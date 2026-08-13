import React from 'react';

interface Props {
  children: React.ReactNode;
  onClose?: () => void;
}

interface State {
  hasError: boolean;
  message: string;
}

export default class ChatErrorBoundary extends React.Component<Props, State> {
  state: State = { hasError: false, message: '' };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, message: error.message };
  }

  componentDidCatch(error: Error) {
    console.error('AI chat failed to render:', error);
  }

  render() {
    if (!this.state.hasError) return this.props.children;

    return (
      <section className="flex h-full min-h-[320px] w-full flex-col items-center justify-center bg-surface p-6 text-center lg:w-[430px]">
        <span className="material-symbols-outlined text-[36px] text-error">error</span>
        <h3 className="mt-3 text-sm font-semibold text-on-surface">Chat could not be displayed</h3>
        <p className="mt-1 max-w-md text-xs text-secondary">{this.state.message || 'The conversation could not be initialized. Reset the panel and try again.'}</p>
        <div className="mt-4 flex gap-2">
          {this.props.onClose && <button type="button" onClick={this.props.onClose} className="rounded-lg border border-outline-variant px-3 py-2 text-xs font-semibold text-on-surface">Close</button>}
          <button type="button" onClick={() => this.setState({ hasError: false, message: '' })} className="rounded-lg bg-primary px-3 py-2 text-xs font-semibold text-on-primary">Try again</button>
        </div>
      </section>
    );
  }
}
