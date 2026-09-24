import { useState } from 'react';
import { Row, Col, Card, Button, Modal, Form, Badge } from 'react-bootstrap';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { projectApi } from '../api/projectApi';
import { organizationApi } from '../api/organizationApi';
import { ProjectStatusLabels } from '../types';
import { LoadingSpinner, ErrorAlert, EmptyState } from '../components/Feedback';

export default function Projects() {
  const qc = useQueryClient();
  const [show, setShow] = useState(false);
  const [orgId, setOrgId] = useState('');
  const [name, setName] = useState('');
  const [desc, setDesc] = useState('');
  const [status, setStatus] = useState(1);

  const { data: orgs } = useQuery({ queryKey: ['orgs'], queryFn: () => organizationApi.list(1, 50) });
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['projects'],
    queryFn: () => projectApi.list(undefined, 1, 50),
  });

  const createMut = useMutation({
    mutationFn: () => projectApi.create({ organizationId: orgId, name, description: desc, status }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['projects'] });
      setShow(false);
      setName('');
      setDesc('');
    },
  });

  if (isLoading) return <LoadingSpinner />;
  if (isError) return <ErrorAlert message="Failed to load projects" onRetry={() => refetch()} />;

  return (
    <>
      <div className="d-flex justify-content-between align-items-center mb-3">
        <h3>Projects</h3>
        <Button onClick={() => setShow(true)}>New Project</Button>
      </div>
      {!data?.items.length ? (
        <EmptyState title="No projects found." hint="Create your first project." />
      ) : (
        <Row className="g-3">
          {data.items.map((p) => (
            <Col key={p.id} md={6} lg={4}>
              <Card className="shadow-sm h-100">
                <Card.Body>
                  <Card.Title>{p.name}</Card.Title>
                  <div className="text-muted small mb-2">{p.organizationName}</div>
                  <Card.Text className="text-muted">{p.description || 'No description'}</Card.Text>
                  <div className="d-flex gap-2 mb-2">
                    <Badge bg="primary">{ProjectStatusLabels[p.status]}</Badge>
                    <Badge bg="secondary">{p.taskCount} tasks</Badge>
                    <Badge bg="success">{p.completedTasks} done</Badge>
                  </div>
                  <div className="d-flex gap-2">
                    <Link to={`/projects/${p.id}`} className="btn btn-outline-primary btn-sm">Details</Link>
                    <Link to={`/projects/${p.id}/tasks`} className="btn btn-primary btn-sm">Board</Link>
                  </div>
                </Card.Body>
              </Card>
            </Col>
          ))}
        </Row>
      )}
      <Modal show={show} onHide={() => setShow(false)}>
        <Modal.Header closeButton><Modal.Title>New Project</Modal.Title></Modal.Header>
        <Modal.Body>
          <Form>
            <Form.Group className="mb-3">
              <Form.Label>Organization</Form.Label>
              <Form.Select value={orgId} onChange={(e) => setOrgId(e.target.value)}>
                <option value="">Select...</option>
                {orgs?.items.map((o) => <option key={o.id} value={o.id}>{o.name}</option>)}
              </Form.Select>
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>Name</Form.Label>
              <Form.Control value={name} onChange={(e) => setName(e.target.value)} />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>Description</Form.Label>
              <Form.Control as="textarea" rows={3} value={desc} onChange={(e) => setDesc(e.target.value)} />
            </Form.Group>
            <Form.Group>
              <Form.Label>Status</Form.Label>
              <Form.Select value={status} onChange={(e) => setStatus(Number(e.target.value))}>
                {ProjectStatusLabels.map((s, i) => <option key={s} value={i}>{s}</option>)}
              </Form.Select>
            </Form.Group>
          </Form>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShow(false)}>Cancel</Button>
          <Button disabled={!orgId || !name.trim() || createMut.isPending} onClick={() => createMut.mutate()}>
            {createMut.isPending ? 'Creating...' : 'Create'}
          </Button>
        </Modal.Footer>
      </Modal>
    </>
  );
}
