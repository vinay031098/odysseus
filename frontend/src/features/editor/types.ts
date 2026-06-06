export type EditorTool =
  | 'move'
  | 'brush'
  | 'eraser'
  | 'inpaint'
  | 'lasso'
  | 'wand'
  | 'floodFill'
  | 'clone'
  | 'crop'
  | 'text'

export type OpenTab = {
  id: string
  title: string
  dirty?: boolean
}

export type CropRect = { x: number; y: number; w: number; h: number }

export type TransformHandle = 'nw' | 'ne' | 'sw' | 'se' | 'rot' | 'move' | null

export type GalleryEditorTool = EditorTool | 'transform'

export type { TransformHandleId as GalleryTransformHandleId } from '@/lib/editor/transformHandles'

export const BLANK_CANVAS_PRESETS = [
  { w: 1024, h: 1024, label: 'Square HD — 1024 × 1024' },
  { w: 1920, h: 1080, label: 'Widescreen — 1920 × 1080' },
  { w: 1080, h: 1920, label: 'Portrait — 1080 × 1920' },
  { w: 1080, h: 1080, label: 'Instagram — 1080 × 1080' },
  { w: 1500, h: 1050, label: 'Postcard — 1500 × 1050' },
  { w: 3840, h: 2160, label: '4K — 3840 × 2160' },
] as const
