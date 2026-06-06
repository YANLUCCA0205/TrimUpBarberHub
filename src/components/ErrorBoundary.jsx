import React from 'react';
import { AlertTriangle } from 'lucide-react';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    console.error('ErrorBoundary capturou um erro:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex min-h-screen items-center justify-center bg-background p-4">
          <div className="flex max-w-md flex-col items-center gap-4 rounded-lg border border-border bg-card p-8 text-center shadow-lg">
            <AlertTriangle className="h-12 w-12 text-destructive" />

            <h1 className="text-2xl font-bold text-foreground">
              Algo deu errado
            </h1>

            <p className="text-muted-foreground">
              Ocorreu um erro inesperado. Tente recarregar a página.
            </p>

            <button
              onClick={() => window.location.reload()}
              className="mt-2 rounded-md bg-primary px-6 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
            >
              Recarregar
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
