import { describe, expect, it } from 'vitest'
import {
  humanFileSize,
  imageLabel,
  isMediaFile,
  isVideoUrl,
  mergeTags,
  parseTagList,
} from './galleryHelpers'

describe('galleryHelpers', () => {
  it('detects video URLs by extension', () => {
    expect(isVideoUrl('/api/generated-image/clip.mp4')).toBe(true)
    expect(isVideoUrl('/api/generated-image/photo.jpg')).toBe(false)
  })

  it('accepts common media files', () => {
    expect(isMediaFile(new File(['x'], 'photo.jpg', { type: 'image/jpeg' }))).toBe(true)
    expect(isMediaFile(new File(['x'], 'clip.webm', { type: 'video/webm' }))).toBe(true)
    expect(isMediaFile(new File(['x'], 'notes.txt', { type: 'text/plain' }))).toBe(false)
  })

  it('formats file sizes', () => {
    expect(humanFileSize(512)).toBe('512 B')
    expect(humanFileSize(2048)).toBe('2.0 KB')
    expect(humanFileSize(null)).toBe('')
  })

  it('parses and merges tag lists without duplicates', () => {
    expect(parseTagList('a, b ,c')).toEqual(['a', 'b', 'c'])
    expect(mergeTags('Sunset, beach', 'beach, ocean')).toEqual(['Sunset', 'beach', 'ocean'])
  })

  it('prefers prompt for image label', () => {
    expect(imageLabel({ prompt: 'Beach day', filename: 'abc.jpg' })).toBe('Beach day')
    expect(imageLabel({ prompt: '', filename: 'abc.jpg' })).toBe('abc')
  })
})
