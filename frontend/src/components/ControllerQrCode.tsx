import { QRCodeSVG } from 'qrcode.react'

type ControllerQrCodeProps = {
  url: string
}

export function ControllerQrCode({ url }: ControllerQrCodeProps) {
  return (
    <section className="controller-qr" aria-labelledby="controller-qr-title">
      <h2 id="controller-qr-title">Conectează telefonul</h2>
      <div className="controller-qr__code">
        <QRCodeSVG
          value={url}
          size={280}
          level="M"
          marginSize={4}
          title="Scanează pentru a deschide controllerul jocului"
        />
      </div>
      <a className="controller-qr__url" href={url}>
        {url}
      </a>
    </section>
  )
}
