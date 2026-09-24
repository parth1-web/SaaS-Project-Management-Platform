import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Row, Col, Button, Modal, Form } from 'react-bootstrap';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { taskApi } from '../api/taskApi';
import TaskCard from '../components/TaskCard';
import { LoadingSpinner, ErrorAlert } from '../components/Feedback';
import { getProjectHub } from '../utils/signalr';

const columns = [
  { status: 0, title: 'TODO' },
  { status: 1, title: 'IN PROGRESS' },
  { status: 2, title: 'REVIEW' },
  { status: 3, title: 'COMPLETED' },
];

export default function TaskBoard() {
  const { id: projectId = '' } = useParams();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [show, setShow] = useState(false);
  const [title, setTitle] = useState('');
  const [desc, setDesc] = useState('');
  const [priority, setPriority] = useState(1);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('');

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['tasks', projectId, search, statusFilter, priorityFilter],
    queryFn: () => taskApi.list(projectId, {
      search: search || undefined,
      status: statusFilter || undefined,
      priority: priorityFilter || undefined,
      page: 1,
      pageSize: 100,
    }),
  });

  useEffect(() => {
    const hub = getProjectHub(projectId, {
      TaskCreated: () => qc.invalidateQueries({ queryKey: ['tasks', projectId] }),
      TaskUpdated: () => qc.invalidateQueries({ queryKey: ['tasks', projectId] }),
      TaskStatusChanged: () => qc.invalidateQueries({ queryKey: ['tasks', projectId] }),
      TaskAssigned: () => qc.invalidateQueries({ queryKey: ['tasks', projectId] }),
    });
    return () => {
      hub.stop().catch(() => undefined);
    };
  }, [projectId, qc]);

  const createMut = useMutation({
    mutationFn: () => taskApi.create(projectId, { title, description: desc, priority }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['tasks', projectId] });
      setShow(false);
      setTitle('');
      setDesc('');
    },
  });

  const moveMut = useMutation({
    mutationFn: ({ taskId, status }: { taskId: string; status: number }) =>
      taskApi.updateStatus(taskId, status),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['tasks', projectId] }),
  });

  if (isLoading) return <LoadingSpinner text="Loading tasks..." />;
  if (isError) return <ErrorAlert message="Failed to load tasks" onRetry={() => refetch()} />;

  return (
    <>
      <div className="d-flex justify-content-between align-items-center mb-3 flex-wrap gap-2">
        <h3>Task Board</h3>
        <Button onClick={() => setShow(true)}>New Task</Button>
      </div>
      <div className="d-flex gap-2 mb-3 flex-wrap">
        <Form.Control placeholder="Search..." value={search} onChange={(e) => setSearch(e.target.value)} style={{ maxWidth: 220 }} />
        <Form.Select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} style={{ maxWidth: 160 }}>
          <option value="">All statuses</option>
          <option value="Todo">Todo</option>
          <option value="InProgress">InProgress</option>
          <option value="Review">Review</option>
          <option value="Completed">Completed</option>
        </Form.Select>
        <Form.Select value={priorityFilter} onChange={(e) => setPriorityFilter(e.target.value)} style={{ maxWidth: 160 }}>
          <option value="">All priorities</option>
          <option value="Low">Low</option>
          <option value="Medium">Medium</option>
          <option value="High">High</option>
          <option value="Urgent">Urgent</option>
        </Form.Select>
        {(search || statusFilter || priorityFilter) && (
          <Button variant="outline-secondary" onClick={() => { setSearch(''); setStatusFilter(''); setPriorityFilter(''); }}>
            Clear
          </Button>
        )}
      </div>
      <Row className="g-3">
        {columns.map((col) => (
          <Col key={col.status} md={6} lg={3}>
            <div className="bg-light rounded p-2">
              <div className="fw-bold mb-2">{col.title} ({data?.items.filter((t) => t.status === col.status).length ?? 0})</div>
              {data?.items.filter((t) => t.status === col.status).map((t) => (
                <div key={t.id}>
                  <TaskCard task={t} onClick={() => navigate(`/tasks/${t.id}`)} />
                  <div className="d-flex gap-1 mb-2">
                    {col.status > 0 && (
                      <Button size="sm" variant="outline-secondary" onClick={() => moveMut.mutate({ taskId: t.id, status: col.status - 1 })}>←</Button>
                    )}
                    {col.status < 3 && (
                      <Button size="sm" variant="outline-primary" onClick={() => moveMut.mutate({ taskId: t.id, status: col.status + 1 })}>→</Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </Col>
        ))}
      </Row>
      <Modal show={show} onHide={() => setShow(false)}>
        <Modal.Header closeButton><Modal.Title>New Task</Modal.Title></Modal.Header>
        <Modal.Body>
          <Form>
            <Form.Group className="mb-3"><Form.Label>Title</Form.Label><Form.Control value={title} onChange={(e) => setTitle(e.target.value)} /></Form.Group>
            <Form.Group className="mb-3"><Form.Label>Description</Form.Label><Form.Control as="textarea" rows={3} value={desc} onChange={(e) => setDesc(e.target.value)} /></Form.Group>
            <Form.Group>
              <Form.Label>Priority</Form.Label>
              <Form.Select value={priority} onChange={(e) => setPriority(Number(e.target.value))}>
                <option value={0}>Low</option>
                <option value={1}>Medium</option>
                <option value={2}>High</option>
                <option value={3}>Urgent</option>
              </Form.Select>
            </Form.Group>
          </Form>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShow(false)}>Cancel</Button>
          <Button disabled={!title.trim() || createMut.isPending} onClick={() => createMut.mutate()}>
            {createMut.isPending ? 'Creating...' : 'Create'}
          </Button>
        </Modal.Footer>
      </Modal>
    </>
  );
}
