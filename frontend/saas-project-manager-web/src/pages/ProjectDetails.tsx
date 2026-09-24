import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Badge, Button, Card, Col, Form, ProgressBar, Row, Tab, Tabs } from 'react-bootstrap';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, EllipsisVertical, Pencil } from 'lucide-react';
import { projectApi } from '../api/projectApi';
import { taskApi } from '../api/taskApi';
import { organizationApi } from '../api/organizationApi';
import { ProjectStatusBadge } from '../components/ui/Badges';
import { Avatar } from '../components/ui/Avatar';
import ActivityTimeline from '../components/ui/ActivityTimeline';
import ConfirmModal from '../components/ui/ConfirmModal';
import { ErrorState, LoadingState } from '../components/ui/States';
import PageHeader from '../components/ui/PageHeader';
import { useToastStore } from '../store/toastStore';

export default function ProjectDetails() {
  const { id = '' } = useParams();
  const qc = useQueryClient();
  const { push } = useToastStore();
  const [email, setEmail] = useState('');
  const [confirmRemove, setConfirmRemove] = useState<string | null>(null);

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['project', id],
    queryFn: () => projectApi.get(id),
  });
  const membersQ = useQuery({ queryKey: ['project-members', id], queryFn: () => projectApi.members(id) });
  const tasksQ = useQuery({
    queryKey: ['project-tasks-summary', id],
    queryFn: () => taskApi.list(id, { page: 1, pageSize: 100 }),
  });
  const activityQ = useQuery({
    queryKey: ['project-activity', id],
    queryFn: async () => {
      if (!data) return [];
      const res = await organizationApi.activity(data.organizationId, 1, 10);
      return res.items.filter(
        (a) => a.entityId === id || a.description?.toLowerCase().includes(data.name.toLowerCase())
      );
    },
    enabled: !!data,
  });

  const addMut = useMutation({
    mutationFn: () => projectApi.addMember(id, email),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['project-members', id] });
      setEmail('');
      push('Member added successfully.');
    },
    onError: () => push('Could not add member.', 'danger'),
  });

  const removeMut = useMutation({
    mutationFn: (userId: string) => projectApi.removeMember(id, userId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['project-members', id] });
      setConfirmRemove(null);
      push('Member removed successfully.');
    },
  });

  if (isLoading) return <LoadingState text="Loading project..." />;
  if (isError || !data) return <ErrorState message="We couldn't load this project." onRetry={() => refetch()} />;

  const progress = data.taskCount ? Math.round((data.completedTasks / data.taskCount) * 100) : 0;
  const tasks = tasksQ.data?.items ?? [];
  const inProgress = tasks.filter((t) => t.status === 1).length;
  const remaining = Math.max(0, data.taskCount - data.completedTasks);

  return (
    <>
      <Link to="/projects" className="small text-muted text-decoration-none d-inline-flex align-items-center gap-1 mb-2">
        <ArrowLeft size={13} aria-hidden /> Projects
      </Link>
      <PageHeader
        title={data.name}
        subtitle={data.description || 'No description'}
        actions={
          <>
            <ProjectStatusBadge status={data.status} />
            <Button size="sm" variant="light" className="border" aria-label="Edit project">
              <Pencil size={14} aria-hidden /> Edit
            </Button>
            <Button size="sm" variant="light" className="border" aria-label="More actions">
              <EllipsisVertical size={14} aria-hidden />
            </Button>
            <Link to={`/projects/${id}/tasks`} className="btn btn-primary btn-sm">
              Open Board
            </Link>
          </>
        }
      />

      <Tabs defaultActiveKey="overview" className="mb-3" aria-label="Project sections">
        <Tab eventKey="overview" title="Overview">
          <Row className="g-3 mt-1">
            <Col xs={12} xl={7}>
              <Card className="sm-card mb-3">
                <Card.Body>
                  <div className="d-flex justify-content-between small text-muted mb-1">
                    <span>Project progress</span>
                    <span>{progress}%</span>
                  </div>
                  <ProgressBar now={progress} style={{ height: 8 }} aria-label={`Progress ${progress}%`} />
                  <Row className="g-2 mt-3 text-center">
                    <Col xs={4}>
                      <div className="fw-bold fs-5">{data.taskCount}</div>
                      <div className="small text-muted">Total</div>
                    </Col>
                    <Col xs={4}>
                      <div className="fw-bold fs-5">{data.completedTasks}</div>
                      <div className="small text-muted">Completed</div>
                    </Col>
                    <Col xs={4}>
                      <div className="fw-bold fs-5">{inProgress}</div>
                      <div className="small text-muted">In progress</div>
                    </Col>
                  </Row>
                  <div className="small text-muted mt-2">{remaining} remaining</div>
                </Card.Body>
              </Card>
              <Card className="sm-card">
                <Card.Body>
                  <strong>Recent activity</strong>
                  <div className="mt-3">
                    <ActivityTimeline items={activityQ.data ?? []} />
                  </div>
                </Card.Body>
              </Card>
            </Col>
            <Col xs={12} xl={5}>
              <Card className="sm-card">
                <Card.Body>
                  <div className="d-flex justify-content-between align-items-center mb-2">
                    <strong>Members ({membersQ.data?.length ?? 0})</strong>
                    <Badge bg="light" text="dark" className="border fw-normal">
                      {data.organizationName}
                    </Badge>
                  </div>
                  <div className="d-flex gap-2 mb-3">
                    <Form.Control
                      size="sm"
                      placeholder="user@email.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      aria-label="Member email"
                    />
                    <Button size="sm" onClick={() => addMut.mutate()} disabled={!email || addMut.isPending}>
                      Add
                    </Button>
                  </div>
                  {(membersQ.data ?? []).map((m) => (
                    <div key={m.userId} className="d-flex align-items-center gap-2 border-bottom py-2">
                      <Avatar name={m.fullName} size={30} />
                      <span className="flex-grow-1">
                        <span className="d-block fw-semibold small">{m.fullName}</span>
                        <span className="d-block text-muted" style={{ fontSize: 12 }}>{m.email}</span>
                      </span>
                      <Button size="sm" variant="outline-danger" onClick={() => setConfirmRemove(m.userId)}>
                        Remove
                      </Button>
                    </div>
                  ))}
                </Card.Body>
              </Card>
            </Col>
          </Row>
        </Tab>
        <Tab eventKey="tasks" title={`Tasks (${data.taskCount})`}>
          <Card className="sm-card mt-3">
            <Card.Body>
              {tasks.slice(0, 10).map((t) => (
                <div key={t.id} className="d-flex justify-content-between border-bottom py-2 small">
                  <span className="fw-semibold">{t.title}</span>
                  <Link to={`/tasks/${t.id}`}>Open</Link>
                </div>
              ))}
              {tasks.length === 0 && <div className="text-muted small">No tasks yet.</div>}
              <Link to={`/projects/${id}/tasks`} className="btn btn-primary btn-sm mt-2">
                Open full board
              </Link>
            </Card.Body>
          </Card>
        </Tab>
        <Tab eventKey="members" title="Members">
          <Card className="sm-card mt-3">
            <Card.Body>
              <div className="text-muted small">Manage members in the Overview tab.</div>
            </Card.Body>
          </Card>
        </Tab>
        <Tab eventKey="activity" title="Activity">
          <Card className="sm-card mt-3">
            <Card.Body>
              <ActivityTimeline items={activityQ.data ?? []} />
            </Card.Body>
          </Card>
        </Tab>
      </Tabs>

      <ConfirmModal
        show={!!confirmRemove}
        title="Remove member?"
        body="This member will lose access to this project."
        confirmLabel="Remove"
        onCancel={() => setConfirmRemove(null)}
        onConfirm={() => confirmRemove && removeMut.mutate(confirmRemove)}
        busy={removeMut.isPending}
      />
    </>
  );
}
