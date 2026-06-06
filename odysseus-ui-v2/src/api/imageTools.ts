import { api } from './client'

export type InpaintRequest = {
  image: string
  mask: string
  prompt: string
  strength?: number
  _endpoint?: string
  _model?: string
}

export type InpaintResponse = {
  image?: string
  error?: string
}

export type RemoveBgRequest = {
  image: string
  hint_mask?: string
}

export type RemoveBgResponse = {
  image?: string
  error?: string
}

export type HarmonizeRequest = {
  image: string
  mask?: string
  body_mask?: string
  seam_mask?: string
  strength?: number
  seam_fix?: number
  _endpoint?: string
  _model?: string
}

export type HarmonizeResponse = {
  image?: string
  error?: string
}

export async function inpaintImage(payload: InpaintRequest): Promise<InpaintResponse> {
  return api.post<InpaintResponse>('/api/image/inpaint', payload)
}

export async function removeBackground(payload: RemoveBgRequest): Promise<RemoveBgResponse> {
  return api.post<RemoveBgResponse>('/api/image/remove-bg', payload)
}

export async function harmonizeImage(payload: HarmonizeRequest): Promise<HarmonizeResponse> {
  return api.post<HarmonizeResponse>('/api/image/harmonize', payload)
}
