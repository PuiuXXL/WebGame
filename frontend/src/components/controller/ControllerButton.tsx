import { useEffect, useRef, type PointerEvent, type ReactNode } from 'react'
import type { InputKey } from '../../realtime/protocol'

type ControllerButtonProps = {
  inputKey: InputKey
  label: string
  glyph: ReactNode
  variant: 'direction' | 'action'
  pressed: boolean
  disabled?: boolean
  onInputChange: (key: InputKey, pressed: boolean) => void
}

export function ControllerButton({
  inputKey,
  label,
  glyph,
  variant,
  pressed,
  disabled = false,
  onInputChange,
}: ControllerButtonProps) {
  const pressedRef = useRef(false)
  useEffect(() => {
    pressedRef.current = pressed
  }, [pressed])

  function press(event: PointerEvent<HTMLButtonElement>) {
    event.preventDefault()
    if (pressedRef.current || disabled) {
      return
    }

    // Keeps the release firing even if the thumb slides off the button.
    event.currentTarget.setPointerCapture(event.pointerId)
    pressedRef.current = true
    onInputChange(inputKey, true)

    if ('vibrate' in navigator) {
      navigator.vibrate(12)
    }
  }

  function release() {
    if (!pressedRef.current) {
      return
    }

    pressedRef.current = false
    onInputChange(inputKey, false)
  }

  return (
    <button
      className={[
        'pad-button',
        `pad-button--${variant}`,
        `pad-button--${inputKey}`,
        pressed ? 'pad-button--pressed' : '',
      ]
        .filter(Boolean)
        .join(' ')}
      type="button"
      disabled={disabled}
      aria-label={label}
      onPointerDown={press}
      onPointerUp={release}
      onPointerCancel={release}
      onLostPointerCapture={release}
      onDragStart={(event) => event.preventDefault()}
      onContextMenu={(event) => event.preventDefault()}
    >
      <span className="pad-button__glyph" aria-hidden="true">
        {glyph}
      </span>
      <span className="pad-button__label">{label}</span>
    </button>
  )
}
