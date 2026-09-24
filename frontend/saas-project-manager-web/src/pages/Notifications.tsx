import { useState } from 'react';
import { Button, Card, Tab, Tabs } from 'react-bootstrap';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { BellOff, CheckCheck } from 'lucide-react';
import { notificationApi } from '../api/miscApi';
import PageHeader from '../components/ui/PageHeader';
import { EmptyState, ErrorState, LoadingState } from '../components/ui/States';
import { useToastStore } from '../store/toastStore';

function timeAgo(iso: string): string {
  const mins = Math.max(1, Math.round((Date.now() - new Date(iso).getTime()) / 60000));
  if (mins < 60) return `${mins} min ago`;
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return `${hrs} hr ago`;
  return `${Math.round(hrs / 24)} d ago`;
}

export default function Notifications() {
  const qc = useQueryClient();
  const { push } = useToastStore();
  const [tab, setTab] = useState<'all' | 'unread' | 'read'>('all');

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['notifications', tab],
    queryFn: () => notificationApi.list(1, 50, tab === 'unread'),
  });

  const readMut = useMutation({
    mutationFn: (id: string) => notificationApi.markRead(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['notifications'] });
      qc.invalidateQueries({ queryKey: ['unread'] });
    },
  });
  const allMut = useMutation({
    mutationFn: () => notificationApi.markAllRead(),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['notifications'] });
      qc.invalidateQueries({ queryKey: ['unread'] });
      push('All notifications marked as read.');
    },
  });

  const items = (data?.items ?? []).filter((n) => {
    if (tab === 'unread') return !n.isRead;
    if (tab === 'read') return n.isRead;
    return true;
  });

  if (isLoading) return <LoadingState text="Loading notifications..." />;
  if (isError) return <ErrorState message="We couldn't load notifications." onRetry={() => refetch()} />;

  return (
    <>
      <PageHeader
        title="Notifications"
        subtitle={`${items.length} messages • realtime + 30s polling`}
        actions={
          <Button size="sm" variant="light" className="border" onClick={() => allMut.mutate()} disabled={allMut.isPending}>
            <CheckCheck size={14} className="me-1" aria-hidden /> Mark all as read
          </Button>
        }
      />
      <Tabs activeKey={tab} onSelect={(k) => setTab((k as typeof tab) ?? 'all')} className="mb-3" aria-label="Notification filters">
        <Tab eventKey="all" title="All" />
        <Tab eventKey="unread" title="Unread" />
        <Tab eventKey="read" title="Read" />
      </Tabs>
      {items.length === 0 ? (
        <EmptyState title="You're all caught up" hint="New assignments, comments and deadlines will appear here." icon={<BellOff size={26} aria-hidden />} />
      ) : (
        items.map((n) => (
          <Card key={n.id} className={`sm-card mb-2 ${n.isRead ? '' : 'border-primary'}`}>
            <Card.Body className="d-flex justify-content-between align-items-start gap-2">
              <div>
                <div className="fw-semibold small">
                  {!n.isRead && <span className="text-danger me-1" aria-hidden>●</span>}
                  {n.title}
                </div>
                <div className="text-muted small">{n.message}</div>
                <div className="text-muted" style={{ fontSize: 12 }}>{timeAgo(n.createdAt)}</div>
              </div>
              {!n.isRead && (
                <Button size="sm" variant="light" className="border" onClick={() => readMut.mutate(n.id)}>
                  Mark read
                </Button>
              )}
            </Card.Body>
          </Card>
        ))
      )}
    </>
  );
}
