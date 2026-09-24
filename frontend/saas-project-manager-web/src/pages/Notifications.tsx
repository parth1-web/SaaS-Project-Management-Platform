import { Card, Button, Badge } from 'react-bootstrap';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { notificationApi } from '../api/miscApi';
import { LoadingSpinner, ErrorAlert, EmptyState } from '../components/Feedback';

export default function Notifications() {
  const qc = useQueryClient();
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['notifications'],
    queryFn: () => notificationApi.list(1, 50),
  });

  const readMut = useMutation({
    mutationFn: (id: string) => notificationApi.markRead(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['notifications'] }),
  });
  const allMut = useMutation({
    mutationFn: () => notificationApi.markAllRead(),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['notifications'] }),
  });

  if (isLoading) return <LoadingSpinner />;
  if (isError) return <ErrorAlert message="Failed to load notifications" onRetry={() => refetch()} />;

  return (
    <>
      <div className="d-flex justify-content-between align-items-center mb-3">
        <h3>Notifications</h3>
        <Button variant="outline-primary" size="sm" onClick={() => allMut.mutate()}>Mark all as read</Button>
      </div>
      {!data?.items.length ? (
        <EmptyState title="No notifications." />
      ) : (
        data.items.map((n) => (
          <Card key={n.id} className="shadow-sm mb-2">
            <Card.Body className="d-flex justify-content-between align-items-start">
              <div>
                <div className="fw-semibold">{n.title} {!n.isRead && <Badge bg="danger">New</Badge>}</div>
                <div className="text-muted">{n.message}</div>
                <div className="text-muted small">{new Date(n.createdAt).toLocaleString()}</div>
              </div>
              {!n.isRead && <Button size="sm" variant="outline-secondary" onClick={() => readMut.mutate(n.id)}>Mark read</Button>}
            </Card.Body>
          </Card>
        ))
      )}
    </>
  );
}
