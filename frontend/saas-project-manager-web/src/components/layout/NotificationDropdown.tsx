import { Badge, Dropdown, ListGroup } from 'react-bootstrap';
import { Bell } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { notificationApi } from '../../api/miscApi';
import { useAuthStore } from '../../store/authStore';

function timeAgo(iso: string): string {
  const mins = Math.max(1, Math.round((Date.now() - new Date(iso).getTime()) / 60000));
  if (mins < 60) return `${mins} min ago`;
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return `${hrs} hr ago`;
  return `${Math.round(hrs / 24)} d ago`;
}

export default function NotificationDropdown() {
  const { isAuthenticated } = useAuthStore();
  const { data } = useQuery({
    queryKey: ['notifications-dropdown'],
    queryFn: () => notificationApi.list(1, 6),
    enabled: isAuthenticated,
    refetchInterval: 30000,
  });
  const { data: unread } = useQuery({
    queryKey: ['unread'],
    queryFn: () => notificationApi.unreadCount(),
    enabled: isAuthenticated,
    refetchInterval: 30000,
  });

  return (
    <Dropdown align="end">
      <Dropdown.Toggle variant="light" size="sm" className="border position-relative" aria-label={`Notifications${unread ? `, ${unread} unread` : ''}`}>
        <Bell size={16} aria-hidden />
        {!!unread && (
          <Badge bg="danger" pill className="position-absolute top-0 start-100 translate-middle">
            {unread}
          </Badge>
        )}
      </Dropdown.Toggle>
      <Dropdown.Menu style={{ minWidth: 340 }} className="p-2">
        <div className="d-flex justify-content-between align-items-center px-2 pb-1">
          <strong>Notifications</strong>
          <Link to="/notifications" className="small">
            View all
          </Link>
        </div>
        <ListGroup variant="flush">
          {(data?.items ?? []).map((n) => (
            <ListGroup.Item key={n.id} className="small">
              <div className="fw-semibold">
                {!n.isRead && <span className="text-danger me-1" aria-hidden>●</span>}
                {n.title}
              </div>
              <div className="text-muted text-truncate">{n.message}</div>
              <div className="text-muted" style={{ fontSize: 12 }}>{timeAgo(n.createdAt)}</div>
            </ListGroup.Item>
          ))}
          {(data?.items ?? []).length === 0 && (
            <ListGroup.Item className="small text-muted">No notifications</ListGroup.Item>
          )}
        </ListGroup>
      </Dropdown.Menu>
    </Dropdown>
  );
}
