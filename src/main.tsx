import React from 'react'
import ReactDom from 'react-dom/client'
import App from './App'
import './index.css'
import { ToastProvider } from './components/Toast'

ReactDom.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ToastProvider>
      <App />
    </ToastProvider>
  </React.StrictMode>,
)