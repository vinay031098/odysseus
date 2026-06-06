import { fetchTtsStats, synthesizeSpeech } from '@/api/chat'
import { fetchAuthSettings } from '@/api/settings'
import { stripThinkingTags } from '@/lib/thinkingParser'

type QueueItem = {
  text: string
  onStart?: () => void
  onEnd?: () => void
}

function extractPlainText(content: string): string {
  let text = stripThinkingTags(content)
  text = text.replace(/```[\s\S]*?```/g, ' ').replace(/`[^`]+`/g, ' ')
  text = text
    .replace(/#{1,6}\s/g, '')
    .replace(/\*\*(.+?)\*\*/g, '$1')
    .replace(/\*(.+?)\*/g, '$1')
    .replace(/\[(.+?)\]\(.+?\)/g, '$1')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
  return text
}

function splitNewSentences(newRegion: string): { sentences: string[]; advancedChars: number } {
  const sentences: string[] = []
  let current = ''
  let advancedChars = 0

  for (let i = 0; i < newRegion.length; i++) {
    current += newRegion[i]
    const ch = newRegion[i]
    const next = newRegion[i + 1]
    if ((ch === '.' || ch === '!' || ch === '?') && next && /\s/.test(next)) {
      const lastWord = current.trim().split(/\s/).pop() || ''
      if (/^\d+\.$/.test(lastWord)) continue
      if (/^[A-Z][a-z]?\.$/.test(lastWord)) continue
      sentences.push(current.trim())
      current = ''
    }
  }

  for (const sentence of sentences) {
    if (sentence.length < 15) {
      advancedChars += sentence.length + 1
      continue
    }
    advancedChars += sentence.length + 1
  }

  return { sentences: sentences.filter((s) => s.length >= 15), advancedChars }
}

class TtsManager {
  private available = false
  private autoPlay = false
  private useBrowserTts = false
  private browserVoice = ''
  private playbackSpeed = 1
  private currentAudio: HTMLAudioElement | null = null
  private isPlaying = false
  private queue: QueueItem[] = []
  private processing = false
  private cache = new Map<string, string>()
  private streamSentencesSent = 0
  private streamActive = false
  private streamDebounceTimer: ReturnType<typeof setTimeout> | null = null
  private streamCallbacks: { onStart?: () => void; onEnd?: () => void } = {}

  async checkAvailability(): Promise<boolean> {
    try {
      const settings = await fetchAuthSettings()
      if (settings.tts_enabled === false) {
        this.available = false
        return false
      }
      const stats = await fetchTtsStats()
      this.playbackSpeed = typeof stats.speed === 'number' ? stats.speed : 1
      if (stats.provider === 'browser') {
        this.useBrowserTts = 'speechSynthesis' in window
        this.browserVoice = typeof stats.voice === 'string' ? stats.voice : ''
        this.available = this.useBrowserTts
        return this.available
      }
      this.useBrowserTts = false
      this.available = stats.provider !== 'disabled' && stats.available !== false
      return this.available
    } catch {
      this.available = false
      return false
    }
  }

  setAutoPlay(value: boolean): void {
    this.autoPlay = value
    if (!value) this.stop()
  }

  getAutoPlay(): boolean {
    return this.autoPlay
  }

  getAvailable(): boolean {
    return this.available
  }

  getIsPlaying(): boolean {
    return this.isPlaying || this.processing
  }

  private findBrowserVoice(): SpeechSynthesisVoice | null {
    if (!this.browserVoice) return null
    const voices = window.speechSynthesis.getVoices()
    const target = this.browserVoice.toLowerCase()
    return (
      voices.find((v) => v.name.toLowerCase() === target) ??
      voices.find((v) => v.name.toLowerCase().includes(target)) ??
      null
    )
  }

  private async synthesize(text: string): Promise<string> {
    const plainText = extractPlainText(text)
    if (!plainText) throw new Error('No text to synthesize')
    if (this.useBrowserTts) return '__browser_tts__'

    let hash = 0
    for (let i = 0; i < plainText.length; i++) {
      hash = (hash << 5) - hash + plainText.charCodeAt(i)
      hash &= hash
    }
    const cacheKey = hash.toString(36)
    if (this.cache.has(cacheKey)) return this.cache.get(cacheKey)!

    const blob = await synthesizeSpeech(plainText)
    const url = URL.createObjectURL(blob)
    this.cache.set(cacheKey, url)
    return url
  }

  private async playBrowser(plainText: string): Promise<void> {
    await new Promise<void>((resolve, reject) => {
      const utterance = new SpeechSynthesisUtterance(plainText)
      const voice = this.findBrowserVoice()
      if (voice) utterance.voice = voice
      utterance.rate = this.playbackSpeed
      utterance.onend = () => {
        this.isPlaying = false
        resolve()
      }
      utterance.onerror = () => {
        this.isPlaying = false
        reject(new Error('Browser TTS error'))
      }
      window.speechSynthesis.speak(utterance)
      this.isPlaying = true
    })
  }

  stop(): void {
    this.streamActive = false
    if (this.streamDebounceTimer) {
      clearTimeout(this.streamDebounceTimer)
      this.streamDebounceTimer = null
    }
    this.streamSentencesSent = 0
    for (const item of this.queue) item.onEnd?.()
    this.queue = []
    this.processing = false
    if (this.useBrowserTts) window.speechSynthesis.cancel()
    if (this.currentAudio) {
      this.currentAudio.pause()
      this.currentAudio.currentTime = 0
      this.currentAudio = null
    }
    this.isPlaying = false
  }

  enqueue(text: string, onStart?: () => void, onEnd?: () => void): void {
    this.queue.push({ text, onStart, onEnd })
    if (!this.processing) void this.processQueue()
  }

  private async processQueue(): Promise<void> {
    if (this.processing) return
    this.processing = true
    while (this.queue.length > 0) {
      const item = this.queue[0]
      try {
        await this.playQueueItem(item)
      } catch {
        /* ignore item errors */
      }
      if (this.queue[0] === item) this.queue.shift()
      if (!this.processing) return
    }
    this.processing = false
  }

  private async playQueueItem(item: QueueItem): Promise<void> {
    if (!this.processing) return
    item.onStart?.()
    try {
      const plainText = extractPlainText(item.text)
      if (!plainText || !this.processing) return
      if (this.useBrowserTts) {
        await this.playBrowser(plainText)
      } else {
        const audioUrl = await this.synthesize(item.text)
        if (!this.processing) return
        await new Promise<void>((resolve, reject) => {
          const audio = new Audio(audioUrl)
          if (this.playbackSpeed !== 1) audio.playbackRate = this.playbackSpeed
          this.currentAudio = audio
          audio.onended = () => {
            this.isPlaying = false
            if (this.currentAudio === audio) this.currentAudio = null
            resolve()
          }
          audio.onerror = () => {
            this.isPlaying = false
            if (this.currentAudio === audio) this.currentAudio = null
            reject(new Error('Audio playback error'))
          }
          audio.onpause = () => {
            if (this.currentAudio !== audio) resolve()
          }
          void audio.play().then(() => {
            this.isPlaying = true
          }).catch(reject)
        })
      }
    } finally {
      item.onEnd?.()
    }
  }

  async play(text: string): Promise<void> {
    this.stop()
    this.processing = true
    await this.playQueueItem({ text })
    this.processing = false
  }

  streamingStart(): void {
    this.streamSentencesSent = 0
    this.streamActive = true
    this.streamCallbacks = {}
  }

  streamingUpdate(accumulatedText: string): void {
    if (!this.streamActive || !this.available || !this.autoPlay) return
    if (this.streamDebounceTimer) return
    this.streamDebounceTimer = setTimeout(() => {
      this.streamDebounceTimer = null
      this.processStreamingSentences(accumulatedText)
    }, 150)
  }

  private processStreamingSentences(accumulatedText: string): void {
    if (!this.streamActive) return
    const stripped = accumulatedText
      .replace(/```[\s\S]*?```/g, '')
      .replace(/```[\s\S]*$/g, '')
    const plainText = extractPlainText(stripped)
    if (!plainText || plainText.length <= this.streamSentencesSent) return

    const newRegion = plainText.substring(this.streamSentencesSent)
    const { sentences, advancedChars } = splitNewSentences(newRegion)
    if (sentences.length === 0) {
      this.streamSentencesSent += advancedChars
      return
    }

    for (const sentence of sentences) {
      this.enqueue(sentence, this.streamCallbacks.onStart, this.streamCallbacks.onEnd)
    }
    this.streamSentencesSent += advancedChars
  }

  streamingAttachCallbacks(onStart?: () => void, onEnd?: () => void): void {
    this.streamCallbacks = { onStart, onEnd }
  }

  streamingEnd(finalText: string): void {
    if (!this.streamActive) return
    this.streamActive = false
    if (this.streamDebounceTimer) {
      clearTimeout(this.streamDebounceTimer)
      this.streamDebounceTimer = null
    }

    const stripped = finalText
      .replace(/```[\s\S]*?```/g, '')
      .replace(/```[\s\S]*$/g, '')
    const plainText = extractPlainText(stripped)
    const remaining = plainText.substring(this.streamSentencesSent).trim()
    if (remaining.length >= 15) {
      this.enqueue(remaining, this.streamCallbacks.onStart, this.streamCallbacks.onEnd)
    }
    this.streamSentencesSent = 0
  }
}

export const ttsManager = new TtsManager()

if (typeof window !== 'undefined') {
  window.addEventListener('beforeunload', () => ttsManager.stop())
}
