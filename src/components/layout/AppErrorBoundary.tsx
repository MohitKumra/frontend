import React from 'react';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';

interface AppErrorBoundaryProps {
  children: React.ReactNode;
}

interface AppErrorBoundaryState {
  hasError: boolean;
}

export class AppErrorBoundary extends React.Component<AppErrorBoundaryProps, AppErrorBoundaryState> {
  state: AppErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError(): AppErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: unknown) {
    console.error('App boundary caught an error:', error);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="p-6 max-w-2xl mx-auto">
          <Card className="p-8 text-center">
            <p className="text-lg font-bold text-text-primary">Something went wrong</p>
            <p className="text-sm text-text-muted mt-2">Try refreshing the page or going back to the dashboard.</p>
            <Button className="mt-5" onClick={() => window.location.assign('/')}>Go Home</Button>
          </Card>
        </div>
      );
    }

    return this.props.children;
  }
}
