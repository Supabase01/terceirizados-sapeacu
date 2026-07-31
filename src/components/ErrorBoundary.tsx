import { Component, ErrorInfo, ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { AlertTriangle } from 'lucide-react';

interface Props { children: ReactNode }
interface State { error: Error | null }

class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('[ErrorBoundary]', error, info.componentStack);
  }

  render() {
    const { error } = this.state;
    if (!error) return this.props.children;

    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-background p-6 text-center">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-destructive/10">
          <AlertTriangle className="h-7 w-7 text-destructive" />
        </div>
        <div className="space-y-1">
          <h1 className="text-xl font-semibold text-foreground">Ocorreu um erro ao carregar a tela</h1>
          <p className="text-sm text-muted-foreground max-w-md break-words">{error.message}</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => this.setState({ error: null })}>Tentar novamente</Button>
          <Button onClick={() => { window.location.href = '/'; }}>Voltar ao início</Button>
        </div>
      </div>
    );
  }
}

export default ErrorBoundary;
