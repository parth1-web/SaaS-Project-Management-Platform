import type { ActivityLog } from '../../types';

function timeLabel(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleString(undefined, { hour: 'numeric', minute: '2-digit' });
}

function dayLabel(iso: string): string {
  const d = new Date(iso);
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);
  if (d.toDateString() === today.toDateString()) return 'Today';
  if (d.toDateString() === yesterday.toDateString()) return 'Yesterday';
  return d.toLocaleDateString();
}

export default function ActivityTimeline({ items }: { items: ActivityLog[] }) {
  if (!items.length) return <div className="text-muted small">No activity yet.</div>;
  const groups = new Map<string, ActivityLog[]>();
  for (const a of items) {
    const k = dayLabel(a.createdAt);
    if (!groups.has(k)) groups.set(k, []);
    groups.get(k)!.push(a);
  }
  return (
    <div>
      {[...groups.entries()].map(([day, list]) => (
        <div key={day} className="mb-3">
          <div className="sm-section-title mb-2">{day}</div>
          <div className="sm-timeline">
            {list.map((a) => (
              <div key={a.id} className="sm-timeline-item">
                <span className="sm-timeline-dot" aria-hidden />
                <div className="small">
                  <span className="text-muted">{timeLabel(a.createdAt)}</span>
                  <div>
                    <strong>{a.userName}</strong> <span className="text-muted">{a.action}</span>
                  </div>
                  {a.description && <div className="text-muted">{a.description}</div>}
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
