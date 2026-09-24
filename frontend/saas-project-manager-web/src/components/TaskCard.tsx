import { Badge } from 'react-bootstrap';
import { CalendarDays, MessageSquare, Paperclip } from 'lucide-react';
import type { TaskItem } from '../../types';
import { TaskPriorityLabels } from '../../types';
import { PriorityBadge } from '../ui/Badges';
import { Avatar } from '../ui/Avatar';

function dueLabel(due?: string): { text: string; urgent: boolean } {
  if (!due) return { text: 'No due date', urgent: false };
  const d = new Date(due);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const diff = Math.ceil((d.getTime() - today.getTime()) / 86400000);
  if (diff < 0) return { text: `Overdue ${d.toLocaleDateString()}`, urgent: true };
  if (diff === 0) return { text: 'Today', urgent: true };
  if (diff === 1) return { text: 'Tomorrow', urgent: false };
  return { text: d.toLocaleDateString(), urgent: false };
}

export default function TaskCard({ task, onClick }: { task: TaskItem; onClick?: () => void }) {
  const due = dueLabel(task.dueDate);
  return (
    <article
      className="sm-task-card mb-2"
      onClick={onClick}
      onKeyDown={(e) => {
        if ((e.key === 'Enter' || e.key === ' ') && onClick) {
          e.preventDefault();
          onClick();
        }
      }}
      tabIndex={onClick ? 0 : undefined}
      role={onClick ? 'button' : undefined}
      aria-label={`Task ${task.title}`}
    >
      <div className="fw-semibold" style={{ fontSize: 14 }}>{task.title}</div>
      <div className="d-flex gap-1 align-items-center mt-1 flex-wrap">
        <PriorityBadge priority={task.priority} />
        <span className="small text-muted">{TaskPriorityLabels[task.priority]}</span>
      </div>
      <div className="d-flex justify-content-between align-items-center mt-2">
        <span className="d-inline-flex align-items-center gap-1">
          {task.assigneeName ? (
            <Avatar name={task.assigneeName} size={22} />
          ) : (
            <span className="small text-muted">Unassigned</span>
          )}
          {task.assigneeName && <span className="small text-muted text-truncate" style={{ maxWidth: 90 }}>{task.assigneeName.split(' ')[0]}</span>}
        </span>
        <span className={`small d-inline-flex align-items-center gap-1 ${due.urgent ? 'text-danger fw-semibold' : 'text-muted'}`}>
          <CalendarDays size={12} aria-hidden /> {due.text}
        </span>
      </div>
      {(task.commentCount > 0 || task.attachmentCount > 0) && (
        <div className="d-flex gap-2 mt-1 small text-muted">
          {task.commentCount > 0 && (
            <span className="d-inline-flex align-items-center gap-1">
              <MessageSquare size={12} aria-hidden /> {task.commentCount}
            </span>
          )}
          {task.attachmentCount > 0 && (
            <span className="d-inline-flex align-items-center gap-1">
              <Paperclip size={12} aria-hidden /> {task.attachmentCount}
            </span>
          )}
          <Badge bg="light" text="dark" className="border ms-auto fw-normal">
            #{task.id.slice(0, 6)}
          </Badge>
        </div>
      )}
    </article>
  );
}
