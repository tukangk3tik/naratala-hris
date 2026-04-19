// Sidebar navigation — collapsible icon+label
const Sidebar = ({ current, setCurrent, collapsed, setCollapsed, dark }) => {
  const items = [
    { id: 'overview',   key: 'nav_overview',   icon: IconHome },
    { id: 'absence',    key: 'nav_timeoff',    icon: IconCalendar, badge: 6 },
    { id: 'employees',  key: 'nav_employees',  icon: IconUsers },
    { id: 'payroll',    key: 'nav_payroll',    icon: IconCash },
    { id: 'benefits',   key: 'nav_benefits',   icon: IconHeart },
    { id: 'recruiting', key: 'nav_recruiting', icon: IconBriefcase, badge: 5 },
  ];

  return (
    <aside className={`nt-sidebar ${collapsed ? 'collapsed' : ''}`}>
      <div className="nt-brand">
        <div className="nt-logo">
          <svg viewBox="0 0 32 32" width="28" height="28">
            <circle cx="16" cy="16" r="14" fill="var(--accent)" />
            <path d="M10 21c0-4 2.5-7 6-7s6 3 6 7" stroke="var(--ink)" strokeWidth="2" fill="none" strokeLinecap="round"/>
            <circle cx="13" cy="13" r="1.4" fill="var(--ink)"/>
            <circle cx="19" cy="13" r="1.4" fill="var(--ink)"/>
          </svg>
        </div>
        {!collapsed && (
          <div className="nt-brand-text">
            <div className="nt-brand-name">Naratala</div>
            <div className="nt-brand-sub">{t('brand_sub')}</div>
          </div>
        )}
        <button className="nt-collapse" onClick={() => setCollapsed(!collapsed)}>
          {collapsed ? <IconChevronRight size={16}/> : <IconChevronLeft size={16}/>}
        </button>
      </div>

      <nav className="nt-nav">
        {items.map(it => {
          const IconC = it.icon;
          const active = current === it.id;
          const label = t(it.key);
          return (
            <button key={it.id}
                    className={`nt-nav-item ${active ? 'active' : ''}`}
                    onClick={() => setCurrent(it.id)}
                    title={collapsed ? label : undefined}>
              <span className="nt-nav-icon"><IconC size={18}/></span>
              {!collapsed && <span className="nt-nav-label">{label}</span>}
              {!collapsed && it.badge && <span className="nt-nav-badge">{it.badge}</span>}
              {collapsed && it.badge && <span className="nt-nav-badge-dot" />}
            </button>
          );
        })}
      </nav>

      <div className="nt-nav-divider" />

      <nav className="nt-nav">
        <button className="nt-nav-item" title={collapsed ? t('nav_settings') : undefined}>
          <span className="nt-nav-icon"><IconSettings size={18}/></span>
          {!collapsed && <span className="nt-nav-label">{t('nav_settings')}</span>}
        </button>
        <button className="nt-nav-item" title={collapsed ? t('nav_ask') : undefined}>
          <span className="nt-nav-icon"><IconSparkle size={18}/></span>
          {!collapsed && <span className="nt-nav-label">{t('nav_ask')}</span>}
          {!collapsed && <span className="nt-nav-kbd">⌘K</span>}
        </button>
      </nav>

      <div className="nt-sidebar-footer">
        <div className="nt-avatar" style={{'--h': 40}}>TL</div>
        {!collapsed && (
          <div className="nt-me">
            <div className="nt-me-name">Theo Laurent</div>
            <div className="nt-me-role">Chief People Officer</div>
          </div>
        )}
        {!collapsed && <button className="nt-icon-btn"><IconLogout size={16}/></button>}
      </div>
    </aside>
  );
};

// Top bar
const TopBar = ({ title, subtitle, right, onToggleDark, dark }) => (
  <header className="nt-topbar">
    <div className="nt-topbar-left">
      <div>
        <h1 className="nt-page-title">{title}</h1>
        {subtitle && <p className="nt-page-sub">{subtitle}</p>}
      </div>
    </div>
    <div className="nt-topbar-right">
      <div className="nt-search">
        <IconSearch size={16}/>
        <input placeholder={t('search_placeholder')} />
        <span className="nt-kbd">⌘ /</span>
      </div>
      <button className="nt-icon-btn nt-has-badge">
        <IconBell size={18}/>
        <span className="nt-dot" />
      </button>
      <button className="nt-icon-btn" onClick={onToggleDark}>
        {dark ? <IconSun size={18}/> : <IconMoon size={18}/>}
      </button>
      {right}
    </div>
  </header>
);

const Avatar = ({ emp, size = 36 }) => (
  <div className="nt-avatar" style={{ '--h': emp.hue, width: size, height: size, fontSize: size * 0.38 }}>
    {emp.avatar}
  </div>
);

const Pill = ({ tone = 'neutral', children, style }) => (
  <span className={`nt-pill tone-${tone}`} style={style}>{children}</span>
);

const Card = ({ title, subtitle, actions, children, className = '', style, pad = true }) => (
  <section className={`nt-card ${className}`} style={style}>
    {(title || actions) && (
      <header className="nt-card-head">
        <div>
          {title && <h3 className="nt-card-title">{title}</h3>}
          {subtitle && <p className="nt-card-sub">{subtitle}</p>}
        </div>
        {actions}
      </header>
    )}
    <div className={pad ? 'nt-card-body' : ''}>{children}</div>
  </section>
);

Object.assign(window, { Sidebar, TopBar, Avatar, Pill, Card });
