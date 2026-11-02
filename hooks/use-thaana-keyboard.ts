import type { KeyboardEvent, RefObject } from 'react'
import { useCallback } from 'react'
import { getThaanaChar } from '@/lib/thaana-keyboard'

type ThaanaInputElement = HTMLTextAreaElement | HTMLInputElement

interface UseThaanaKeyboardOptions {
  enabled: boolean
  value: string
  setValue: (value: string) => void
  textareaRef: RefObject<ThaanaInputElement | null>
}

export const PASSTHROUGH_KEYS = new Set([
  'Backspace',
  'Delete',
  'Enter',
  'Tab',
  'Escape',
  'ArrowLeft',
  'ArrowRight',
  'ArrowUp',
  'ArrowDown',
  'Home',
  'End',
  'PageUp',
  'PageDown',
])

export function useThaanaKeyboard({
  enabled,
  value,
  setValue,
  textareaRef,
}: UseThaanaKeyboardOptions) {
  const onKeyDown = useCallback(
    (e: KeyboardEvent<ThaanaInputElement>) => {
      if (!enabled) return
      if (e.ctrlKey || e.metaKey || e.altKey) return
      if (PASSTHROUGH_KEYS.has(e.key)) return

      const thaanaChar = getThaanaChar(e.key)
      if (!thaanaChar) return

      e.preventDefault()

      const textarea = textareaRef.current
      if (!textarea) return

      const start = textarea.selectionStart ?? value.length
      const end = textarea.selectionEnd ?? start
      const newValue = value.slice(0, start) + thaanaChar + value.slice(end)
      const newCursor = start + thaanaChar.length

      setValue(newValue)

      requestAnimationFrame(() => {
        if (textareaRef.current) {
          textareaRef.current.selectionStart = newCursor
          textareaRef.current.selectionEnd = newCursor
        }
      })
    },
    [enabled, value, setValue, textareaRef],
  )

  return { onKeyDown }
}
