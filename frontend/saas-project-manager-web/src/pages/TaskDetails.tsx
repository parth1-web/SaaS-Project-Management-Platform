import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { Row, Col, Card, Button, Form, Badge } from 'react-bootstrap';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { taskApi, commentApi } from '../api/taskApi';
import { attachmentApi } from '../api/miscApi';
import { TaskStatusLabels, TaskPriorityLabels } from '../types';
import { LoadingSpinner, ErrorAlert } from '../components/Feedback';

export default function TaskDetails() {
  const { id = '' } = useParams();
  const qc = useQueryClient();
  const [comment, setComment] = useState('');
  const [editTitle, setEditTitle] = useState('');
  const [editDesc, setEditDesc] = useState('');
  const [editing, setEditing] = useState(false);

  const { data: task, isLoading, isError, refetch } = useQuery({
    queryKey: ['task', id],
    queryFn: () => taskApi.get(id),
  });
  const commentsQuery = useQuery({
    queryKey: ['comments', id],
    queryFn: () => commentApi.list(id, 1, 50),
    enabled: !!id,
  });
  const attachmentsQuery = useQuery({
    queryKey: ['attachments', id],
    queryFn: () => attachmentApi.list(id),
    enabled: !!id,
  });

  const commentMut = useMutation({
    mutationFn: () => commentApi.create(id, comment),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['comments', id] });
      setComment('');
    },
  });

  const updateMut = useMutation({
    mutationFn: () => taskApi.update(id, {
      title: editTitle,
      description: editDesc,
      priority: task!.priority,
      status: task!.status,
    }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['task', id] });
      setEditing(false);
    },
  });

  const uploadMut = useMutation({
    mutationFn: (file: File) => attachmentApi.upload(id, file),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['attachments', id] }),
  });

  if (isLoading) return <LoadingSpinner />;
  if (isError || !task) return <ErrorAlert message="Failed to load task" onRetry={() => refetch()} />;

  return (
    <>
      <h3 className="mb-3">{task.title}</h3>
      <Row className="g-3">
        <Col lg={8}>
          <Card className="shadow-sm mb-3">
            <Card.Body>
              <div className="d-flex gap-2 mb-2">
                <Badge bg="primary">{TaskStatusLabels[task.status]}</Badge>
                <Badge bg="warning" text="dark">{TaskPriorityLabels[task.priority]}</Badge>
              </div>
              {!editing ? (
                <>
                  <p>{task.description || 'No description'}</p>
                  <div className="text-muted small">
                    Project: {task.projectName} • Assignee: {task.assigneeName ?? 'Unassigned'} • Due: {task.dueDate ? new Date(task.dueDate).toLocaleString() : '—'}
                  </div>
                  <Button size="sm" variant="outline-secondary" className="mt-2" onClick={() => { setEditTitle(task.title); setEditDesc(task.description ?? ''); setEditing(true); }}>
                    Edit
                  </Button>
                </>
              ) : (
                <>
                  <Form.Group className="mb-2"><Form.Label>Title</Form.Label><Form.Control value={editTitle} onChange={(e) => setEditTitle(e.target.value)} /></Form.Group>
                  <Form.Group className="mb-2"><Form.Label>Description</Form.Label><Form.Control as="textarea" rows={3} value={editDesc} onChange={(e) => setEditDesc(e.target.value)} /></Form.Group>
                  <div className="d-flex gap-2">
                    <Button size="sm" onClick={() => updateMut.mutate()}>Save</Button>
                    <Button size="sm" variant="secondary" onClick={() => setEditing(false)}>Cancel</Button>
                  </div>
                </>
              )}
              <hr />
              <h6>Status</h6>
              <div className="d-flex gap-2 flex-wrap">
                {TaskStatusLabels.map((s, i) => (
                  <Button key={s} size="sm" variant={task.status === i ? 'primary' : 'outline-primary'} onClick={() => taskApi.updateStatus(id, i).then(() => qc.invalidateQueries({ queryKey: ['task', id] }))}>
                    {s}
                  </Button>
                ))}
              </div>
            </Card.Body>
          </Card>
          <Card className="shadow-sm">
            <Card.Body>
              <Card.Title>Comments ({commentsQuery.data?.totalCount ?? 0})</Card.Title>
              <div className="d-flex gap-2 mb-3">
                <Form.Control value={comment} onChange={(e) => setComment(e.target.value)} placeholder="Write a comment..." />
                <Button onClick={() => commentMut.mutate()} disabled={!comment.trim()}>Post</Button>
              </div>
              {commentsQuery.data?.items.map((c) => (
                <div key={c.id} className="border-bottom py-2">
                  <div><strong>{c.userName}</strong> <span className="text-muted small">{new Date(c.createdAt).toLocaleString()}</span></div>
                  <div>{c.content}</div>
                </div>
              ))}
            </Card.Body>
          </Card>
        </Col>
        <Col lg={4}>
          <Card className="shadow-sm">
            <Card.Body>
              <Card.Title>Attachments ({attachmentsQuery.data?.length ?? 0})</Card.Title>
              <Form.Group className="mb-2">
                <Form.Control type="file" onChange={(e) => {
                  const f = (e.target as HTMLInputElement).files?.[0];
                  if (f) uploadMut.mutate(f);
                }} />
              </Form.Group>
              {attachmentsQuery.data?.map((a) => (
                <div key={a.id} className="d-flex justify-content-between align-items-center border-bottom py-2 small">
                  <span>{a.fileName} ({Math.round(a.size / 1024)} KB)</span>
                  <Button size="sm" variant="outline-danger" onClick={() => attachmentApi.remove(a.id).then(() => qc.invalidateQueries({ queryKey: ['attachments', id] }))}>
                    Delete
                  </Button>
                </div>
              ))}
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </>
  );
}
