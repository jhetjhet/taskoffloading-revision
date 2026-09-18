import React from "react";

export class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(e) {
    return { hasError: true, error: e };
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: 32, fontFamily: "monospace" }}>
          <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 8, color: "#dc2626" }}>Runtime Error</div>
          <pre style={{ fontSize: 14, color: "#6b7280" }}>{this.state.error?.toString()}</pre>
        </div>
      );
    }
    return this.props.children;
  }
}

