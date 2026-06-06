/** Image model capability classifier — ported from static/js/editor/ai-models.js */

export type ImageModelCaps = { gen: boolean; inpaint: boolean }

export function modelCaps(
  modelId: string,
  endpointName: string,
  endpointType: string,
): ImageModelCaps {
  const id = (modelId || '').toLowerCase()
  const name = (endpointName || '').toLowerCase()
  const type = (endpointType || '').toLowerCase()
  const textOnly =
    /(?:^|[/\-_:])(gpt-?[345]|gpt-oss|claude|llama|qwen[^-]*chat|chat$|instruct$|coder)/i
  if (textOnly.test(id) && !/image/i.test(id)) return { gen: false, inpaint: false }
  if (/dall-e-3/.test(id)) return { gen: true, inpaint: false }
  if (/dall-e-2/.test(id)) return { gen: true, inpaint: true }
  if (/gpt-image/.test(id)) return { gen: true, inpaint: true }
  if (
    /(?:^|[/\-_])(?:sd-?xl|sdxl|sd3|sd-|stable[\s-]*diffusion|flux|playground|pixart|kandinsky)/i.test(
      id,
    )
  ) {
    const isInpaintModel = /inpaint|edit|fill/i.test(id) || /inpaint|edit|fill/i.test(name)
    return { gen: !isInpaintModel || /base/i.test(id), inpaint: true }
  }
  if (type === 'image') {
    if (/inpaint|edit|fill/i.test(name)) return { gen: false, inpaint: true }
    return { gen: true, inpaint: true }
  }
  if (/inpaint|edit|fill/i.test(name)) return { gen: false, inpaint: true }
  if (/diffus|flux|sd|image/i.test(name)) return { gen: true, inpaint: true }
  return { gen: false, inpaint: false }
}

export type ImageModelOption = {
  value: string
  label: string
  disabled: boolean
  endpoint: string
  model: string
}

export function buildImageModelOptions(
  endpoints: Array<{
    base_url: string
    name?: string
    model_type?: string
    models?: string[]
    is_enabled?: boolean
    online?: boolean
  }>,
  filter: 'inpaint' | 'img2img',
): ImageModelOption[] {
  const out: ImageModelOption[] = []
  for (const ep of endpoints) {
    if (!ep.is_enabled) continue
    const models = ep.models?.length ? ep.models : ['']
    const isImageEndpoint = (ep.model_type || '').toLowerCase() === 'image'
    const epUsable = !!ep.online || isImageEndpoint
    for (const modelId of models) {
      const caps = modelCaps(modelId || ep.name || '', ep.name || '', ep.model_type || '')
      const ok =
        filter === 'inpaint' ? caps.inpaint : caps.inpaint || caps.gen
      if (!ok) continue
      const value = `${ep.base_url}::${modelId}`
      const shortModel = modelId
        ? String(modelId).split('/').pop()!
        : ep.name || ep.base_url
      const epHint = modelId && ep.name && ep.name !== modelId ? ` · ${ep.name}` : ''
      out.push({
        value,
        label: `${shortModel}${epHint}${epUsable ? '' : ' (offline)'}`,
        disabled: !epUsable,
        endpoint: ep.base_url,
        model: modelId,
      })
    }
  }
  return out
}

export function parseModelValue(raw: string): { endpoint: string; model: string } {
  if (!raw) return { endpoint: '', model: '' }
  const idx = raw.indexOf('::')
  if (idx < 0) return { endpoint: raw, model: '' }
  return { endpoint: raw.slice(0, idx), model: raw.slice(idx + 2) }
}
