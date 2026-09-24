import { Card, Form } from 'react-bootstrap';
import { useQuery } from '@tanstack/react-query';
import { organizationApi } from '../api/organizationApi';
import { useOrgStore } from '../store/orgStore';
import PageHeader from '../components/ui/PageHeader';
import ActivityTimeline from '../components/ui/ActivityTimeline';
import { EmptyState, LoadingState, ErrorState } from '../components/ui/States';

export default function Activity() {
  const { selectedOrgId, setSelectedOrgId } = useOrgStore();
  const orgsQ = useQuery({ queryKey: ['orgs'], queryFn: () => organizationApi.list(1, 50) });
  const effectiveOrg = selectedOrgId ?? orgsQ.data?.items[0]?.id;

  const activityQ = useQuery({
    queryKey: ['activity-page', effectiveOrg],
    queryFn: () => organizationApi.activity(effectiveOrg!, 1, 50),
    enabled: !!effectiveOrg,
  });

  return (
    <>
      <PageHeader
        title="Activity"
        subtitle="Audit timeline across your organization."
        actions={
          <Form.Select
            size="sm"
            style={{ maxWidth: 240 }}
            value={effectiveOrg ?? ''}
            onChange={(e) => setSelectedOrgId(e.target.value || null)}
            aria-label="Select organization for activity"
          >
            {(orgsQ.data?.items ?? []).map((o) => (
              <option key={o.id} value={o.id}>
                {o.name}
              </option>
            ))}
          </Form.Select>
        }
      />
      <Card className="sm-card">
        <Card.Body>
          {activityQ.isLoading ? (
            <LoadingState text="Loading activity..." />
          ) : activityQ.isError ? (
            <ErrorState message="We couldn't load activity." onRetry={() => activityQ.refetch()} />
          ) : (activityQ.data?.items ?? []).length === 0 ? (
            <EmptyState title="No activity yet" hint="Actions on projects, tasks and members will appear here." />
          ) : (
            <ActivityTimeline items={activityQ.data?.items ?? []} />
          )}
        </Card.Body>
      </Card>
    </>
  );
}
