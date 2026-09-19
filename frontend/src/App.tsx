import { Navigate, Route, Routes } from 'react-router-dom'
import { ControllerPage } from './pages/ControllerPage'
import { GamePage } from './pages/GamePage'
import './App.css'

function App() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/game" replace />} />
      <Route path="/game" element={<GamePage />} />
      <Route path="/controller" element={<ControllerPage />} />
      <Route path="*" element={<Navigate to="/game" replace />} />
    </Routes>
  )
}

export default App
