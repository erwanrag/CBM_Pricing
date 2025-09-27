//src/shared/components/error/ErrorBoundary.jsx
import React from "react";

// 🚧 Composant de fallback d'erreur React
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error, info) {
    console.error("Erreur capturée par ErrorBoundary :", error, info);
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback || <div>Une erreur est survenue.</div>;
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
