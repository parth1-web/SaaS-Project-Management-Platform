import { Card, Badge } from 'react-bootstrap';
import type { TaskItem } from '../types';
import { TaskStatusLabels, TaskPriorityLabels } from '../types';

const priorityVariant = (p: number) => (p === 3 ? 'danger' : p === 2 ? 'warning' : p === 1 ? 'info' : 'secondary');

export default function TaskCard({ task, onClick }: { task: TaskItem; onClick?: () => void }) {
  return (
    <Card className="mb-2 shadow-sm" onClick={onClick} style={{ cursor: onClick ? 'pointer' : 'default' }}>
      <Card.Body className="p-3">
        <div className="fw-semibold">{task.title}</div>
        <div className="d-flex gap-1 flex-wrap mt-2">
          <Badge bg="primary">{TaskStatusLabels[task.status]}</Badge>
          <Badge bg={priorityVariant(task.priority)}>{TaskPriorityLabels[task.priority]}</Badge>
        </div>
        <div className="text-muted small mt-2">
          {task.assigneeName ? `Assigned: ${task.assigneeName}` : 'Unassigned'} •{' '}
          {task.dueDate ? `Due ${new Date(task.dueDate).toLocaleDateString()}` : 'No due date'} •{' '}
          {task.commentCount} comments
        </div>
      </Card.Body>
    </Card>
  );
}
