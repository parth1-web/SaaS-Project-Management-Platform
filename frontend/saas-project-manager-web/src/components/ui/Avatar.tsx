export function initials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export function Avatar({
  name,
  size = 32,
  title,
}: {
  name: string;
  size?: number;
  title?: string;
}) {
  return (
    <span
      className="sm-avatar"
      style={{ width: size, height: size, fontSize: size * 0.38 }}
      title={title ?? name}
      aria-label={name}
      role="img"
    >
      {initials(name)}
    </span>
  );
}

export function AvatarGroup({ names, max = 4 }: { names: string[]; max?: number }) {
  const shown = names.slice(0, max);
  const extra = names.length - shown.length;
  return (
    <span className="sm-avatar-group d-inline-flex align-items-center" aria-label={`${names.length} members`}>
      {shown.map((n, i) => (
        <Avatar key={`${n}-${i}`} name={n} size={28} />
      ))}
      {extra > 0 && <Avatar name={`+${extra}`} size={28} title={`${extra} more`} />}
    </span>
  );
}
