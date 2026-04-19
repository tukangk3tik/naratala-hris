// Employees view
const EmployeesView = ({ selectedId, setSelectedId, showAdd, setShowAdd }) => {
  const [query, setQuery]   = React.useState('');
  const [dept, setDept]     = React.useState('All');
  const [sort, setSort]     = React.useState('name');
  const [view, setView]     = React.useState('table');

  const filtered = EMPLOYEES
    .filter(e => dept === 'All' || e.dept === dept)
    .filter(e => !query || (e.name + e.role + e.email).toLowerCase().includes(query.toLowerCase()))
    .sort((a, b) => {
      if (sort === 'name')    return a.name.localeCompare(b.name);
      if (sort === 'start')   return new Date(b.start) - new Date(a.start);
      if (sort === 'salary')  return b.salary - a.salary;
      if (sort === 'dept')    return a.dept.localeCompare(b.dept);
      return 0;
    });

  return (
    <div className="nt-emp-wrap">
      <Card
        title={<span>{filtered.length} <span className="muted">{t('of_people', { n: EMPLOYEES.length })}</span></span>}
        subtitle={t('people_sub')}
        actions={
          <div className="nt-emp-tools">
            <div className="nt-search small">
              <IconSearch size={14}/>
              <input placeholder={t('search_emp')} value={query} onChange={e => setQuery(e.target.value)}/>
            </div>
            <select className="nt-select" value={dept} onChange={e => setDept(e.target.value)}>
              {DEPARTMENTS.map(d => <option key={d}>{d}</option>)}
            </select>
            <select className="nt-select" value={sort} onChange={e => setSort(e.target.value)}>
              <option value="name">{t('sort_name')}</option>
              <option value="dept">{t('sort_dept')}</option>
              <option value="start">{t('sort_start')}</option>
              <option value="salary">{t('sort_salary')}</option>
            </select>
            <div className="nt-view-toggle">
              <button className={view === 'table' ? 'active' : ''} onClick={() => setView('table')}>
                <svg width="14" height="14" viewBox="0 0 16 16"><path d="M1 3h14M1 8h14M1 13h14" stroke="currentColor" strokeWidth="1.5"/></svg>
              </button>
              <button className={view === 'grid' ? 'active' : ''} onClick={() => setView('grid')}>
                <svg width="14" height="14" viewBox="0 0 16 16"><rect x="1" y="1" width="6" height="6" stroke="currentColor" strokeWidth="1.5" fill="none"/><rect x="9" y="1" width="6" height="6" stroke="currentColor" strokeWidth="1.5" fill="none"/><rect x="1" y="9" width="6" height="6" stroke="currentColor" strokeWidth="1.5" fill="none"/><rect x="9" y="9" width="6" height="6" stroke="currentColor" strokeWidth="1.5" fill="none"/></svg>
              </button>
            </div>
            <button className="nt-icon-btn-line"><IconDownload size={14}/> {t('export')}</button>
            <button className="nt-btn-primary" onClick={() => setShowAdd(true)}>
              <IconPlus size={14}/> {t('add_person')}
            </button>
          </div>
        }
        pad={false}
      >
        {view === 'table' ? (
          <EmployeeTable rows={filtered} onOpen={setSelectedId}/>
        ) : (
          <EmployeeGrid rows={filtered} onOpen={setSelectedId}/>
        )}
      </Card>

      {selectedId != null && (
        <EmployeeDrawer emp={EMPLOYEES.find(e => e.id === selectedId)} onClose={() => setSelectedId(null)}/>
      )}
      {showAdd && <AddEmployeeModal onClose={() => setShowAdd(false)}/>}
    </div>
  );
};

const EmployeeTable = ({ rows, onOpen }) => {
  const months = TRANSLATIONS[window.__lang]?.months_short || TRANSLATIONS.en.months_short;
  return (
    <div className="nt-table-wrap">
      <table className="nt-table">
        <thead>
          <tr>
            <th style={{width: 32}}><input type="checkbox"/></th>
            <th>{t('col_name')}</th>
            <th>{t('col_role')}</th>
            <th>{t('col_dept')}</th>
            <th>{t('col_location')}</th>
            <th>{t('col_started')}</th>
            <th>{t('col_status')}</th>
            <th style={{width: 32}}></th>
          </tr>
        </thead>
        <tbody>
          {rows.map(emp => {
            const d = new Date(emp.start);
            return (
              <tr key={emp.id} className="nt-table-row" onClick={() => onOpen(emp.id)}>
                <td onClick={(e) => e.stopPropagation()}><input type="checkbox"/></td>
                <td>
                  <div className="nt-cell-person">
                    <Avatar emp={emp} size={32}/>
                    <div>
                      <div className="nt-cell-name">{emp.name}</div>
                      <div className="nt-cell-email muted">{emp.email}</div>
                    </div>
                  </div>
                </td>
                <td>{emp.role}</td>
                <td><span className={`nt-dept-chip dept-${emp.dept.toLowerCase()}`}>{emp.dept}</span></td>
                <td className="muted">{emp.location}</td>
                <td className="muted">{months[d.getMonth()]} {d.getFullYear()}</td>
                <td>
                  <Pill tone={emp.status === 'Active' ? 'sage' : 'butter'}>
                    {emp.status === 'Active' ? t('status_active') : t('status_leave')}
                  </Pill>
                </td>
                <td><button className="nt-icon-btn-line sm" onClick={(e) => e.stopPropagation()}><IconMore size={14}/></button></td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};

const EmployeeGrid = ({ rows, onOpen }) => (
  <div className="nt-emp-grid">
    {rows.map(emp => (
      <button key={emp.id} className="nt-emp-card" onClick={() => onOpen(emp.id)}>
        <Avatar emp={emp} size={56}/>
        <div className="nt-emp-card-name">{emp.name}</div>
        <div className="nt-emp-card-role muted">{emp.role}</div>
        <div className="nt-emp-card-meta">
          <span className={`nt-dept-chip dept-${emp.dept.toLowerCase()}`}>{emp.dept}</span>
        </div>
      </button>
    ))}
  </div>
);

const EmployeeDrawer = ({ emp, onClose }) => {
  const [tab, setTab] = React.useState('overview');
  const tenure = ((new Date() - new Date(emp.start)) / (365.25 * 24 * 3600 * 1000)).toFixed(1);
  const months = TRANSLATIONS[window.__lang]?.months_short || TRANSLATIONS.en.months_short;
  const d = new Date(emp.start);
  const startedText = `${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}`;

  return (
    <div className="nt-drawer-scrim" onClick={onClose}>
      <aside className="nt-drawer" onClick={e => e.stopPropagation()}>
        <header className="nt-drawer-head">
          <button className="nt-icon-btn" onClick={onClose}><IconX size={18}/></button>
          <div className="nt-drawer-actions">
            <button className="nt-icon-btn-line"><IconMessage size={14}/> {t('msg')}</button>
            <button className="nt-icon-btn-line"><IconMore size={14}/></button>
          </div>
        </header>

        <div className="nt-drawer-hero">
          <Avatar emp={emp} size={92}/>
          <div>
            <h2 className="nt-drawer-name">{emp.name}</h2>
            <div className="nt-drawer-role">{emp.role}</div>
            <div className="nt-drawer-chips">
              <Pill tone="sage">{emp.dept}</Pill>
              <Pill tone="neutral">{emp.pronouns}</Pill>
              <Pill tone="butter">{tenure} {t('years')}</Pill>
            </div>
          </div>
        </div>

        <div className="nt-drawer-contact">
          <div><IconMail size={14}/> {emp.email}</div>
          <div><IconPhone size={14}/> {emp.phone}</div>
          <div><IconMapPin size={14}/> {emp.location}</div>
        </div>

        <div className="nt-tabs">
          {['overview','compensation','time off','documents','notes'].map(tk => (
            <button key={tk} className={`nt-tab ${tab === tk ? 'active' : ''}`} onClick={() => setTab(tk)}>{t('tab_' + tk)}</button>
          ))}
        </div>

        <div className="nt-drawer-body">
          {tab === 'overview' && (
            <>
              <div className="nt-dl">
                <dt>{t('dl_manager')}</dt><dd>{emp.manager}</dd>
                <dt>{t('dl_started')}</dt><dd>{startedText}</dd>
                <dt>{t('dl_employment')}</dt><dd>{t('ft_salaried')}</dd>
                <dt>{t('dl_status')}</dt><dd><Pill tone={emp.status === 'Active' ? 'sage' : 'butter'}>{emp.status === 'Active' ? t('status_active') : t('status_leave')}</Pill></dd>
                <dt>{t('dl_location')}</dt><dd>{emp.location}</dd>
                <dt>{t('dl_cost')}</dt><dd>{emp.dept.toUpperCase()}-001</dd>
              </div>

              <div className="nt-drawer-block">
                <div className="nt-drawer-block-title">{t('recent_activity')}</div>
                <ul className="nt-timeline">
                  <li><span className="nt-timeline-dot tone-sage"/><div><div>Q1 self-review</div><span className="muted">3 {t('days')}</span></div></li>
                  <li><span className="nt-timeline-dot tone-butter"/><div><div>Time-off request</div><span className="muted">1w</span></div></li>
                  <li><span className="nt-timeline-dot tone-plum"/><div><div>{t('benefit_learn')}</div><span className="muted">2w</span></div></li>
                  <li><span className="nt-timeline-dot tone-terracotta"/><div><div>{emp.role}</div><span className="muted">6m</span></div></li>
                </ul>
              </div>
            </>
          )}
          {tab === 'compensation' && (
            <div className="nt-drawer-block">
              <div className="nt-comp-big">
                <div className="nt-big-num">${(emp.salary/1000).toFixed(0)}k</div>
                <div className="muted">{t('base_salary')}</div>
              </div>
              <div className="nt-dl">
                <dt>{t('band')}</dt><dd>L4 · Senior</dd>
                <dt>{t('position_in_band')}</dt><dd>62%</dd>
                <dt>{t('last_raise')}</dt><dd>+6.5% · Jan 2026</dd>
                <dt>{t('bonus_target')}</dt><dd>12%</dd>
                <dt>{t('equity')}</dt><dd>8,400 RSU</dd>
              </div>
            </div>
          )}
          {tab === 'time off' && (
            <div className="nt-drawer-block">
              <BalanceBar label={t('bal_vacation')} used={7}  total={20} tone="sage"/>
              <div style={{height: 12}}/>
              <BalanceBar label={t('bal_sick')}     used={2}  total={10} tone="terracotta"/>
              <div style={{height: 12}}/>
              <BalanceBar label={t('bal_personal')} used={1}  total={5}  tone="butter"/>
              <div style={{height: 20}}/>
              <div className="muted" style={{fontSize: 13}}>{t('next_booked')} {tDateLabel('May 5')}–{tDateLabel('May 9')}</div>
            </div>
          )}
          {tab === 'documents' && (
            <ul className="nt-doc-list">
              <li><span>Offer letter · 2021</span><button className="nt-icon-btn-line sm"><IconDownload size={12}/></button></li>
              <li><span>Employment contract</span><button className="nt-icon-btn-line sm"><IconDownload size={12}/></button></li>
              <li><span>I-9</span><button className="nt-icon-btn-line sm"><IconDownload size={12}/></button></li>
              <li><span>2025 W-2</span><button className="nt-icon-btn-line sm"><IconDownload size={12}/></button></li>
              <li><span>Handbook 2026</span><button className="nt-icon-btn-line sm"><IconDownload size={12}/></button></li>
            </ul>
          )}
          {tab === 'notes' && (
            <div className="nt-drawer-block">
              <textarea className="nt-textarea" placeholder=""/>
            </div>
          )}
        </div>
      </aside>
    </div>
  );
};

const AddEmployeeModal = ({ onClose }) => {
  const [step, setStep] = React.useState(1);
  const [form, setForm] = React.useState({ name: '', email: '', role: '', dept: 'Design', location: '', manager: '', startDate: '', salary: '', type: 'Full-time' });
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));
  const canNext = step === 1 ? form.name && form.email : step === 2 ? form.role && form.dept : true;

  return (
    <div className="nt-drawer-scrim" onClick={onClose}>
      <div className="nt-modal" onClick={e => e.stopPropagation()}>
        <header className="nt-modal-head">
          <div>
            <div className="nt-modal-kicker">{t('step_of', { n: step })}</div>
            <h2 className="nt-modal-title">
              {step === 1 && t('step1_title')}
              {step === 2 && t('step2_title')}
              {step === 3 && t('step3_title')}
            </h2>
          </div>
          <button className="nt-icon-btn" onClick={onClose}><IconX size={18}/></button>
        </header>

        <div className="nt-step-dots">
          <div className={`nt-step-dot ${step >= 1 ? 'active' : ''}`}/>
          <div className={`nt-step-dot ${step >= 2 ? 'active' : ''}`}/>
          <div className={`nt-step-dot ${step >= 3 ? 'active' : ''}`}/>
        </div>

        <div className="nt-modal-body">
          {step === 1 && (
            <>
              <Field label={t('f_legal_name')}>
                <input className="nt-input" placeholder="Avery Summers" value={form.name} onChange={e => set('name', e.target.value)}/>
              </Field>
              <div className="nt-form-row">
                <Field label={t('f_preferred')}><input className="nt-input" placeholder="Ave"/></Field>
                <Field label={t('f_pronouns')}>
                  <select className="nt-input"><option>they/them</option><option>she/her</option><option>he/him</option></select>
                </Field>
              </div>
              <Field label={t('f_work_email')}>
                <input className="nt-input" type="email" placeholder="avery@naratala.co" value={form.email} onChange={e => set('email', e.target.value)}/>
              </Field>
              <Field label={t('f_phone')} hint={t('f_phone_hint')}>
                <input className="nt-input" placeholder="+62 812 3456 7890"/>
              </Field>
            </>
          )}
          {step === 2 && (
            <>
              <Field label={t('f_title')}>
                <input className="nt-input" placeholder="Senior Product Designer" value={form.role} onChange={e => set('role', e.target.value)}/>
              </Field>
              <div className="nt-form-row">
                <Field label={t('f_dept')}>
                  <select className="nt-input" value={form.dept} onChange={e => set('dept', e.target.value)}>
                    {DEPARTMENTS.filter(d => d !== 'All').map(d => <option key={d}>{d}</option>)}
                  </select>
                </Field>
                <Field label={t('f_type')}>
                  <select className="nt-input" value={form.type} onChange={e => set('type', e.target.value)}>
                    <option>{t('ft')}</option><option>{t('pt')}</option><option>{t('contract')}</option><option>{t('intern')}</option>
                  </select>
                </Field>
              </div>
              <Field label={t('f_manager')}>
                <input className="nt-input" value={form.manager} onChange={e => set('manager', e.target.value)}/>
              </Field>
              <Field label={t('f_location')}>
                <input className="nt-input" value={form.location} onChange={e => set('location', e.target.value)}/>
              </Field>
              <Field label={t('f_arrangement')}>
                <div className="nt-radio-row">
                  {[t('arr_office'), t('arr_hybrid'), t('arr_remote')].map((o, i) => (
                    <label key={o} className="nt-radio"><input type="radio" name="arrangement" defaultChecked={i === 1}/> {o}</label>
                  ))}
                </div>
              </Field>
            </>
          )}
          {step === 3 && (
            <>
              <div className="nt-form-row">
                <Field label={t('f_start')}>
                  <input className="nt-input" type="date" value={form.startDate} onChange={e => set('startDate', e.target.value)}/>
                </Field>
                <Field label={t('f_probation')}>
                  <select className="nt-input"><option>{t('pp_90')}</option><option>{t('pp_60')}</option><option>{t('pp_none')}</option></select>
                </Field>
              </div>
              <div className="nt-form-row">
                <Field label={t('f_salary')}>
                  <input className="nt-input" placeholder="120000" value={form.salary} onChange={e => set('salary', e.target.value)}/>
                </Field>
                <Field label={t('f_band')}>
                  <select className="nt-input">
                    {COMP_BANDS.map(b => <option key={b.level}>{b.level}</option>)}
                  </select>
                </Field>
              </div>
              <Field label={t('f_bonus')}><input className="nt-input" placeholder="10"/></Field>
              <Field label={t('f_enroll')}>
                <div className="nt-check-stack">
                  <label><input type="checkbox" defaultChecked/> {t('benefit_med')}</label>
                  <label><input type="checkbox" defaultChecked/> {t('benefit_dv')}</label>
                  <label><input type="checkbox" defaultChecked/> {t('benefit_401k')}</label>
                  <label><input type="checkbox" defaultChecked/> {t('benefit_learn')}</label>
                </div>
              </Field>
            </>
          )}
        </div>

        <footer className="nt-modal-foot">
          <button className="nt-btn-ghost" onClick={() => step === 1 ? onClose() : setStep(step - 1)}>
            {step === 1 ? t('cancel') : t('back')}
          </button>
          <div className="nt-modal-foot-right">
            {step < 3 ? (
              <button className="nt-btn-primary" disabled={!canNext} onClick={() => setStep(step + 1)}>
                {t('continue_btn')} <IconArrowRight size={14}/>
              </button>
            ) : (
              <button className="nt-btn-primary" onClick={onClose}>
                <IconCheck size={14}/> {t('send_offer')}
              </button>
            )}
          </div>
        </footer>
      </div>
    </div>
  );
};

const Field = ({ label, hint, children }) => (
  <label className="nt-field">
    <span className="nt-field-label">{label}</span>
    {children}
    {hint && <span className="nt-field-hint">{hint}</span>}
  </label>
);

Object.assign(window, { EmployeesView });
