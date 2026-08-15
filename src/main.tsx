import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { runM1Proof } from './lib/runM1Proof'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

// M1 checkpoint: proves the in-browser model + branching data mechanic works.
// Console-only for now; superseded by the real engine wiring in M2.
void runM1Proof()
