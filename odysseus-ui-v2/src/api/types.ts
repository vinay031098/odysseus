/** API types for Odysseus UI v2 */

export type UserPrivileges = Record<string, boolean | number | string[] | undefined>

export interface AuthStatus {
  authenticated: boolean
  username?: string
  is_admin?: boolean
  signup_enabled?: boolean
  privileges?: UserPrivileges
  auth_enabled?: boolean
}

export interface LoginRequest {
  username: string
  password: string
  remember?: boolean
  totp_code?: string
}

export interface LoginResponse {
  ok: boolean
  username?: string
  requires_totp?: boolean
}

export interface ApiErrorBody {
  detail?: string | { msg?: string }[]
}

export interface ChangePasswordRequest {
  current_password: string
  new_password: string
}

export interface ModelEndpoint {
  id: string
  name: string
  base_url: string
  has_key: boolean
  is_enabled: boolean
  models: string[]
  pinned_models?: string[]
  online: boolean
  status: string
  model_type?: string
  endpoint_kind?: string
  category?: string
  ping_error?: string | null
}

export type CreateModelEndpointResponse = Omit<ModelEndpoint, 'models'> & {
  models?: string[]
}

export interface ModelFallbackEntry {
  endpoint_id: string
  model: string
}

export interface AuthSettings {
  default_endpoint_id?: string
  default_model?: string
  default_model_fallbacks?: ModelFallbackEntry[]
  [key: string]: unknown
}

export interface UserPrefs {
  default_endpoint_id?: string
  default_model?: string
  default_model_fallbacks?: ModelFallbackEntry[]
  [key: string]: unknown
}

export interface PrefValueResponse {
  key: string
  value: unknown
}

export interface Session {
  id: string
  name: string
  model?: string
  endpoint_url?: string
  rag?: boolean
  archived?: boolean
  folder?: string | null
  total_tokens?: number
  is_important?: boolean
  created_at?: string
  updated_at?: string
  last_message_at?: string
  message_count?: number
}

export interface SessionCreateResponse {
  id: string
  name: string
  model?: string
  rag?: boolean
  archived?: boolean
}

export interface WebSource {
  url: string
  title?: string
  snippet?: string
}

export interface RagSource {
  filename?: string
  similarity?: number
  snippet?: string
}

export interface MessageVariantRecord {
  content?: string
  raw?: string
  label: string
}

export interface ChatMessage {
  role: 'user' | 'assistant' | 'system' | string
  content: string
  metadata?: Record<string, unknown> & {
    _db_id?: string
    variants?: MessageVariantRecord[]
    variantIndex?: number
    web_sources?: WebSource[]
    research_sources?: WebSource[]
    rag_sources?: RagSource[]
    thinking?: string
    thinking_time?: number
    tool_events?: ToolEventRecord[]
    plan_pending?: boolean
  }
}

export interface ToolEventRecord {
  name?: string
  status?: string
  output?: string
  exit_code?: number
}

export interface UploadedFile {
  id: string
  name: string
  mime: string
  size: number
  width?: number
  height?: number
}

export interface UploadResponse {
  files: UploadedFile[]
}

export interface SearchResult {
  session_id: string
  session_name: string
  role: string
  content_snippet: string
  timestamp: string | null
}

export interface ForkSessionResponse {
  status: string
  id: string
  name: string
  kept: number
}

export interface HistoryResponse {
  history: ChatMessage[]
  model?: string
}

export interface ModelEndpointItem {
  host?: string
  port?: number
  url: string
  models: string[]
  models_display?: string[]
  models_extra?: string[]
  endpoint_id: string
  endpoint_name?: string
  offline?: boolean
}

export interface ModelsResponse {
  hosts?: unknown[]
  items: ModelEndpointItem[]
}

export interface ModelOption {
  id: string
  label: string
  url: string
  endpointId: string
  endpointName?: string
  offline?: boolean
}

export interface DefaultChat {
  endpoint_id: string
  endpoint_url: string
  model: string
}

export interface PendingChat {
  url: string
  modelId: string
  endpointId: string
}

export interface StreamChunkEvent {
  type: 'delta'
  text: string
}

export interface StreamDoneEvent {
  type: 'done'
}

export interface StreamErrorEvent {
  type: 'error'
  message: string
}

export interface StreamToolStartEvent {
  type: 'tool_start'
  name: string
  label?: string
}

export interface StreamToolProgressEvent {
  type: 'tool_progress'
  message: string
}

export interface StreamAgentStepEvent {
  type: 'agent_step'
  label?: string
}

export interface StreamSourcesEvent {
  type: 'web_sources' | 'research_sources' | 'rag_sources'
  data: WebSource[] | RagSource[]
}

export interface StreamThinkingEvent {
  type: 'thinking'
  text: string
}

export interface StreamResearchProgressEvent {
  type: 'research_progress'
  phase?: string
  title?: string
  total_sources?: number
}

export interface StreamUiControlEvent {
  type: 'ui_control'
  ui_event?: string
  toggle_name?: string
  state?: boolean
  mode?: string
  model?: string
  theme_name?: string
  colors?: Record<string, string>
  selector?: string
  label?: string
  bg?: {
    pattern?: string
    effectColor?: string
    effectIntensity?: number
    effectSize?: number
    frosted?: boolean
  }
}

export interface AskUserOption {
  label: string
  description?: string
}

export interface AskUserPayload {
  question: string
  options: AskUserOption[]
  multi?: boolean
}

export interface StreamAskUserEvent {
  type: 'ask_user'
  data: AskUserPayload
}

export interface StreamDocStreamOpenEvent {
  type: 'doc_stream_open'
  title?: string
  language?: string
}

export interface StreamDocStreamDeltaEvent {
  type: 'doc_stream_delta'
  content?: string
}

export interface StreamDocUpdateEvent {
  type: 'doc_update'
  doc_id: string
  content?: string
  title?: string
  language?: string
  version?: number
}

export interface DocSuggestion {
  id: string
  find: string
  replace: string
  reason?: string
}

export interface StreamDocSuggestionsEvent {
  type: 'doc_suggestions'
  doc_id?: string
  suggestions: DocSuggestion[]
}

export type StreamEvent =
  | StreamChunkEvent
  | StreamDoneEvent
  | StreamErrorEvent
  | StreamToolStartEvent
  | StreamToolProgressEvent
  | StreamAgentStepEvent
  | StreamSourcesEvent
  | StreamThinkingEvent
  | StreamResearchProgressEvent
  | StreamUiControlEvent
  | StreamAskUserEvent
  | StreamDocStreamOpenEvent
  | StreamDocStreamDeltaEvent
  | StreamDocUpdateEvent
  | StreamDocSuggestionsEvent
  | { type: 'rich' }

export interface ChatStreamPayload {
  delta?: string
  text?: string
  status?: number
  type?: string
  name?: string
  label?: string
  message?: string
  data?:
    | WebSource[]
    | RagSource[]
    | AskUserPayload
    | Record<string, unknown>
  thinking?: string
  ui_event?: string
  toggle_name?: string
  state?: boolean
  mode?: string
  model?: string
  theme_name?: string
  colors?: Record<string, string>
  selector?: string
  phase?: string
  title?: string
  language?: string
  content?: string
  doc_id?: string
  version?: number
  suggestions?: DocSuggestion[]
  total_sources?: number
  error?: { message?: string }
  bg?: StreamUiControlEvent['bg']
}

export interface StreamLiveState {
  statusText?: string
  thinking?: string
  webSources?: WebSource[]
  researchSources?: WebSource[]
  ragSources?: RagSource[]
  isRich: boolean
}

// ── Compare ──

export interface CompareStartResponse {
  id: string
  session_left: string
  session_right: string
  model_left: string | null
  model_right: string | null
  is_blind: boolean
  mapping?: { left: string; right: string } | null
}

export interface CompareVoteResponse {
  winner: string
  model_a: string
  model_b: string
  revealed: { left: string; right: string }
}

export interface CompareHistoryItem {
  id: string
  prompt: string
  model_a: string
  model_b: string
  winner: string | null
  is_blind: boolean
  voted_at: string | null
  created_at: string | null
}

// ── Research ──

export interface ResearchProgress {
  phase?: string
  round?: number
  queries?: number
  total_sources?: number
  total_findings?: number
  new_sources?: number
  model?: string
}

export interface ResearchActiveTask {
  session_id: string
  query: string
  status: string
  progress: ResearchProgress
  started_at: number
}

export interface ResearchLibraryItem {
  id: string
  query: string
  category: string
  source_count: number
  status: string
  duration: string
  rounds: string
  started_at: number
  completed_at: number
  archived: boolean
}

export interface ResearchStartRequest {
  query: string
  max_rounds?: number
  search_provider?: string | null
  endpoint_id?: string | null
  model?: string | null
  max_time?: number
  category?: string | null
}

export interface ResearchStartResponse {
  session_id: string
  status: string
  query: string
}

export interface ResearchResultPeek {
  result: string
  sources: ResearchSource[]
  raw_findings: unknown[]
  category?: string
}

export interface ResearchSource {
  title?: string
  url?: string
  snippet?: string
}

export interface ResearchStreamEvent {
  status?: string
  final?: boolean
  error?: string
  phase?: string
  round?: number
  queries?: number
  total_sources?: number
  total_findings?: number
  model?: string
}

// ── Cookbook (prompt presets) ──

export interface PromptPreset {
  name: string
  temperature?: number
  max_tokens?: number
  system_prompt?: string
  enabled?: boolean
  inject_prefix?: string
  inject_suffix?: string
}

export interface UserTemplate {
  id: string
  name: string
  system_prompt: string
  temperature?: number
  max_tokens?: number
}

export interface CookbookRecipe {
  id: string
  name: string
  prompt: string
  temperature?: number
  source: 'preset' | 'template' | 'builtin'
  description?: string
}

// ── Agents (skills) ──

export interface SkillNecessity {
  necessary?: boolean
  redundant_with?: string[]
  reason?: string
}

export interface AgentSkill {
  id?: string
  name: string
  description?: string
  category?: string
  status?: string
  when_to_use?: string
  tags?: string[]
  source?: string
  confidence?: number
  uses?: number
  created_at?: number
  updated_at?: number
  teacher_model?: string
  audit_verdict?: 'pass' | 'needs_work' | 'fail' | 'inconclusive' | string
  audit_by_teacher?: boolean
  audit_worker_model?: string
  audit_teacher_model?: string
  audited_at?: number
  necessity?: SkillNecessity
}

export interface SkillAuditResult {
  skill: string
  result?: string
  verdict?: SkillTestVerdict
  confidence?: number
  skill_state?: Partial<AgentSkill> & { name: string }
}

export interface SkillAuditStatus {
  status: 'none' | 'running' | 'done' | 'cancelled' | string
  scope?: string
  total?: number
  done?: number
  current?: string | null
  model?: string
  teacher?: string | null
  results?: SkillAuditResult[]
  log?: string[]
  started?: number
  finished?: number
}

export interface SkillsIndexEntry {
  name: string
  description?: string
  category?: string
}

export interface BuiltinAgentCapability {
  name: string
  description?: string
  is_overridden?: boolean
  overridden?: boolean
}

export interface BuiltinSkillDetail {
  name: string
  text: string
  default: string
  is_overridden: boolean
}

export interface SkillAddPayload {
  name?: string
  description: string
  category?: string
  when_to_use?: string
  procedure?: string[]
  tags?: string[]
  status?: string
}

export interface SkillTestLogEvent {
  type: string
  task?: string
  model?: string
  round?: number
  tool?: string
  command?: string
  output?: string
  text?: string
  error?: string
}

export interface SkillTestVerdict {
  verdict?: 'pass' | 'needs_work' | 'fail' | 'inconclusive' | string
  confidence?: number
  summary?: string
  issues?: string[]
}

export interface SkillTestStatus {
  status: 'none' | 'running' | 'done' | string
  task?: string
  model?: string
  log?: SkillTestLogEvent[]
  verdict?: SkillTestVerdict
}

// ── Group chat ──

export type GroupMode = 'round-robin' | 'parallel'

export interface GroupCharacter {
  id: string
  name: string
  prompt: string
}

export interface GroupParticipant {
  id: string
  modelId: string
  modelLabel: string
  url: string
  endpointId: string
  character?: GroupCharacter
}

export interface GroupPresetParticipant {
  model?: string
  character?: { id: string; name: string; prompt?: string }
}

export interface GroupPreset {
  id?: string
  name?: string
  mode?: GroupMode
  participants?: GroupPresetParticipant[]
}

export interface GroupResponse {
  participantId: string
  label: string
  content: string
  isStreaming?: boolean
}

export interface GroupTurn {
  id: string
  userMessage: string
  responses: GroupResponse[]
}
