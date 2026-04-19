// ABSENCE approval queue
const AbsenceView = ({ openEmployee }) => {
  const [requests, setRequests] = React.useState(ABSENCE_REQUESTS);
  const [filter, setFilter]     = React.useState('pending');
  const [selected, setSelected] = React.useState(requests[0].id);
  const [toast, setToast]       = React.useState(null);

  const empById = (id) => EMPLOYEES.find(e => e.id === id);
  const filtered = requests.filter(r => filter === 'all' || r.status === filter);
  const selectedReq = filtered.find(r => r.id === selected) || filtered[0];

  const act = (id, status) => {
    setRequests(rs => rs.map(r => r.id === id ? { ...r, status } : r));
    const r = requests.find(x => x.id === id);
    const emp = empById(r.empId);
    setToast({ text: `${status === 'approved' ? t('toast_approved') : t('toast_declined')} · ${emp.name} — ${tType(r.type).toLowerCase()}`, status });
    setTimeout(() => setToast(null), 3200);
  };

  const pendingCount = requests.filter(r => r.status === 'pending').length;
  const urgentCount  = requests.filter(r => r.status === 'pending' && r.urgent).length;

  return (
    <div className="nt-absence-layout">
      <div className="nt-queue-col">
        <div className="nt-kpi-row">
          <KPI label={t('kpi_pending')}  value={pendingCount} accent="terracotta" icon={<IconClock size={16}/>} />
          <KPI label={t('kpi_out_today')} value={3} accent="sage" icon={<IconUsers size={16}/>} hint={t('kpi_out_hint')} />
          <KPI label={t('kpi_urgent')}    value={urgentCount} accent="butter" icon={<IconSparkle size={16}/>} hint={t('kpi_urgent_hint')} />
          <KPI label={t('kpi_days_used')} value="612" accent="plum" icon={<IconCalendar size={16}/>} hint={t('kpi_days_hint')} />
        </div>

        <Card
          title={t('queue_title')}
          subtitle={t('queue_sub')}
          actions={
            <div className="nt-filter-row">
              {[
                ['pending',  t('filter_pending'), pendingCount],
                ['approved', t('filter_approved')],
                ['all',      t('filter_all')],
              ].map(([k, lbl, n]) => (
                <button key={k}
                        className={`nt-seg ${filter === k ? 'active' : ''}`}
                        onClick={() => setFilter(k)}>
                  {lbl}{n != null && <span className="nt-seg-n">{n}</span>}
                </button>
              ))}
              <button className="nt-icon-btn-line"><IconFilter size={14}/> {t('filter_btn')}</button>
            </div>
          }
          pad={false}
        >
          <ul className="nt-request-list">
            {filtered.map(r => {
              const emp = empById(r.empId);
              const active = selectedReq && r.id === selectedReq.id;
              const dayWord = r.days === 1 ? t('day') : t('days');
              return (
                <li key={r.id}
                    className={`nt-request ${active ? 'active' : ''} ${r.status !== 'pending' ? 'resolved' : ''}`}
                    onClick={() => setSelected(r.id)}>
                  <Avatar emp={emp} size={44}/>
                  <div className="nt-request-main">
                    <div className="nt-request-top">
                      <span className="nt-request-name">{emp.name}</span>
                      <span className="nt-request-role">· {emp.role}</span>
                      {r.urgent && r.status === 'pending' && <Pill tone="terracotta">{t('urgent_tag')}</Pill>}
                      {r.status === 'approved' && <Pill tone="sage">{t('approved_tag')}</Pill>}
                    </div>
                    <div className="nt-request-detail">
                      <span className="nt-chip">{tType(r.type)}</span>
                      <span>{r.days} {dayWord}</span>
                      <span>·</span>
                      <span>{tDateLabel(r.from)} → {tDateLabel(r.to)}</span>
                    </div>
                    {r.reason && r.reason !== '—' && (
                      <p className="nt-request-reason">"{tReason(r.reason)}"</p>
                    )}
                  </div>
                  <div className="nt-request-side">
                    <span className="nt-request-when">{tSubmitted(r.submitted)}</span>
                    {r.status === 'pending' && (
                      <div className="nt-request-actions">
                        <button className="nt-btn-ghost danger" onClick={(e) => { e.stopPropagation(); act(r.id, 'declined'); }}>
                          <IconX size={14}/>
                        </button>
                        <button className="nt-btn-primary sm" onClick={(e) => { e.stopPropagation(); act(r.id, 'approved'); }}>
                          <IconCheck size={14}/> {t('approve')}
                        </button>
                      </div>
                    )}
                  </div>
                </li>
              );
            })}
            {filtered.length === 0 && (
              <li className="nt-empty">{t('empty_queue')}</li>
            )}
          </ul>
        </Card>

        <AbsenceCalendar />
      </div>

      <aside className="nt-absence-rail">
        {selectedReq && <RequestDetail req={selectedReq} emp={empById(selectedReq.empId)} onAct={act} openEmployee={openEmployee} />}
      </aside>

      {toast && (
        <div className={`nt-toast tone-${toast.status === 'approved' ? 'sage' : 'terracotta'}`}>
          {toast.status === 'approved' ? <IconCheck size={16}/> : <IconX size={16}/>}
          {toast.text}
        </div>
      )}
    </div>
  );
};

const KPI = ({ label, value, hint, accent = 'sage', icon }) => (
  <div className={`nt-kpi accent-${accent}`}>
    <div className="nt-kpi-icon">{icon}</div>
    <div className="nt-kpi-label">{label}</div>
    <div className="nt-kpi-value">{value}</div>
    {hint && <div className="nt-kpi-hint">{hint}</div>}
  </div>
);

const RequestDetail = ({ req, emp, onAct, openEmployee }) => {
  const balance = { vacation: { used: 7, total: 20 }, sick: { used: 2, total: 10 }, personal: { used: 1, total: 5 } };
  const dayWord = req.days === 1 ? t('day') : t('days');
  return (
    <div className="nt-detail">
      <div className="nt-detail-head">
        <Avatar emp={emp} size={56}/>
        <div>
          <div className="nt-detail-name">{emp.name}</div>
          <div className="nt-detail-role">{emp.role} · {emp.dept}</div>
        </div>
        <button className="nt-link" onClick={() => openEmployee(emp.id)}>{t('profile')} <IconArrowRight size={12}/></button>
      </div>

      <div className="nt-detail-hero">
        <div>
          <div className="nt-detail-type">{tType(req.type)}</div>
          <div className="nt-detail-range">{tDateLabel(req.from)} — {tDateLabel(req.to)}</div>
        </div>
        <div className="nt-detail-days">
          <span className="nt-big-num">{req.days}</span>
          <span>{dayWord}</span>
        </div>
      </div>

      {req.reason && req.reason !== '—' && (
        <div className="nt-detail-block">
          <div className="nt-detail-label">{t('note_from')} {emp.name.split(' ')[0]}</div>
          <p className="nt-detail-quote">"{tReason(req.reason)}"</p>
        </div>
      )}

      <div className="nt-detail-block">
        <div className="nt-detail-label">{t('coverage_label')}</div>
        <div className="nt-coverage">
          {req.coverage !== '—'
            ? <><IconCheck size={14}/> {req.coverage} {t('coverage_will')}</>
            : <span className="muted">{t('no_coverage')}</span>}
        </div>
      </div>

      <div className="nt-detail-block">
        <div className="nt-detail-label">{t('balance_label')}</div>
        <div className="nt-balance-stack">
          <BalanceBar label={t('bal_vacation')} used={balance.vacation.used + (req.type === 'Vacation' ? req.days : 0)} total={balance.vacation.total} tone="sage"/>
          <BalanceBar label={t('bal_sick')}     used={balance.sick.used + (req.type === 'Sick leave' ? req.days : 0)}   total={balance.sick.total}     tone="terracotta"/>
          <BalanceBar label={t('bal_personal')} used={balance.personal.used + (req.type === 'Personal' ? req.days : 0)} total={balance.personal.total} tone="butter"/>
        </div>
      </div>

      <div className="nt-detail-block">
        <div className="nt-detail-label">{t('conflicts_label')}</div>
        <div className="nt-conflict-list">
          <div className="nt-conflict">
            <Avatar emp={EMPLOYEES.find(e=>e.id===15)} size={24}/>
            <span>Yuki T. · {tDateLabel('May 5')}</span>
          </div>
          <div className="nt-conflict soft">
            <IconCalendar size={14}/> Design team sync · {tDateLabel('May 5').replace('5','7')}
          </div>
        </div>
      </div>

      {req.status === 'pending' && (
        <div className="nt-detail-cta">
          <button className="nt-btn-ghost wide" onClick={() => onAct(req.id, 'declined')}>
            <IconX size={14}/> {t('decline')}
          </button>
          <button className="nt-btn-primary wide" onClick={() => onAct(req.id, 'approved')}>
            <IconCheck size={14}/> {t('approve')} {req.days} {dayWord}
          </button>
        </div>
      )}

      <div className="nt-detail-block">
        <div className="nt-detail-label">{t('message_label')} {emp.name.split(' ')[0]}</div>
        <div className="nt-compose">
          <input placeholder={t('message_placeholder')} />
          <button className="nt-icon-btn-line"><IconMessage size={14}/></button>
        </div>
      </div>
    </div>
  );
};

const BalanceBar = ({ label, used, total, tone }) => {
  const pct = Math.min(100, (used / total) * 100);
  return (
    <div className="nt-balance">
      <div className="nt-balance-top">
        <span>{label}</span>
        <span className="nt-balance-num">{used}<span className="muted">/{total}</span></span>
      </div>
      <div className={`nt-balance-track tone-${tone}`}>
        <div className="nt-balance-fill" style={{ width: `${pct}%` }}/>
      </div>
    </div>
  );
};

const AbsenceCalendar = () => {
  const days = Array.from({ length: 30 }, (_, i) => i + 1);
  const today = 19;
  const absencesByDay = {};
  CALENDAR_ABSENCES.forEach(a => {
    a.days.forEach(d => {
      absencesByDay[d] = absencesByDay[d] || [];
      absencesByDay[d].push(a);
    });
  });
  const dow = TRANSLATIONS[window.__lang]?.dow_short || TRANSLATIONS.en.dow_short;

  return (
    <Card title={t('cal_title')} subtitle={t('cal_sub')}
          actions={<div className="nt-cal-nav">
            <button className="nt-icon-btn-line sm"><IconChevronLeft size={14}/></button>
            <span className="nt-cal-label">{t('cal_month')}</span>
            <button className="nt-icon-btn-line sm"><IconChevronRight size={14}/></button>
          </div>}>
      <div className="nt-cal-grid">
        {dow.map((d, i) => <div key={i} className="nt-cal-dow">{d}</div>)}
        {Array.from({ length: 2 }).map((_, i) => <div key={`s${i}`}/>)}
        {days.map(d => {
          const list = absencesByDay[d] || [];
          const isToday = d === today;
          const isWeekend = (d + 2) % 7 === 0 || (d + 2) % 7 === 6;
          return (
            <div key={d} className={`nt-cal-cell ${isToday ? 'today' : ''} ${isWeekend ? 'weekend' : ''}`}>
              <div className="nt-cal-num">{d}</div>
              <div className="nt-cal-pills">
                {list.slice(0, 3).map((a, i) => {
                  const emp = EMPLOYEES.find(e => e.id === a.empId);
                  const tone = a.type === 'Parental' ? 'plum' : a.type === 'Conference' ? 'butter' : 'sage';
                  return <div key={i} className={`nt-cal-pill tone-${tone}`} title={`${emp.name} · ${a.type}`}>{emp.avatar}</div>;
                })}
                {list.length > 3 && <div className="nt-cal-pill more">+{list.length - 3}</div>}
              </div>
            </div>
          );
        })}
      </div>
      <div className="nt-cal-legend">
        <span><i className="dot tone-sage"/> {t('legend_vacation')}</span>
        <span><i className="dot tone-plum"/> {t('legend_parental')}</span>
        <span><i className="dot tone-butter"/> {t('legend_conference')}</span>
      </div>
    </Card>
  );
};

Object.assign(window, { AbsenceView });
