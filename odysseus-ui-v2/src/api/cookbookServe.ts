import { api } from './client'

export interface CookbookGpuProcess {
  pid: number
  name: string
  used_mb: number
}

export interface CookbookGpu {
  index: number
  name: string
  uuid?: string
  free_mb: number
  total_mb: number
  used_mb: number
  util_pct: number
  busy: boolean
  processes: CookbookGpuProcess[]
  backend?: string
  source?: string
  unified_memory?: boolean
  gtt_used_mb?: number
}

export interface CookbookGpusResponse {
  ok: boolean
  gpus: CookbookGpu[]
  backend?: string
  source?: string
  error?: string
  nvidia_error?: string
}

export interface CookbookServer {
  host: string
  name?: string
  port?: string
  platform?: string
  env?: string
  envPath?: string
  modelDirs?: string[]
  modelDir?: string
  downloadDir?: string
}

export interface CookbookEnvState {
  servers?: CookbookServer[]
  remoteHost?: string
  defaultServer?: string
  env?: string
  envPath?: string
  hfToken?: string
  hfTokenConfigured?: boolean
  hfTokenMasked?: string
  gpus?: string
  platform?: string
}

export interface CookbookServePreset {
  /** Short model name (repo basename). */
  name: string
  /** Full HuggingFace repo id. */
  model: string
  /** User-facing label in saved-config menus. */
  label?: string
  /** Launch command (tmux payload). */
  cmd?: string
  /** Remote host; legacy presets may use `host` instead. */
  remoteHost?: string
  host?: string
  port?: string | number
  backend?: string
  envPath?: string
  gpus?: string
  confirmedWorking?: boolean
  fields?: Record<string, string | boolean>
}

export interface CookbookTaskPayload {
  repo_id?: string
  remote_host?: string
  include?: string
  disable_hf_transfer?: boolean
  _cmd?: string
  port?: number
}

export interface CookbookTask {
  id?: string
  sessionId: string
  name: string
  type: 'serve' | 'download' | string
  status: string
  output?: string
  progress?: string
  ts?: number
  payload?: CookbookTaskPayload
  remoteHost?: string
  sshPort?: string
  platform?: string
  /** Serve endpoint was reachable but probe now fails. */
  _unreachable?: boolean
  /** Serve endpoint answered at least once (avoids false alarms during warmup). */
  _everReachable?: boolean
  _lastStatusFlipAt?: number
  _selfHealed?: boolean
}

export interface CookbookState {
  tasks?: CookbookTask[]
  presets?: CookbookServePreset[]
  env?: CookbookEnvState
  serveState?: unknown
}

export interface CookbookTaskLiveStatus {
  session_id: string
  type: string
  model: string
  status: string
  progress?: string
  phase?: string
  diagnosis?: { message?: string } | null
  output_tail?: string
  cmd?: string
  tps?: number
  reqs?: number
  pct?: number
  remote?: string
}

export interface CookbookTasksStatusResponse {
  tasks: CookbookTaskLiveStatus[]
}

export interface CookbookPackage {
  name: string
  pip: string
  desc: string
  category: string
  target: string
  installed: boolean
  kind?: string
  applicable?: boolean
  status_note?: string
  install_hint?: string
  pip_update_available?: boolean
  update_note?: string
}

export interface CookbookPackagesResponse {
  packages: CookbookPackage[]
}

export interface KillPidRequest {
  pid: number
  host?: string | null
  ssh_port?: string | null
  signal?: 'TERM' | 'KILL' | 'INT'
}

export interface KillPidResponse {
  ok: boolean
  pid?: number
  signal?: string
  error?: string
}

export interface SetupRequest {
  host: string
  ssh_port?: string | null
}

export interface SetupResponse {
  ok: boolean
  output?: string
  platform?: string
  error?: string
}

export interface ServeModelRequest {
  repo_id: string
  cmd: string
  remote_host?: string
  ssh_port?: string
  env_prefix?: string
  gpus?: string
  platform?: string
}

export interface ServeModelResponse {
  ok: boolean
  session_id?: string
  error?: string
  detail?: string
}

export interface ShellExecResponse {
  ok?: boolean
  exit_code?: number
  stdout?: string
  stderr?: string
  error?: string
}

export interface CachedModel {
  repo_id: string
  size: string
  status: string
  is_gguf?: boolean
  is_diffusion?: boolean
}

export type GpuQuery = {
  host?: string
  ssh_port?: string
}

function gpuQueryString(query?: GpuQuery): string {
  const params = new URLSearchParams()
  if (query?.host) params.set('host', query.host)
  if (query?.ssh_port) params.set('ssh_port', query.ssh_port)
  const qs = params.toString()
  return qs ? `?${qs}` : ''
}

export function fetchCookbookState() {
  return api.get<CookbookState>('/api/cookbook/state')
}

export function saveCookbookState(state: CookbookState) {
  return api.post<{ ok: boolean; preserved?: number; error?: string }>(
    '/api/cookbook/state',
    state,
  )
}

export function fetchCookbookGpus(query?: GpuQuery) {
  return api.get<CookbookGpusResponse>(`/api/cookbook/gpus${gpuQueryString(query)}`)
}

export function killCookbookPid(body: KillPidRequest) {
  return api.post<KillPidResponse>('/api/cookbook/kill-pid', body)
}

export function setupCookbookServer(body: SetupRequest) {
  return api.post<SetupResponse>('/api/cookbook/setup', body)
}

export function fetchCookbookPackages(query?: GpuQuery & { venv?: string }) {
  const params = new URLSearchParams()
  if (query?.host) params.set('host', query.host)
  if (query?.ssh_port) params.set('ssh_port', query.ssh_port)
  if (query?.venv) params.set('venv', query.venv)
  const qs = params.toString()
  return api.get<CookbookPackagesResponse>(
    `/api/cookbook/packages${qs ? `?${qs}` : ''}`,
  )
}

export function fetchCookbookTasksStatus() {
  return api.get<CookbookTasksStatusResponse>('/api/cookbook/tasks/status')
}

export function serveModel(body: ServeModelRequest) {
  return api.post<ServeModelResponse>('/api/model/serve', body)
}

export function execShell(command: string) {
  return api.post<ShellExecResponse>('/api/shell/exec', { command })
}

export function fetchCachedModels(query?: GpuQuery) {
  const params = new URLSearchParams()
  if (query?.host) params.set('host', query.host)
  if (query?.ssh_port) params.set('ssh_port', query.ssh_port)
  const qs = params.toString()
  return api.get<{ models: CachedModel[] }>(`/api/model/cached${qs ? `?${qs}` : ''}`)
}
