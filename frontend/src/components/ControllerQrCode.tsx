import { QRCodeSVG } from 'qrcode.react'

type ControllerQrCodeProps = {
  url: string
}

export function ControllerQrCode({ url }: ControllerQrCodeProps) {
  return (
    <section className="controller-qr" aria-label="Cod QR pentru controller">
      <div className="controller-qr__code">
        <QRCodeSVG
          value={url}
          size={280}
          level="M"
          marginSize={4}
          title="Scanează pentru a deschide controllerul jocului"
        />
      </div>
    </section>
  )
}
