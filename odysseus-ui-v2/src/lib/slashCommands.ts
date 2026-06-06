import { searchMessages } from '@/api/chat'
import { createEvent } from '@/api/calendar'
import { api } from '@/api/client'
import { execShell } from '@/api/cookbookServe'
import {
  addPersonalDirectory,
  fetchPersonalDocs,
  removePersonalDirectory,
} from '@/api/personal'
import { createNote, fetchNotes } from '@/api/notes'
import { createModelEndpoint, fetchModelEndpoints } from '@/api/settings'
import { createSession, deleteSession } from '@/api/sessions'
import {
  addMemory,
  deleteMemory,
  fetchMemories,
  searchMemories,
} from '@/api/memory'
import type { PendingChat, Session, SkillsIndexEntry } from '@/api/types'
import {
  clearWorkspaceFolder,
  getWorkspaceFolder,
  openWorkspacePicker as dispatchWorkspacePicker,
  setWorkspaceFolder,
} from '@/lib/workspaceFolder'
import {
  formatToggleStatus,
  getBashEnabled,
  getChatMode,
  getWebEnabled,
  isPlanEnabled,
  isResearchEnabled,
  toggleNamedFeature,
} from '@/lib/chatToggles'
import {
  handle8Ball,
  handleAscii,
  handleColor,
  handleCowsay,
  handleFlip,
  handleFortune,
  handleMatrix,
  handleOdyssey,
  handleRoll,
  handleUptime,
  handleWisdom,
} from '@/lib/slashEasterEggs'
import { startDemoTour } from '@/lib/demoTour'
import { pickStarterPrompt } from '@/lib/starterPrompts'
import { readCustomThemes, THEME_PRESETS, type ThemeColors } from '@/lib/theme'

// ── Types ─────────────────────────────────────────────────────────

export interface SlashCommandItem {
  id: string
  label: string
  insert: string
  description?: string
  category?: string
  kind: 'command' | 'skill'
}

export interface SlashContext {
  skills: SkillsIndexEntry[]
  sessionId: string | null
  sessions: Session[]
  archivedSessions?: Session[]
  currentSession: Session | null
  activePending: PendingChat | null
  navigate: (path: string) => void
  startNewChat: () => void
  selectSession: (id: string) => void
  deleteSession: (id: string) => void
  renameSession: (id: string, name: string) => void
  archiveSession: (id: string) => void
  toggleImportant: (id: string, important: boolean) => void
  forkSession: (keepCount: number) => Promise<string | null>
  truncateSession: (keepCount: number) => Promise<void>
  clearMessages: () => void
  invalidateSessions: () => void
  getRag: () => boolean
  setRag: (value: boolean) => void
  getIncognito: () => boolean
  setIncognito: (value: boolean) => void
  setWeb?: (value: boolean) => void
  setBash?: (value: boolean) => void
  setPlan?: (value: boolean) => void
  setResearch?: (value: boolean) => void
  getWorkspace?: () => string
  setWorkspace?: (path: string) => void
  clearWorkspace?: () => void
  openWorkspacePicker?: () => void
  applyTheme?: (name: string) => void
  saveCustomTheme?: (name: string, colors: ThemeColors) => void
  deleteCustomTheme?: (name: string) => void
  getThemeColors?: () => ThemeColors
  reloadSession?: () => Promise<void>
}

export type SlashHandleResult =
  | { handled: true; reply: string; hideUserBubble?: boolean; typewriter?: boolean }
  | { handled: true; sendToModel: true; message: string; enableWeb?: boolean }
  | { handled: true; prefillComposer: string; hideUserBubble?: boolean }
  | { handled: true; openWorkspacePicker: true; hideUserBubble?: boolean }
  | { handled: false }

interface CommandSubDef {
  help: string
  usage?: string
  alias?: string[]
  hidden?: boolean
}

interface CommandDef {
  category?: string
  help?: string
  usage?: string
  alias?: string[]
  hidden?: boolean
  default?: string
  subs?: Record<string, CommandSubDef>
  handler?: boolean
}

// ── Command registry (metadata — handlers live in dispatch) ─────────

export const COMMANDS: Record<string, CommandDef> = {
  chats: {
    alias: ['chat', 'session', 'sessions', 's'],
    category: 'Chats',
    help: 'Manage chat sessions',
    default: 'info',
    subs: {
      new: { alias: ['create', 'mkdir'], help: 'Create new chat', usage: '/chats new [name]' },
      delete: { alias: ['del', 'rm'], help: 'Delete chat', usage: '/chats delete [id]' },
      archive: { alias: ['tar'], help: 'Archive chat', usage: '/chats archive [id]' },
      rename: { alias: ['mv'], help: 'Rename current chat', usage: '/chats rename Name' },
      favorite: { alias: ['pin', 'important'], help: 'Mark as favorite', usage: '/chats favorite' },
      unfavorite: { alias: ['unpin', 'unimportant'], help: 'Unmark favorite', usage: '/chats unfavorite' },
      fork: { alias: ['cp'], help: 'Fork chat (keep first N msgs)', usage: '/chats fork [N]' },
      truncate: { help: 'Delete older messages, keep last N', usage: '/chats truncate N' },
      switch: { alias: ['goto', 'cd'], help: 'Switch to chat by name/id', usage: '/chats switch name' },
      sort: { help: 'Auto-sort into folders', usage: '/chats sort' },
      info: { alias: ['stat'], help: 'Show chat details', usage: '/chats info' },
      clear: { help: 'Clear chat display', usage: '/chats clear' },
      export: { alias: ['cat'], help: 'Download as markdown', usage: '/chats export' },
    },
  },
  toggle: {
    alias: ['t'],
    category: 'Quick toggles',
    help: 'Toggle features on/off',
    default: '_show',
    subs: {
      web: { alias: ['search', 'w'], help: 'Toggle web search', usage: '/toggle web' },
      bash: { alias: ['b', 'shell'], help: 'Toggle bash/shell', usage: '/toggle bash' },
      rag: { help: 'Toggle RAG', usage: '/toggle rag' },
      incognito: { help: 'Toggle incognito mode', usage: '/toggle incognito' },
      research: { alias: ['r'], help: 'Toggle deep research', usage: '/toggle research' },
      plan: { alias: ['p'], help: 'Toggle plan mode', usage: '/toggle plan' },
      _show: { help: 'Show all toggle states', usage: '/toggle' },
    },
  },
  plan: {
    category: 'Quick toggles',
    help: 'Toggle plan mode (agent)',
    handler: true,
    usage: '/plan [on|off]',
  },
  workspace: {
    alias: ['ws'],
    category: 'Agent',
    help: 'Set the folder the agent works in',
    handler: true,
    usage: '/workspace [set <path> | clear | pick]',
  },
  memory: {
    alias: ['m'],
    category: 'Memory',
    help: 'Manage persistent memories',
    default: 'list',
    subs: {
      list: { alias: ['ls'], help: 'List all memories', usage: '/memory list' },
      add: { alias: ['echo'], help: 'Save a memory', usage: '/memory add text' },
      delete: { alias: ['del', 'rm'], help: 'Delete by ID', usage: '/memory delete id' },
      search: { alias: ['grep'], help: 'Search memories', usage: '/memory search q' },
    },
  },
  rag: {
    category: 'RAG',
    hidden: true,
    help: 'Manage document indexing',
    default: 'list',
    subs: {
      list: { alias: ['ls'], help: 'List indexed files', usage: '/rag list' },
      add: { help: 'Add directory', usage: '/rag add /path' },
      remove: { alias: ['rm'], help: 'Remove directory', usage: '/rag remove /path' },
    },
  },
  note: {
    alias: ['n'],
    category: 'Memory',
    help: 'Quick-save a note',
    handler: true,
    usage: '/note text',
  },
  todo: {
    alias: ['td'],
    category: 'Productivity',
    help: 'Add or list todos',
    handler: true,
    usage: '/todo Your task  ·  /todo list',
  },
  event: {
    alias: ['ev'],
    category: 'Productivity',
    help: 'Create a calendar event',
    handler: true,
    usage: '/event tomorrow 14:00 Team call',
  },
  demo: {
    alias: ['tour'],
    category: 'Tours',
    help: 'Full guided product tour',
    handler: true,
    usage: '/demo',
  },
  prompt: {
    category: 'Getting started',
    help: 'Send a random starter prompt',
    handler: true,
    usage: '/prompt',
  },
  theme: {
    category: 'Settings',
    help: 'Change color theme',
    handler: true,
    usage: '/theme name',
  },
  setup: {
    alias: ['su', 'seutp'],
    category: 'Getting started',
    help: 'Add local or API model endpoints',
    handler: true,
    usage: '/setup local URL  ·  /setup groq KEY  ·  /setup endpoint',
    subs: {
      deepseek: { help: 'DeepSeek', usage: '/setup deepseek sk-...' },
      openai: { help: 'OpenAI', usage: '/setup openai sk-proj-...' },
      anthropic: { help: 'Anthropic', usage: '/setup anthropic sk-ant-...' },
      openrouter: { help: 'OpenRouter', usage: '/setup openrouter sk-or-...' },
      groq: { help: 'Groq', usage: '/setup groq gsk_...' },
      gemini: { alias: ['google'], help: 'Google Gemini', usage: '/setup gemini AIza...' },
      xai: { alias: ['grok'], help: 'xAI (Grok)', usage: '/setup xai xai-...' },
      ollama: { help: 'Ollama Cloud', usage: '/setup ollama KEY' },
      copilot: { help: 'GitHub Copilot', usage: '/setup copilot' },
      local: { help: 'Local model server', usage: '/setup local http://localhost:8000/v1' },
      endpoint: { help: 'Open endpoint manager in Settings', usage: '/setup endpoint' },
    },
  },
  settings: {
    alias: ['cfg', 'preferences', 'config'],
    category: 'Settings',
    help: 'Open the Settings panel',
    handler: true,
    usage: '/settings [tab]',
  },
  open: {
    alias: ['show'],
    category: 'Utility',
    hidden: true,
    help: 'Open a tool panel',
    handler: true,
    usage: '/open Cookbook',
  },
  cookbook: { alias: ['cook'], category: 'Tools', help: 'Open Cookbook', handler: true, usage: '/cookbook' },
  email: { alias: ['mail', 'inbox'], category: 'Tools', help: 'Open Email', handler: true, usage: '/email' },
  notes: { category: 'Tools', help: 'Open Notes', handler: true, usage: '/notes' },
  tasks: { category: 'Tools', help: 'Open Tasks', handler: true, usage: '/tasks' },
  brain: { alias: ['memories'], category: 'Tools', help: 'Open Brain / Memory', handler: true, usage: '/brain' },
  library: {
    alias: ['docs', 'documents'],
    category: 'Tools',
    help: 'Open Library',
    handler: true,
    usage: '/library',
  },
  gallery: { alias: ['photos'], category: 'Tools', help: 'Open Gallery', handler: true, usage: '/gallery' },
  research: { category: 'Tools', help: 'Open Deep Research', handler: true, usage: '/research' },
  compare: { category: 'Tools', help: 'Open Compare', handler: true, usage: '/compare' },
  models: { alias: ['model'], category: 'Settings', help: 'List available models', handler: true, usage: '/models' },
  search: {
    alias: ['websearch'],
    category: 'Utility',
    hidden: true,
    help: 'Web search (sends query with web enabled)',
    handler: true,
    usage: '/search query',
  },
  find: {
    alias: ['search-history'],
    category: 'Utility',
    hidden: true,
    help: 'Search all conversations',
    handler: true,
    usage: '/find query',
  },
  stats: {
    alias: ['df'],
    category: 'Utility',
    hidden: true,
    help: 'Database statistics',
    handler: true,
    usage: '/stats',
  },
  compact: {
    category: 'Utility',
    hidden: true,
    help: 'Compact older chat messages',
    handler: true,
    usage: '/compact',
  },
  sh: {
    alias: ['exec', 'run', 'shell'],
    category: 'Utility',
    hidden: true,
    help: 'Run a shell command',
    handler: true,
    usage: '/sh command',
  },
  shortcuts: {
    alias: ['keys', 'keybinds', 'bind'],
    category: 'Utility',
    hidden: true,
    help: 'Show keyboard shortcuts',
    handler: true,
    usage: '/shortcuts',
  },
  ping: {
    alias: ['pong'],
    category: 'Utility',
    hidden: true,
    help: 'Check if model endpoints are alive',
    handler: true,
    usage: '/ping',
  },
  probe: {
    alias: ['test-models'],
    category: 'Utility',
    hidden: true,
    help: 'Test which models actually respond',
    handler: true,
    usage: '/probe [endpoint]',
  },
  flip: { alias: ['coin'], hidden: true, handler: true, usage: '/flip' },
  roll: { alias: ['dice', 'r'], hidden: true, handler: true, usage: '/roll [NdN|sides]' },
  '8ball': { alias: ['8-ball'], hidden: true, handler: true, usage: '/8ball question' },
  fortune: { alias: ['cookie'], hidden: true, handler: true, usage: '/fortune' },
  odyssey: { alias: ['homer', 'quote'], hidden: true, handler: true, usage: '/odyssey' },
  ascii: { alias: ['banner'], hidden: true, handler: true, usage: '/ascii [text]' },
  matrix: { hidden: true, handler: true, usage: '/matrix' },
  cowsay: { alias: ['moo', 'say'], hidden: true, handler: true, usage: '/cowsay [text]' },
  wisdom: { alias: ['inspire'], hidden: true, handler: true, usage: '/wisdom' },
  uptime: { hidden: true, handler: true, usage: '/uptime' },
  color: { alias: ['colour'], hidden: true, handler: true, usage: '/color [hex]' },
  help: {
    alias: ['?', 'man', 'commands'],
    category: 'Utility',
    help: 'Show slash command help',
    handler: true,
    usage: '/help',
  },
  skills: {
    category: 'Agent',
    help: 'List published skills',
    handler: true,
    usage: '/skills',
  },
}

export const LEGACY_ALIASES: Record<string, { parent: string; sub: string }> = {
  new: { parent: 'chats', sub: 'new' },
  create: { parent: 'chats', sub: 'new' },
  delete: { parent: 'chats', sub: 'delete' },
  del: { parent: 'chats', sub: 'delete' },
  archive: { parent: 'chats', sub: 'archive' },
  rename: { parent: 'chats', sub: 'rename' },
  favorite: { parent: 'chats', sub: 'favorite' },
  important: { parent: 'chats', sub: 'favorite' },
  star: { parent: 'chats', sub: 'favorite' },
  unfavorite: { parent: 'chats', sub: 'unfavorite' },
  unimportant: { parent: 'chats', sub: 'unfavorite' },
  unstar: { parent: 'chats', sub: 'unfavorite' },
  fork: { parent: 'chats', sub: 'fork' },
  truncate: { parent: 'chats', sub: 'truncate' },
  sessions: { parent: 'chats', sub: 'info' },
  switch: { parent: 'chats', sub: 'switch' },
  goto: { parent: 'chats', sub: 'switch' },
  sort: { parent: 'chats', sub: 'sort' },
  info: { parent: 'chats', sub: 'info' },
  clear: { parent: 'chats', sub: 'clear' },
  export: { parent: 'chats', sub: 'export' },
  web: { parent: 'toggle', sub: 'web' },
  bash: { parent: 'toggle', sub: 'bash' },
  research: { parent: 'toggle', sub: 'research' },
  memories: { parent: 'memory', sub: 'list' },
  forget: { parent: 'memory', sub: 'delete' },
  rm: { parent: 'chats', sub: 'delete' },
  mv: { parent: 'chats', sub: 'rename' },
  cd: { parent: 'chats', sub: 'switch' },
  cp: { parent: 'chats', sub: 'fork' },
  cat: { parent: 'chats', sub: 'export' },
  stat: { parent: 'chats', sub: 'info' },
  tar: { parent: 'chats', sub: 'archive' },
  mkdir: { parent: 'chats', sub: 'new' },
  status: { parent: 'toggle', sub: '_show' },
}

const EXCLUDED_AUTOCOMPLETE = new Set([
  'flip',
  'roll',
  '8ball',
  'fortune',
  'odyssey',
  'ascii',
  'matrix',
  'cowsay',
  'wisdom',
  'uptime',
  'color',
])

const PROMOTED_ALIASES = new Set([
  'new',
  'clear',
  'rename',
  'fork',
  'export',
  'archive',
  'favorite',
  'unfavorite',
  'web',
  'bash',
  'research',
  'memories',
  'forget',
])

const PANEL_ROUTES: Record<string, string> = {
  cookbook: '/cookbook',
  cook: '/cookbook',
  settings: '/settings',
  setting: '/settings',
  config: '/settings',
  cfg: '/settings',
  preferences: '/settings',
  gallery: '/gallery',
  photos: '/gallery',
  notes: '/notes',
  tasks: '/tasks',
  library: '/library',
  docs: '/library',
  documents: '/library',
  archive: '/library',
  brain: '/memory',
  memory: '/memory',
  memories: '/memory',
  research: '/research',
  compare: '/compare',
  email: '/email',
  mail: '/email',
  inbox: '/email',
  agents: '/agents',
  calendar: '/calendar',
  chat: '/chat',
}

const SETUP_PROVIDERS: Record<string, { name: string; url: string }> = {
  deepseek: { name: 'DeepSeek', url: 'https://api.deepseek.com/v1' },
  openai: { name: 'OpenAI', url: 'https://api.openai.com/v1' },
  anthropic: { name: 'Anthropic', url: 'https://api.anthropic.com/v1' },
  openrouter: { name: 'OpenRouter', url: 'https://openrouter.ai/api/v1' },
  groq: { name: 'Groq', url: 'https://api.groq.com/openai/v1' },
  gemini: { name: 'Gemini', url: 'https://generativelanguage.googleapis.com/v1beta/openai' },
  google: { name: 'Gemini', url: 'https://generativelanguage.googleapis.com/v1beta/openai' },
  xai: { name: 'xAI', url: 'https://api.x.ai/v1' },
  grok: { name: 'xAI', url: 'https://api.x.ai/v1' },
}

const SETTINGS_TAB_ALIASES: Record<string, string> = {
  models: 'ai',
  model: 'ai',
  ai: 'ai',
  appearance: 'appearance',
  theme: 'appearance',
  shortcuts: 'shortcuts',
  keys: 'shortcuts',
  account: 'account',
  privacy: 'privacy',
  email: 'email',
  integrations: 'integrations',
  search: 'search',
  services: 'services',
  reminders: 'reminders',
  tools: 'tools',
  users: 'users',
  system: 'system',
}

const MAX_AUTOCOMPLETE = 12

// ── Parsing & matching ──────────────────────────────────────────────

export function parseSlashInput(text: string): { command: string; args: string; argList: string[] } | null {
  const trimmed = text.trim()
  if (!trimmed.startsWith('/')) return null
  const body = trimmed.slice(1)
  const space = body.indexOf(' ')
  const argList = space === -1 ? [] : body.slice(space + 1).trim().split(/\s+/)
  if (space === -1) return { command: body.toLowerCase(), args: '', argList: [] }
  return { command: body.slice(0, space).toLowerCase(), args: body.slice(space + 1).trim(), argList }
}

function buildAliasMap(): Record<string, string> {
  const map: Record<string, string> = {}
  for (const [name, def] of Object.entries(COMMANDS)) {
    map[name] = name
    for (const a of def.alias ?? []) map[a] = name
  }
  return map
}

const ALIAS_MAP = buildAliasMap()

export function resolveCommand(cmd: string): string | null {
  return ALIAS_MAP[cmd] ?? null
}

function resolveSubcommand(def: CommandDef, sub: string): string | null {
  if (!def.subs) return null
  if (def.subs[sub]) return sub
  for (const [name, sDef] of Object.entries(def.subs)) {
    if (sDef.alias?.includes(sub)) return name
  }
  return null
}

export function levenshtein(a: string, b: string): number {
  const m = a.length
  const n = b.length
  const dp = Array.from({ length: m + 1 }, () => new Array<number>(n + 1).fill(0))
  for (let i = 0; i <= m; i++) dp[i][0] = i
  for (let j = 0; j <= n; j++) dp[0][j] = j
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      dp[i][j] =
        a[i - 1] === b[j - 1]
          ? dp[i - 1][j - 1]
          : 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1])
    }
  }
  return dp[m][n]
}

export function fuzzyMatchCommand(typed: string, maxDist = 2): string[] {
  const candidates = Object.keys(ALIAS_MAP)
  for (const k of Object.keys(LEGACY_ALIASES)) {
    if (!candidates.includes(k)) candidates.push(k)
  }
  const matches: string[] = []
  for (const c of candidates) {
    const d = levenshtein(typed, c)
    if (d > 0 && d <= maxDist) matches.push(c)
  }
  return matches.sort((a, b) => levenshtein(typed, a) - levenshtein(typed, b))
}

interface FlatEntry {
  token: string
  aliases: string[]
  category: string
  help: string
  usage: string
}

function flattenCommandRegistry(): FlatEntry[] {
  const out: FlatEntry[] = []
  const seen = new Set<string>()

  for (const [name, def] of Object.entries(COMMANDS)) {
    if (EXCLUDED_AUTOCOMPLETE.has(name)) continue
    if (def.hidden) continue
    if (def.handler) {
      const tok = `/${name}`
      seen.add(tok)
      out.push({
        token: tok,
        aliases: (def.alias ?? []).map((a) => `/${a}`),
        category: def.category ?? '',
        help: def.help ?? '',
        usage: def.usage ?? tok,
      })
    }
    if (def.subs) {
      for (const [sub, sdef] of Object.entries(def.subs)) {
        if (sub.startsWith('_')) continue
        if (sdef.hidden) continue
        const tok = `/${name} ${sub}`
        seen.add(tok)
        out.push({
          token: tok,
          aliases: (sdef.alias ?? []).map((a) => `/${name} ${a}`),
          category: def.category ?? '',
          help: sdef.help,
          usage: sdef.usage ?? tok,
        })
      }
    }
  }

  for (const [alias, { parent, sub }] of Object.entries(LEGACY_ALIASES)) {
    if (!PROMOTED_ALIASES.has(alias)) continue
    const tok = `/${alias}`
    if (seen.has(tok)) continue
    const parentDef = COMMANDS[parent]
    const subDef = parentDef?.subs?.[sub]
    if (!subDef) continue
    seen.add(tok)
    out.push({
      token: tok,
      aliases: [],
      category: parentDef.category ?? '',
      help: subDef.help,
      usage: tok,
    })
  }

  return out
}

const FLAT_REGISTRY = flattenCommandRegistry()

function scoreMatch(entry: FlatEntry, query: string): number {
  const q = query.toLowerCase()
  const t = entry.token.toLowerCase()
  if (t === q) return 1000
  if (t.startsWith(q)) return 500 + (50 - Math.min(50, t.length - q.length))
  for (const a of entry.aliases) {
    const al = a.toLowerCase()
    if (al === q) return 900
    if (al.startsWith(q)) return 400
  }
  if (t.includes(q)) return 100
  if (entry.help.toLowerCase().includes(q.slice(1))) return 25
  return 0
}

export function buildSlashCommandItems(skills: SkillsIndexEntry[]): SlashCommandItem[] {
  const base: SlashCommandItem[] = FLAT_REGISTRY.map((e) => ({
    id: e.token,
    label: e.token,
    insert: `${e.token} `,
    description: e.help,
    category: e.category || 'Other',
    kind: 'command' as const,
  }))

  const skillItems = skills.map((sk) => ({
    id: `skill:${sk.name}`,
    label: `/${sk.name}`,
    insert: `/${sk.name} `,
    description: sk.description,
    category: 'Skills',
    kind: 'skill' as const,
  }))

  return [...base, ...skillItems]
}

export function filterSlashCommands(items: SlashCommandItem[], query: string): SlashCommandItem[] {
  const q = query.trim()
  if (!q || q === '/') {
    return items.slice(0, MAX_AUTOCOMPLETE)
  }

  const scored = items
    .map((item) => {
      const entry: FlatEntry = {
        token: item.label,
        aliases: [],
        category: item.category ?? '',
        help: item.description ?? '',
        usage: item.label,
      }
      let score = scoreMatch(entry, q)
      if (item.kind === 'skill' && item.label.toLowerCase().includes(q.toLowerCase().replace(/^\//, ''))) {
        score = Math.max(score, 300)
      }
      return { item, score }
    })
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, MAX_AUTOCOMPLETE)
    .map((x) => x.item)

  return scored.length ? scored : items.slice(0, MAX_AUTOCOMPLETE)
}

export function slashQueryFromComposer(value: string, caret: number): string | null {
  if (!value.startsWith('/') || value.includes('\n')) return null
  const before = value.slice(0, caret).trimEnd()
  const match = /^(\/[^\s]+(?:\s+[^\s]*)?)/.exec(before)
  if (!match) return null
  return match[1]
}

export function composeSkillInvocation(markdown: string, request: string): string {
  const req = request.trim()
  return (
    `Apply the skill below to my request, following its Procedure / Pitfalls / Verification.\n\n` +
    `--- BEGIN SKILL ---\n${markdown}\n--- END SKILL ---\n\n` +
    (req ? `Request: ${req}` : 'Request: (use the skill as appropriate)')
  )
}

export function formatSkillsList(skills: SkillsIndexEntry[]): string {
  if (!skills.length) {
    return 'No published skills yet. Skills appear in **Agents** after extraction or import.'
  }
  const lines = skills.map((sk) => {
    const desc = sk.description ? ` — ${sk.description}` : ''
    return `- \`/${sk.name}\`${desc}`
  })
  return ['**Published skills** (invoke with `/<name> [request]`):', '', ...lines].join('\n')
}

function formatHelpText(): string {
  const categories: Record<string, string[]> = {}
  for (const [name, def] of Object.entries(COMMANDS)) {
    if (def.hidden) continue
    const cat = def.category || 'Other'
    if (!categories[cat]) categories[cat] = []
    if (def.subs) {
      for (const [sub, sDef] of Object.entries(def.subs)) {
        if (sub.startsWith('_')) continue
        const usage = sDef.usage ?? `/${name} ${sub}`
        categories[cat].push(`  ${usage.padEnd(24)}${sDef.help}`)
      }
    } else if (def.help) {
      const usage = def.usage ?? `/${name}`
      categories[cat].push(`  ${usage.padEnd(24)}${def.help}`)
    }
  }
  const order = [
    'Getting started',
    'Chats',
    'Quick toggles',
    'Agent',
    'Settings',
    'Memory',
    'RAG',
    'Productivity',
    'Tools',
    'Tours',
    'Utility',
    'Other',
  ]
  const lines: string[] = ['**Slash commands**', '']
  for (const cat of order) {
    if (!categories[cat]?.length) continue
    lines.push(`**${cat}:**`)
    lines.push(...categories[cat])
    lines.push('')
  }
  for (const cat of Object.keys(categories)) {
    if (order.includes(cat)) continue
    lines.push(`**${cat}:**`)
    lines.push(...categories[cat])
    lines.push('')
  }
  lines.push('Tip: type `/` in the composer for autocomplete.')
  lines.push('Shortcuts: `/new` `/rename` `/fork` `/web` `/bash` `/memories`')
  return lines.join('\n')
}

// ── Event time parsing (ported from legacy) ───────────────────────

function pad2(n: number): string {
  return String(n).padStart(2, '0')
}

function toLocalIso(d: Date): string {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}T${pad2(d.getHours())}:${pad2(d.getMinutes())}:00`
}

export function parseTimeSpec(input: string): { date: Date; rest: string } | null {
  const s = (input || '').trim().replace(/^(me\s+)/i, '').trim()
  const now = new Date()

  let m = s.match(/^in\s+(\d+)\s*(m|min|mins|minutes|h|hr|hrs|hours|d|day|days)\b\s*(?:to\s+)?(.*)$/i)
  if (m) {
    const n = parseInt(m[1], 10)
    const unit = m[2].toLowerCase()
    const d = new Date(now)
    if (unit.startsWith('m')) d.setMinutes(d.getMinutes() + n)
    else if (unit.startsWith('h')) d.setHours(d.getHours() + n)
    else d.setDate(d.getDate() + n)
    return { date: d, rest: m[3].trim() }
  }

  m = s.match(/^(\d{4})-(\d{2})-(\d{2})[T\s]+(\d{1,2}):(\d{2})\s*(?:to\s+)?(.*)$/i)
  if (m) {
    const d = new Date(+m[1], +m[2] - 1, +m[3], +m[4], +m[5])
    return { date: d, rest: m[6].trim() }
  }

  m = s.match(/^(today|tomorrow)\s+(?:at\s+)?(\d{1,2})(?::(\d{2}))?\s*(am|pm)?\s*(?:to\s+)?(.*)$/i)
  if (m) {
    const d = new Date(now)
    if (m[1].toLowerCase() === 'tomorrow') d.setDate(d.getDate() + 1)
    let hh = parseInt(m[2], 10)
    const mm = m[3] ? parseInt(m[3], 10) : 0
    const mer = (m[4] || '').toLowerCase()
    if (mer === 'pm' && hh < 12) hh += 12
    if (mer === 'am' && hh === 12) hh = 0
    if (hh > 23 || mm > 59) return null
    d.setHours(hh, mm, 0, 0)
    return { date: d, rest: m[5].trim() }
  }

  m = s.match(/^(?:at\s+)?(\d{1,2})(?::(\d{2}))?\s*(am|pm)?\b\s*(?:to\s+)?(.*)$/i)
  if (m) {
    const d = new Date(now)
    let hh = parseInt(m[1], 10)
    const mm = m[2] ? parseInt(m[2], 10) : 0
    const mer = (m[3] || '').toLowerCase()
    if (mer === 'pm' && hh < 12) hh += 12
    if (mer === 'am' && hh === 12) hh = 0
    if (hh > 23 || mm > 59) return null
    if (m[2] == null && !mer) return null
    d.setHours(hh, mm, 0, 0)
    if (d.getTime() <= now.getTime()) d.setDate(d.getDate() + 1)
    return { date: d, rest: m[4].trim() }
  }

  return null
}

// ── Toggle helpers ──────────────────────────────────────────────────

type RuntimeToggle = 'web' | 'bash' | 'rag' | 'incognito' | 'research' | 'plan'

function readToggle(ctx: SlashContext, name: RuntimeToggle): boolean {
  const mode = getChatMode()
  if (name === 'rag') return ctx.getRag()
  if (name === 'incognito') return ctx.getIncognito()
  if (name === 'web') return getWebEnabled(mode)
  if (name === 'bash') return getBashEnabled(mode)
  if (name === 'plan') return isPlanEnabled()
  return isResearchEnabled()
}

function applyToggleValue(ctx: SlashContext, name: RuntimeToggle, val: string): string {
  const explicit = val === 'on' ? true : val === 'off' ? false : undefined
  if (name === 'rag' || name === 'incognito') {
    const cur = readToggle(ctx, name)
    const target = explicit ?? !cur
    if (name === 'rag') ctx.setRag(target)
    else ctx.setIncognito(target)
    return `${name}: ${target ? 'on' : 'off'}`
  }
  if (name === 'web' || name === 'bash' || name === 'plan' || name === 'research') {
    const cur = readToggle(ctx, name)
    const target = explicit ?? !cur
    if (name === 'web') {
      if (ctx.setWeb) ctx.setWeb(target)
      else toggleNamedFeature('web', explicit)
    } else if (name === 'bash') {
      if (ctx.setBash) ctx.setBash(target)
      else toggleNamedFeature('bash', explicit)
    } else if (name === 'plan') {
      if (ctx.setPlan) ctx.setPlan(target)
      else toggleNamedFeature('plan', explicit)
    } else if (ctx.setResearch) {
      ctx.setResearch(target)
    } else {
      toggleNamedFeature('research', explicit)
    }
    return `${name}: ${target ? 'on' : 'off'}`
  }
  return `${name}: off`
}

// ── Session helpers ─────────────────────────────────────────────────

function resolveSessionId(
  idOrName: string | undefined,
  ctx: SlashContext,
): string | null {
  if (!idOrName) return ctx.sessionId
  if (idOrName.length === 36) return idOrName
  const q = idOrName.toLowerCase()
  const all = [...ctx.sessions, ...(ctx.archivedSessions ?? [])]
  const match = all.find(
    (s) => s.id.startsWith(q) || (s.name || '').toLowerCase() === q,
  )
  return match?.id ?? idOrName
}

function navigatePanel(ctx: SlashContext, target: string, extraPath = ''): string | null {
  const route = PANEL_ROUTES[target]
  if (route) {
    ctx.navigate(extraPath ? `${route}${extraPath}` : route)
    return null
  }
  return `I don't know how to open "${target}" yet. Try /open Cookbook, Settings, Notes, Tasks, Library, Gallery, Research, or Compare.`
}

// ── Command handlers ────────────────────────────────────────────────

async function handleChatsSub(
  sub: string,
  args: string[],
  ctx: SlashContext,
): Promise<string> {
  switch (sub) {
    case 'new': {
      const name = args.join(' ') || undefined
      if (ctx.activePending) {
        try {
          const result = await createSession(ctx.activePending, name)
          ctx.invalidateSessions()
          ctx.selectSession(result.id)
          return `New session — ${result.name}`
        } catch (e) {
          return `Failed to create session: ${e instanceof Error ? e.message : 'error'}`
        }
      }
      ctx.startNewChat()
      return name ? `Started new chat (${name})` : 'Started new chat'
    }
    case 'delete': {
      const raw = args.join(' ').trim()
      const force = /-(rf|fr)\b/.test(raw)
      const clean = raw.replace(/\s*-(rf|fr)\b\s*/, '').trim()
      if (clean === 'all' || (force && !clean)) {
        const targets = force
          ? ctx.sessions.filter((s) => !s.archived)
          : ctx.sessions.filter((s) => !s.archived && !s.is_important)
        if (!targets.length) return 'Nothing to delete'
        let deleted = 0
        for (const s of targets) {
          try {
            await deleteSession(s.id)
            deleted++
          } catch {
            /* continue */
          }
        }
        ctx.invalidateSessions()
        return `Deleted ${deleted} session${deleted !== 1 ? 's' : ''}`
      }
      const target = resolveSessionId(clean, ctx)
      if (!target) return 'No session to delete'
      const sess = ctx.sessions.find((s) => s.id === target)
      if (sess?.is_important) {
        return 'Cannot delete a starred session — unstar it first, or use `/chats delete all` with force.'
      }
      ctx.deleteSession(target)
      return `Deleted "${sess?.name ?? target.slice(0, 8)}"`
    }
    case 'archive': {
      const target = resolveSessionId(args[0], ctx)
      if (!target) return 'No session to archive'
      ctx.archiveSession(target)
      const sess = ctx.sessions.find((s) => s.id === target)
      return `Archived "${sess?.name ?? target.slice(0, 8)}"`
    }
    case 'rename': {
      const newName = args.join(' ')
      if (!newName) return 'Usage: /chats rename New Name'
      if (!ctx.sessionId) return 'No active session'
      ctx.renameSession(ctx.sessionId, newName)
      return `Renamed to "${newName}"`
    }
    case 'favorite': {
      if (!ctx.sessionId) return 'No active session'
      ctx.toggleImportant(ctx.sessionId, true)
      return 'Session marked as favorite'
    }
    case 'unfavorite': {
      if (!ctx.sessionId) return 'No active session'
      ctx.toggleImportant(ctx.sessionId, false)
      return 'Session unfavorited'
    }
    case 'fork': {
      if (!ctx.sessionId) return 'No active session'
      const keep = parseInt(args[0], 10) || 0
      const newId = await ctx.forkSession(keep)
      if (newId) {
        ctx.selectSession(newId)
        return `Forked session (kept ${keep || 'all'} messages)`
      }
      return 'Fork failed'
    }
    case 'truncate': {
      if (!ctx.sessionId) return 'No active session'
      const keep = parseInt(args[0], 10)
      if (!keep || keep < 1) return 'Usage: /chats truncate N — keeps the last N messages'
      await ctx.truncateSession(keep)
      return `Truncated to ${keep} messages`
    }
    case 'switch': {
      const query = args.join(' ').toLowerCase()
      if (!query) return 'Usage: /chats switch <name or id>'
      const match = ctx.sessions.find(
        (s) =>
          !s.archived &&
          (s.id.startsWith(query) || (s.name || '').toLowerCase().includes(query)),
      )
      if (match) {
        ctx.selectSession(match.id)
        return `Switched to "${match.name}"`
      }
      return `No session matching "${query}"`
    }
    case 'sort': {
      try {
        const data = await api.post<{
          status?: string
          reason?: string
          updated?: number
          folders?: string[]
          deleted_empty?: number
        }>('/api/sessions/auto-sort')
        ctx.invalidateSessions()
        if (data.status === 'skipped') {
          return `Auto-sort skipped: ${data.reason ?? 'No sessions to sort'}`
        }
        const delMsg = data.deleted_empty ? ` (${data.deleted_empty} empty deleted)` : ''
        return `Sorted ${data.updated ?? 0} sessions into ${data.folders?.length ?? 0} folders${delMsg}`
      } catch (e) {
        return `Auto-sort failed: ${e instanceof Error ? e.message : 'error'}`
      }
    }
    case 'info': {
      const s = ctx.currentSession
      if (!s) return 'No active session'
      return [
        `Session: ${s.name || 'Untitled'}`,
        `ID:      ${s.id}`,
        `Model:   ${s.model ?? '?'}`,
        `Folder:  ${s.folder ?? '(none)'}`,
        `Messages: ${s.message_count ?? '?'}`,
        `Created: ${s.created_at ?? '?'}`,
      ].join('\n')
    }
    case 'clear':
      ctx.clearMessages()
      return 'Chat display cleared'
    case 'export': {
      if (!ctx.sessionId) return 'No active session'
      const raw = args.join(' ').trim()
      let fmt = 'md'
      const redir = raw.match(/^>\s*(.+)/)
      if (redir) {
        const ext = redir[1].trim().split('.').pop()?.toLowerCase()
        if (ext && ['json', 'txt', 'html', 'md'].includes(ext)) fmt = ext
      } else if (raw && ['json', 'txt', 'html', 'md'].includes(raw.toLowerCase())) {
        fmt = raw.toLowerCase()
      }
      if (typeof window !== 'undefined') {
        window.open(`/api/session/${ctx.sessionId}/export?fmt=${fmt}`, '_blank')
      }
      return `Exporting as .${fmt}...`
    }
    default:
      return `Unknown subcommand. Try /chats info or /help`
  }
}

async function handleToggleSub(
  sub: string,
  args: string[],
  ctx: SlashContext,
): Promise<string> {
  if (sub === '_show') {
    const name = (args[0] || '').toLowerCase() as RuntimeToggle
    const val = (args[1] || '').toLowerCase()
    const known: RuntimeToggle[] = ['web', 'bash', 'rag', 'incognito', 'research', 'plan']
    if (name && known.includes(name)) {
      return applyToggleValue(ctx, name, val)
    }
    return formatToggleStatus(ctx.getRag, ctx.getIncognito)
  }
  const val = (args[0] || '').toLowerCase()
  const map: Record<string, RuntimeToggle> = {
    web: 'web',
    bash: 'bash',
    rag: 'rag',
    incognito: 'incognito',
    research: 'research',
    plan: 'plan',
  }
  const toggleName = map[sub]
  if (!toggleName) return formatToggleStatus(ctx.getRag, ctx.getIncognito)
  return applyToggleValue(ctx, toggleName, val)
}

async function handleMemorySub(sub: string, args: string[]): Promise<string> {
  switch (sub) {
    case 'list': {
      const mems = await fetchMemories()
      if (!mems.length) return 'No memories stored'
      const lines = mems.slice(0, 40).map(
        (m) => `[${m.category || 'fact'}] ${m.id.slice(0, 8)} — ${m.text}`,
      )
      if (mems.length > 40) lines.push(`... and ${mems.length - 40} more`)
      return lines.join('\n')
    }
    case 'add': {
      const text = args.join(' ')
      if (!text) return 'Usage: /memory add Your text here'
      await addMemory(text)
      return `Memory added: ${text}`
    }
    case 'delete': {
      const raw = args.join(' ').trim()
      const force = /-(rf|fr)\b/.test(raw)
      const clean = raw.replace(/\s*-(rf|fr)\b\s*/, '').trim()
      if (clean === 'all' || (force && !clean)) {
        const mems = await fetchMemories()
        if (!mems.length) return 'No memories to delete'
        if (!force) {
          return `This will delete all ${mems.length} memories. Use /memory delete -rf to confirm.`
        }
        let deleted = 0
        for (const m of mems) {
          try {
            await deleteMemory(m.id)
            deleted++
          } catch {
            /* continue */
          }
        }
        return `Deleted ${deleted}/${mems.length} memories`
      }
      let memId = clean
      if (!memId) return 'Usage: /memory delete <id>'
      if (memId.length < 36) {
        const mems = await fetchMemories()
        const match = mems.find((m) => m.id.startsWith(memId))
        if (match) memId = match.id
      }
      await deleteMemory(memId)
      return 'Memory deleted'
    }
    case 'search': {
      const query = args.join(' ')
      if (!query) return 'Usage: /memory search query'
      const mems = await searchMemories(query)
      if (!mems.length) return `No memories matching "${query}"`
      return mems.map((m) => `[${m.category || 'fact'}] ${m.text}`).join('\n')
    }
    default:
      return 'Unknown memory subcommand. Try /memory list'
  }
}

async function handleSetup(args: string[], ctx: SlashContext): Promise<string> {
  if (!args.length) {
    return [
      '**Setup** — add a model endpoint:',
      '',
      '- `/setup local http://localhost:11434/v1` — Ollama / local server',
      '- `/setup groq gsk_...` — Groq API key',
      '- `/setup openai sk-proj-...` — OpenAI',
      '- `/setup endpoint` — open Settings → Models',
      '',
      'Providers: deepseek, openai, anthropic, openrouter, groq, gemini, xai, ollama, copilot',
    ].join('\n')
  }

  const providerKey = args[0].toLowerCase()

  if (providerKey === 'endpoint') {
    ctx.navigate('/settings?tab=ai')
    return 'Opening Settings → Models. Add an endpoint or paste an API key there.'
  }

  if (providerKey === 'copilot') {
    ctx.navigate('/settings?tab=integrations')
    return 'Opening Settings → Integrations to configure GitHub Copilot.'
  }

  if (providerKey === 'local') {
    const url = args.slice(1).join(' ').trim()
    if (!url) return 'Usage: /setup local http://localhost:11434/v1'
    try {
      const data = await createModelEndpoint({ base_url: url, skip_probe: false })
      const count = data.models?.length ?? 0
      ctx.invalidateSessions()
      return count > 0
        ? `Connected local endpoint — found ${count} model${count !== 1 ? 's' : ''}.`
        : 'Endpoint saved, but no models were found. Check the URL and service status.'
    } catch (e) {
      return `Setup failed: ${e instanceof Error ? e.message : 'error'}`
    }
  }

  const provider = SETUP_PROVIDERS[providerKey]
  if (provider) {
    const key = args.slice(1).join(' ').trim()
    if (!key) {
      return `Paste your ${provider.name} API key, or run \`/setup ${providerKey} <api-key>\` in one step.`
    }
    try {
      const data = await createModelEndpoint({
        base_url: provider.url,
        api_key: key,
        name: provider.name,
        skip_probe: true,
      })
      const count = data.models?.length ?? 0
      ctx.invalidateSessions()
      return count > 0
        ? `${provider.name} connected — ${count} model${count !== 1 ? 's' : ''} found.`
        : `${provider.name} endpoint saved. Open Settings to verify models.`
    } catch (e) {
      return `Setup failed: ${e instanceof Error ? e.message : 'error'}`
    }
  }

  return "I didn't understand that. Try `/setup` to see options."
}

async function handleWorkspace(args: string[], ctx: SlashContext): Promise<SlashHandleResult> {
  const sub = (args[0] || '').toLowerCase()
  const rest = args.slice(1).join(' ').trim()
  const getWs = ctx.getWorkspace ?? getWorkspaceFolder
  const setWs = ctx.setWorkspace ?? setWorkspaceFolder
  const clearWs = ctx.clearWorkspace ?? clearWorkspaceFolder

  if (!sub || sub === 'show' || sub === 'status' || sub === 'info') {
    const cur = getWs()
    return {
      handled: true,
      reply: cur
        ? `Workspace: \`${cur}\``
        : 'No workspace set. `/workspace pick` or `/workspace set /path`.',
      hideUserBubble: true,
    }
  }
  if (sub === 'set' || sub === 'cd' || sub === 'use') {
    if (!rest) return { handled: true, reply: 'Usage: `/workspace set /absolute/path`' }
    setWs(rest)
    return { handled: true, reply: `Workspace set: \`${rest}\``, typewriter: true, hideUserBubble: true }
  }
  if (sub === 'clear' || sub === 'off' || sub === 'none' || sub === 'unset') {
    clearWs()
    return { handled: true, reply: 'Workspace cleared.', typewriter: true, hideUserBubble: true }
  }
  if (sub === 'pick' || sub === 'browse' || sub === 'open') {
    if (ctx.openWorkspacePicker) ctx.openWorkspacePicker()
    else dispatchWorkspacePicker()
    return { handled: true, openWorkspacePicker: true, hideUserBubble: true }
  }
  return {
    handled: true,
    reply: 'Usage: `/workspace` · `set /path` · `clear` · `pick`',
    hideUserBubble: true,
  }
}

async function handleRagSub(sub: string, args: string[]): Promise<string> {
  switch (sub) {
    case 'list': {
      const data = await fetchPersonalDocs()
      const lines: string[] = []
      if (data.directories?.length) {
        lines.push('**Directories:**')
        for (const d of data.directories) {
          lines.push(`  ${typeof d === 'string' ? d : String(d)}`)
        }
      }
      if (data.files?.length) {
        lines.push(`**Files (${data.files.length}):**`)
        for (const f of data.files.slice(0, 30)) {
          lines.push(`  ${f.name || f.path || String(f)}`)
        }
        if (data.files.length > 30) lines.push(`  ... and ${data.files.length - 30} more`)
      }
      return lines.join('\n') || 'No files or directories indexed'
    }
    case 'add': {
      const dir = args.join(' ').trim()
      if (!dir) return 'Usage: `/rag add /path/to/directory`'
      const data = await addPersonalDirectory(dir)
      return `Indexed "${dir}" (${data.indexed_count ?? 0} files)`
    }
    case 'remove': {
      const raw = args.join(' ').trim()
      const force = /-(rf|fr)\b/.test(raw)
      const clean = raw.replace(/\s*-(rf|fr)\b\s*/, '').trim()
      if (clean === 'all' || (force && !clean)) {
        const data = await fetchPersonalDocs()
        const dirs = data.directories ?? []
        if (!dirs.length) return 'No RAG directories to remove'
        if (!force) {
          return `This will remove all ${dirs.length} directories from RAG. Use \`/rag rm -rf\` to confirm.`
        }
        let removed = 0
        for (const d of dirs) {
          const path = typeof d === 'string' ? d : String(d)
          try {
            await removePersonalDirectory(path)
            removed++
          } catch {
            /* continue */
          }
        }
        return `Removed ${removed}/${dirs.length} directories from RAG`
      }
      const dir = clean
      if (!dir) return 'Usage: `/rag remove /path` or `/rag rm -rf` to remove all'
      await removePersonalDirectory(dir)
      return `Removed "${dir}" from RAG`
    }
    default:
      return 'Unknown RAG subcommand. Try `/rag list`'
  }
}

async function handleTheme(args: string[], ctx: SlashContext): Promise<string> {
  const sub = (args[0] || '').toLowerCase()
  const custom = readCustomThemes()
  const customNames = Object.keys(custom)
  const presetNames = Object.keys(THEME_PRESETS)

  if (!sub) {
    const customLabel = customNames.length ? `\nCustom: ${customNames.join(', ')}` : ''
    return [
      '**Theme**',
      '',
      '- `/theme <name>` — apply a preset or custom theme',
      '- `/theme save <name>` — save current colors as custom',
      '- `/theme delete <name>` — delete a custom theme',
      '',
      `Presets: ${presetNames.join(', ')}${customLabel}`,
    ].join('\n')
  }

  if (sub === 'save' && args[1]) {
    const saveName = args[1].toLowerCase().replace(/\s+/g, '-')
    if (THEME_PRESETS[saveName]) return 'Cannot overwrite a built-in theme.'
    const colors = ctx.getThemeColors?.() ?? THEME_PRESETS.dark
    ctx.saveCustomTheme?.(saveName, colors)
    return `Custom theme "${saveName}" saved`
  }

  if (sub === 'delete' || sub === 'del' || sub === 'rm' || sub === 'remove') {
    if (!args[1]) return 'Usage: `/theme delete <name>` or `/theme delete all`'
    const delArg = args[1].toLowerCase().replace(/\s+/g, '-')
    if (delArg === 'all') {
      if (!customNames.length) return 'No custom themes to delete'
      for (const n of customNames) ctx.deleteCustomTheme?.(n)
      return `Deleted ${customNames.length} custom theme${customNames.length !== 1 ? 's' : ''}`
    }
    ctx.deleteCustomTheme?.(delArg)
    return `Theme "${delArg}" deleted`
  }

  const name = sub
  if (!THEME_PRESETS[name] && !custom[name]) {
    const customLabel = customNames.length ? ` | Custom: ${customNames.join(', ')}` : ''
    return `Unknown theme "${name}". Available: ${presetNames.join(', ')}${customLabel}`
  }
  ctx.applyTheme?.(name)
  return `Theme: ${name}`
}

function formatKeyCombo(combo: string): string {
  return combo
    .split('+')
    .map((p) => {
      if (p === 'ctrl') return 'Ctrl'
      if (p === 'alt') return 'Alt'
      if (p === 'shift') return 'Shift'
      if (p === 'escape') return 'Esc'
      return p.charAt(0).toUpperCase() + p.slice(1)
    })
    .join('+')
}

async function handleShortcuts(): Promise<string> {
  let keybinds: Record<string, string> = {
    search: 'ctrl+k',
    toggle_sidebar: 'ctrl+b',
    new_session: 'ctrl+alt+n',
    star_session: 'ctrl+alt+s',
    delete_session: 'ctrl+alt+d',
    admin_panel: 'ctrl+shift+u',
    cancel: 'escape',
  }
  try {
    const settings = await api.get<{ keybinds?: Record<string, string> }>('/api/auth/settings')
    if (settings.keybinds) keybinds = { ...keybinds, ...settings.keybinds }
  } catch {
    /* use defaults */
  }
  const w = typeof window !== 'undefined' ? (window as Window & { _odysseusKeybinds?: Record<string, string> }) : null
  if (w?._odysseusKeybinds) keybinds = { ...keybinds, ...w._odysseusKeybinds }

  const entries: [string, string][] = [
    [formatKeyCombo(keybinds.search), 'Search conversations'],
    [formatKeyCombo(keybinds.toggle_sidebar), 'Toggle sidebar'],
    [formatKeyCombo(keybinds.new_session), 'New chat'],
    [formatKeyCombo(keybinds.star_session), 'Star session'],
    [formatKeyCombo(keybinds.delete_session), 'Delete session'],
    [formatKeyCombo(keybinds.admin_panel), 'Admin panel'],
    [formatKeyCombo(keybinds.cancel), 'Cancel stream'],
  ]
  return ['**Keyboard shortcuts**', '', ...entries.map(([k, d]) => `${k.padEnd(16)}${d}`)].join('\n')
}

async function handleFind(args: string[]): Promise<string> {
  const query = args.join(' ').trim()
  if (!query) return 'Usage: `/find <query>`'
  const results = await searchMessages(query, 20)
  if (!results.length) return `No results for "${query}"`
  return results
    .slice(0, 20)
    .map((r) => {
      const name = r.session_name || 'Untitled'
      const snippet = (r.content_snippet || '').slice(0, 100)
      const sid = r.session_id || ''
      return `${name}${sid ? ` (${sid.slice(0, 8)})` : ''}  ${snippet}`
    })
    .join('\n')
}

async function handleStats(): Promise<string> {
  const d = await api.get<{
    sessions?: number
    messages?: number
    memories?: number
    documents?: number
    uploads?: number
  }>('/api/db/stats')
  return [
    `Sessions:  ${d.sessions ?? '?'}`,
    `Messages:  ${d.messages ?? '?'}`,
    `Memories:  ${d.memories ?? '?'}`,
    `Documents: ${d.documents ?? '?'}`,
    `Uploads:   ${d.uploads ?? '?'}`,
  ].join('\n')
}

async function handleCompact(ctx: SlashContext): Promise<string> {
  if (!ctx.sessionId) return 'No active chat to compact'
  const data = await api.post<{ summarized?: number; kept?: number }>(
    `/api/session/${encodeURIComponent(ctx.sessionId)}/compact`,
  )
  if (ctx.reloadSession) await ctx.reloadSession()
  return `Conversation compacted. Summarized ${data.summarized ?? 0} older messages, kept ${data.kept ?? 0} recent messages.`
}

async function handleShell(args: string[]): Promise<string> {
  const cmd = args.join(' ').trim()
  if (!cmd) return 'Usage: `/sh command`'
  try {
    const data = await execShell(cmd)
    let out = ''
    if (data.stdout) out += data.stdout
    if (data.stderr) out += (out ? '\n' : '') + data.stderr
    if (!out) out = '(no output)'
    const code = data.exit_code != null ? data.exit_code : '?'
    return `$ ${cmd}\n${out}\n[exit ${code}]`
  } catch (e) {
    return `$ ${cmd}\nError: ${e instanceof Error ? e.message : 'error'}`
  }
}

async function handlePing(): Promise<string> {
  const data = await api.get<{
    endpoints?: {
      name: string
      status?: string
      latency_ms?: number | null
      model_count?: number
      error?: string | null
    }[]
  }>('/api/ping')
  const eps = data.endpoints ?? []
  if (!eps.length) return 'No endpoints configured.'
  const lines = eps.map((ep) => {
    const isUp = ep.status === 'online'
    const dot = isUp ? '●' : '○'
    const latency = ep.latency_ms != null ? `${ep.latency_ms}ms` : '--'
    const models = ep.model_count ?? 0
    const err = ep.error ? ` (${ep.error.slice(0, 60)})` : ''
    return `${dot} ${ep.name.padEnd(20)} ${latency.padStart(8)}  ${models} model${models !== 1 ? 's' : ''}${err}`
  })
  return ['**Endpoint ping**', '', ...lines].join('\n')
}

async function handleProbe(args: string[]): Promise<string> {
  const query = args.join(' ').trim()
  let url = '/api/probe'
  if (query) {
    const eps = await fetchModelEndpoints()
    const match = eps.find(
      (e) =>
        e.name.toLowerCase() === query.toLowerCase() ||
        e.name.toLowerCase().includes(query.toLowerCase()),
    )
    if (!match) {
      return `No endpoint matching "${query}". Run \`/ping\` to see endpoints.`
    }
    url += `?endpoint_id=${encodeURIComponent(match.id)}`
  }

  const res = await fetch(url, { credentials: 'include' })
  if (!res.ok) return `Probe failed (${res.status})`
  const reader = res.body?.getReader()
  if (!reader) return 'Probe failed: no response stream'

  const lines: string[] = ['**Model probe**', '']
  let ok = 0
  let total = 0
  const decoder = new TextDecoder()
  let buffer = ''

  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    buffer += decoder.decode(value, { stream: true })
    const chunks = buffer.split('\n')
    buffer = chunks.pop() ?? ''
    for (const line of chunks) {
      if (!line.startsWith('data: ')) continue
      try {
        const data = JSON.parse(line.slice(6)) as {
          type?: string
          endpoint?: string
          model?: string
          status?: string
          error?: string
        }
        if (data.type === 'probe_start' && data.endpoint) {
          lines.push(`**${data.endpoint}**`)
        }
        if (data.type === 'probe_result' && data.model) {
          total++
          const good = data.status === 'ok'
          if (good) ok++
          const mark = good ? '✓' : '✗'
          const err = data.error ? ` — ${data.error.slice(0, 80)}` : ''
          lines.push(`  ${mark} ${data.model}${err}`)
        }
      } catch {
        /* ignore malformed SSE */
      }
    }
  }

  lines.push('', `**${ok}/${total}** models responded`)
  return lines.join('\n')
}

async function runCommand(
  cmdKey: string,
  args: string[],
  ctx: SlashContext,
): Promise<SlashHandleResult> {
  const def = COMMANDS[cmdKey]
  if (!def) return { handled: false }

  if (def.subs) {
    const subArg = (args[0] || '').toLowerCase()
    const subKey = subArg ? resolveSubcommand(def, subArg) : null
    if (subKey) {
      const subArgs = args.slice(1)
      if (cmdKey === 'chats') {
        return { handled: true, reply: await handleChatsSub(subKey, subArgs, ctx) }
      }
      if (cmdKey === 'toggle') {
        return { handled: true, reply: await handleToggleSub(subKey, subArgs, ctx) }
      }
      if (cmdKey === 'memory') {
        return { handled: true, reply: await handleMemorySub(subKey, subArgs) }
      }
      if (cmdKey === 'rag') {
        return { handled: true, reply: await handleRagSub(subKey, subArgs), typewriter: subKey === 'add' || subKey === 'remove' }
      }
      if (cmdKey === 'setup') {
        return { handled: true, reply: await handleSetup([subKey, ...subArgs], ctx) }
      }
    }
    if (def.default) {
      const defSub = def.default
      if (cmdKey === 'chats') {
        return { handled: true, reply: await handleChatsSub(defSub, args, ctx) }
      }
      if (cmdKey === 'toggle') {
        return { handled: true, reply: await handleToggleSub(defSub, args, ctx) }
      }
      if (cmdKey === 'memory') {
        return { handled: true, reply: await handleMemorySub(defSub, args) }
      }
      if (cmdKey === 'rag') {
        return { handled: true, reply: await handleRagSub(defSub, args) }
      }
    }
    return { handled: true, reply: `Unknown subcommand. Try /${cmdKey} --help or /help` }
  }

  switch (cmdKey) {
    case 'help':
    case 'skills':
      return {
        handled: true,
        reply: cmdKey === 'skills' ? formatSkillsList(ctx.skills) : formatHelpText(),
      }
    case 'plan': {
      const val = (args[0] || '').toLowerCase()
      const explicit = val === 'on' ? true : val === 'off' ? false : undefined
      const target = explicit ?? !isPlanEnabled()
      if (ctx.setPlan) ctx.setPlan(target)
      else toggleNamedFeature('plan', explicit)
      return { handled: true, reply: `Plan mode: ${target ? 'on' : 'off'}` }
    }
    case 'note': {
      const text = args.join(' ')
      if (!text) return { handled: true, reply: 'Usage: /note Your note here' }
      await createNote({ title: text, content: '', note_type: 'note' })
      return { handled: true, reply: `Note added: ${text}` }
    }
    case 'todo': {
      const sub = (args[0] || '').toLowerCase()
      if (sub === 'list' || sub === 'ls') {
        const notes = await fetchNotes()
        const items = notes.filter((n) => !n.archived).slice(0, 30)
        if (!items.length) return { handled: true, reply: 'No todos' }
        return {
          handled: true,
          reply: items.map((n) => `• ${(n.title || n.content || '').slice(0, 80)}`).join('\n'),
        }
      }
      const rest = (sub === 'add' ? args.slice(1) : args).join(' ').trim()
      if (!rest) return { handled: true, reply: 'Usage: /todo Your task  ·  /todo list' }
      await createNote({ title: rest, note_type: 'note', label: 'todo' })
      return { handled: true, reply: `Todo added: ${rest}` }
    }
    case 'event': {
      const raw = args.join(' ').trim()
      if (!raw) {
        return {
          handled: true,
          reply:
            'Usage: /event tomorrow 14:00 Title  ·  /event in 30m Title  ·  /event 2026-04-20 15:00 Title',
        }
      }
      const parsed = parseTimeSpec(raw)
      if (!parsed?.rest) {
        return { handled: true, reply: `Could not parse time from: ${raw}` }
      }
      const start = parsed.date
      const end = new Date(start.getTime() + 60 * 60 * 1000)
      await createEvent({
        summary: parsed.rest,
        dtstart: toLocalIso(start),
        dtend: toLocalIso(end),
      })
      return { handled: true, reply: `Event created: ${parsed.rest} at ${toLocalIso(start)}` }
    }
    case 'setup':
      return { handled: true, reply: await handleSetup(args, ctx) }
    case 'settings': {
      const tab = SETTINGS_TAB_ALIASES[(args[0] || '').toLowerCase()] ?? args[0]
      ctx.navigate(tab ? `/settings?tab=${tab}` : '/settings')
      return { handled: true, reply: 'Opening Settings…', hideUserBubble: true }
    }
    case 'open': {
      const target = (args[0] || '').trim().toLowerCase()
      if (!target) {
        return {
          handled: true,
          reply:
            'Open what? Try /open Cookbook, /open Settings, /open Gallery, /open Notes, /open Tasks, /open Library, /open Research, or /open Compare.',
        }
      }
      if (target === 'cookbook' || target === 'cook') {
        const serveQuery = args[1]?.toLowerCase() === 'serve' ? args.slice(2).join(' ') : ''
        ctx.navigate(serveQuery ? `/cookbook?serve=${encodeURIComponent(serveQuery)}` : '/cookbook')
        return { handled: true, reply: 'Opening Cookbook…', hideUserBubble: true }
      }
      const err = navigatePanel(ctx, target)
      return {
        handled: true,
        reply: err ?? `Opening ${target}…`,
        hideUserBubble: !err,
      }
    }
    case 'cookbook':
    case 'email':
    case 'notes':
    case 'tasks':
    case 'brain':
    case 'library':
    case 'gallery':
    case 'research':
    case 'compare': {
      const err = navigatePanel(ctx, cmdKey)
      return {
        handled: true,
        reply: err ?? `Opening ${cmdKey}…`,
        hideUserBubble: !err,
      }
    }
    case 'models': {
      try {
        const data = await api.get<{ items?: { endpoint_name?: string; url: string; models?: string[] }[] }>(
          '/api/models',
        )
        const lines: string[] = []
        for (const ep of data.items ?? []) {
          lines.push(ep.endpoint_name || ep.url)
          for (const m of ep.models ?? []) lines.push(`  ${m}`)
        }
        return { handled: true, reply: lines.join('\n') || 'No models found' }
      } catch (e) {
        return { handled: true, reply: `Failed to fetch models: ${e instanceof Error ? e.message : 'error'}` }
      }
    }
    case 'workspace':
      return handleWorkspace(args, ctx)
    case 'demo': {
      ctx.navigate('/chat')
      startDemoTour(ctx.navigate)
      return {
        handled: true,
        reply: 'Starting the guided tour — follow the tooltips. Click **Skip** anytime.',
        hideUserBubble: true,
      }
    }
    case 'prompt':
      return { handled: true, prefillComposer: pickStarterPrompt(), hideUserBubble: true }
    case 'theme':
      return { handled: true, reply: await handleTheme(args, ctx), typewriter: Boolean(args[0]) }
    case 'search': {
      const query = args.join(' ').trim()
      if (!query) return { handled: true, reply: 'Usage: `/search <query>`' }
      return { handled: true, sendToModel: true, message: query, enableWeb: true }
    }
    case 'find':
      return { handled: true, reply: await handleFind(args) }
    case 'stats':
      return { handled: true, reply: await handleStats() }
    case 'compact':
      try {
        return { handled: true, reply: await handleCompact(ctx) }
      } catch (e) {
        return { handled: true, reply: e instanceof Error ? e.message : 'Compaction failed' }
      }
    case 'sh':
      return { handled: true, reply: await handleShell(args) }
    case 'shortcuts':
      return { handled: true, reply: await handleShortcuts() }
    case 'ping':
      try {
        return { handled: true, reply: await handlePing() }
      } catch (e) {
        return { handled: true, reply: `Failed to ping: ${e instanceof Error ? e.message : 'error'}` }
      }
    case 'probe':
      try {
        return { handled: true, reply: await handleProbe(args) }
      } catch (e) {
        return { handled: true, reply: `Probe failed: ${e instanceof Error ? e.message : 'error'}` }
      }
    case 'flip':
      return { handled: true, reply: handleFlip() }
    case 'roll':
      return { handled: true, reply: handleRoll(args) }
    case '8ball':
      return { handled: true, reply: handle8Ball(args) }
    case 'fortune':
      return { handled: true, reply: handleFortune() }
    case 'odyssey':
      return { handled: true, reply: handleOdyssey() }
    case 'ascii':
      return { handled: true, reply: handleAscii(args) }
    case 'matrix':
      return { handled: true, reply: handleMatrix(), typewriter: true, hideUserBubble: true }
    case 'cowsay':
      return { handled: true, reply: handleCowsay(args) }
    case 'wisdom':
      return { handled: true, reply: handleWisdom() }
    case 'uptime':
      return { handled: true, reply: handleUptime() }
    case 'color':
      return { handled: true, reply: handleColor(args) }
    default:
      return { handled: false }
  }
}

// ── Main dispatcher ─────────────────────────────────────────────────

export async function handleSlashCommand(
  text: string,
  ctx: SlashContext,
): Promise<SlashHandleResult> {
  const parsed = parseSlashInput(text)
  if (!parsed) return { handled: false }

  const { command: rawCmd, argList: args } = parsed
  const wantsHelp = args.includes('--help') || args.includes('-h')

  let cmdKey = resolveCommand(rawCmd)
  let cmdDef = cmdKey ? COMMANDS[cmdKey] : null

  if (!cmdDef && LEGACY_ALIASES[rawCmd]) {
    const leg = LEGACY_ALIASES[rawCmd]
    cmdDef = COMMANDS[leg.parent]
    cmdKey = leg.parent
    if (wantsHelp && cmdDef?.subs?.[leg.sub]) {
      const sDef = cmdDef.subs[leg.sub]
      return {
        handled: true,
        reply: `${sDef.usage ?? `/${leg.parent} ${leg.sub}`}\n${sDef.help}`,
      }
    }
    if (cmdKey === 'chats') {
      return { handled: true, reply: await handleChatsSub(leg.sub, args, ctx) }
    }
    if (cmdKey === 'toggle') {
      return { handled: true, reply: await handleToggleSub(leg.sub, args, ctx) }
    }
    if (cmdKey === 'memory') {
      return { handled: true, reply: await handleMemorySub(leg.sub, args) }
    }
  }

  if (cmdDef && cmdKey) {
    if (wantsHelp) {
      if (cmdDef.subs && !args.filter((a) => a !== '--help' && a !== '-h').length) {
        const lines = [`${cmdDef.help ?? cmdKey}`, '']
        for (const [sub, sDef] of Object.entries(cmdDef.subs)) {
          if (sub.startsWith('_')) continue
          lines.push(`  ${(sDef.usage ?? `/${cmdKey} ${sub}`).padEnd(26)}${sDef.help}`)
        }
        return { handled: true, reply: lines.join('\n') }
      }
      return {
        handled: true,
        reply: `${cmdDef.usage ?? `/${cmdKey}`}\n${cmdDef.help ?? 'No help available.'}`,
      }
    }
    const result = await runCommand(cmdKey, args, ctx)
    if (result.handled) return result
  }

  const skill = ctx.skills.find((s) => s.name.toLowerCase() === rawCmd)
  if (skill) {
    return {
      handled: true,
      sendToModel: true,
      message: `/${skill.name}${args.length ? ` ${args.join(' ')}` : ''}`,
    }
  }

  const suggestions = fuzzyMatchCommand(rawCmd)
  if (suggestions.length) {
    return {
      handled: true,
      reply: `Unknown command "/${rawCmd}". Did you mean: ${suggestions.map((s) => `/${s}`).join(', ')}?`,
    }
  }

  return { handled: false }
}

export function helpText(): string {
  return formatHelpText()
}

export function countRegisteredCommands(): number {
  return Object.keys(COMMANDS).length
}

export function countLegacyCommands(): number {
  return Object.keys(COMMANDS).length
}
