import { Badge, Button } from 'react-bootstrap';
import { SlidersHorizontal, X } from 'lucide-react';

export interface ActiveFilter {
  key: string;
  label: string;
  value: string;
}

export default function FilterBar({
  filters,
  onRemove,
  onClear,
}: {
  filters: ActiveFilter[];
  onRemove: (key: string) => void;
  onClear: () => void;
}) {
  if (!filters.length) return null;
  return (
    <div className="d-flex align-items-center gap-2 flex-wrap mb-3" aria-label="Active filters">
      <span className="small text-muted d-inline-flex align-items-center gap-1">
        <SlidersHorizontal size={13} aria-hidden /> Filters:
      </span>
      {filters.map((f) => (
        <Badge key={f.key} bg="light" text="dark" className="border d-inline-flex align-items-center gap-1 fw-normal">
          {f.label}: {f.value}
          <Button
            variant="link"
            size="sm"
            className="p-0 text-muted"
            onClick={() => onRemove(f.key)}
            aria-label={`Remove ${f.label} filter`}
            style={{ lineHeight: 1 }}
          >
            <X size={12} aria-hidden />
          </Button>
        </Badge>
      ))}
      <Button variant="link" size="sm" onClick={onClear}>
        Clear Filters
      </Button>
    </div>
  );
}
