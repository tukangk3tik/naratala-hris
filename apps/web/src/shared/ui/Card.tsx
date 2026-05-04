import type { ReactNode } from 'react';

export function Card({
  title,
  subtitle,
  actions,
  children,
}: {
  title?: ReactNode;
  subtitle?: ReactNode;
  actions?: ReactNode;
  children: ReactNode;
}): JSX.Element {
  return (
    <section className="nt-card">
      {(title || actions) && (
        <header className="nt-card-head">
          <div>
            {title && <h2 className="nt-card-title">{title}</h2>}
            {subtitle && <p className="nt-card-sub">{subtitle}</p>}
          </div>
          {actions && <div className="nt-card-actions">{actions}</div>}
        </header>
      )}
      <div className="nt-card-body">{children}</div>
    </section>
  );
}
