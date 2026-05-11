// Debug logger must import first so console intercept is active
// before any other module runs.
import './debugLogger';
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';

class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }
  static getDerivedStateFromError() {
    return { hasError: true };
  }
  componentDidCatch(error: Error) {
    console.error('[ErrorBoundary]', error);
  }
  render() {
    if (this.state.hasError) {
      return (
        <div className="flex min-h-screen items-center justify-center bg-vapor-black px-4">
          <div className="text-center">
            <h1 className="text-xl font-bold text-[#ff2aa3] mb-2">Something went wrong</h1>
            <p className="text-sm text-white/60 mb-4">IronLog hit an unexpected error.</p>
            <button
              onClick={() => window.location.reload()}
              className="rounded-full bg-gradient-to-r from-[#ff2aa3] to-[#ff2e88] px-5 py-2 text-sm font-semibold text-white"
            >
              Reload
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </React.StrictMode>
);
