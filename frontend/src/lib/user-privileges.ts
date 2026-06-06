export const PRIVILEGE_LABELS: Record<string, string> = {
  can_use_agent: 'Agent mode',
  can_use_browser: 'Browser automation',
  can_use_bash: 'Shell / Python / Files',
  can_use_documents: 'Document editor',
  can_use_research: 'Deep research',
  can_generate_images: 'Image generation',
  can_manage_memory: 'Memory & skills',
}

export const PRIVILEGE_KEYS = Object.keys(PRIVILEGE_LABELS)
