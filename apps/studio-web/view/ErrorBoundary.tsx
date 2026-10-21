/**
 * A diagram that fails to render says so, rather than leaving the view blank (in a chat, the user would see an
 * empty card), and the error goes to the view's analytics.
 */
import { Component, type ReactNode } from 'react';
import { track } from './analytics';

export class ErrorBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch(error: unknown) {
    track('view_crashed', { error: String((error as Error)?.name ?? 'Error').slice(0, 60) });
  }

  render() {
    return this.state.failed ? <p className="ec-mcp-message">Something went wrong showing this diagram. Ask for it again to show it afresh.</p> : this.props.children;
  }
}
