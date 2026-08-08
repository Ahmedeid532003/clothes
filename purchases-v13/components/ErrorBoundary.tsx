import React, { Component, ErrorInfo, ReactNode } from "react";

interface Props {
  children?: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  // @ts-ignore
  public state: State;
  // @ts-ignore
  public props: Props;

  constructor(props: Props) {
    super(props);
    this.props = props;
    this.state = { hasError: false, error: null };
  }

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught error:", error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return this.props.fallback || (
        <div className="p-4 bg-red-50 text-red-500 rounded-lg border border-red-200 z-50 relative w-full">
          <h2 className="font-bold">Something went wrong.</h2>
          <pre className="text-xs mt-2 overflow-auto">{this.state.error?.message}</pre>
          <button 
            // @ts-ignore
            onClick={() => this.setState({ hasError: false, error: null })} 
            className="mt-2 bg-red-100 text-red-700 px-3 py-1 rounded"
          >
            Retry
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
