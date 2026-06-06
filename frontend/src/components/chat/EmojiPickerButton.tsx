import { useState } from 'react'
import { Smile } from 'lucide-react'
import { Button } from '@/components/ui/button'

const COMMON_EMOJIS = ['😀', '😂', '🙂', '😉', '🤔', '👍', '👎', '❤️', '🔥', '✨', '🎉', '🙏']

interface EmojiPickerButtonProps {
  disabled?: boolean
  onInsert: (emoji: string) => void
}

export function EmojiPickerButton({ disabled, onInsert }: EmojiPickerButtonProps) {
  const [open, setOpen] = useState(false)

  return (
    <div className="relative">
      <Button
        type="button"
        variant="ghost"
        size="icon"
        disabled={disabled}
        aria-label="Insert emoji"
        onClick={() => setOpen((v) => !v)}
      >
        <Smile className="h-4 w-4" />
      </Button>
      {open && (
        <div className="absolute bottom-full right-0 z-10 mb-1 grid w-44 grid-cols-6 gap-1 rounded-lg border border-border bg-background p-2 shadow-lg">
          {COMMON_EMOJIS.map((emoji) => (
            <button
              key={emoji}
              type="button"
              className="rounded p-1 text-lg hover:bg-muted"
              onClick={() => {
                onInsert(emoji)
                setOpen(false)
              }}
            >
              {emoji}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
