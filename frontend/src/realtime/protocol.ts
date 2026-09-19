export const INPUT_KEYS = ['left', 'right', 'jump', 'action'] as const

export type InputKey = (typeof INPUT_KEYS)[number]
export type ClientRole = 'game' | 'controller'

export type InputMessage = {
  type: 'input'
  key: InputKey
  pressed: boolean
}

export type InputResetMessage = {
  type: 'input_reset'
}

export type StatusMessage = {
  type: 'status'
  status: string
}

export type ErrorMessage = {
  type: 'error'
  code: string
  message: string
}

export type ServerMessage =
  | InputMessage
  | InputResetMessage
  | StatusMessage
  | ErrorMessage

export type InputState = Record<InputKey, boolean>

export function createEmptyInputState(): InputState {
  return {
    left: false,
    right: false,
    jump: false,
    action: false,
  }
}

export function parseServerMessage(rawMessage: string): ServerMessage | null {
  let value: unknown

  try {
    value = JSON.parse(rawMessage)
  } catch {
    return null
  }

  if (!isRecord(value) || typeof value.type !== 'string') {
    return null
  }

  switch (value.type) {
    case 'input':
      if (isInputKey(value.key) && typeof value.pressed === 'boolean') {
        return { type: 'input', key: value.key, pressed: value.pressed }
      }
      return null
    case 'input_reset':
      return { type: 'input_reset' }
    case 'status':
      return typeof value.status === 'string'
        ? { type: 'status', status: value.status }
        : null
    case 'error':
      return typeof value.code === 'string' && typeof value.message === 'string'
        ? { type: 'error', code: value.code, message: value.message }
        : null
    default:
      return null
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function isInputKey(value: unknown): value is InputKey {
  return typeof value === 'string' && INPUT_KEYS.includes(value as InputKey)
}
