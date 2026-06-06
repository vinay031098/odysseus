import { useCallback, useEffect, useRef, useState } from 'react'
import { toast } from 'sonner'
import { fetchSttStats, transcribeAudio } from '@/api/chat'

type BrowserSpeechRecognition = {
  continuous: boolean
  interimResults: boolean
  lang: string
  onresult: ((event: { resultIndex: number; results: { isFinal: boolean; [key: number]: { transcript?: string } }[] }) => void) | null
  start: () => void
  stop: () => void
}

function getSpeechRecognitionCtor(): (new () => BrowserSpeechRecognition) | undefined {
  const w = window as Window & {
    SpeechRecognition?: new () => BrowserSpeechRecognition
    webkitSpeechRecognition?: new () => BrowserSpeechRecognition
  }
  return w.SpeechRecognition ?? w.webkitSpeechRecognition
}

function voiceAttachmentFile(blob: Blob): File {
  return new File([blob], `voice-message-${Date.now()}.webm`, { type: 'audio/webm' })
}

export function useVoiceInput(
  onTranscript: (text: string) => void,
  onAttachment?: (file: File) => void,
) {
  const [isRecording, setIsRecording] = useState(false)
  const [provider, setProvider] = useState('disabled')
  const mediaRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const recognitionRef = useRef<BrowserSpeechRecognition | null>(null)
  const transcriptRef = useRef('')

  useEffect(() => {
    void fetchSttStats().then((s) => setProvider(s.provider ?? 'disabled'))
  }, [])

  const attachRecording = useCallback(
    (blob: Blob) => {
      if (!onAttachment) {
        toast.message('Voice recorded (enable attachments to send audio)')
        return
      }
      onAttachment(voiceAttachmentFile(blob))
      toast.message('Voice added as attachment')
    },
    [onAttachment],
  )

  const stopRecognition = useCallback(() => {
    const rec = recognitionRef.current
    if (rec) {
      try {
        rec.stop()
      } catch {
        /* ignore */
      }
      recognitionRef.current = null
    }
    const text = transcriptRef.current.trim()
    transcriptRef.current = ''
    return text
  }, [])

  const startRecognition = useCallback(() => {
    const Ctor = getSpeechRecognitionCtor()
    if (!Ctor) return
    transcriptRef.current = ''
    const rec = new Ctor()
    rec.continuous = true
    rec.interimResults = false
    rec.onresult = (event) => {
      for (let i = event.resultIndex; i < event.results.length; i++) {
        if (event.results[i]?.isFinal) {
          transcriptRef.current += `${event.results[i][0]?.transcript ?? ''} `
        }
      }
    }
    rec.start()
    recognitionRef.current = rec
  }, [])

  const stop = useCallback(async () => {
    setIsRecording(false)
    const recorder = mediaRef.current
    if (recorder && recorder.state !== 'inactive') {
      recorder.stop()
    }
  }, [])

  const start = useCallback(async () => {
    if (isRecording) {
      await stop()
      return
    }
    if (!window.isSecureContext) {
      toast.error('Microphone requires HTTPS or localhost')
      return
    }
    if (!navigator.mediaDevices?.getUserMedia) {
      toast.error('Microphone not supported in this browser')
      return
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      chunksRef.current = []
      const recorder = new MediaRecorder(stream, { mimeType: 'audio/webm' })
      mediaRef.current = recorder

      if (provider === 'browser') startRecognition()

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data)
      }

      recorder.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop())
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' })

        if (provider === 'browser') {
          const text = stopRecognition()
          if (text) onTranscript(text)
          else {
            toast.message('No speech detected')
            attachRecording(blob)
          }
          return
        }

        if (provider === 'local' || provider.startsWith('endpoint:')) {
          try {
            toast.message('Transcribing…')
            const result = await transcribeAudio(blob)
            if (result.text) onTranscript(result.text)
            else toast.message('No speech detected')
          } catch (err) {
            toast.error(err instanceof Error ? err.message : 'Transcription failed')
            attachRecording(blob)
          }
          return
        }

        attachRecording(blob)
      }

      recorder.start()
      setIsRecording(true)
      toast.message('Recording…')
    } catch {
      toast.error('Could not access microphone')
    }
  }, [attachRecording, isRecording, onTranscript, provider, startRecognition, stop, stopRecognition])

  return { isRecording, provider, start, stop }
}
