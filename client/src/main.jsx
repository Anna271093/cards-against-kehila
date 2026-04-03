import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }
  componentDidCatch(error, info) {
    console.error('App error:', error, info);
  }
  render() {
    if (this.state.hasError) {
      return (
        <div style={{ color: 'white', padding: 40, textAlign: 'center', direction: 'rtl' }}>
          <h1>שגיאה</h1>
          <pre style={{ color: '#f88', fontSize: 14, whiteSpace: 'pre-wrap' }}>
            {this.state.error?.message}
          </pre>
          <button
            onClick={() => window.location.reload()}
            style={{ marginTop: 20, padding: '10px 30px', fontSize: 16 }}
          >
            טען מחדש
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <ErrorBoundary>
    <App />
  </ErrorBoundary>
);
