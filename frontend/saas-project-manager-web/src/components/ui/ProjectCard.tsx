import { Card, ProgressBar } from 'react-bootstrap';
import { CalendarDays, ListChecks } from 'lucide-react';
import { Link } from 'react-router-dom';
import type { Project } from '../../types';
import { ProjectStatusBadge } from '../ui/Badges';

function accentFor(id: string): string {
  const palette = ['#2563eb', '#0ea5e9', '#1d4ed8', '#38bdf8', '#1e40af', '#60a5fa'];
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) % palette.length;
  return palette[h];
}

export default function ProjectCard({ project }: { project: Project }) {
  const progress = project.taskCount ? Math.round((project.completedTasks / project.taskCount) * 100) : 0;
  const accent = accentFor(project.id);
  return (
    <Card className="sm-card sm-card-hover h-100">
      <div style={{ height: 4, background: accent, borderTopLeftRadius: 10, borderTopRightRadius: 10 }} aria-hidden />
      <Card.Body>
        <div className="d-flex justify-content-between align-items-start gap-2 mb-2">
          <ProjectStatusBadge status={project.status} />
          <span className="text-muted small">{project.organizationName}</span>
        </div>
        <Card.Title style={{ fontSize: 17 }} className="mb-1">
          <Link to={`/projects/${project.id}`} className="text-decoration-none stretched-link" style={{ color: 'var(--sm-text)' }}>
            {project.name}
          </Link>
        </Card.Title>
        <Card.Text className="text-muted small text-truncate-2" style={{ minHeight: 36 }}>
          {project.description || 'No description'}
        </Card.Text>
        <div className="d-flex justify-content-between small text-muted mb-1">
          <span className="d-inline-flex align-items-center gap-1">
            <ListChecks size={13} aria-hidden /> {project.completedTasks}/{project.taskCount} tasks
          </span>
          <span>{progress}%</span>
        </div>
        <ProgressBar now={progress} style={{ height: 6 }} className="mb-2" aria-label={`Progress ${progress}%`} />
        <div className="d-flex justify-content-between align-items-center small text-muted">
          <span>{project.memberCount} members</span>
          <span className="d-inline-flex align-items-center gap-1">
            <CalendarDays size={13} aria-hidden />
            {project.endDate ? new Date(project.endDate).toLocaleDateString() : 'No deadline'}
          </span>
        </div>
      </Card.Body>
    </Card>
  );
}
