import { createUrlConfig } from './urlConfig'

const config = createUrlConfig({
  publicAppUrl: import.meta.env.VITE_PUBLIC_APP_URL,
  realtimeUrl: import.meta.env.VITE_REALTIME_URL,
  pageOrigin: window.location.origin,
})

export const getControllerUrl = config.controllerUrl
export const isLoopbackOrigin = () => config.loopback
export const getRealtimeUrl = () => config.realtimeUrl
