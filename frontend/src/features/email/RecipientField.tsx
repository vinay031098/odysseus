import { useCallback, useEffect, useId, useRef, useState } from 'react'
import { searchContacts } from '@/api/contacts'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  commitRecipientValue,
  flattenContactSuggestions,
  isCompleteEmailFragment,
  parseExistingEmails,
  splitRecipientsAndFragment,
  type ContactSuggestion,
} from '@/lib/recipientAutocomplete'
import { cn } from '@/lib/utils'

type RecipientFieldProps = {
  id: string
  label: string
  value: string
  onChange: (value: string) => void
  placeholder?: string
  required?: boolean
}

export function RecipientField({
  id,
  label,
  value,
  onChange,
  placeholder,
  required,
}: RecipientFieldProps) {
  const listId = useId()
  const inputRef = useRef<HTMLInputElement>(null)
  const [suggestions, setSuggestions] = useState<ContactSuggestion[]>([])
  const [open, setOpen] = useState(false)
  const [highlight, setHighlight] = useState(0)
  const searchToken = useRef(0)

  const commit = useCallback(
    (email: string) => {
      onChange(commitRecipientValue(value, email))
      setSuggestions([])
      setOpen(false)
      setHighlight(0)
      requestAnimationFrame(() => {
        const input = inputRef.current
        if (!input) return
        input.focus()
        const end = input.value.length
        input.setSelectionRange(end, end)
      })
    },
    [onChange, value],
  )

  useEffect(() => {
    const { fragment } = splitRecipientsAndFragment(value)
    if (!fragment || fragment.length < 1) {
      setSuggestions([])
      setOpen(false)
      return
    }

    const token = ++searchToken.current
    const timer = window.setTimeout(() => {
      void (async () => {
        try {
          const data = await searchContacts(fragment)
          if (token !== searchToken.current) return
          const already = parseExistingEmails(value)
          const items = flattenContactSuggestions(data.results ?? [], already)
          setSuggestions(items)
          setOpen(items.length > 0)
          setHighlight(0)
        } catch {
          if (token !== searchToken.current) return
          setSuggestions([])
          setOpen(false)
        }
      })()
    }, 150)

    return () => window.clearTimeout(timer)
  }, [value])

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    const active = open && suggestions.length > 0 ? suggestions[highlight] : null

    if (open && e.key === 'ArrowDown') {
      e.preventDefault()
      setHighlight((idx) => (idx + 1) % suggestions.length)
      return
    }
    if (open && e.key === 'ArrowUp') {
      e.preventDefault()
      setHighlight((idx) => (idx - 1 + suggestions.length) % suggestions.length)
      return
    }
    if (e.key === 'Enter' || e.key === 'Tab') {
      if (active) {
        e.preventDefault()
        commit(active.email)
        return
      }
      const { fragment } = splitRecipientsAndFragment(value)
      if (e.key === 'Enter' && isCompleteEmailFragment(fragment)) {
        e.preventDefault()
        commit(fragment.trim())
      }
      return
    }
    if (e.key === 'Escape') {
      setOpen(false)
      return
    }
    if (e.key === ',' && active) {
      e.preventDefault()
      commit(active.email)
    }
  }

  return (
    <div className="relative space-y-1">
      <Label htmlFor={id}>{label}</Label>
      <Input
        ref={inputRef}
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={handleKeyDown}
        onBlur={() => {
          window.setTimeout(() => setOpen(false), 200)
        }}
        onFocus={() => {
          if (suggestions.length > 0) setOpen(true)
        }}
        placeholder={placeholder}
        required={required}
        role="combobox"
        aria-expanded={open}
        aria-controls={open ? listId : undefined}
        aria-autocomplete="list"
        autoComplete="off"
      />
      {open && suggestions.length > 0 ? (
        <ul
          id={listId}
          role="listbox"
          className="absolute z-20 mt-1 max-h-48 w-full overflow-y-auto rounded-md border border-border bg-panel py-1 shadow-md"
        >
          {suggestions.map((item, index) => (
            <li
              key={`${item.email}-${index}`}
              role="option"
              aria-selected={index === highlight}
              className={cn(
                'cursor-pointer px-3 py-2 text-sm',
                index === highlight && 'bg-primary/10',
              )}
              onMouseDown={(e) => {
                e.preventDefault()
                commit(item.email)
              }}
              onMouseEnter={() => setHighlight(index)}
            >
              <span className="font-medium">{item.name}</span>
              <span className="ml-2 text-muted">{item.email}</span>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  )
}
