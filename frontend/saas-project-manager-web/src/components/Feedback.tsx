import { Spinner, Alert, Button } from 'react-bootstrap';

export function LoadingSpinner({ text = 'Loading...' }: { text?: string }) {
  return (
    <div className="d-flex flex-column align-items-center justify-content-center py-5">
      <Spinner animation="border" role="status" />
      <div className="mt-2 text-muted">{text}</div>
    </div>
  );
}

export function ErrorAlert({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <Alert variant="danger" className="d-flex justify-content-between align-items-center">
      <span>{message}</span>
      {onRetry && <Button variant="outline-danger" size="sm" onClick={onRetry}>Retry</Button>}
    </Alert>
  );
}

export function EmptyState({ title, hint }: { title: string; hint?: string }) {
  return (
    <div className="text-center py-5 text-muted">
      <h5>{title}</h5>
      {hint && <p>{hint}</p>}
    </div>
  );
}
