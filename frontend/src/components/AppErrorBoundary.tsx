import { Component, type ErrorInfo, type ReactNode } from "react";

type Props = { children: ReactNode };
type State = { error: Error | null };

/** Catches render errors so a blank screen becomes a readable message. */
export class AppErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error(error, info.componentStack);
  }

  render(): ReactNode {
    if (this.state.error) {
      return (
        <div className="min-h-dvh bg-[#0c0a0a] px-6 py-10 text-zinc-100">
          <h1 className="text-lg font-semibold text-red-200">
            Something went wrong
          </h1>
          <p className="mt-2 max-w-lg text-sm text-zinc-400">
            Try refreshing the page. If it keeps happening, open the browser
            console (F12 → Console) and share any red error text.
          </p>
          <pre className="mt-4 max-h-48 overflow-auto rounded-lg bg-black/50 p-3 text-xs text-red-100/90">
            {this.state.error.message}
          </pre>
          <button
            type="button"
            className="mt-6 rounded-lg bg-zinc-700 px-4 py-2 text-sm text-white hover:bg-zinc-600"
            onClick={() => this.setState({ error: null })}
          >
            Try again
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
