import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Alert, Button, Card, Col, Form, Modal, Row, Tab, Table, Tabs } from 'react-bootstrap';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Building2, Trash2 } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { organizationApi } from '../api/organizationApi';
import { projectApi } from '../api/projectApi';
import { RoleBadge } from '../components/ui/Badges';
import { Avatar } from '../components/ui/Avatar';
import ActivityTimeline from '../components/ui/ActivityTimeline';
import ConfirmModal from '../components/ui/ConfirmModal';
import PageHeader from '../components/ui/PageHeader';
import { ErrorState, LoadingState } from '../components/ui/States';
import { useToastStore } from '../store/toastStore';

const memberSchema = z.object({
  email: z.string().email('Invalid email'),
  role: z.string(),
});

export default function OrganizationDetails() {
  const { id = '' } = useParams();
  const qc = useQueryClient();
  const { push } = useToastStore();
  const [showAdd, setShowAdd] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const [removeId, setRemoveId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editDesc, setEditDesc] = useState('');

  const orgQ = useQuery({ queryKey: ['org', id], queryFn: () => organizationApi.get(id) });
  const membersQ = useQuery({ queryKey: ['org-members', id], queryFn: () => organizationApi.members(id) });
  const activityQ = useQuery({ queryKey: ['org-activity', id], queryFn: () => organizationApi.activity(id, 1, 20) });
  const projectsQ = useQuery({ queryKey: ['org-projects', id], queryFn: () => projectApi.list(id, 1, 20) });

  const { register, handleSubmit, reset, formState: { errors } } = useForm<z.infer<typeof memberSchema>>({
    resolver: zodResolver(memberSchema),
    defaultValues: { email: '', role: 'Member' },
  });

  const addMut = useMutation({
    mutationFn: (v: z.infer<typeof memberSchema>) => organizationApi.addMember(id, v),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['org-members', id] });
      setShowAdd(false);
      reset();
      push('Member added successfully.');
    },
    onError: (e: unknown) => {
      const msg = (e as { response?: { data?: { error?: string } } })?.response?.data?.error ?? 'Could not add member.';
      push(msg, 'danger');
    },
  });
  const roleMut = useMutation({
    mutationFn: ({ userId, role }: { userId: string; role: string }) => organizationApi.updateRole(id, userId, role),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['org-members', id] });
      push('Role updated.');
    },
  });
  const removeMut = useMutation({
    mutationFn: (userId: string) => organizationApi.removeMember(id, userId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['org-members', id] });
      setRemoveId(null);
      push('Member removed successfully.');
    },
  });
  const updateMut = useMutation({
    mutationFn: () => organizationApi.update(id, { name: editName, description: editDesc }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['org', id] });
      setShowEdit(false);
      push('Organization updated.');
    },
  });

  if (orgQ.isLoading) return <LoadingState text="Loading organization..." />;
  if (orgQ.isError || !orgQ.data) return <ErrorState message="We couldn't load this organization." onRetry={() => orgQ.refetch()} />;
  const org = orgQ.data;

  return (
    <>
      <Link to="/organizations" className="small text-muted text-decoration-none d-inline-flex align-items-center gap-1 mb-2">
        <ArrowLeft size={13} aria-hidden /> Organizations
      </Link>
      <PageHeader
        title={org.name}
        subtitle={org.description || `${org.memberCount} members • ${org.projectCount} projects`}
        actions={
          <>
            <RoleBadge role={org.userRole} />
            <Button size="sm" variant="light" className="border" onClick={() => { setEditName(org.name); setEditDesc(org.description ?? ''); setShowEdit(true); }}>
              Edit
            </Button>
            <Button size="sm" onClick={() => setShowAdd(true)}>Add Member</Button>
          </>
        }
      />

      <Tabs defaultActiveKey="overview" className="mb-3" aria-label="Organization sections">
        <Tab eventKey="overview" title="Overview">
          <Row className="g-3 mt-1">
            <Col xs={12} sm={4}>
              <Card className="sm-card text-center p-3"><div className="fw-bold fs-4">{org.projectCount}</div><div className="small text-muted">Projects</div></Card>
            </Col>
            <Col xs={12} sm={4}>
              <Card className="sm-card text-center p-3"><div className="fw-bold fs-4">{org.memberCount}</div><div className="small text-muted">Members</div></Card>
            </Col>
            <Col xs={12} sm={4}>
              <Card className="sm-card text-center p-3"><div className="fw-bold fs-6">{new Date(org.createdAt).toLocaleDateString()}</div><div className="small text-muted">Created</div></Card>
            </Col>
          </Row>
          <Card className="sm-card mt-3">
            <Card.Body>
              <strong>Recent activity</strong>
              <div className="mt-3"><ActivityTimeline items={activityQ.data?.items ?? []} /></div>
            </Card.Body>
          </Card>
        </Tab>
        <Tab eventKey="members" title={`Members (${membersQ.data?.length ?? 0})`}>
          <Card className="sm-card mt-3">
            <Card.Body className="p-0">
              <div className="table-responsive">
                <Table hover className="sm-table mb-0">
                  <thead><tr><th>Member</th><th>Email</th><th>Role</th><th>Joined</th><th className="text-end">Actions</th></tr></thead>
                  <tbody>
                    {(membersQ.data ?? []).map((m) => (
                      <tr key={m.userId}>
                        <td>
                          <span className="d-flex align-items-center gap-2">
                            <Avatar name={m.fullName} size={30} />
                            <strong className="small">{m.fullName}</strong>
                          </span>
                        </td>
                        <td className="small text-muted">{m.email}</td>
                        <td>
                          <Form.Select size="sm" value={m.role} style={{ maxWidth: 130 }} aria-label={`Role for ${m.fullName}`} onChange={(e) => roleMut.mutate({ userId: m.userId, role: e.target.value })}>
                            <option>Owner</option><option>Admin</option><option>Manager</option><option>Member</option>
                          </Form.Select>
                        </td>
                        <td className="small text-muted">{new Date(m.joinedAt).toLocaleDateString()}</td>
                        <td className="text-end">
                          <Button size="sm" variant="outline-danger" onClick={() => setRemoveId(m.userId)} aria-label={`Remove ${m.fullName}`}>
                            <Trash2 size={13} aria-hidden />
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </Table>
              </div>
            </Card.Body>
          </Card>
        </Tab>
        <Tab eventKey="projects" title="Projects">
          <Card className="sm-card mt-3">
            <Card.Body>
              {(projectsQ.data?.items ?? []).map((p) => (
                <div key={p.id} className="d-flex justify-content-between border-bottom py-2 small">
                  <span className="fw-semibold">{p.name}</span>
                  <Link to={`/projects/${p.id}`}>Open</Link>
                </div>
              ))}
              {(projectsQ.data?.items ?? []).length === 0 && <div className="text-muted small">No projects yet.</div>}
            </Card.Body>
          </Card>
        </Tab>
        <Tab eventKey="activity" title="Activity">
          <Card className="sm-card mt-3">
            <Card.Body><ActivityTimeline items={activityQ.data?.items ?? []} /></Card.Body>
          </Card>
        </Tab>
      </Tabs>

      <Modal show={showAdd} onHide={() => setShowAdd(false)} centered aria-label="Add member">
        <Modal.Header closeButton><Modal.Title>Add Member</Modal.Title></Modal.Header>
        <form onSubmit={handleSubmit((v) => addMut.mutate(v))} noValidate>
          <Modal.Body>
            <Alert variant="info" className="small">User must already have an account. Use their login email.</Alert>
            <Form.Group className="mb-3">
              <Form.Label>Email</Form.Label>
              <Form.Control {...register('email')} isInvalid={!!errors.email} placeholder="member@email.com" />
              <Form.Control.Feedback type="invalid">{errors.email?.message}</Form.Control.Feedback>
            </Form.Group>
            <Form.Group>
              <Form.Label>Role</Form.Label>
              <Form.Select {...register('role')}>
                <option>Member</option><option>Manager</option><option>Admin</option><option>Owner</option>
              </Form.Select>
            </Form.Group>
          </Modal.Body>
          <Modal.Footer>
            <Button variant="secondary" onClick={() => setShowAdd(false)}>Cancel</Button>
            <Button type="submit" disabled={addMut.isPending}>{addMut.isPending ? 'Adding...' : 'Add Member'}</Button>
          </Modal.Footer>
        </form>
      </Modal>

      <Modal show={showEdit} onHide={() => setShowEdit(false)} centered aria-label="Edit organization">
        <Modal.Header closeButton><Modal.Title>Edit Organization</Modal.Title></Modal.Header>
        <Modal.Body>
          <Form.Group className="mb-3"><Form.Label>Name</Form.Label><Form.Control value={editName} onChange={(e) => setEditName(e.target.value)} /></Form.Group>
          <Form.Group><Form.Label>Description</Form.Label><Form.Control as="textarea" rows={3} value={editDesc} onChange={(e) => setEditDesc(e.target.value)} /></Form.Group>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowEdit(false)}>Cancel</Button>
          <Button onClick={() => updateMut.mutate()} disabled={updateMut.isPending}>Save</Button>
        </Modal.Footer>
      </Modal>

      <ConfirmModal
        show={!!removeId}
        title="Remove member?"
        body="This member will lose access to this organization."
        confirmLabel="Remove"
        onCancel={() => setRemoveId(null)}
        onConfirm={() => removeId && removeMut.mutate(removeId)}
        busy={removeMut.isPending}
      />
      <div className="visually-hidden" aria-hidden>
        <Building2 size={1} />
      </div>
    </>
  );
}
