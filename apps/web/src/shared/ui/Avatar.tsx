import type { CSSProperties } from 'react';

export function Avatar({
  name,
  hue,
  size = 36,
}: {
  name: string;
  hue: number;
  size?: number;
}): JSX.Element {
  const initials = name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((s) => s[0]!.toUpperCase())
    .join('');
  return (
    <div
      className="nt-avatar"
      style={{ '--h': hue, width: size, height: size, fontSize: size * 0.38 } as CSSProperties}
    >
      {initials || '?'}
    </div>
  );
}
