import assert from 'node:assert/strict'
import test from 'node:test'
import { createUrlConfig } from '../src/config/urlConfig.ts'

test('public .env origin drives both QR and socket when monitor opens localhost', () => {
  const config = createUrlConfig({ publicAppUrl: 'http://192.0.2.10:5173/', pageOrigin: 'http://localhost:5173' })
  assert.equal(config.controllerUrl('pair-code'), 'http://192.0.2.10:5173/controller?s=pair-code')
  assert.equal(config.realtimeUrl, 'ws://192.0.2.10:5173/ws')
  assert.equal(config.loopback, false)
})

test('HTTPS hosting automatically uses secure WebSockets', () => {
  const config = createUrlConfig({ publicAppUrl: 'https://game.example', pageOrigin: 'http://localhost:5173' })
  assert.equal(config.realtimeUrl, 'wss://game.example/ws')
  assert.equal(config.controllerUrl('a+b&c'), 'https://game.example/controller?s=a%2Bb%26c')
})

test('empty public configuration uses the browser origin', () => {
  const config = createUrlConfig({ publicAppUrl: ' ', realtimeUrl: '', pageOrigin: 'https://game.example' })
  assert.equal(config.realtimeUrl, 'wss://game.example/ws')
  assert.equal(config.controllerUrl(null), 'https://game.example/controller')
})

test('separate realtime endpoint does not change the QR destination', () => {
  const config = createUrlConfig({ publicAppUrl: 'https://game.example', realtimeUrl: 'wss://socket.example/ws', pageOrigin: 'https://game.example' })
  assert.equal(config.realtimeUrl, 'wss://socket.example/ws')
  assert.equal(config.controllerUrl('token'), 'https://game.example/controller?s=token')
})

test('invalid schemes and paths fail with a configuration error', () => {
  for (const publicAppUrl of ['ftp://game.example', 'https://game.example/game']) {
    assert.throws(() => createUrlConfig({ publicAppUrl, pageOrigin: 'https://game.example' }), /VITE_PUBLIC_APP_URL/)
  }
  assert.throws(() => createUrlConfig({ realtimeUrl: 'https://game.example/ws', pageOrigin: 'https://game.example' }), /VITE_REALTIME_URL/)
})
