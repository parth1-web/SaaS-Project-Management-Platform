import { Alert, Button, Card, Placeholder, Spinner } from 'react-bootstrap';
import type { ReactNode } from 'react';

export function LoadingState({ text = 'Loading...' }: { text?: string }) {
  return (
    <div className="d-flex flex-column align-items-center justify-content-center py-5" role="status" aria-live="polite">
      <Spinner animation="border" />
      <div className="mt-2 text-muted small">{text}</div>
    </div>
  );
}

export function CardSkeletonGrid({ count = 6 }: { count?: number }) {
  return (
    <div className="row g-3">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="col-12 col-sm-6 col-xl-4">
          <Card className="sm-card p-3">
            <Placeholder as={Card.Title} animation="glow">
              <Placeholder xs={7} />
            </Placeholder>
            <Placeholder as={Card.Text} animation="glow">
              <Placeholder xs={10} /> <Placeholder xs={6} />
            </Placeholder>
            <div className="sm-skeleton" style={{ height: 8 }} />
          </Card>
        </div>
      ))}
    </div>
  );
}

export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <Alert variant="danger" className="d-flex justify-content-between align-items-center">
      <div>
        <div className="fw-semibold">Something went wrong</div>
        <div className="small">{message}</div>
      </div>
      {onRetry && (
        <Button variant="outline-danger" size="sm" onClick={onRetry}>
          Try Again
        </Button>
      )}
    </Alert>
  );
}

export function EmptyState({
  title,
  hint,
  action,
  icon,
}: {
  title: string;
  hint?: string;
  action?: ReactNode;
  icon?: ReactNode;
}) {
  return (
    <Card className="sm-card text-center py-5 px-3">
      {icon && <div className="mb-2 text-muted d-flex justify-content-center">{icon}</div>}
      <h5 className="mb-1">{title}</h5>
      {hint && <p className="text-muted small mb-3">{hint}</p>}
      {action}
    </Card>
  );
}
