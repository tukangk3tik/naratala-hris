import type { ReactNode } from 'react';

export type Tone = 'neutral' | 'good' | 'warn' | 'bad' | 'info';

export function Pill({
  tone = 'neutral',
  children,
}: {
  tone?: Tone;
  children: ReactNode;
}): JSX.Element {
  return <span className={`nt-pill tone-${tone}`}>{children}</span>;
}
