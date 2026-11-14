import { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error in ErrorBoundary:', error, errorInfo);
  }

  private handleRetry = () => {
    this.setState({ hasError: false, error: null });
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div
          role="alert"
          className="flex min-h-screen flex-col items-center justify-center p-6 text-slate-100"
          style={{ backgroundColor: '#070B14' }}
        >
          <div
            className="w-full max-w-md p-6 rounded-lg border text-center shadow-xl"
            style={{
              backgroundColor: '#0F1626',
              borderColor: '#1E2A40',
            }}
          >
            <h1 className="text-lg font-bold text-white mb-2">
              Application Error
            </h1>
            <p className="text-sm text-slate-300 mb-4">
              An unexpected error occurred while rendering the Earth Information Jukebox.
            </p>
            {this.state.error && (
              <pre
                className="p-3 mb-6 text-xs text-left text-red-300 rounded font-mono overflow-auto max-h-32 border"
                style={{
                  backgroundColor: '#070B14',
                  borderColor: '#1E2A40',
                }}
              >
                {this.state.error.message}
              </pre>
            )}
            <button
              type="button"
              onClick={this.handleRetry}
              className="px-5 py-2.5 rounded font-medium text-sm text-white transition-colors"
              style={{ backgroundColor: '#1E5BD8' }}
            >
              Retry
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
