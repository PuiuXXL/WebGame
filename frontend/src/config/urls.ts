const configuredPublicAppUrl = import.meta.env.VITE_PUBLIC_APP_URL?.trim()
const configuredRealtimeUrl = import.meta.env.VITE_REALTIME_URL?.trim()

function getPublicAppUrl() {
  const publicAppUrl = configuredPublicAppUrl || window.location.origin

  return publicAppUrl.replace(/\/$/, '')
}

/** The QR carries the pairing code, so an old phone's link stops working on rotation. */
export function getControllerUrl(session: string | null) {
  const base = `${getPublicAppUrl()}/controller`
  return session ? `${base}?s=${encodeURIComponent(session)}` : base
}

/** True when the page is served from localhost while the phone would need a LAN address. */
export function isLoopbackOrigin() {
  const host = new URL(getPublicAppUrl()).hostname
  return host === 'localhost' || host === '127.0.0.1' || host === '[::1]'
}

export function getRealtimeUrl() {
  if (configuredRealtimeUrl) {
    return configuredRealtimeUrl
  }

  const websocketProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
  return `${websocketProtocol}//${window.location.host}/ws`
}
