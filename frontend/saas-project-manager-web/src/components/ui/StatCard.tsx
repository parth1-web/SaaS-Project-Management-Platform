import { Card } from 'react-bootstrap';
import type { ReactNode } from 'react';

interface Props {
  icon: ReactNode;
  value: string | number;
  label: string;
  sub?: string;
}

export default function StatCard({ icon, value, label, sub }: Props) {
  return (
    <Card className="sm-card sm-kpi h-100">
      <Card.Body className="d-flex gap-3 align-items-start">
        <span className="sm-kpi-icon" aria-hidden>
          {icon}
        </span>
        <span>
          <div className="sm-kpi-value">{value}</div>
          <div className="sm-kpi-label">{label}</div>
          {sub && <div className="sm-kpi-sub">{sub}</div>}
        </span>
      </Card.Body>
    </Card>
  );
}
