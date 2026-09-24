import { Badge } from 'react-bootstrap';
import { ProjectStatusLabels, TaskPriorityLabels, TaskStatusLabels } from '../../types';

export function StatusBadge({ status }: { status: number }) {
  const map = ['primary', 'info', 'warning', 'success'] as const;
  return <Badge bg={map[status] ?? 'secondary'}>{TaskStatusLabels[status] ?? status}</Badge>;
}

export function PriorityBadge({ priority }: { priority: number }) {
  const map = ['secondary', 'info', 'warning', 'danger'] as const;
  return <Badge bg={map[priority] ?? 'secondary'}>{TaskPriorityLabels[priority] ?? priority}</Badge>;
}

export function ProjectStatusBadge({ status }: { status: number }) {
  const map = ['secondary', 'primary', 'success', 'dark'] as const;
  return <Badge bg={map[status] ?? 'secondary'}>{ProjectStatusLabels[status] ?? status}</Badge>;
}

export function RoleBadge({ role }: { role: string }) {
  const v =
    role === 'Owner' ? 'primary' : role === 'Admin' ? 'danger' : role === 'Manager' ? 'warning' : 'secondary';
  return (
    <Badge bg={v} text={role === 'Manager' ? 'dark' : undefined}>
      {role}
    </Badge>
  );
}
