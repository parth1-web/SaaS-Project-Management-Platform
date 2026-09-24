import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Card, Button, Form, Badge, ProgressBar } from 'react-bootstrap';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { projectApi } from '../api/projectApi';
import { ProjectStatusLabels } from '../types';
import { LoadingSpinner, ErrorAlert } from '../components/Feedback';

export default function ProjectDetails() {
  const { id = '' } = useParams();
  const qc = useQueryClient();
  const [email, setEmail] = useState('');

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['project', id],
    queryFn: () => projectApi.get(id),
  });
  const membersQuery = useQuery({
    queryKey: ['project-members', id],
    queryFn: () => projectApi.members(id),
  });

  const addMut = useMutation({
    mutationFn: () => projectApi.addMember(id, email),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['project-members', id] });
      setEmail('');
    },
  });

  if (isLoading) return <LoadingSpinner />;
  if (isError || !data) return <ErrorAlert message="Failed to load project" onRetry={() => refetch()} />;

  const progress = data.taskCount ? Math.round((data.completedTasks / data.taskCount) * 100) : 0;

  return (
    <>
      <div className="d-flex justify-content-between align-items-center mb-3">
        <h3>{data.name}</h3>
        <Link to={`/projects/${id}/tasks`} className="btn btn-primary">Open Board</Link>
      </div>
      <Card className="shadow-sm mb-3">
        <Card.Body>
          <div className="d-flex gap-2 mb-2">
            <Badge bg="primary">{ProjectStatusLabels[data.status]}</Badge>
            <Badge bg="secondary">{data.organizationName}</Badge>
          </div>
          <p className="text-muted">{data.description}</p>
          <div className="mb-2">Progress: {progress}% ({data.completedTasks}/{data.taskCount})</div>
          <ProgressBar now={progress} />
        </Card.Body>
      </Card>
      <Card className="shadow-sm">
        <Card.Body>
          <Card.Title>Members ({membersQuery.data?.length ?? 0})</Card.Title>
          <div className="d-flex gap-2 mb-3">
            <Form.Control placeholder="user@email.com" value={email} onChange={(e) => setEmail(e.target.value)} />
            <Button onClick={() => addMut.mutate()} disabled={!email}>Add</Button>
          </div>
          {membersQuery.data?.map((m) => (
            <div key={m.userId} className="d-flex justify-content-between border-bottom py-2">
              <span>{m.fullName} • <span className="text-muted">{m.email}</span></span>
              <Button variant="outline-danger" size="sm" onClick={() => projectApi.removeMember(id, m.userId).then(() => qc.invalidateQueries({ queryKey: ['project-members', id] }))}>
                Remove
              </Button>
            </div>
          ))}
        </Card.Body>
      </Card>
    </>
  );
}
