import { useCallback, useSyncExternalStore } from 'react'
import {
  readEmailBubblesDisabled,
  writeEmailBubblesDisabled,
} from '@/lib/emailPreferences'

const EVENT = 'odysseus:email-bubbles-pref'

function subscribe(onStoreChange: () => void) {
  window.addEventListener(EVENT, onStoreChange)
  window.addEventListener('storage', onStoreChange)
  return () => {
    window.removeEventListener(EVENT, onStoreChange)
    window.removeEventListener('storage', onStoreChange)
  }
}

function getSnapshot() {
  return readEmailBubblesDisabled()
}

/** Whether chat-bubble thread layout is disabled (plain fold view instead). */
export function useEmailBubblesPref() {
  const disabled = useSyncExternalStore(subscribe, getSnapshot, () => false)

  const setDisabled = useCallback((value: boolean) => {
    writeEmailBubblesDisabled(value)
    window.dispatchEvent(new Event(EVENT))
  }, [])

  const toggle = useCallback(() => {
    setDisabled(!readEmailBubblesDisabled())
  }, [setDisabled])

  return { bubblesDisabled: disabled, setBubblesDisabled: setDisabled, toggleBubbles: toggle }
}
