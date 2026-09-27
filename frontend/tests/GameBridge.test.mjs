import assert from 'node:assert/strict'
import test from 'node:test'
import { GameBridge, GameState } from '../src/game/bridge.ts'

test('quick controller taps reach both world movement and trivia once', () => {
  const bridge = new GameBridge()
  bridge.setKey('right', true)
  bridge.setKey('right', false)
  assert.equal(bridge.movement.isPressed('right'), true)
  assert.deepEqual([...bridge.consumeEdges()], ['right'])
  assert.equal(bridge.consumeEdges().size, 0)
})

test('disconnect/reset clears held movement, queued taps and trivia actions', () => {
  const bridge = new GameBridge()
  bridge.setKey('up', true)
  bridge.setKey('right', true)
  bridge.setKey('right', false)
  bridge.setKey('action', true)
  bridge.releaseAll()
  for (const key of ['up', 'down', 'left', 'right', 'action']) {
    assert.equal(bridge.input[key], false)
    assert.equal(bridge.movement.isPressed(key), false)
  }
  assert.equal(bridge.consumeEdges().size, 0)
})

test('holding ACTION triggers only one interaction until released', () => {
  const bridge = new GameBridge()
  bridge.setKey('action', true)
  assert.equal(bridge.consumeEdges().has('action'), true)
  bridge.setKey('action', true)
  assert.equal(bridge.consumeEdges().size, 0)
  bridge.setKey('action', false)
  bridge.setKey('action', true)
  assert.equal(bridge.consumeEdges().has('action'), true)
})

test('new game clears medals, wrong answers, hints and cooldowns', () => {
  const state = new GameState(['it', 'tehnic'])
  state.get('it').solved = true
  Object.assign(state.get('tehnic'), {
    wrongAnswers: new Set([1]), hintRevealed: true, cooldownUntil: 1000,
  })
  assert.equal(state.medals, 1)
  state.reset(['it', 'tehnic'])
  assert.equal(state.medals, 0)
  assert.equal(state.get('tehnic').wrongAnswers.size, 0)
  assert.equal(state.get('tehnic').hintRevealed, false)
  assert.equal(state.isCoolingDown('tehnic', 0), false)
})
