export function stripHfUrl(input: string): string {
  let repo = input.trim()
  repo = repo.replace(/^hf\.co\//, '')
  const hfMatch = repo.match(/^https?:\/\/huggingface\.co\/([^/]+\/[^/?#]+(?::[^/?#\s]+)?)/)
  if (hfMatch) repo = hfMatch[1]
  return repo
}

export function splitRepoTag(raw: string): { repo: string; include: string | null } {
  const m = raw.match(/^([^\s/:]+\/[^\s/:]+):([^\s/]+)$/)
  if (!m) return { repo: raw, include: null }
  return { repo: m[1], include: `*${m[2]}*` }
}

export function parseDownloadInput(input: string): {
  repo: string
  include: string | null
  error?: string
} {
  const raw = stripHfUrl(input)
  if (!raw) return { repo: '', include: null, error: 'Enter a model repo or HuggingFace URL' }
  const { repo, include } = splitRepoTag(raw)
  if (!/^[^\s/]+\/[^\s/]+$/.test(repo)) {
    return {
      repo,
      include,
      error: 'Enter a full HuggingFace repo ID like "org/model-name" (or paste the full HF URL).',
    }
  }
  return { repo, include }
}

export function buildEnvPrefix(
  env: string,
  envPath: string,
  platform?: string,
): string | undefined {
  if (env === 'venv' && envPath) {
    if (platform === 'windows') {
      const p = envPath.endsWith('\\Scripts\\Activate.ps1')
        ? envPath
        : `${envPath}\\Scripts\\Activate.ps1`
      return `& ${p}`
    }
    const p = envPath.endsWith('/bin/activate') ? envPath : `${envPath}/bin/activate`
    return `source ${p}`
  }
  if (env === 'conda' && envPath) {
    if (platform === 'windows') return `conda activate ${envPath}`
    return `eval "$(conda shell.bash hook)" && conda activate ${envPath}`
  }
  return undefined
}

export function ollamaPullCommand(modelName: string): string {
  return `ollama pull ${modelName.split('/').pop()?.toLowerCase() ?? modelName}`
}
