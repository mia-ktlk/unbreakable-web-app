import { cn } from "@/lib/utils";
import { AlertTriangle, RotateCcw } from "lucide-react";
import { Component, ReactNode } from "react";

interface Props {
  children: ReactNode;
  /** When true, log the error and render nothing instead of a fallback UI. */
  silent?: boolean;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("[ErrorBoundary]", error, errorInfo.componentStack);
  }

  reset = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.silent) {
        return null;
      }

      const showStack = import.meta.env.DEV;

      return (
        <div className="flex min-h-[50vh] items-center justify-center p-6">
          <div
            role="alert"
            className={cn(
              "flex w-full max-w-md flex-col gap-4 rounded-lg border border-destructive/30",
              "bg-background p-5 shadow-lg"
            )}
          >
            <div className="flex items-start gap-3">
              <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-destructive" />
              <div className="space-y-1">
                <p className="text-sm font-medium">Something went wrong</p>
                <p className="text-xs text-muted-foreground">
                  The page hit an unexpected error. You can try again without reloading.
                </p>
              </div>
            </div>

            {showStack && this.state.error?.stack && (
              <pre className="max-h-32 overflow-auto rounded bg-muted p-2 text-[10px] text-muted-foreground whitespace-break-spaces">
                {this.state.error.stack}
              </pre>
            )}

            <button
              type="button"
              onClick={this.reset}
              className={cn(
                "flex items-center justify-center gap-1.5 self-start rounded-md px-3 py-1.5 text-xs font-medium",
                "bg-primary text-primary-foreground hover:opacity-90"
              )}
            >
              <RotateCcw className="h-3.5 w-3.5" />
              Try again
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
