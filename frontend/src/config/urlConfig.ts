type UrlOptions = {
  publicAppUrl?: string
  realtimeUrl?: string
  pageOrigin: string
}

/** Both screens use the same public origin, even when the monitor uses localhost. */
export function createUrlConfig(options: UrlOptions) {
  const app = new URL(options.publicAppUrl?.trim() || options.pageOrigin)
  if (!['http:', 'https:'].includes(app.protocol)) {
    throw new Error('VITE_PUBLIC_APP_URL trebuie să înceapă cu http:// sau https://.')
  }
  if (app.pathname !== '/' || app.search || app.hash || app.username || app.password) {
    throw new Error('VITE_PUBLIC_APP_URL trebuie să conțină doar originea, fără /game sau alte căi.')
  }
  const socket = new URL('/ws', app)
  socket.protocol = app.protocol === 'https:' ? 'wss:' : 'ws:'
  const realtimeUrl = options.realtimeUrl?.trim() || socket.href
  if (!['ws:', 'wss:'].includes(new URL(realtimeUrl).protocol)) {
    throw new Error('VITE_REALTIME_URL trebuie să înceapă cu ws:// sau wss://.')
  }
  return {
    realtimeUrl,
    loopback: ['localhost', '127.0.0.1', '[::1]'].includes(app.hostname),
    controllerUrl(session: string | null) {
      const url = new URL('/controller', app)
      if (session) url.searchParams.set('s', session)
      return url.href
    },
  }
}
