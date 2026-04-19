// PAYROLL, BENEFITS, RECRUITING, OVERVIEW

const PayrollView = () => {
  const max = Math.max(...PAYROLL_MONTHS.map(m => m.total));
  const maxHc = Math.max(...PAYROLL_MONTHS.map(m => m.headcount));
  const months = TRANSLATIONS[window.__lang]?.months_short || TRANSLATIONS.en.months_short;

  const deptBreakdown = [
    { name: 'Engineering', amount: 184000, color: 'sage' },
    { name: 'Design',      amount: 86000,  color: 'terracotta' },
    { name: 'Product',     amount: 48000,  color: 'butter' },
    { name: 'Finance',     amount: 54000,  color: 'plum' },
    { name: 'People',      amount: 34000,  color: 'sky' },
    { name: 'Success',     amount: 22000,  color: 'neutral' },
    { name: 'Executive',   amount: 34000,  color: 'ink' },
  ];
  const totalDept = deptBreakdown.reduce((s, d) => s + d.amount, 0);

  return (
    <div className="nt-payroll-grid">
      <div className="nt-payroll-hero">
        <div className="nt-hero-row">
          <div>
            <div className="nt-kicker">{t('preview')}</div>
            <div className="nt-huge-num">{t('huge_payroll')}</div>
            <div className="nt-hero-sub">
              <Pill tone="sage">{t('vs_march')}</Pill>
              <span className="muted">{t('pays_apr')}</span>
            </div>
          </div>
          <div className="nt-hero-actions">
            <button className="nt-icon-btn-line"><IconDownload size={14}/> {t('export_csv')}</button>
            <button className="nt-btn-primary lg"><IconCheck size={14}/> {t('review_run')}</button>
          </div>
        </div>

        <div className="nt-hero-chart">
          <div className="nt-chart-head">
            <div className="nt-chart-title">{t('monthly_chart_title')}</div>
            <div className="nt-chart-legend">
              <span><i className="dot tone-sage"/> {t('legend_payroll')}</span>
              <span><i className="dot tone-terracotta"/> {t('legend_headcount')}</span>
            </div>
          </div>
          <div className="nt-combo-chart">
            <svg viewBox="0 0 600 220" preserveAspectRatio="none" className="nt-chart-svg">
              <defs>
                <linearGradient id="gradSage" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%"  stopColor="var(--sage)" stopOpacity="0.4"/>
                  <stop offset="100%" stopColor="var(--sage)" stopOpacity="0"/>
                </linearGradient>
              </defs>
              {[0,1,2,3,4].map(i => (
                <line key={i} x1="0" x2="600" y1={20 + i*40} y2={20 + i*40} stroke="var(--line)" strokeWidth="1"/>
              ))}
              <path d={`M 0 ${220 - (PAYROLL_MONTHS[0].total/max)*180} ${PAYROLL_MONTHS.map((m,i) => `L ${(i/(PAYROLL_MONTHS.length-1))*600} ${220 - (m.total/max)*180}`).join(' ')} L 600 220 L 0 220 Z`}
                    fill="url(#gradSage)"/>
              <path d={`M 0 ${220 - (PAYROLL_MONTHS[0].total/max)*180} ${PAYROLL_MONTHS.map((m,i) => `L ${(i/(PAYROLL_MONTHS.length-1))*600} ${220 - (m.total/max)*180}`).join(' ')}`}
                    stroke="var(--sage)" strokeWidth="2.5" fill="none" strokeLinecap="round"/>
              <path d={`M 0 ${220 - (PAYROLL_MONTHS[0].headcount/maxHc)*160} ${PAYROLL_MONTHS.map((m,i) => `L ${(i/(PAYROLL_MONTHS.length-1))*600} ${220 - (m.headcount/maxHc)*160}`).join(' ')}`}
                    stroke="var(--terracotta)" strokeWidth="2" fill="none" strokeDasharray="4 4" strokeLinecap="round"/>
              {PAYROLL_MONTHS.map((m, i) => (
                <g key={i}>
                  <circle cx={(i/(PAYROLL_MONTHS.length-1))*600} cy={220 - (m.total/max)*180} r="5" fill="var(--bg)" stroke="var(--sage)" strokeWidth="2.5"/>
                  <circle cx={(i/(PAYROLL_MONTHS.length-1))*600} cy={220 - (m.headcount/maxHc)*160} r="3" fill="var(--terracotta)"/>
                </g>
              ))}
            </svg>
            <div className="nt-chart-x">
              {PAYROLL_MONTHS.map((m, i) => {
                const idx = ['Nov','Dec','Jan','Feb','Mar','Apr'].indexOf(m.m);
                const mi = [10,11,0,1,2,3][idx];
                return <span key={m.m}>{months[mi]}</span>;
              })}
            </div>
          </div>
        </div>
      </div>

      <Card title={t('dept_spend')} subtitle={t('april_preview')}>
        <div className="nt-dept-spend">
          <div className="nt-donut">
            <svg viewBox="0 0 100 100">
              {(() => {
                let offset = 0;
                return deptBreakdown.map((d, i) => {
                  const frac = d.amount / totalDept;
                  const r = 40, cx = 50, cy = 50;
                  const circ = 2 * Math.PI * r;
                  const dash = frac * circ;
                  const el = (
                    <circle key={i} cx={cx} cy={cy} r={r} fill="none" strokeWidth="14"
                            stroke={`var(--${d.color})`}
                            strokeDasharray={`${dash} ${circ - dash}`}
                            strokeDashoffset={-offset}
                            transform={`rotate(-90 ${cx} ${cy})`}/>
                  );
                  offset += dash;
                  return el;
                });
              })()}
              <text x="50" y="48" textAnchor="middle" style={{fontFamily: 'Instrument Serif, serif', fontSize: 14, fill: 'var(--ink)'}}>$462k</text>
              <text x="50" y="60" textAnchor="middle" style={{fontSize: 5, fill: 'var(--muted)'}}>TOTAL</text>
            </svg>
          </div>
          <ul className="nt-dept-list">
            {deptBreakdown.map(d => (
              <li key={d.name}>
                <i className={`dot tone-${d.color}`}/>
                <span className="nt-dept-name">{d.name}</span>
                <span className="muted">{Math.round(d.amount/totalDept*100)}%</span>
                <span className="nt-dept-amount">${(d.amount/1000).toFixed(0)}k</span>
              </li>
            ))}
          </ul>
        </div>
      </Card>

      <Card title={t('upcoming_runs')}>
        <ul className="nt-runs">
          <li>
            <div className="nt-run-date"><span className="nt-big-num">30</span><span>{months[3]}</span></div>
            <div className="nt-run-main">
              <div className="nt-run-title">{t('april_monthly')}</div>
              <div className="muted">{t('preview_ready')}</div>
            </div>
            <Pill tone="butter">{t('needs_review')}</Pill>
          </li>
          <li>
            <div className="nt-run-date"><span className="nt-big-num">15</span><span>{months[4]}</span></div>
            <div className="nt-run-main">
              <div className="nt-run-title">{t('may_bonus')}</div>
              <div className="muted">{t('scheduled_proj')}</div>
            </div>
            <Pill tone="neutral">{t('scheduled')}</Pill>
          </li>
          <li>
            <div className="nt-run-date"><span className="nt-big-num">31</span><span>{months[4]}</span></div>
            <div className="nt-run-main">
              <div className="nt-run-title">{t('may_monthly')}</div>
              <div className="muted">{t('auto_scheduled')}</div>
            </div>
            <Pill tone="neutral">{t('scheduled')}</Pill>
          </li>
        </ul>
      </Card>

      <Card title={t('things_to_check')} subtitle={t('before_running')}>
        <ul className="nt-checklist">
          <li><span className="nt-check done"><IconCheck size={12}/></span>{t('check_1')}</li>
          <li><span className="nt-check done"><IconCheck size={12}/></span>{t('check_2')}</li>
          <li><span className="nt-check warn">!</span>{t('check_3')}</li>
          <li><span className="nt-check warn">!</span>{t('check_4')}</li>
          <li><span className="nt-check"/>{t('check_5')}</li>
        </ul>
      </Card>
    </div>
  );
};

const BenefitsView = () => {
  const [selectedBand, setSelectedBand] = React.useState('L4 · Senior');
  return (
    <div className="nt-benefits-grid">
      <div className="nt-kpi-row nt-span-full">
        <KPI label={t('kpi_enroll')} value="91%"     accent="sage"       icon={<IconCheck size={16}/>} hint={t('kpi_enroll_hint')}/>
        <KPI label={t('kpi_spend')}  value="$48.2k"  accent="terracotta" icon={<IconCash size={16}/>}  hint={t('kpi_spend_hint')}/>
        <KPI label={t('kpi_open')}   value="42" accent="butter"     icon={<IconClock size={16}/>} hint={t('kpi_open_hint')}/>
        <KPI label={t('kpi_claims')} value="214"     accent="plum"       icon={<IconHeart size={16}/>} hint={t('kpi_claims_hint')}/>
      </div>

      <Card title={t('plans_title')} subtitle={t('plans_sub')} className="nt-span-full">
        <div className="nt-benefit-grid">
          {BENEFITS.map(b => (
            <div key={b.id} className="nt-benefit-card">
              <div className="nt-benefit-head">
                <div>
                  <div className="nt-benefit-name">{b.name}</div>
                  <div className="muted">{b.carrier} · {b.coverage}</div>
                </div>
                <div className="nt-benefit-cost">{b.cost}</div>
              </div>
              <div className="nt-benefit-enroll">
                <div className="nt-benefit-track">
                  <div className="nt-benefit-fill" style={{ width: `${(b.enrolled/b.eligible)*100}%` }}/>
                </div>
                <div className="nt-benefit-stats">
                  <span><span className="nt-big-num">{b.enrolled}</span> {t('enrolled', { n: b.eligible })}</span>
                  <span className="muted">{Math.round((b.enrolled/b.eligible)*100)}%</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </Card>

      <Card title={t('comp_bands_title')} subtitle={t('comp_bands_sub')} className="nt-span-full">
        <CompBands selected={selectedBand} onSelect={setSelectedBand}/>
      </Card>
    </div>
  );
};

const CompBands = ({ selected, onSelect }) => {
  const max = Math.max(...COMP_BANDS.map(b => b.max));
  return (
    <div className="nt-comp-bands">
      <div className="nt-comp-scale">
        {[50, 100, 150, 200, 250, 300, 350].map(v => (
          <div key={v} className="nt-comp-tick" style={{ left: `${(v / (max * 1.05)) * 100}%` }}>
            <span>${v}k</span>
          </div>
        ))}
      </div>
      {COMP_BANDS.map(b => {
        const left = (b.min / (max * 1.05)) * 100;
        const width = ((b.max - b.min) / (max * 1.05)) * 100;
        const midPct = ((b.mid - b.min) / (b.max - b.min)) * 100;
        const active = selected === b.level;
        return (
          <div key={b.level} className={`nt-band-row ${active ? 'active' : ''}`} onClick={() => onSelect(b.level)}>
            <div className="nt-band-label">
              <span>{b.level}</span>
              <span className="muted">{b.count} {t('people_count')}</span>
            </div>
            <div className="nt-band-track">
              <div className="nt-band-bar" style={{ left: `${left}%`, width: `${width}%` }}>
                <span className="nt-band-min">${b.min}k</span>
                <span className="nt-band-mid" style={{ left: `${midPct}%` }}>
                  <span className="nt-band-mid-dot"/>
                  <span className="nt-band-mid-label">${b.mid}k</span>
                </span>
                <span className="nt-band-max">${b.max}k</span>
                {Array.from({ length: b.count }).map((_, i) => {
                  const pct = 15 + (i * 70 / Math.max(1, b.count - 1));
                  return <span key={i} className="nt-band-dot" style={{ left: `${pct}%` }}/>;
                })}
              </div>
            </div>
          </div>
        );
      })}
      <div className="nt-comp-legend">
        <span><span className="nt-band-dot legend"/> {t('legend_one_emp')}</span>
        <span><span className="nt-band-mid-dot legend"/> {t('legend_midpoint')}</span>
        <span>{t('legend_bands_updated')}</span>
      </div>
    </div>
  );
};

const RecruitingView = () => {
  const stages = [
    { key: 'applied',   label: t('stage_applied') },
    { key: 'screen',    label: t('stage_screen') },
    { key: 'interview', label: t('stage_interview') },
    { key: 'offer',     label: t('stage_offer') },
  ];
  return (
    <div className="nt-recruit-grid">
      <div className="nt-kpi-row nt-span-full">
        <KPI label={t('kpi_open_roles')} value="5"   accent="sage"       icon={<IconBriefcase size={16}/>} hint={t('kpi_open_roles_hint')}/>
        <KPI label={t('kpi_candidates')} value="284" accent="terracotta" icon={<IconUsers size={16}/>}     hint={t('kpi_candidates_hint')}/>
        <KPI label={t('kpi_offers')}     value="4"   accent="butter"     icon={<IconMail size={16}/>}      hint={t('kpi_offers_hint')}/>
        <KPI label={t('kpi_ttf')}        value="38d" accent="plum"       icon={<IconClock size={16}/>}     hint={t('kpi_ttf_hint')}/>
      </div>

      <Card title={t('open_reqs')} subtitle={t('open_reqs_sub')} className="nt-span-full"
            actions={<button className="nt-btn-primary"><IconPlus size={14}/> {t('new_role')}</button>}>
        <ul className="nt-jobs">
          {JOBS.map(j => {
            const total = j.stage.applied;
            return (
              <li key={j.id} className="nt-job">
                <div className="nt-job-main">
                  <div className="nt-job-head">
                    <div className="nt-job-title">{j.title}</div>
                    <Pill tone="sage">{j.type === 'Full-time' ? t('ft') : t('contract')}</Pill>
                  </div>
                  <div className="nt-job-meta">
                    <span className={`nt-dept-chip dept-${j.dept.toLowerCase()}`}>{j.dept}</span>
                    <span><IconMapPin size={12}/> {j.location}</span>
                    <span><IconClock size={12}/> {t('opened')} {j.opened}</span>
                    <span>· {t('owned_by')} {j.owner}</span>
                  </div>
                </div>
                <div className="nt-pipeline">
                  {stages.map((s, i) => (
                    <div key={s.key} className="nt-pipe-stage">
                      <div className="nt-pipe-count">{j.stage[s.key]}</div>
                      <div className="nt-pipe-label">{s.label}</div>
                      <div className="nt-pipe-bar">
                        <div className="nt-pipe-fill" style={{ width: `${(j.stage[s.key] / total) * 100}%` }}/>
                      </div>
                    </div>
                  ))}
                </div>
                <button className="nt-icon-btn-line sm"><IconArrowRight size={14}/></button>
              </li>
            );
          })}
        </ul>
      </Card>
    </div>
  );
};

const OverviewView = ({ setView, openEmployee }) => {
  const activity = getActivity();
  return (
    <div className="nt-overview">
      <div className="nt-kpi-row nt-span-full">
        <KPI label={t('kpi_headcount')} value="62"    accent="sage"       icon={<IconUsers size={16}/>} hint={t('kpi_headcount_hint')}/>
        <KPI label={t('kpi_pending')}   value="6"     accent="terracotta" icon={<IconClock size={16}/>} hint={t('kpi_pto_hint')}/>
        <KPI label={t('kpi_april')}     value="$462k" accent="butter"     icon={<IconCash size={16}/>}  hint={t('kpi_april_hint')}/>
        <KPI label={t('kpi_open_roles')} value="5"    accent="plum"       icon={<IconBriefcase size={16}/>} hint={t('kpi_open_roles_ov_hint')}/>
      </div>

      <Card title={t('right_now')} subtitle={t('right_now_sub')} className="nt-span-2">
        <ul className="nt-actions-list">
          <li onClick={() => setView('absence')}>
            <div className="nt-action-icon tone-terracotta"><IconClock size={16}/></div>
            <div className="nt-action-main">
              <div className="nt-action-title">{t('review_6')}</div>
              <div className="muted">{t('review_6_sub')}</div>
            </div>
            <IconArrowRight size={14}/>
          </li>
          <li onClick={() => setView('payroll')}>
            <div className="nt-action-icon tone-butter"><IconCash size={16}/></div>
            <div className="nt-action-main">
              <div className="nt-action-title">{t('run_prev')}</div>
              <div className="muted">{t('run_prev_sub')}</div>
            </div>
            <IconArrowRight size={14}/>
          </li>
          <li onClick={() => setView('recruiting')}>
            <div className="nt-action-icon tone-sage"><IconBriefcase size={16}/></div>
            <div className="nt-action-main">
              <div className="nt-action-title">{t('offers_approval')}</div>
              <div className="muted">{t('offers_approval_sub')}</div>
            </div>
            <IconArrowRight size={14}/>
          </li>
          <li onClick={() => setView('employees')}>
            <div className="nt-action-icon tone-plum"><IconUsers size={16}/></div>
            <div className="nt-action-main">
              <div className="nt-action-title">{t('avery_starts')}</div>
              <div className="muted">{t('avery_sub')}</div>
            </div>
            <IconArrowRight size={14}/>
          </li>
        </ul>
      </Card>

      <Card title={t('activity_title')} subtitle={t('activity_sub')}>
        <ul className="nt-activity">
          {activity.map((a, i) => (
            <li key={i}>
              <div className="nt-activity-dot" style={{'--h': 20 + i*50}}/>
              <div className="nt-activity-main">
                <div><b>{a.who}</b> {a.what}</div>
                <div className="muted">{a.when} · {a.tag}</div>
              </div>
            </li>
          ))}
        </ul>
      </Card>

      <Card title={t('say_hi')} subtitle={t('say_hi_sub')} className="nt-span-full">
        <div className="nt-celebrate">
          {[
            { emp: EMPLOYEES[1], kind: 'birthday', date: '21 Apr' },
            { emp: EMPLOYEES[4], kind: '9',        date: '22 Apr' },
            { emp: EMPLOYEES[9], kind: 'birthday', date: '23 Apr' },
            { emp: EMPLOYEES[11], kind: '2',       date: '24 Apr' },
            { emp: EMPLOYEES[13], kind: 'birthday',date: '25 Apr' },
          ].map((c, i) => (
            <button key={i} className="nt-celeb" onClick={() => openEmployee(c.emp.id)}>
              <Avatar emp={c.emp} size={44}/>
              <div>
                <div className="nt-celeb-name">{c.emp.name.split(' ')[0]}</div>
                <div className="muted">{c.kind === 'birthday' ? t('birthday') : t('anniv', { k: c.kind + ' ' + t('years') })}</div>
              </div>
              <div className="muted nt-celeb-date">{c.date}</div>
            </button>
          ))}
        </div>
      </Card>
    </div>
  );
};

Object.assign(window, { PayrollView, BenefitsView, RecruitingView, OverviewView });
