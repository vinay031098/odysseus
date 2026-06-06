import { useCallback, useEffect, useRef, useState } from 'react'
import { Mic, Square, Volume2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ttsManager } from '@/lib/ttsManager'
import { cn } from '@/lib/utils'

interface VoiceInputButtonProps {
  disabled?: boolean
  isRecording: boolean
  onToggle: () => void
}

export function VoiceInputButton({ disabled, isRecording, onToggle }: VoiceInputButtonProps) {
  return (
    <Button
      type="button"
      variant={isRecording ? 'destructive' : 'ghost'}
      size="icon"
      disabled={disabled}
      onClick={onToggle}
      aria-label={isRecording ? 'Stop recording' : 'Voice input'}
    >
      {isRecording ? <Square className="h-4 w-4 fill-current" /> : <Mic className="h-4 w-4" />}
    </Button>
  )
}

interface TtsAutoPlayToggleProps {
  enabled: boolean
  disabled?: boolean
  onChange: (value: boolean) => void
}

export function TtsAutoPlayToggle({ enabled, disabled, onChange }: TtsAutoPlayToggleProps) {
  const [available, setAvailable] = useState(false)

  useEffect(() => {
    void ttsManager.checkAvailability().then(setAvailable)
  }, [])

  useEffect(() => {
    ttsManager.setAutoPlay(enabled)
  }, [enabled])

  if (!available) return null

  return (
    <Button
      type="button"
      variant={enabled ? 'secondary' : 'ghost'}
      size="icon"
      disabled={disabled}
      onClick={() => onChange(!enabled)}
      aria-label={enabled ? 'Disable auto read-aloud' : 'Enable auto read-aloud'}
      title={enabled ? 'Auto read-aloud on' : 'Auto read-aloud off'}
    >
      <Volume2 className={cn('h-4 w-4', enabled && 'text-primary')} />
    </Button>
  )
}

interface TtsButtonProps {
  text: string
  disabled?: boolean
  autoPlay?: boolean
  isStreaming?: boolean
}

export function TtsButton({ text, disabled, autoPlay = false, isStreaming = false }: TtsButtonProps) {
  const [available, setAvailable] = useState(false)
  const [playing, setPlaying] = useState(false)
  const streamStartedRef = useRef(false)

  const resetButton = useCallback(() => setPlaying(false), [])
  const markPlaying = useCallback(() => setPlaying(true), [])

  useEffect(() => {
    void ttsManager.checkAvailability().then(setAvailable)
  }, [])

  useEffect(() => {
    if (!available || !autoPlay) return
    if (isStreaming) {
      if (!streamStartedRef.current) {
        ttsManager.streamingStart()
        streamStartedRef.current = true
      }
      ttsManager.streamingAttachCallbacks(markPlaying, resetButton)
      ttsManager.streamingUpdate(text)
      return
    }
    if (streamStartedRef.current) {
      streamStartedRef.current = false
      ttsManager.streamingAttachCallbacks(markPlaying, resetButton)
      ttsManager.streamingEnd(text)
      if (ttsManager.getIsPlaying()) setPlaying(true)
    }
  }, [autoPlay, available, isStreaming, markPlaying, resetButton, text])

  if (!available || !text.trim()) return null

  const toggle = async () => {
    if (ttsManager.getIsPlaying()) {
      ttsManager.stop()
      setPlaying(false)
      return
    }
    setPlaying(true)
    ttsManager.enqueue(
      text,
      () => setPlaying(true),
      () => setPlaying(false),
    )
  }

  return (
    <button
      type="button"
      className={cn(
        'ai-tts-button rounded px-1.5 py-0.5 text-xs hover:bg-muted',
        playing && 'text-primary',
      )}
      disabled={disabled}
      title={playing ? 'Stop' : 'Read aloud'}
      onClick={() => void toggle()}
    >
      {playing ? 'Stop' : 'Listen'}
    </button>
  )
}
