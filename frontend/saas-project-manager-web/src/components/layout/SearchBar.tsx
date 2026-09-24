import { useState } from 'react';
import { Form, InputGroup, ListGroup } from 'react-bootstrap';
import { Search } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { taskApi } from '../../api/taskApi';
import { projectApi } from '../../api/projectApi';

export default function SearchBar() {
  const [q, setQ] = useState('');
  const [focused, setFocused] = useState(false);
  const enabled = q.trim().length >= 2 && focused;

  const tasks = useQuery({
    queryKey: ['global-search-tasks', q],
    queryFn: () => taskApi.search({ search: q, page: 1, pageSize: 5 }),
    enabled,
  });
  const projects = useQuery({
    queryKey: ['global-search-projects', q],
    queryFn: () => projectApi.list(undefined, 1, 50),
    enabled,
  });

  const filteredProjects = (projects.data?.items ?? []).filter((p) =>
    p.name.toLowerCase().includes(q.toLowerCase())
  ).slice(0, 4);

  return (
    <div className="position-relative flex-grow-1" style={{ maxWidth: 480 }}>
      <InputGroup size="sm">
        <InputGroup.Text aria-hidden>
          <Search size={14} />
        </InputGroup.Text>
        <Form.Control
          placeholder="Search projects, tasks, members..."
          aria-label="Global search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={() => window.setTimeout(() => setFocused(false), 150)}
        />
      </InputGroup>
      {enabled && (
        <div
          className="position-absolute w-100 mt-1 sm-card p-2 shadow"
          style={{ zIndex: 1040 }}
          role="listbox"
          aria-label="Search results"
        >
          <div className="sm-section-title px-2">Tasks</div>
          <ListGroup variant="flush">
            {(tasks.data?.items ?? []).map((t) => (
              <ListGroup.Item key={t.id} action as={Link} to={`/tasks/${t.id}`} className="small">
                {t.title}
              </ListGroup.Item>
            ))}
            {(tasks.data?.items ?? []).length === 0 && (
              <ListGroup.Item className="small text-muted">No tasks</ListGroup.Item>
            )}
          </ListGroup>
          <div className="sm-section-title px-2 pt-2">Projects</div>
          <ListGroup variant="flush">
            {filteredProjects.map((p) => (
              <ListGroup.Item key={p.id} action as={Link} to={`/projects/${p.id}`} className="small">
                {p.name}
              </ListGroup.Item>
            ))}
            {filteredProjects.length === 0 && (
              <ListGroup.Item className="small text-muted">No projects</ListGroup.Item>
            )}
          </ListGroup>
        </div>
      )}
    </div>
  );
}
