import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import { ErrorBoundary } from './components/ErrorBoundary'
import './styles.css'

function Boot(): React.ReactElement {
  if (!window.typstStudio) {
    return (
      <div className="boot-error">
        <h1>Typst Studio failed to start</h1>
        <p>
          The preload bridge did not load. Try restarting the app or run{' '}
          <code>npm run build</code> then <code>npm run dev</code> again.
        </p>
      </div>
    )
  }
  return <App />
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <Boot />
    </ErrorBoundary>
  </StrictMode>
)
