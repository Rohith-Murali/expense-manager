import React from 'react';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {}

  render() {
    if (this.state.hasError) {
      return (
        <div className='min-h-screen flex flex-col items-center justify-center bg-gray-50 text-gray-800'>
          <h1 className='text-2xl font-bold mb-4'>Something went wrong.</h1>
          <p className='mb-2'>
            An unexpected error occurred. Please refresh the page or contact support.
          </p>
          <details className='text-sm text-gray-500 whitespace-pre-wrap'>
            {this.state.error && this.state.error.toString()}
          </details>
        </div>
      );
    }
    return this.props.children;
  }
}

export default ErrorBoundary;
