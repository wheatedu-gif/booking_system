import React, { Component, ErrorInfo, ReactNode } from 'react';

interface Props { children: ReactNode; }
interface State { hasError: boolean; error?: Error; }

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught:', error, errorInfo);
  }

  render() {
    if (this.state.hasError && this.state.error) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-slate-50 p-8">
          <div className="max-w-lg bg-white rounded-2xl shadow-lg border border-red-100 p-8">
            <h2 className="text-xl font-bold text-red-600 mb-4">頁面發生錯誤</h2>
            <pre className="text-sm text-slate-600 overflow-auto bg-slate-50 p-4 rounded-xl mb-4">
              {this.state.error.message}
            </pre>
            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg font-bold hover:bg-blue-700"
            >
              重新載入
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
