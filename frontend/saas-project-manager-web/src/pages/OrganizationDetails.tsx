import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { Row, Col, Card, Table, Button, Form, Badge, Modal, Alert } from 'react-bootstrap';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { organizationApi } from '../api/organizationApi';
import { LoadingSpinner, ErrorAlert } from '../components/Feedback';

export default function OrganizationDetails() {
  const { id = '' } = useParams();
  const qc = useQueryClient();
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('Member');
  const [editName, setEditName] = useState('');
  const [editDesc, setEditDesc] = useState('');
  const [showEdit, setShowEdit] = useState(false);
  const [error, setError] = useState('');

  const orgQuery = useQuery({ queryKey: ['org', id], queryFn: () => organizationApi.get(id) });
  const membersQuery = useQuery({ queryKey: ['org-members', id], queryFn: () => organizationApi.members(id) });
  const activityQuery = useQuery({ queryKey: ['org-activity', id], queryFn: () => organizationApi.activity(id, 1, 10) });

  const addMut = useMutation({
    mutationFn: () => organizationApi.addMember(id, { email, role }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['org-members', id] });
      setEmail('');
      setError('');
    },
    onError: (e: unknown) => {
      const msg = (e as { response?: { data?: { error?: string } } })?.response?.data?.error ?? 'Failed';
      setError(msg);
    },
  });

  const roleMut = useMutation({
    mutationFn: ({ userId, newRole }: { userId: string; newRole: string }) =>
      organizationApi.updateRole(id, userId, newRole),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['org-members', id] }),
  });

  const removeMut = useMutation({
    mutationFn: (userId: string) => organizationApi.removeMember(id, userId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['org-members', id] }),
  });

  const updateMut = useMutation({
    mutationFn: () => organizationApi.update(id, { name: editName, description: editDesc }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['org', id] });
      setShowEdit(false);
    },
  });

  if (orgQuery.isLoading) return <LoadingSpinner />;
  if (orgQuery.isError || !orgQuery.data) return <ErrorAlert message="Failed to load organization" onRetry={() => orgQuery.refetch()} />;

  const org = orgQuery.data;

  return (
    <>
      <div className="d-flex justify-content-between align-items-center mb-3">
        <h3>{org.name} <Badge bg="info">{org.userRole}</Badge></h3>
        <Button variant="outline-secondary" size="sm" onClick={() => { setEditName(org.name); setEditDesc(org.description ?? ''); setShowEdit(true); }}>
          Edit
        </Button>
      </div>
      <p className="text-muted">{org.description}</p>
      <Row className="g-3">
        <Col lg={7}>
          <Card className="shadow-sm mb-3">
            <Card.Body>
              <Card.Title>Members</Card.Title>
              {error && <Alert variant="danger">{error}</Alert>}
              <div className="d-flex gap-2 mb-3">
                <Form.Control placeholder="member@email.com" value={email} onChange={(e) => setEmail(e.target.value)} />
                <Form.Select value={role} onChange={(e) => setRole(e.target.value)} style={{ maxWidth: 140 }}>
                  <option>Member</option>
                  <option>Manager</option>
                  <option>Admin</option>
                  <option>Owner</option>
                </Form.Select>
                <Button onClick={() => addMut.mutate()} disabled={!email || addMut.isPending}>Add</Button>
              </div>
              <Table responsive hover size="sm">
                <thead><tr><th>Name</th><th>Email</th><th>Role</th><th></th></tr></thead>
                <tbody>
                  {membersQuery.data?.map((m) => (
                    <tr key={m.userId}>
                      <td>{m.fullName}</td>
                      <td>{m.email}</td>
                      <td>
                        <Form.Select
                          size="sm"
                          value={m.role}
                          onChange={(e) => roleMut.mutate({ userId: m.userId, newRole: e.target.value })}
                          style={{ maxWidth: 130 }}
                        >
                          <option>Owner</option>
                          <option>Admin</option>
                          <option>Manager</option>
                          <option>Member</option>
                        </Form.Select>
                      </td>
                      <td><Button variant="outline-danger" size="sm" onClick={() => removeMut.mutate(m.userId)}>Remove</Button></td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            </Card.Body>
          </Card>
        </Col>
        <Col lg={5}>
          <Card className="shadow-sm">
            <Card.Body>
              <Card.Title>Recent Activity</Card.Title>
              {activityQuery.data?.items.map((a) => (
                <div key={a.id} className="border-bottom py-2 small">
                  <div><strong>{a.userName}</strong> • {a.action}</div>
                  <div className="text-muted">{a.description}</div>
                  <div className="text-muted">{new Date(a.createdAt).toLocaleString()}</div>
                </div>
              )) ?? <div className="text-muted">No activity</div>}
            </Card.Body>
          </Card>
        </Col>
      </Row>
      <Modal show={showEdit} onHide={() => setShowEdit(false)}>
        <Modal.Header closeButton><Modal.Title>Edit Organization</Modal.Title></Modal.Header>
        <Modal.Body>
          <Form.Group className="mb-3"><Form.Label>Name</Form.Label><Form.Control value={editName} onChange={(e) => setEditName(e.target.value)} /></Form.Group>
          <Form.Group><Form.Label>Description</Form.Label><Form.Control as="textarea" rows={3} value={editDesc} onChange={(e) => setEditDesc(e.target.value)} /></Form.Group>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowEdit(false)}>Cancel</Button>
          <Button onClick={() => updateMut.mutate()}>Save</Button>
        </Modal.Footer>
      </Modal>
    </>
  );
}
