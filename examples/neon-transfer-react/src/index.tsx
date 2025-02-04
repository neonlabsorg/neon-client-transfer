import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import NeonTransferApp from './neon-transfer-app';
import reportWebVitals from './reportWebVitals';
import { ErrorBoundary } from "react-error-boundary";

const handleError = (error: Error, info: React.ErrorInfo) => {
  console.error("Error caught by boundary:", error, info.componentStack ?? "No stack trace available");
};

const ErrorFallback = () => (
  <div role="alert">
    <h2>Something went wrong.</h2>
    <p>Please refresh the page or try again later.</p>
  </div>
);

const root = ReactDOM.createRoot(
  document.getElementById('root') as HTMLElement
);
root.render(
  <React.StrictMode>
    <ErrorBoundary FallbackComponent={ErrorFallback} onError={handleError}>
      <NeonTransferApp />
    </ErrorBoundary>
  </React.StrictMode>
);

reportWebVitals();
