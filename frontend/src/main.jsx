import React from 'react'
import { createRoot } from 'react-dom/client'
import { HashRouter } from 'react-router-dom'
import App from './App.jsx'
import { AuthProvider } from './lib/auth.jsx'
import { ToastProvider } from './lib/ui.jsx'
import { registerServiceWorker } from './lib/pwa.jsx'
import './index.css'

registerServiceWorker()
createRoot(document.getElementById('root')).render(
  <HashRouter><ToastProvider><AuthProvider><App /></AuthProvider></ToastProvider></HashRouter>
)
