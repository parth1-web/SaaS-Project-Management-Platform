import { Pagination } from 'react-bootstrap';

export default function Pager({
  page,
  totalPages,
  onChange,
}: {
  page: number;
  totalPages: number;
  onChange: (page: number) => void;
}) {
  if (totalPages <= 1) return null;
  const items = [];
  const start = Math.max(1, page - 2);
  const end = Math.min(totalPages, page + 2);
  for (let p = start; p <= end; p++) items.push(p);
  return (
    <Pagination size="sm" className="mb-0" aria-label="Pagination">
      <Pagination.Prev disabled={page <= 1} onClick={() => onChange(page - 1)} aria-label="Previous page" />
      {start > 1 && (
        <>
          <Pagination.Item onClick={() => onChange(1)}>1</Pagination.Item>
          <Pagination.Ellipsis disabled />
        </>
      )}
      {items.map((p) => (
        <Pagination.Item key={p} active={p === page} onClick={() => onChange(p)} aria-label={`Page ${p}`} aria-current={p === page ? 'page' : undefined}>
          {p}
        </Pagination.Item>
      ))}
      {end < totalPages && (
        <>
          <Pagination.Ellipsis disabled />
          <Pagination.Item onClick={() => onChange(totalPages)}>{totalPages}</Pagination.Item>
        </>
      )}
      <Pagination.Next disabled={page >= totalPages} onClick={() => onChange(page + 1)} aria-label="Next page" />
    </Pagination>
  );
}
