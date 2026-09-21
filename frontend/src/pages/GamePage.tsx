import { ControllerQrCode } from '../components/ControllerQrCode'
import { getControllerUrl } from '../config/urls'

export function GamePage() {
  return (
    <main className="page game-page">
      <h1>Game Screen</h1>
      <ControllerQrCode url={getControllerUrl()} />
    </main>
  )
}
