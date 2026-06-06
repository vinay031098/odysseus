/** Escape a CLI flag for use inside a RegExp. */
function escapeFlag(flag: string): string {
  return flag.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

/** Append a flag token if not already present in the command. */
export function appendServeFlag(cmd: string, flag: string): string {
  const trimmed = cmd.trim()
  if (!flag || trimmed.includes(flag)) return trimmed
  return `${trimmed} ${flag}`.replace(/\s{2,}/g, ' ').trim()
}

/** Replace `--flag value` or append if missing. */
export function replaceServeFlag(cmd: string, flag: string, value: string): string {
  if (!flag) return cmd
  const re = new RegExp(`${escapeFlag(flag)}\\s+\\S+`)
  const replacement = `${flag} ${value}`
  if (re.test(cmd)) return cmd.replace(re, replacement)
  return `${cmd.trim()} ${replacement}`.replace(/\s{2,}/g, ' ').trim()
}

/** Remove `--flag value` from a serve command. */
export function removeServeFlag(cmd: string, flag: string): string {
  if (!flag) return cmd.trim()
  const re = new RegExp(`${escapeFlag(flag)}\\s+\\S+`)
  return cmd.replace(re, '').replace(/\s{2,}/g, ' ').trim()
}

/** Prepend an env var assignment (e.g. VLLM_USE_FLASHINFER_SAMPLER=0). */
export function prependServeEnv(cmd: string, env: string): string {
  const prefix = env.trimEnd()
  if (!prefix) return cmd.trim()
  if (cmd.includes(prefix)) return cmd.trim()
  const gap = prefix.endsWith(' ') ? '' : ' '
  return `${prefix}${gap}${cmd.trim()}`.replace(/\s{2,}/g, ' ').trim()
}

export function mutateServeCommand(
  cmd: string,
  op: 'append' | 'replace' | 'remove' | 'prepend',
  flag: string,
  value?: string,
): string {
  switch (op) {
    case 'append':
      return appendServeFlag(cmd, flag)
    case 'replace':
      return replaceServeFlag(cmd, flag, value ?? '')
    case 'remove':
      return removeServeFlag(cmd, flag)
    case 'prepend':
      return prependServeEnv(cmd, flag)
    default:
      return cmd
  }
}
