import { lazy, Suspense } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import { ControllerPage } from './pages/ControllerPage'
import { GamePage } from './pages/GamePage'
import { GameStartPage } from './pages/GameStartPage'
import { GameSessionLayout } from './pages/GameSessionLayout'
import './App.css'

const PlayingPage = lazy(() =>
  import('./pages/PlayingPage').then((module) => ({ default: module.PlayingPage })),
)

function App() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/game" replace />} />
      <Route path="/game" element={<GameSessionLayout />}>
        <Route index element={<GamePage />} />
        <Route path="start" element={<GameStartPage />} />
        <Route
          path="play"
          element={
            <Suspense fallback={<main className="page">Se încarcă jocul…</main>}>
              <PlayingPage />
            </Suspense>
          }
        />
      </Route>
      <Route path="/controller" element={<ControllerPage />} />
      <Route path="*" element={<Navigate to="/game" replace />} />
    </Routes>
  )
}

export default App
