import React from 'react';

class ErrorBoundary extends React.Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false, error: null, errorInfo: null };
    }

    static getDerivedStateFromError(error) {
        return { hasError: true };
    }

    componentDidCatch(error, errorInfo) {
        this.setState({ error, errorInfo });
        console.error("Uncaught error:", error, errorInfo);
    }

    render() {
        if (this.state.hasError) {
            return (
                <div className="min-h-screen bg-slate-950 text-white p-10 font-mono">
                    <h1 className="text-3xl text-rose-500 mb-4">Something went wrong.</h1>
                    <div className="bg-slate-900 p-6 rounded-lg border border-rose-900/50">
                        <p className="text-rose-300 font-bold mb-2">{this.state.error && this.state.error.toString()}</p>
                        <pre className="text-xs text-gray-500 overflow-auto whitespace-pre-wrap">
                            {this.state.errorInfo && this.state.errorInfo.componentStack}
                        </pre>
                    </div>
                    <button
                        onClick={() => window.location.reload()}
                        className="mt-6 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded"
                    >
                        Reload Page
                    </button>
                </div>
            );
        }

        return this.props.children;
    }
}

export default ErrorBoundary;
