import { Component, type ReactNode } from "react";
import { reportClientError } from "@/lib/reportError";

type Props = { children: ReactNode };
type State = { hasError: boolean };

/**
 * App-wide error boundary: prevents a render crash from showing a blank white
 * screen, reports the error, and offers a recovery path. Uses inline styles so
 * the fallback renders even if the stylesheet failed to load.
 */
class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: unknown, info: { componentStack?: string }) {
    reportClientError(error, { componentStack: info?.componentStack, boundary: "root" });
  }

  private handleReload = () => {
    this.setState({ hasError: false });
    window.location.assign("/");
  };

  render() {
    if (!this.state.hasError) return this.props.children;
    return (
      <div
        style={{
          minHeight: "100dvh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: 24,
          background: "#0f0620",
          color: "#ffffff",
          fontFamily: "'Space Grotesk', sans-serif",
          textAlign: "center",
        }}
      >
        <div style={{ maxWidth: 420 }}>
          <h1 style={{ fontSize: 22, marginBottom: 12 }}>Something went wrong</h1>
          <p style={{ opacity: 0.8, marginBottom: 24, lineHeight: 1.5 }}>
            An unexpected error occurred. Please reload — if it keeps happening, contact support.
          </p>
          <button
            onClick={this.handleReload}
            style={{
              background: "linear-gradient(135deg, #e9d5ff 0%, #c4b5fd 100%)",
              color: "#111827",
              border: "1px solid #a78bfa",
              padding: "12px 28px",
              borderRadius: 8,
              fontWeight: 700,
              fontSize: 16,
              cursor: "pointer",
            }}
          >
            Reload Orbiit
          </button>
        </div>
      </div>
    );
  }
}

export default ErrorBoundary;
