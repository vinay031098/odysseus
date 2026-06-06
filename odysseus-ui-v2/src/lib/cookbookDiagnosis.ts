import type { CookbookTask } from '@/api/cookbookServe'

export type DiagnosisFixAction =
  | 'retry_download'
  | 'retry_no_transfer'
  | 'open_hf'
  | 'copy_hint'
  | 'copy_bundle'
  | 'serve_retry'
  | 'serve_retry_replace'
  | 'serve_retry_remove'
  | 'serve_retry_prepend'
  | 'edit_serve'
  | 'open_deps'
  | 'quick_cmd'
  | 'pip_update'

export interface DiagnosisFix {
  label: string
  action: DiagnosisFixAction
  hint?: string
  flag?: string
  value?: string
  pkg?: string
  /** Short tmux task label, e.g. update-vllm */
  pipTaskName?: string
  /** Full shell command (python -m pip …) */
  pipCmd?: string
}

export interface DiagnosisEntry {
  pattern: RegExp
  message: string
  suggestion?: string
  fixes: DiagnosisFix[]
  match?: (text: string) => boolean
}

const serveReplace = (label: string, flag: string, value: string): DiagnosisFix => ({
  label,
  action: 'serve_retry_replace',
  flag,
  value,
})

const serveAppend = (label: string, flag: string): DiagnosisFix => ({
  label,
  action: 'serve_retry',
  flag,
})

const serveRemove = (label: string, flag: string): DiagnosisFix => ({
  label,
  action: 'serve_retry_remove',
  flag,
})

const pipUpdate = (taskName: string, cmd: string, label: string): DiagnosisFix => ({
  label,
  action: 'pip_update',
  pipTaskName: taskName,
  pipCmd: cmd,
})

export const DOWNLOAD_DIAGNOSIS_PATTERNS: DiagnosisEntry[] = [
  {
    pattern: /403 Forbidden|401 Unauthorized|Access to model.*is restricted|gated repo|not in the authorized list|awaiting a review/i,
    message:
      'Gated model — accept the license on HuggingFace and ensure your HF token has access.',
    fixes: [
      { label: 'Request access on HF', action: 'open_hf' },
      { label: 'Retry download', action: 'retry_download' },
    ],
  },
  {
    pattern: /No space left on device|Disk quota exceeded|ENOSPC/i,
    message: 'Disk full on the server. Free space before retrying.',
    fixes: [
      { label: 'Retry download', action: 'retry_download' },
      { label: 'Check HF cache size', action: 'quick_cmd', flag: 'du -sh ~/.cache/huggingface 2>/dev/null' },
    ],
  },
  {
    pattern: /Connection refused|Could not connect|Connection reset by peer|timed out/i,
    message: 'Network connection failed. HuggingFace or the remote host may be unreachable.',
    fixes: [
      { label: 'Retry without hf_transfer', action: 'retry_no_transfer' },
      { label: 'Retry download', action: 'retry_download' },
      { label: 'Test HF connectivity', action: 'quick_cmd', flag: 'curl -sI https://huggingface.co 2>&1 | head -3' },
    ],
  },
  {
    pattern: /hf_transfer|Rust download|ChunkedEncodingError|ContentLengthError/i,
    message: 'Parallel hf_transfer downloader failed — retry with the reliable downloader.',
    suggestion: 'Suggested action: retry with hf_transfer disabled (resumes partial files).',
    fixes: [{ label: 'Retry without hf_transfer', action: 'retry_no_transfer' }],
  },
  {
    pattern: /tmux is required|tmux: command not found/i,
    message: 'tmux is required for background downloads on this server.',
    fixes: [
      {
        label: 'Copy install hint',
        action: 'copy_hint',
        hint: 'Install tmux on the target server, then retry the download.',
      },
    ],
  },
  {
    pattern: /Repository Not Found|404 Client Error|404 Not Found/i,
    message: 'Model repo not found — check the org/model id.',
    fixes: [{ label: 'Request access on HF', action: 'open_hf' }],
  },
  {
    pattern: /DOWNLOAD_FAILED|ERROR /i,
    message: 'Download failed — check the log output above.',
    fixes: [
      { label: 'Retry without hf_transfer', action: 'retry_no_transfer' },
      { label: 'Retry download', action: 'retry_download' },
    ],
  },
]

export const SERVE_DIAGNOSIS_PATTERNS: DiagnosisEntry[] = [
  {
    pattern: /No available memory for the cache blocks|Available KV cache memory:.*-/i,
    message: 'No GPU memory left for KV cache after loading model.',
    fixes: [
      serveReplace('Retry with GPU mem 0.95', '--gpu-memory-utilization', '0.95'),
      serveReplace('Retry with context 2048', '--max-model-len', '2048'),
      serveReplace('Retry with more GPUs (TP=8)', '--tensor-parallel-size', '8'),
    ],
  },
  {
    pattern: /warming up sampler|max_num_seqs.*gpu_memory_utilization/i,
    message: 'OOM during warmup. Lower GPU memory or max sequences.',
    fixes: [
      serveReplace('Retry with GPU mem 0.80', '--gpu-memory-utilization', '0.80'),
      serveAppend('Retry with --max-num-seqs 64', '--max-num-seqs 64'),
      serveAppend('Retry with --max-num-seqs 32', '--max-num-seqs 32'),
    ],
  },
  {
    pattern: /CUDA out of memory|torch\.cuda\.OutOfMemoryError|CUDA error: out of memory/i,
    message: 'GPU ran out of memory. Try more GPUs (higher TP) or lower context.',
    fixes: [
      serveReplace('Retry with TP=2', '--tensor-parallel-size', '2'),
      serveReplace('Retry with TP=4', '--tensor-parallel-size', '4'),
      serveReplace('Retry with GPU mem 0.80', '--gpu-memory-utilization', '0.80'),
      serveReplace('Retry with context 4096', '--max-model-len', '4096'),
      serveAppend('Retry with --enforce-eager', '--enforce-eager'),
    ],
  },
  {
    pattern: /not divisible by weight quantization|quantization block/i,
    message: 'FP8 MoE quantization is incompatible with this tensor-parallel split.',
    suggestion:
      'Suggested action: retry with a lower tensor-parallel size, such as TP=4 or TP=2. If it still fails, use a non-FP8/GGUF version of the model.',
    fixes: [
      serveReplace('Retry with TP=4', '--tensor-parallel-size', '4'),
      serveReplace('Retry with TP=2', '--tensor-parallel-size', '2'),
      { label: 'Edit serve', action: 'edit_serve' },
    ],
  },
  {
    pattern: /There is no module or parameter named ['"]lm_head\.input_scale['"]|lm_head\.input_scale|weight_scale_2/i,
    message: 'vLLM cannot load this ModelOpt LM-head quantized checkpoint with the current runtime.',
    suggestion:
      'Suggested action: upgrade vLLM through the environment that provides this CLI, or choose a compatible checkpoint.',
    fixes: [
      { label: 'Open Dependencies', action: 'open_deps', pkg: 'vllm' },
      {
        label: 'Copy upgrade hint',
        action: 'copy_hint',
        hint: 'Upgrade the vLLM environment that provides the selected vllm CLI, or use a compatible checkpoint.',
      },
    ],
  },
  {
    pattern: /not divisib|must be divisible|attention heads.*divisible/i,
    message: 'Tensor parallel size incompatible with model dimensions.',
    fixes: [
      serveReplace('Retry with TP=1', '--tensor-parallel-size', '1'),
      serveReplace('Retry with TP=2', '--tensor-parallel-size', '2'),
      serveReplace('Retry with TP=4', '--tensor-parallel-size', '4'),
    ],
  },
  {
    pattern: /Too large swap space|swap space.*total CPU memory/i,
    message: 'Swap space too large for available CPU memory.',
    fixes: [
      serveRemove('Retry without swap', '--swap-space'),
      serveReplace('Retry with swap 1', '--swap-space', '1'),
    ],
  },
  {
    pattern: /swap space|not enough.*memory.*cpu|Cannot allocate memory/i,
    message: 'Not enough CPU RAM or swap space.',
    fixes: [
      serveRemove('Retry without swap', '--swap-space'),
      serveReplace('Lower max context to 4096', '--max-model-len', '4096'),
    ],
  },
  {
    pattern: /unrecognized arguments:\s*--swap-space/i,
    message: '--swap-space was removed in newer vLLM versions. Remove it from the command.',
    fixes: [serveRemove('Retry without swap', '--swap-space')],
  },
  {
    pattern: /Address already in use|bind.*address.*in use/i,
    message: 'Port is already in use. Another server may be running.',
    fixes: [
      { label: 'Kill existing vLLM', action: 'quick_cmd', flag: 'pkill -f vllm' },
      { label: 'Edit serve (change port)', action: 'edit_serve' },
    ],
  },
  {
    pattern: /No CUDA GPUs are available|no GPU.*found|CUDA_VISIBLE_DEVICES.*invalid/i,
    message: 'No GPUs visible. Check your GPU selection or driver.',
    fixes: [{ label: 'Edit serve (clear GPU pin)', action: 'edit_serve' }],
  },
  {
    pattern: /Weights for this component appear to be missing|load the component before passing/i,
    message:
      'Single-file checkpoint needs a base model for missing components. The base model may be gated.',
    fixes: [{ label: 'Request access to base model', action: 'open_hf' }],
  },
  {
    pattern: /Entry Not Found.*model_index\.json|Could not load model.*Check diffusers/i,
    message: 'Single-file model — needs base config from a gated repo.',
    fixes: [{ label: 'Request access to base model', action: 'open_hf' }],
  },
  {
    pattern: /does not appear to have a file named|not a valid model|No such file or directory.*model/i,
    message: 'Model path or ID not found.',
    fixes: [{ label: 'Edit serve', action: 'edit_serve' }],
  },
  {
    pattern: /NCCL error|ncclSystemError|ncclInternalError/i,
    message: 'Multi-GPU communication (NCCL) failed.',
    fixes: [
      serveReplace('Set TP to 1 (single GPU)', '--tensor-parallel-size', '1'),
      serveAppend('Enable enforce eager', '--enforce-eager'),
    ],
  },
  {
    pattern: /KV cache.*too (small|large)|max_model_len.*exceeds|maximum.*context/i,
    message: 'Context length too large for available GPU memory.',
    fixes: [
      serveReplace('Lower to 8192', '--max-model-len', '8192'),
      serveReplace('Lower to 4096', '--max-model-len', '4096'),
      serveReplace('Lower to 2048', '--max-model-len', '2048'),
    ],
  },
  {
    pattern: /vllm.*command not found|No module named vllm/i,
    message: 'vLLM is not installed or not in PATH.',
    fixes: [
      { label: 'Open Dependencies', action: 'open_deps', pkg: 'vllm' },
      { label: 'Edit serve', action: 'edit_serve' },
    ],
  },
  {
    pattern: /sglang.*command not found|No module named sglang|SGLang is not installed/i,
    message: 'SGLang is not installed or not in PATH.',
    fixes: [
      { label: 'Open Dependencies', action: 'open_deps', pkg: 'sglang' },
      {
        label: 'Copy install command',
        action: 'copy_hint',
        hint: 'python3 -m pip install "sglang[all]"',
      },
    ],
  },
  {
    pattern: /No accelerator \(CUDA, XPU, HPU, NPU, MUSA, MPS\) is available|Triton is not supported on current platform/i,
    message: 'SGLang needs a visible GPU/accelerator on this server.',
    suggestion: 'Suggested action: switch this serve config to llama.cpp for CPU/local serving, or choose a GPU server.',
    fixes: [
      { label: 'Switch to llama.cpp', action: 'edit_serve', value: 'llamacpp' },
      { label: 'Choose GPU server', action: 'edit_serve' },
    ],
  },
  {
    pattern: /flashinfer.*version.*does not match|flashinfer-cubin version/i,
    message: 'FlashInfer version mismatch.',
    fixes: [
      {
        label: 'Auto-fix: bypass version check',
        action: 'serve_retry_prepend',
        flag: 'FLASHINFER_DISABLE_VERSION_CHECK=1 ',
      },
    ],
  },
  {
    pattern: /torch\.cuda\.is_available\(\).*False|No CUDA runtime/i,
    message: 'vLLM needs a visible CUDA/ROCm GPU.',
    suggestion: 'Suggested action: switch this serve config to llama.cpp for CPU/local serving, or choose a GPU server.',
    fixes: [
      { label: 'Switch to llama.cpp', action: 'edit_serve', value: 'llamacpp' },
      { label: 'Choose GPU server', action: 'edit_serve' },
    ],
  },
  {
    pattern: /Engine core initialization failed/i,
    message: 'vLLM engine failed to start. Check the error above.',
    fixes: [
      serveAppend('Retry with --enforce-eager', '--enforce-eager'),
      serveReplace('Retry with context 4096', '--max-model-len', '4096'),
      serveReplace('Lower GPU mem to 0.80', '--gpu-memory-utilization', '0.80'),
    ],
  },
  {
    pattern: /weight_loader.*unexpected keyword|Unexpected key.*state_dict/i,
    message: 'Model format incompatible with this vLLM version.',
    fixes: [serveAppend('Try trust remote code', '--trust-remote-code')],
  },
  {
    pattern: /enable-auto-tool-choice requires --tool-call-parser/i,
    message: 'Auto tool choice needs a tool call parser.',
    fixes: [serveAppend('Retry with --tool-call-parser hermes', '--tool-call-parser hermes')],
  },
  {
    pattern: /Please pass.*trust.remote.code=True|contains custom code which must be executed to correctly load/i,
    message: 'Model requires custom code. Enable --trust-remote-code.',
    fixes: [serveAppend('Retry with --trust-remote-code', '--trust-remote-code')],
  },
  {
    pattern: /does not recognize this architecture|model type.*but Transformers does not/i,
    message: 'Model architecture too new for installed vLLM/transformers.',
    fixes: [
      serveAppend('Try --trust-remote-code', '--trust-remote-code'),
      pipUpdate('update-vllm', '${PY} -m pip install -U vllm transformers', 'Update vLLM on server'),
      { label: 'Open Dependencies', action: 'open_deps', pkg: 'vllm' },
    ],
  },
  {
    pattern: /Either a revision or a version must be specified|transformers\.integrations\.hub_kernels|kernels\/layer/i,
    message: 'Transformers/kernels package mismatch.',
    fixes: [
      pipUpdate(
        'repair-kernels',
        '${PY} -m pip install --user --break-system-packages kernels<0.15',
        'Repair kernel package',
      ),
      { label: 'Open Dependencies', action: 'open_deps', pkg: 'sglang' },
    ],
  },
  {
    pattern: /ollama.*command not found/i,
    message: 'Ollama is not installed on this server.',
    fixes: [
      {
        label: 'Copy install command',
        action: 'copy_hint',
        hint: 'curl -fsSL https://ollama.com/install.sh | sh',
      },
    ],
  },
  {
    pattern: /llama-server.*command not found|llama\.cpp.*not found|No module named.*llama_cpp|No module named 'starlette_context'/i,
    message: 'llama-cpp-python server is not installed.',
    fixes: [
      { label: 'Open Dependencies', action: 'open_deps', pkg: 'llama_cpp' },
      {
        label: 'Copy install command',
        action: 'copy_hint',
        hint: 'pip install "llama-cpp-python[server]"',
      },
    ],
  },
  {
    pattern: /Windows Error 0xc000001d|Illegal instruction|0xc000001d/i,
    message: 'AVX2 instruction set mismatch for precompiled llama-cpp-python wheel.',
    suggestion: 'Suggested action: switch to Ollama or choose a remote Linux GPU server.',
    fixes: [
      { label: 'Switch to Ollama', action: 'edit_serve', value: 'ollama' },
      { label: 'Choose remote server', action: 'edit_serve' },
    ],
  },
  {
    pattern: /CUDA Toolkit not found|Unable to find cudart library|missing:\s*CUDA_CUDART/i,
    message: 'llama.cpp found nvcc, but the CUDA runtime library is missing.',
    fixes: [
      { label: 'Edit serve', action: 'edit_serve' },
      { label: 'Open Dependencies', action: 'open_deps', pkg: 'llama_cpp' },
    ],
  },
  {
    pattern: /No module named ['"]?torch|No module named ['"]?diffusers|diffusers.*command not found/i,
    message: 'Diffusion serving needs PyTorch and diffusers.',
    fixes: [
      { label: 'Open Dependencies', action: 'open_deps', pkg: 'diffusers' },
      {
        label: 'Copy install command',
        action: 'copy_hint',
        hint: 'python3 -m pip install "diffusers[torch]"',
      },
    ],
  },
  {
    pattern: /Triton kernels.*Failed to import|cannot import name '\w+' from 'triton_kernels/i,
    message: 'Triton kernels version mismatch (non-fatal warning).',
    fixes: [{ label: 'Open Dependencies', action: 'open_deps', pkg: 'triton' }],
  },
  {
    pattern: /attention_sink|sliding.window.*not supported|sliding_window.*incompatible/i,
    message: 'Model uses attention features unsupported in this vLLM version.',
    fixes: [
      pipUpdate('update-vllm', '${PY} -m pip install -U vllm', 'Update vLLM on server'),
      { label: 'Open Dependencies', action: 'open_deps', pkg: 'vllm' },
    ],
  },
  {
    pattern: /nvcc fatal\s+:\s+Unsupported gpu architecture 'compute_\d+'/i,
    message: 'FlashInfer JIT nvcc too old for this GPU.',
    suggestion: 'Suggested action: relaunch with VLLM_USE_FLASHINFER_SAMPLER=0 prepended.',
    fixes: [
      {
        label: 'Retry with VLLM_USE_FLASHINFER_SAMPLER=0',
        action: 'serve_retry_prepend',
        flag: 'VLLM_USE_FLASHINFER_SAMPLER=0 ',
      },
      pipUpdate(
        'uninstall-flashinfer',
        '${PY} -m pip uninstall flashinfer-python -y',
        'Uninstall flashinfer-python',
      ),
      { label: 'Edit serve', action: 'edit_serve' },
    ],
  },
  {
    pattern: /ImportError: cannot import name '[^']+' from 'torch(\.\w+)+'/i,
    message: 'vLLM was built against a newer torch than what is installed.',
    fixes: [
      pipUpdate('reinstall-vllm', '${PY} -m pip install --force-reinstall vllm', 'Reinstall vLLM (pulls matching torch)'),
      pipUpdate('upgrade-torch', '${PY} -m pip install -U torch', 'Upgrade torch only'),
      { label: 'Open Dependencies', action: 'open_deps', pkg: 'vllm' },
    ],
  },
  {
    match: (text) => {
      const tail = text.slice(-4096)
      if (!/Traceback \(most recent call last\)/i.test(tail)) return false
      if (/Application startup complete|"GET \/v1\/[^"]+ HTTP\/[\d.]+" 2\d\d|Uvicorn running on/i.test(tail)) {
        return false
      }
      return true
    },
    pattern: /Traceback \(most recent call last\)/i,
    message: 'Python traceback detected — may be a handled error, check logs.',
    fixes: [{ label: 'Kill vLLM processes', action: 'quick_cmd', flag: 'pkill -f vllm' }],
  },
  {
    pattern: /403 Forbidden|401 Unauthorized|gated repo|Access to model.*is restricted/i,
    message: 'Gated model — accept the license and verify your HF token.',
    fixes: [{ label: 'Request access on HF', action: 'open_hf' }],
  },
]

export function diagnoseOutput(
  text: string,
  patterns: DiagnosisEntry[] = [...DOWNLOAD_DIAGNOSIS_PATTERNS, ...SERVE_DIAGNOSIS_PATTERNS],
): DiagnosisEntry | null {
  for (const entry of patterns) {
    const hit = entry.match ? entry.match(text) : entry.pattern.test(text)
    if (hit) return entry
  }
  return null
}

export function inferBaseRepo(text: string): string | null {
  if (!text) return null
  const t = text.toLowerCase()
  if (t.includes('sd3.5') || t.includes('stable-diffusion-3.5')) {
    return 'stabilityai/stable-diffusion-3.5-large'
  }
  if (t.includes('sd3') || t.includes('stable-diffusion-3')) {
    return 'stabilityai/stable-diffusion-3-medium-diffusers'
  }
  if (t.includes('flux')) return 'black-forest-labs/FLUX.1-schnell'
  if (t.includes('sdxl') || t.includes('stable-diffusion-xl')) {
    return 'stabilityai/stable-diffusion-xl-base-1.0'
  }
  return null
}

export function extractGatedRepo(text: string): string | null {
  const m =
    text.match(/Access to model\s+(\S+)\s+is restricted/i) ||
    text.match(/huggingface\.co\/([^\s/]+\/[^\s/]+)/i) ||
    text.match(/config=([^\s,)]+)/i)
  if (m) return m[1] || m[2] || null
  return inferBaseRepo(text)
}

export function diagnosisSuggestion(entry: DiagnosisEntry): string {
  if (entry.suggestion) return entry.suggestion
  if (entry.fixes.length) return `Suggested action: ${entry.fixes[0].label}.`
  return 'Suggested action: review the output and adjust settings.'
}

export interface DiagnosisFixHandlers {
  onRetryDownload?: () => void
  onRetryNoTransfer?: () => void
  onServeRetry?: (fix: DiagnosisFix) => void
  onEditServe?: (fix?: DiagnosisFix) => void
  onOpenDeps?: (pkg?: string) => void
  onQuickCmd?: (cmd: string) => void
  onPipUpdate?: (fix: DiagnosisFix) => void
  onCopyBundle?: () => void
}

export function resolvePipDiagnosisCmd(
  fix: DiagnosisFix,
  envType?: string,
  envPath?: string,
): string | null {
  if (!fix.pipCmd) return null
  const py =
    envType === 'venv' && envPath
      ? `${envPath.replace(/\/+$/, '')}/bin/python3`
      : 'python3'
  return fix.pipCmd.replace(/\$\{PY\}/g, py)
}

export function buildDiagnosisCopyBundle(args: {
  task?: Pick<CookbookTask, 'sessionId' | 'id' | 'type' | 'status' | 'name' | 'remoteHost' | 'sshPort' | 'payload' | '_unreachable'>
  diagnosis: DiagnosisEntry
  output: string
  suggestion?: string
}): string {
  const { task, diagnosis, output, suggestion } = args
  const lines = ['## Odysseus Cookbook troubleshooting']
  if (task) {
    lines.push(
      '',
      '### Task',
      `- ID: ${task.sessionId || task.id || 'unknown'}`,
      `- Type: ${task.type || 'unknown'}`,
      `- Status: ${task._unreachable ? 'unreachable' : task.status || 'unknown'}`,
      `- Model: ${task.payload?.repo_id || task.name || 'unknown'}`,
      `- Host: ${task.remoteHost || 'local'}${task.sshPort ? `:${task.sshPort}` : ''}`,
    )
  }
  lines.push('', '### Diagnosis', diagnosis.message)
  const suggestionText =
    suggestion ||
    diagnosis.suggestion ||
    (diagnosis.fixes.length ? `Suggested action: ${diagnosis.fixes[0].label}.` : '')
  if (suggestionText) {
    lines.push('', '### Suggested action', suggestionText.replace(/^Suggested action:\s*/i, ''))
  }
  const cmd = task?.payload?._cmd || ''
  if (cmd) lines.push('', '### Launch command', '```bash', cmd, '```')
  if (output.trim()) {
    lines.push('', '### Captured output', '```text', output.trim(), '```')
  }
  return lines.join('\n')
}

export function handleDiagnosisFix(fix: DiagnosisFix, output: string, handlers: DiagnosisFixHandlers) {
  switch (fix.action) {
    case 'retry_download':
      handlers.onRetryDownload?.()
      break
    case 'retry_no_transfer':
      handlers.onRetryNoTransfer?.()
      break
    case 'open_hf': {
      const repo = extractGatedRepo(output)
      window.open(
        repo ? `https://huggingface.co/${repo}` : 'https://huggingface.co/settings/gated-repos',
        '_blank',
        'noopener',
      )
      break
    }
    case 'copy_hint':
      if (fix.hint) void navigator.clipboard.writeText(fix.hint)
      break
    case 'copy_bundle':
      handlers.onCopyBundle?.()
      break
    case 'pip_update':
      handlers.onPipUpdate?.(fix)
      break
    case 'serve_retry':
    case 'serve_retry_replace':
    case 'serve_retry_remove':
    case 'serve_retry_prepend':
      handlers.onServeRetry?.(fix)
      break
    case 'edit_serve':
      handlers.onEditServe?.(fix)
      break
    case 'open_deps':
      handlers.onOpenDeps?.(fix.pkg)
      break
    case 'quick_cmd':
      if (fix.flag) handlers.onQuickCmd?.(fix.flag)
      break
  }
}

export function taskNeedsDiagnosis(task: CookbookTask, output: string): boolean {
  if (!output.trim()) return false
  if (task.status === 'error' || task.status === 'crashed' || task.status === 'failed') {
    return true
  }
  if (task.type === 'download' && /DOWNLOAD_FAILED|ERROR /i.test(output)) return true
  if (task.type === 'serve' && ['stopped', 'error', 'crashed', 'failed'].includes(task.status)) {
    return true
  }
  return false
}

export function servePatternCount(): number {
  return SERVE_DIAGNOSIS_PATTERNS.length
}
