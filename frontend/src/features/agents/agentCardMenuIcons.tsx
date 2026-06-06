import { Pencil, Play, Trash2, Upload, X } from 'lucide-react'

export function menuIconPublish(isPublished: boolean) {
  return isPublished ? <X className="h-3.5 w-3.5" /> : <Upload className="h-3.5 w-3.5" />
}

export function menuIconEdit() {
  return <Pencil className="h-3.5 w-3.5" />
}

export function menuIconTest() {
  return <Play className="h-3.5 w-3.5" />
}

export function menuIconDelete() {
  return <Trash2 className="h-3.5 w-3.5" />
}
