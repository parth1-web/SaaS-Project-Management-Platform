import type { ReactNode } from 'react';
import { Button } from 'react-bootstrap';

interface Props {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
}

export default function PageHeader({ title, subtitle, actions }: Props) {
  return (
    <div className="d-flex justify-content-between align-items-start gap-3 mb-3 flex-wrap">
      <div>
        <h1 className="sm-page-title">{title}</h1>
        {subtitle && <div className="sm-page-sub">{subtitle}</div>}
      </div>
      {actions && <div className="d-flex gap-2 flex-wrap">{actions}</div>}
    </div>
  );
}

export function PrimaryButton({
  children,
  ...rest
}: React.ComponentProps<typeof Button>) {
  return (
    <Button variant="primary" {...rest}>
      {children}
    </Button>
  );
}
