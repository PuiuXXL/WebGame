import assert from 'node:assert/strict'
import test from 'node:test'
import { GameInput } from '../src/game/GameInput.ts'

test('a quick tap remains visible long enough for the game to sample it', () => {
  let time = 0
  const input = new GameInput(() => time)

  input.set('right', true)
  time = 10
  input.set('right', false)

  assert.equal(input.isPressed('right'), true)
  time = 89
  assert.equal(input.isPressed('right'), true)
  time = 90
  assert.equal(input.isPressed('right'), false)
})

test('a held direction stops immediately after release', () => {
  let time = 0
  const input = new GameInput(() => time)

  input.set('up', true)
  assert.equal(input.isPressed('up'), true)
  time = 200
  input.set('up', false)

  assert.equal(input.isPressed('up'), false)
})

test('reset cancels held inputs and pending tap movement', () => {
  let time = 0
  const input = new GameInput(() => time)

  input.set('left', true)
  time = 5
  input.set('left', false)
  input.set('down', true)
  input.reset()

  assert.equal(input.isPressed('left'), false)
  assert.equal(input.isPressed('down'), false)
})

test('ACTION does not remain active after a quick tap', () => {
  const input = new GameInput(() => 0)

  input.set('action', true)
  input.set('action', false)

  assert.equal(input.isPressed('action'), false)
})
