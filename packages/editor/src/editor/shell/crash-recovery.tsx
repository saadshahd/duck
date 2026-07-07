import { Component, type CSSProperties, type ReactNode } from "react";

type CrashGuardProps = {
  fallback: (error: Error) => ReactNode;
  resetKey?: unknown;
  children: ReactNode;
};

type CrashGuardState = { status: "ok" } | { status: "crashed"; error: Error };

/**
 * Render-error boundary for the editor surface. A crash anywhere in the
 * subtree swaps to `fallback(error)` instead of unmounting the host page to
 * blank. Changing `resetKey` after a crash re-attempts the children.
 */
export class CrashGuard extends Component<CrashGuardProps, CrashGuardState> {
  state: CrashGuardState = { status: "ok" };

  static getDerivedStateFromError(error: Error): CrashGuardState {
    return { status: "crashed", error };
  }

  componentDidCatch(error: Error): void {
    console.error("Duck editor crashed:", error);
  }

  componentDidUpdate(prev: CrashGuardProps): void {
    if (
      this.state.status === "crashed" &&
      prev.resetKey !== this.props.resetKey
    ) {
      this.setState({ status: "ok" });
    }
  }

  render(): ReactNode {
    return this.state.status === "crashed"
      ? this.props.fallback(this.state.error)
      : this.props.children;
  }
}

const noticeStyle: CSSProperties = {
  position: "fixed",
  bottom: "16px",
  left: "50%",
  transform: "translateX(-50%)",
  zIndex: 2147483647,
  display: "flex",
  alignItems: "center",
  gap: "12px",
  padding: "10px 14px",
  borderRadius: "8px",
  background: "rgba(20, 20, 20, 0.92)",
  color: "rgba(255, 255, 255, 0.92)",
  font: "13px/1.4 system-ui, sans-serif",
  boxShadow: "0 4px 16px rgba(0, 0, 0, 0.24)",
};

const resumeStyle: CSSProperties = {
  padding: "4px 10px",
  borderRadius: "6px",
  border: "1px solid rgba(255, 255, 255, 0.32)",
  background: "transparent",
  color: "inherit",
  font: "inherit",
  cursor: "pointer",
};

/**
 * The one honest surface shown while the editor is crashed: names the failure,
 * states that the document survived, and offers a single resume action.
 * Viewport-edge anchored; exists only in the crashed state.
 */
export function RecoveryNotice({ onResume }: { onResume: () => void }) {
  return (
    <div role="alert" data-role="crash-recovery" style={noticeStyle}>
      <span>The editor hit a rendering error — your document is intact.</span>
      <button
        type="button"
        data-role="crash-resume"
        style={resumeStyle}
        onClick={onResume}
      >
        Resume editing
      </button>
    </div>
  );
}
