import { describe, expect, it, vi } from 'vitest'
import {
  buildSlashCommandItems,
  composeSkillInvocation,
  countRegisteredCommands,
  COMMANDS,
  filterSlashCommands,
  formatSkillsList,
  fuzzyMatchCommand,
  handleSlashCommand,
  LEGACY_ALIASES,
  levenshtein,
  parseSlashInput,
  parseTimeSpec,
  resolveCommand,
  slashQueryFromComposer,
  type SlashContext,
} from './slashCommands'

vi.mock('@/api/chat', () => ({
  searchMessages: vi.fn(async () => []),
}))

vi.mock('@/api/personal', () => ({
  fetchPersonalDocs: vi.fn(async () => ({ files: [], directories: [] })),
  addPersonalDirectory: vi.fn(async () => ({ indexed_count: 3 })),
  removePersonalDirectory: vi.fn(async () => ({})),
}))

vi.mock('@/api/cookbookServe', () => ({
  execShell: vi.fn(async () => ({ stdout: 'ok', stderr: '', exit_code: 0 })),
}))

vi.mock('@/api/client', () => ({
  api: {
    get: vi.fn(async (path: string) => {
      if (path === '/api/models') {
        return { items: [{ endpoint_name: 'Local', url: 'http://x', models: ['gpt-4'] }] }
      }
      if (path === '/api/db/stats') {
        return { sessions: 1, messages: 2, memories: 3, documents: 4, uploads: 5 }
      }
      if (path === '/api/ping') {
        return { endpoints: [{ name: 'Groq', status: 'online', latency_ms: 42, model_count: 2 }] }
      }
      if (path === '/api/auth/settings') {
        return { keybinds: { search: 'ctrl+k' } }
      }
      return {}
    }),
    post: vi.fn(async () => ({ summarized: 4, kept: 6 })),
  },
}))

function makeContext(overrides: Partial<SlashContext> = {}): SlashContext {
  return {
    skills: [],
    sessionId: 'sess-1',
    sessions: [
      {
        id: 'sess-1',
        name: 'Main chat',
        model: 'gpt-4',
        message_count: 3,
      },
    ],
    currentSession: {
      id: 'sess-1',
      name: 'Main chat',
      model: 'gpt-4',
      message_count: 3,
    },
    activePending: null,
    navigate: vi.fn(),
    startNewChat: vi.fn(),
    selectSession: vi.fn(),
    deleteSession: vi.fn(),
    renameSession: vi.fn(),
    archiveSession: vi.fn(),
    toggleImportant: vi.fn(),
    forkSession: vi.fn(async () => 'sess-2'),
    truncateSession: vi.fn(async () => {}),
    clearMessages: vi.fn(),
    invalidateSessions: vi.fn(),
    getRag: () => true,
    setRag: vi.fn(),
    getIncognito: () => false,
    setIncognito: vi.fn(),
    setWeb: vi.fn(),
    setBash: vi.fn(),
    setPlan: vi.fn(),
    getWorkspace: () => '',
    setWorkspace: vi.fn(),
    clearWorkspace: vi.fn(),
    openWorkspacePicker: vi.fn(),
    applyTheme: vi.fn(),
    saveCustomTheme: vi.fn(),
    deleteCustomTheme: vi.fn(),
    getThemeColors: () => ({
      bg: '#000',
      fg: '#fff',
      panel: '#111',
      border: '#333',
      red: '#f00',
    }),
    reloadSession: vi.fn(async () => {}),
    ...overrides,
  }
}

describe('slashCommands registry', () => {
  it('defines P0 command groups including new ports', () => {
    expect(countRegisteredCommands()).toBe(46)
    expect(COMMANDS.chats).toBeDefined()
    expect(COMMANDS.workspace).toBeDefined()
    expect(COMMANDS.rag).toBeDefined()
    expect(COMMANDS.theme).toBeDefined()
    expect(COMMANDS.prompt).toBeDefined()
    expect(COMMANDS.search).toBeDefined()
    expect(COMMANDS.find).toBeDefined()
    expect(COMMANDS.stats).toBeDefined()
    expect(COMMANDS.compact).toBeDefined()
    expect(COMMANDS.sh).toBeDefined()
    expect(COMMANDS.shortcuts).toBeDefined()
    expect(COMMANDS.ping).toBeDefined()
    expect(COMMANDS.probe).toBeDefined()
    expect(COMMANDS.flip).toBeDefined()
    expect(COMMANDS.demo).toBeDefined()
    expect(Object.keys(LEGACY_ALIASES).length).toBeGreaterThan(20)
  })

  it('hides easter eggs from autocomplete palette', () => {
    const items = buildSlashCommandItems([])
    const labels = items.map((i) => i.label)
    expect(labels).not.toContain('/flip')
    expect(labels).not.toContain('/matrix')
    expect(labels).toContain('/theme')
    expect(labels).toContain('/workspace')
    expect(labels).toContain('/prompt')
  })
})

describe('slashCommands parsing & matching', () => {
  const skills = [
    { name: 'deploy-app', description: 'Deploy to production' },
    { name: 'lint-code', description: 'Run the linter' },
  ]

  it('builds categorized palette items', () => {
    const items = buildSlashCommandItems(skills)
    expect(items.length).toBeGreaterThanOrEqual(70)
    expect(items.some((i) => i.label === '/help')).toBe(true)
    expect(items.some((i) => i.label === '/chats new')).toBe(true)
    expect(items.some((i) => i.label === '/new')).toBe(true)
    expect(items.some((i) => i.label === '/deploy-app')).toBe(true)
    expect(items.filter((i) => i.category === 'Chats').length).toBeGreaterThan(0)
  })

  it('filters commands with scored prefix match', () => {
    const items = buildSlashCommandItems(skills)
    expect(filterSlashCommands(items, '/dep').map((i) => i.label)).toContain('/deploy-app')
    expect(filterSlashCommands(items, '/tog').map((i) => i.label)).toContain('/toggle web')
    expect(filterSlashCommands(items, '/theme').map((i) => i.label)).toContain('/theme')
    expect(filterSlashCommands(items, '/help').map((i) => i.label)).toContain('/help')
  })

  it('detects slash query at caret', () => {
    expect(slashQueryFromComposer('/hel', 4)).toBe('/hel')
    expect(slashQueryFromComposer('/chats new', 10)).toBe('/chats new')
    expect(slashQueryFromComposer('hello /ski', 10)).toBeNull()
    expect(slashQueryFromComposer('/help\nmore', 5)).toBeNull()
  })

  it('parses command args', () => {
    expect(parseSlashInput('/chats rename My Chat')).toEqual({
      command: 'chats',
      args: 'rename My Chat',
      argList: ['rename', 'My', 'Chat'],
    })
  })

  it('resolves aliases and legacy names', () => {
    expect(resolveCommand('s')).toBe('chats')
    expect(resolveCommand('cook')).toBe('cookbook')
    expect(resolveCommand('ws')).toBe('workspace')
    expect(LEGACY_ALIASES.web).toEqual({ parent: 'toggle', sub: 'web' })
  })

  it('fuzzy-matches typos', () => {
    expect(levenshtein('hel', 'help')).toBe(1)
    expect(fuzzyMatchCommand('hel')).toContain('help')
    expect(fuzzyMatchCommand('cokbook')).toContain('cookbook')
  })

  it('parses event time specs', () => {
    const parsed = parseTimeSpec('tomorrow 14:00 Team sync')
    expect(parsed?.rest).toBe('Team sync')
    expect(parsed?.date.getHours()).toBe(14)
  })
})

describe('handleSlashCommand', () => {
  const skills = [{ name: 'deploy-app', description: 'Deploy' }]

  it('handles /help locally', async () => {
    const result = await handleSlashCommand('/help', makeContext({ skills }))
    expect(result.handled).toBe(true)
    if (result.handled && 'reply' in result) {
      expect(result.reply).toContain('Slash commands')
    }
  })

  it('handles /toggle web', async () => {
    const setWeb = vi.fn()
    const ctx = makeContext({ setWeb })
    const result = await handleSlashCommand('/toggle web', ctx)
    expect(result.handled).toBe(true)
    if (result.handled && 'reply' in result) {
      expect(result.reply).toMatch(/web: (on|off)/)
    }
  })

  it('handles legacy /web alias', async () => {
    const result = await handleSlashCommand('/web', makeContext())
    expect(result.handled).toBe(true)
  })

  it('handles /plan on', async () => {
    const result = await handleSlashCommand('/plan on', makeContext())
    expect(result.handled).toBe(true)
    if (result.handled && 'reply' in result) {
      expect(result.reply).toContain('Plan mode: on')
    }
  })

  it('handles /chats info', async () => {
    const result = await handleSlashCommand('/chats info', makeContext())
    expect(result.handled).toBe(true)
    if (result.handled && 'reply' in result) {
      expect(result.reply).toContain('Main chat')
    }
  })

  it('handles /new via legacy alias', async () => {
    const startNewChat = vi.fn()
    const result = await handleSlashCommand('/new', makeContext({ startNewChat, sessionId: null }))
    expect(result.handled).toBe(true)
    expect(startNewChat).toHaveBeenCalled()
  })

  it('navigates on /cookbook', async () => {
    const navigate = vi.fn()
    const result = await handleSlashCommand('/cookbook', makeContext({ navigate }))
    expect(result.handled).toBe(true)
    expect(navigate).toHaveBeenCalledWith('/cookbook')
  })

  it('navigates on /settings models tab', async () => {
    const navigate = vi.fn()
    const result = await handleSlashCommand('/settings models', makeContext({ navigate }))
    expect(result.handled).toBe(true)
    expect(navigate).toHaveBeenCalledWith('/settings?tab=ai')
  })

  it('routes skill invocation to model', async () => {
    const result = await handleSlashCommand('/deploy-app fix staging', makeContext({ skills }))
    expect(result).toEqual({
      handled: true,
      sendToModel: true,
      message: '/deploy-app fix staging',
    })
  })

  it('handles /workspace set with typewriter', async () => {
    const setWorkspace = vi.fn()
    const result = await handleSlashCommand('/workspace set /tmp/proj', makeContext({ setWorkspace }))
    expect(result.handled).toBe(true)
    if (result.handled && 'reply' in result) {
      expect(result.reply).toContain('/tmp/proj')
      expect(result.typewriter).toBe(true)
      expect(result.hideUserBubble).toBe(true)
    }
    expect(setWorkspace).toHaveBeenCalledWith('/tmp/proj')
  })

  it('opens workspace picker on /workspace pick', async () => {
    const openWorkspacePicker = vi.fn()
    const result = await handleSlashCommand('/workspace pick', makeContext({ openWorkspacePicker }))
    expect(result).toMatchObject({ handled: true, openWorkspacePicker: true })
    expect(openWorkspacePicker).toHaveBeenCalled()
  })

  it('handles /rag list', async () => {
    const result = await handleSlashCommand('/rag list', makeContext())
    expect(result.handled).toBe(true)
    if (result.handled && 'reply' in result) {
      expect(result.reply).toContain('No files')
    }
  })

  it('starts interactive tour on /demo', async () => {
    const navigate = vi.fn()
    const result = await handleSlashCommand('/demo', makeContext({ navigate }))
    expect(result.handled).toBe(true)
    expect(navigate).toHaveBeenCalledWith('/chat')
    if (result.handled && 'reply' in result) {
      expect(result.reply).toContain('guided tour')
    }
  })

  it('prefills composer on /prompt', async () => {
    const result = await handleSlashCommand('/prompt', makeContext())
    expect(result).toMatchObject({ handled: true, hideUserBubble: true })
    if (result.handled && 'prefillComposer' in result) {
      expect(result.prefillComposer.length).toBeGreaterThan(0)
    }
  })

  it('applies theme on /theme dark', async () => {
    const applyTheme = vi.fn()
    const result = await handleSlashCommand('/theme dark', makeContext({ applyTheme }))
    expect(result.handled).toBe(true)
    expect(applyTheme).toHaveBeenCalledWith('dark')
  })

  it('sends /search query to model with web enabled', async () => {
    const result = await handleSlashCommand('/search latest news', makeContext())
    expect(result).toEqual({
      handled: true,
      sendToModel: true,
      message: 'latest news',
      enableWeb: true,
    })
  })

  it('handles /stats', async () => {
    const result = await handleSlashCommand('/stats', makeContext())
    expect(result.handled).toBe(true)
    if (result.handled && 'reply' in result) {
      expect(result.reply).toContain('Sessions:')
    }
  })

  it('handles /shortcuts', async () => {
    const result = await handleSlashCommand('/shortcuts', makeContext())
    expect(result.handled).toBe(true)
    if (result.handled && 'reply' in result) {
      expect(result.reply).toContain('Keyboard shortcuts')
    }
  })

  it('handles /ping', async () => {
    const result = await handleSlashCommand('/ping', makeContext())
    expect(result.handled).toBe(true)
    if (result.handled && 'reply' in result) {
      expect(result.reply).toContain('Groq')
    }
  })

  it('handles easter egg /flip', async () => {
    const result = await handleSlashCommand('/flip', makeContext())
    expect(result.handled).toBe(true)
    if (result.handled && 'reply' in result) {
      expect(result.reply).toMatch(/Heads|Tails|edge/i)
    }
  })

  it('handles easter egg /matrix with typewriter rain', async () => {
    const result = await handleSlashCommand('/matrix', makeContext())
    expect(result.handled).toBe(true)
    if (result.handled && 'reply' in result) {
      expect(result.reply).toContain('Wake up, Neo')
      expect(result.typewriter).toBe(true)
    }
  })

  it('suggests fuzzy matches for unknown commands', async () => {
    const result = await handleSlashCommand('/hel', makeContext())
    expect(result.handled).toBe(true)
    if (result.handled && 'reply' in result) {
      expect(result.reply).toContain('Did you mean')
    }
  })

  it('formats empty skills list', () => {
    expect(formatSkillsList([])).toContain('No published skills')
  })

  it('composes skill invocation body', () => {
    const body = composeSkillInvocation('# Skill\nDo thing', 'my task')
    expect(body).toContain('BEGIN SKILL')
    expect(body).toContain('Request: my task')
  })
})
