import { useRef, useState, type PointerEvent } from 'react'
import type { InputKey } from '../../realtime/protocol'

type ControllerButtonProps = {
  inputKey: InputKey
  label: string
  onInputChange: (key: InputKey, pressed: boolean) => void
}

export function ControllerButton({
  inputKey,
  label,
  onInputChange,
}: ControllerButtonProps) {
  const pressedRef = useRef(false)
  const [pressed, setPressed] = useState(false)

  function press(event: PointerEvent<HTMLButtonElement>) {
    event.preventDefault()
    if (pressedRef.current) {
      return
    }

    event.currentTarget.setPointerCapture(event.pointerId)
    pressedRef.current = true
    setPressed(true)
    onInputChange(inputKey, true)
  }

  function release() {
    if (!pressedRef.current) {
      return
    }

    pressedRef.current = false
    setPressed(false)
    onInputChange(inputKey, false)
  }

  return (
    <button
      className={`controller-button controller-button--${inputKey}${pressed ? ' controller-button--pressed' : ''}`}
      type="button"
      aria-label={inputKey.toUpperCase()}
      onPointerDown={press}
      onPointerUp={release}
      onPointerCancel={release}
      onLostPointerCapture={release}
      onDragStart={(event) => event.preventDefault()}
      onContextMenu={(event) => event.preventDefault()}
    >
      {label}
    </button>
  )
}
