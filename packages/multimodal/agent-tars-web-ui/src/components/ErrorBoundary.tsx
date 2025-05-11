import React from 'react';

interface Props {
  children: React.ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="error-boundary">
          <h2>应用发生错误</h2>
          <p>请尝试刷新页面。如果问题持续存在，请联系我们的支持团队。</p>
          <pre>{this.state.error?.toString()}</pre>
          <button onClick={() => window.location.reload()}>刷新页面</button>
        </div>
      );
    }

    return this.props.children;
  }
}
