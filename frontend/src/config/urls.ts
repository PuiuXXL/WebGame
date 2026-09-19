const configuredPublicAppUrl = import.meta.env.VITE_PUBLIC_APP_URL?.trim()
const configuredRealtimeUrl = import.meta.env.VITE_REALTIME_URL?.trim()

function getPublicAppUrl() {
  const publicAppUrl = configuredPublicAppUrl || window.location.origin

  return publicAppUrl.replace(/\/$/, '')
}

export function getControllerUrl() {
  return `${getPublicAppUrl()}/controller`
}

export function getRealtimeUrl() {
  if (configuredRealtimeUrl) {
    return configuredRealtimeUrl
  }

  const websocketProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
  return `${websocketProtocol}//${window.location.host}/ws`
}
