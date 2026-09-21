import loadingScreen from '../assets/LoadingScreen.png'

export function GameStartPage() {
  return (
    <main className="game-start-page">
      <img
        className="game-start-page__image"
        src={loadingScreen}
        alt="Pisica și Umbrele — ecranul de start al aventurii prin campusul Observator"
      />
    </main>
  )
}
