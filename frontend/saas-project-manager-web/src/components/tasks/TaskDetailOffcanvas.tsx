import { useState } from 'react';
import { Badge, Button, Form, Offcanvas } from 'react-bootstrap';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Paperclip, Send } from 'lucide-react';
import { taskApi, commentApi } from '../../api/taskApi';
import { attachmentApi } from '../../api/miscApi';
import { PriorityBadge, StatusBadge } from '../ui/Badges';
import { Avatar } from '../ui/Avatar';
import { LoadingState } from '../ui/States';
import { useToastStore } from '../../store/toastStore';
import ConfirmModal from '../ui/ConfirmModal';
import type { TaskFormValues } from './TaskFormModal';
import TaskFormModal from './TaskFormModal';

export default function TaskDetailOffcanvas({
  taskId,
  show,
  onClose,
}: {
  taskId: string | null;
  show: boolean;
  onClose: () => void;
}) {
  const qc = useQueryClient();
  const { push } = useToastStore();
  const [comment, setComment] = useState('');
  const [editing, setEditing] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const taskQ = useQuery({
    queryKey: ['task', taskId],
    queryFn: () => taskApi.get(taskId!),
    enabled: !!taskId && show,
  });
  const commentsQ = useQuery({
    queryKey: ['comments', taskId],
    queryFn: () => commentApi.list(taskId!, 1, 50),
    enabled: !!taskId && show,
  });
  const attachmentsQ = useQuery({
    queryKey: ['attachments', taskId],
    queryFn: () => attachmentApi.list(taskId!),
    enabled: !!taskId && show,
  });

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ['task', taskId] });
    qc.invalidateQueries({ queryKey: ['tasks'] });
    qc.invalidateQueries({ queryKey: ['comments', taskId] });
    qc.invalidateQueries({ queryKey: ['attachments', taskId] });
    qc.invalidateQueries({ queryKey: ['dashboard'] });
  };

  const commentMut = useMutation({
    mutationFn: () => commentApi.create(taskId!, comment),
    onSuccess: () => {
      setComment('');
      invalidate();
      push('Comment added successfully.');
    },
  });

  const statusMut = useMutation({
    mutationFn: (status: number) => taskApi.updateStatus(taskId!, status),
    onSuccess: () => {
      invalidate();
      push('Task updated successfully.');
    },
  });

  const updateMut = useMutation({
    mutationFn: (v: TaskFormValues) =>
      taskApi.update(taskId!, {
        title: v.title,
        description: v.description,
        priority: v.priority,
        status: v.status,
        dueDate: v.dueDate ? new Date(v.dueDate).toISOString() : undefined,
        assignedTo: v.assignedTo || undefined,
      }),
    onSuccess: () => {
      setEditing(false);
      invalidate();
      push('Task updated successfully.');
    },
  });

  const deleteMut = useMutation({
    mutationFn: () => taskApi.remove(taskId!),
    onSuccess: () => {
      setConfirmDelete(false);
      onClose();
      qc.invalidateQueries({ queryKey: ['tasks'] });
      push('Task deleted.');
    },
  });

  const uploadMut = useMutation({
    mutationFn: (f: File) => attachmentApi.upload(taskId!, f),
    onSuccess: () => {
      invalidate();
      push('Attachment uploaded.');
    },
    onError: () => push('Upload failed (10MB max).', 'danger'),
  });

  const task = taskQ.data;

  return (
    <>
      <Offcanvas show={show} onHide={onClose} placement="end" style={{ width: 480 }} aria-label="Task details">
        <Offcanvas.Header closeButton>
          <Offcanvas.Title>Task Details</Offcanvas.Title>
        </Offcanvas.Header>
        <Offcanvas.Body>
          {!taskId || taskQ.isLoading ? (
            <LoadingState text="Loading task..." />
          ) : !task ? (
            <div className="text-muted">Task not found.</div>
          ) : (
            <>
              <h5 className="mb-2">{task.title}</h5>
              <div className="d-flex gap-2 mb-3 flex-wrap">
                <StatusBadge status={task.status} />
                <PriorityBadge priority={task.priority} />
                <Badge bg="light" text="dark" className="border fw-normal">
                  {task.projectName}
                </Badge>
              </div>

              <div className="small text-muted mb-1 fw-semibold">Description</div>
              <p className="small">{task.description || 'No description'}</p>
              <hr />

              <div className="row g-2 small mb-2">
                <div className="col-6">
                  <div className="text-muted fw-semibold">Assignee</div>
                  <div className="d-flex align-items-center gap-2 mt-1">
                    {task.assigneeName ? <Avatar name={task.assigneeName} size={26} /> : null}
                    <span>{task.assigneeName ?? 'Unassigned'}</span>
                  </div>
                </div>
                <div className="col-6">
                  <div className="text-muted fw-semibold">Due Date</div>
                  <div className="mt-1">{task.dueDate ? new Date(task.dueDate).toLocaleDateString() : '—'}</div>
                </div>
              </div>

              <div className="small text-muted fw-semibold mb-1">Status</div>
              <div className="d-flex gap-1 flex-wrap mb-2">
                {['Todo', 'In Progress', 'Review', 'Completed'].map((s, i) => (
                  <Button
                    key={s}
                    size="sm"
                    variant={task.status === i ? 'primary' : 'outline-primary'}
                    onClick={() => statusMut.mutate(i)}
                    aria-pressed={task.status === i}
                  >
                    {s}
                  </Button>
                ))}
              </div>

              <div className="d-flex gap-2 mb-3">
                <Button size="sm" variant="light" className="border" onClick={() => setEditing(true)}>
                  Edit
                </Button>
                <Button size="sm" variant="outline-danger" onClick={() => setConfirmDelete(true)}>
                  Delete
                </Button>
              </div>
              <hr />

              <div className="fw-semibold mb-2">Comments ({commentsQ.data?.totalCount ?? 0})</div>
              {(commentsQ.data?.items ?? []).map((c) => (
                <div key={c.id} className="d-flex gap-2 mb-2">
                  <Avatar name={c.userName} size={28} />
                  <div className="sm-card p-2 flex-grow-1">
                    <div className="small">
                      <strong>{c.userName}</strong>{' '}
                      <span className="text-muted">{new Date(c.createdAt).toLocaleString()}</span>
                    </div>
                    <div className="small">{c.content}</div>
                  </div>
                </div>
              ))}
              <div className="d-flex gap-2 mt-2">
                <Form.Control
                  size="sm"
                  placeholder="Write a comment..."
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  aria-label="Write a comment"
                />
                <Button size="sm" onClick={() => commentMut.mutate()} disabled={!comment.trim() || commentMut.isPending} aria-label="Send comment">
                  <Send size={14} aria-hidden />
                </Button>
              </div>
              <hr />

              <div className="fw-semibold mb-2">Attachments ({attachmentsQ.data?.length ?? 0})</div>
              <Form.Group className="mb-2">
                <Form.Control
                  size="sm"
                  type="file"
                  aria-label="Upload attachment"
                  onChange={(e) => {
                    const f = (e.target as HTMLInputElement).files?.[0];
                    if (f) uploadMut.mutate(f);
                  }}
                />
              </Form.Group>
              {(attachmentsQ.data ?? []).map((a) => (
                <div key={a.id} className="d-flex justify-content-between align-items-center border-bottom py-1 small">
                  <span className="d-inline-flex align-items-center gap-1 text-truncate">
                    <Paperclip size={12} aria-hidden /> {a.fileName}
                  </span>
                  <Button
                    size="sm"
                    variant="link"
                    onClick={() => attachmentApi.remove(a.id).then(() => invalidate())}
                    aria-label={`Delete ${a.fileName}`}
                  >
                    Delete
                  </Button>
                </div>
              ))}
            </>
          )}
        </Offcanvas.Body>
      </Offcanvas>

      {task && (
        <TaskFormModal
          show={editing}
          title="Edit Task"
          initial={{
            title: task.title,
            description: task.description ?? '',
            priority: task.priority,
            status: task.status,
            dueDate: task.dueDate ? task.dueDate.slice(0, 10) : '',
            assignedTo: task.assignedTo ?? '',
          }}
          busy={updateMut.isPending}
          onClose={() => setEditing(false)}
          onSubmit={(v) => updateMut.mutate(v)}
        />
      )}
      <ConfirmModal
        show={confirmDelete}
        title="Delete Task?"
        body="This action cannot be undone."
        confirmLabel="Delete Task"
        onCancel={() => setConfirmDelete(false)}
        onConfirm={() => deleteMut.mutate()}
        busy={deleteMut.isPending}
      />
    </>
  );
}
