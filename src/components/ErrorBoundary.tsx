'use client';

import React, { Component, ErrorInfo, ReactNode } from 'react';

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
  section?: string; // Name of the section for better error messages
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

/**
 * Error Boundary component that catches render errors in its children
 * and displays a friendly fallback UI instead of crashing the app.
 */
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    // Update state so the next render will show the fallback UI
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    // Log the error for debugging
    console.error('[ErrorBoundary] Caught error:', {
      section: this.props.section || 'Unknown',
      error: error.message,
      stack: error.stack,
      componentStack: errorInfo.componentStack,
    });

    // Store error info in state
    this.setState({ errorInfo });

    // Call optional error handler
    this.props.onError?.(error, errorInfo);
  }

  handleRetry = (): void => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    });
  };

  render(): ReactNode {
    if (this.state.hasError) {
      // Use custom fallback if provided
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // Default fallback UI
      return (
        <div style={styles.container}>
          <div style={styles.card}>
            <div style={styles.icon}>⚠️</div>
            <h3 style={styles.title}>Something went wrong</h3>
            <p style={styles.section}>
              {this.props.section ? `in ${this.props.section}` : 'in this section'}
            </p>
            <p style={styles.message}>
              {this.state.error?.message || 'An unexpected error occurred'}
            </p>
            <button onClick={this.handleRetry} style={styles.retryButton}>
              Try Again
            </button>
            {process.env.NODE_ENV === 'development' && this.state.error && (
              <details style={styles.details}>
                <summary style={styles.summary}>Error Details</summary>
                <pre style={styles.stackTrace}>
                  {this.state.error.stack}
                  {this.state.errorInfo?.componentStack}
                </pre>
              </details>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

/**
 * Higher-order component to wrap components with ErrorBoundary
 */
export function withErrorBoundary<P extends object>(
  WrappedComponent: React.ComponentType<P>,
  options?: { section?: string; fallback?: ReactNode }
): React.FC<P> {
  const WithErrorBoundary: React.FC<P> = (props) => (
    <ErrorBoundary section={options?.section} fallback={options?.fallback}>
      <WrappedComponent {...props} />
    </ErrorBoundary>
  );
  
  WithErrorBoundary.displayName = `withErrorBoundary(${WrappedComponent.displayName || WrappedComponent.name || 'Component'})`;
  
  return WithErrorBoundary;
}

// Styles for the error boundary UI
const styles: { [key: string]: React.CSSProperties } = {
  container: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '200px',
    padding: '24px',
  },
  card: {
    background: 'rgba(239, 68, 68, 0.1)',
    border: '1px solid rgba(239, 68, 68, 0.2)',
    borderRadius: '16px',
    padding: '32px',
    textAlign: 'center',
    maxWidth: '400px',
    width: '100%',
  },
  icon: {
    fontSize: '48px',
    marginBottom: '16px',
  },
  title: {
    color: '#fff',
    fontSize: '1.25rem',
    fontWeight: 600,
    margin: '0 0 8px 0',
  },
  section: {
    color: 'rgba(255, 255, 255, 0.5)',
    fontSize: '0.875rem',
    margin: '0 0 12px 0',
  },
  message: {
    color: 'rgba(239, 68, 68, 0.9)',
    fontSize: '0.875rem',
    margin: '0 0 20px 0',
    wordBreak: 'break-word',
  },
  retryButton: {
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    border: 'none',
    borderRadius: '10px',
    color: '#fff',
    cursor: 'pointer',
    fontSize: '0.875rem',
    fontWeight: 600,
    padding: '12px 24px',
    transition: 'all 0.2s ease',
  },
  details: {
    marginTop: '20px',
    textAlign: 'left',
  },
  summary: {
    color: 'rgba(255, 255, 255, 0.5)',
    cursor: 'pointer',
    fontSize: '0.75rem',
    marginBottom: '8px',
  },
  stackTrace: {
    background: 'rgba(0, 0, 0, 0.3)',
    borderRadius: '8px',
    color: 'rgba(255, 255, 255, 0.6)',
    fontSize: '0.7rem',
    maxHeight: '200px',
    overflow: 'auto',
    padding: '12px',
    whiteSpace: 'pre-wrap',
    wordBreak: 'break-all',
  },
};

export default ErrorBoundary;
