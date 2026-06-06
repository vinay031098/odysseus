const MANUAL_HW_KEY = 'hwfit_manual_hardware_v1'

export interface ManualHardwareState {
  mode: 'gpu' | 'ram'
  gpuCount?: number
  vramGb?: number
  ramGb?: number
  backend?: string
}

export function loadManualHardware(): ManualHardwareState | null {
  try {
    const raw = localStorage.getItem(MANUAL_HW_KEY)
    if (!raw) return null
    const s = JSON.parse(raw) as ManualHardwareState
    if (s?.mode === 'gpu' || s?.mode === 'ram') return s
  } catch {
    /* ignore */
  }
  return null
}

export function saveManualHardware(state: ManualHardwareState | null) {
  try {
    if (!state?.mode) localStorage.removeItem(MANUAL_HW_KEY)
    else localStorage.setItem(MANUAL_HW_KEY, JSON.stringify(state))
  } catch {
    /* ignore */
  }
}

export function manualHardwareParams(state: ManualHardwareState | null): Record<string, string> {
  if (!state) return {}
  return {
    manual_mode: state.mode,
    manual_gpu_count: state.mode === 'gpu' ? String(state.gpuCount || 1) : '',
    manual_vram_gb: state.mode === 'gpu' ? String(state.vramGb || 8) : '',
    manual_ram_gb: state.ramGb ? String(state.ramGb) : '',
    manual_backend: state.mode === 'gpu' ? state.backend || 'cuda' : '',
  }
}

export function manualHardwareLabel(state: ManualHardwareState | null): string {
  if (!state) return ''
  const ram = state.ramGb ? ` · ${state.ramGb} GB RAM` : ''
  if (state.mode === 'ram') return `Manual: ${state.ramGb || 0} GB RAM only`
  const gpus = `${state.gpuCount || 1} GPU${Number(state.gpuCount || 1) === 1 ? '' : 's'}`
  return `Manual: ${gpus} · ${state.vramGb || 8} GB VRAM each${ram}`
}
