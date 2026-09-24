import { useQuery } from '@tanstack/react-query';
import { Building2, Check, Plus, Settings2 } from 'lucide-react';
import { Dropdown } from 'react-bootstrap';
import { Link } from 'react-router-dom';
import { organizationApi } from '../../api/organizationApi';
import { useOrgStore } from '../../store/orgStore';

export default function OrganizationSwitcher({ compact = false }: { compact?: boolean }) {
  const { selectedOrgId, setSelectedOrgId } = useOrgStore();
  const { data } = useQuery({
    queryKey: ['orgs-switcher'],
    queryFn: () => organizationApi.list(1, 50),
  });

  const orgs = data?.items ?? [];
  const selected = orgs.find((o) => o.id === selectedOrgId) ?? orgs[0];

  return (
    <Dropdown>
      <Dropdown.Toggle
        variant="light"
        size="sm"
        className="w-100 d-flex align-items-center gap-2 text-start border"
        aria-label="Select organization"
      >
        <Building2 size={16} aria-hidden />
        {!compact && (
          <span className="flex-grow-1 text-truncate">
            <span className="sm-org-meta d-block fw-semibold text-truncate">
              {selected ? selected.name : 'Select organization'}
            </span>
          </span>
        )}
      </Dropdown.Toggle>
      <Dropdown.Menu className="w-100 p-2" style={{ minWidth: 260 }}>
        <div className="sm-section-title px-2 pb-1">Your Organizations</div>
        {orgs.map((o) => (
          <Dropdown.Item
            key={o.id}
            as={Link}
            to={`/organizations/${o.id}`}
            onClick={() => setSelectedOrgId(o.id)}
            className="d-flex align-items-start gap-2 rounded"
            active={o.id === (selected?.id ?? selectedOrgId)}
          >
            <Building2 size={16} className="mt-1" aria-hidden />
            <span className="flex-grow-1">
              <span className="d-block fw-semibold">{o.name}</span>
              <span className="d-block small text-muted">{o.userRole}</span>
            </span>
            {o.id === (selected?.id ?? selectedOrgId) && <Check size={16} aria-hidden />}
          </Dropdown.Item>
        ))}
        <Dropdown.Divider />
        <Dropdown.Item as={Link} to="/organizations">
          <Plus size={14} className="me-1" aria-hidden /> Create Organization
        </Dropdown.Item>
        <Dropdown.Item as={Link} to="/organizations">
          <Settings2 size={14} className="me-1" aria-hidden /> Manage Organizations
        </Dropdown.Item>
      </Dropdown.Menu>
    </Dropdown>
  );
}
