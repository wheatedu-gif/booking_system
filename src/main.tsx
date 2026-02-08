import React from 'react'
import ReactDom from 'react-dom/client'
import App from './App'
import './index.css'
import { ToastProvider } from './components/Toast'
import { ErrorBoundary } from './components/ErrorBoundary'
import { CustomerProvider } from './hooks/useCustomer'

ReactDom.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ErrorBoundary>
      <ToastProvider>
        <CustomerProvider>
          <App />
        </CustomerProvider>
      </ToastProvider>
    </ErrorBoundary>
  </React.StrictMode>,
)