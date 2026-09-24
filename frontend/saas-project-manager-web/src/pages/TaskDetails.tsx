import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Button, Card, Col, Form, Row } from 'react-bootstrap';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Paperclip, Send } from 'lucide-react';
import { commentApi, taskApi } from '../api/taskApi';
import { attachmentApi } from '../api/miscApi';
import { PriorityBadge, StatusBadge } from '../components/ui/Badges';
import { Avatar } from '../components/ui/Avatar';
import { ErrorState, LoadingState } from '../components/ui/States';
import PageHeader from '../components/ui/PageHeader';
import TaskFormModal, { type TaskFormValues } from '../components/tasks/TaskFormModal';
import ConfirmModal from '../components/ui/ConfirmModal';
import { useToastStore } from '../store/toastStore';

export default function TaskDetails() {
  const { id = '' } = useParams();
  const qc = useQueryClient();
  const { push } = useToastStore();
  const [comment, setComment] = useState('');
  const [editing, setEditing] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const { data: task, isLoading, isError, refetch } = useQuery({
    queryKey: ['task', id],
    queryFn: () => taskApi.get(id),
  });
  const commentsQ = useQuery({
    queryKey: ['comments', id],
    queryFn: () => commentApi.list(id, 1, 50),
    enabled: !!id,
  });
  const attachmentsQ = useQuery({
    queryKey: ['attachments', id],
    queryFn: () => attachmentApi.list(id),
    enabled: !!id,
  });

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ['task', id] });
    qc.invalidateQueries({ queryKey: ['comments', id] });
    qc.invalidateQueries({ queryKey: ['attachments', id] });
    qc.invalidateQueries({ queryKey: ['tasks'] });
  };

  const commentMut = useMutation({
    mutationFn: () => commentApi.create(id, comment),
    onSuccess: () => {
      setComment('');
      invalidate();
      push('Comment added successfully.');
    },
  });
  const updateMut = useMutation({
    mutationFn: (v: TaskFormValues) =>
      taskApi.update(id, {
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
    mutationFn: () => taskApi.remove(id),
    onSuccess: () => {
      push('Task deleted.');
      window.history.back();
    },
  });
  const uploadMut = useMutation({
    mutationFn: (f: File) => attachmentApi.upload(id, f),
    onSuccess: () => {
      invalidate();
      push('Attachment uploaded.');
    },
  });

  if (isLoading) return <LoadingState text="Loading task..." />;
  if (isError || !task) return <ErrorState message="We couldn't load this task." onRetry={() => refetch()} />;

  return (
    <>
      <Link to={`/projects/${task.projectId}/tasks`} className="small text-muted text-decoration-none d-inline-flex align-items-center gap-1 mb-2">
        <ArrowLeft size={13} aria-hidden /> Back to board
      </Link>
      <PageHeader
        title={task.title}
        subtitle={`${task.projectName} • ${task.commentCount} comments • ${task.attachmentCount} attachments`}
        actions={
          <>
            <StatusBadge status={task.status} />
            <PriorityBadge priority={task.priority} />
            <Button size="sm" variant="light" className="border" onClick={() => setEditing(true)}>
              Edit
            </Button>
            <Button size="sm" variant="outline-danger" onClick={() => setConfirmDelete(true)}>
              Delete
            </Button>
          </>
        }
      />
      <Row className="g-3">
        <Col xs={12} xl={8}>
          <Card className="sm-card mb-3">
            <Card.Body>
              <div className="small text-muted fw-semibold mb-1">Description</div>
              <p>{task.description || 'No description'}</p>
              <div className="row g-2 small">
                <div className="col-6">
                  <div className="text-muted fw-semibold">Assignee</div>
                  <div className="d-flex align-items-center gap-2 mt-1">
                    {task.assigneeName && <Avatar name={task.assigneeName} size={26} />}
                    <span>{task.assigneeName ?? 'Unassigned'}</span>
                  </div>
                </div>
                <div className="col-6">
                  <div className="text-muted fw-semibold">Due Date</div>
                  <div className="mt-1">{task.dueDate ? new Date(task.dueDate).toLocaleDateString() : '—'}</div>
                </div>
              </div>
              <div className="small text-muted fw-semibold mt-3 mb-1">Status</div>
              <div className="d-flex gap-1 flex-wrap">
                {['Todo', 'In Progress', 'Review', 'Completed'].map((s, i) => (
                  <Button
                    key={s}
                    size="sm"
                    variant={task.status === i ? 'primary' : 'outline-primary'}
                    onClick={() => taskApi.updateStatus(id, i).then(() => invalidate())}
                  >
                    {s}
                  </Button>
                ))}
              </div>
            </Card.Body>
          </Card>
          <Card className="sm-card">
            <Card.Body>
              <strong>Comments ({commentsQ.data?.totalCount ?? 0})</strong>
              <div className="d-flex gap-2 mt-2 mb-3">
                <Form.Control
                  size="sm"
                  placeholder="Write a comment..."
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  aria-label="Write a comment"
                />
                <Button size="sm" onClick={() => commentMut.mutate()} disabled={!comment.trim()} aria-label="Send comment">
                  <Send size={14} aria-hidden />
                </Button>
              </div>
              {(commentsQ.data?.items ?? []).map((c) => (
                <div key={c.id} className="d-flex gap-2 mb-2">
                  <Avatar name={c.userName} size={28} />
                  <div className="sm-card p-2 flex-grow-1">
                    <div className="small">
                      <strong>{c.userName}</strong> <span className="text-muted">{new Date(c.createdAt).toLocaleString()}</span>
                    </div>
                    <div className="small">{c.content}</div>
                  </div>
                </div>
              ))}
            </Card.Body>
          </Card>
        </Col>
        <Col xs={12} xl={4}>
          <Card className="sm-card">
            <Card.Body>
              <strong>Attachments ({attachmentsQ.data?.length ?? 0})</strong>
              <Form.Group className="my-2">
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
                  <Button size="sm" variant="link" onClick={() => attachmentApi.remove(a.id).then(() => invalidate())}>
                    Delete
                  </Button>
                </div>
              ))}
            </Card.Body>
          </Card>
        </Col>
      </Row>

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
