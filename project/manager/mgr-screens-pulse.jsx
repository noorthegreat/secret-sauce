/* Fifth Circle Manager — Pulse dashboard.
   Stabilization sprint: headline counts derive from the live roster/events,
   the Health Score is a transparent weighted composite, and Day-1 is intentional. */

function PulseScreen({ ctx }) {
  const store = useFC();
  const m = window.FCStore.metrics();
  const h = window.FCStore.health();
  const sent = window.FCStore.sentiment();
  const [showCalc, setShowCalc] = useState(false);

  if (store.mode === 'empty') return <PulseEmpty ctx={ctx} />;

  const metrics = [
    { label: 'Active Residents', val: String(m.active), trend: `of ${m.enrolled} enrolled`, kind: 'up' },
    { label: 'Introductions Made', val: String(m.introductions), trend: '78% accepted', kind: 'up' },
    { label: 'Gatherings Held', val: String(m.held), trend: `${m.upcoming} upcoming`, kind: 'gold' },
    { label: 'Community Health', val: h.score + '%', trend: sent.state, kind: 'up' }
  ];
  const execRows = [
    ['Active Residents', `${m.active} of ${m.activeTarget} target`],
    ['Building penetration', `${m.enrolled} of ${m.buildingUnits} units · ${m.penetrationPct}%`],
    ['Intro Success Rate', '78%'],
    ['Avg Event Attendance', '89%'],
    ['Resident Satisfaction', '4.6 / 5.0']
  ];

  return (
    <div style={{ paddingBottom: 28 }}>
      <ScreenHeader eyebrow={`${FCM.building} · ${FCM.week}`} title="Community Pulse"
        right={<i className="ti ti-settings" style={{ fontSize: 18, color: 'var(--gold-muted)', cursor: 'pointer', marginTop: 2 }} />}>
        <div style={{ marginTop: 13 }}><SentimentPill text={sent.state} /></div>
      </ScreenHeader>

      {/* pilot strip */}
      <div style={{ padding: '16px 20px 0' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, background: C.charcoal, padding: '13px 16px' }}>
          <div style={{ width: 7, height: 7, borderRadius: '50%', background: C.green, flexShrink: 0, boxShadow: '0 0 0 3px rgba(107,140,90,0.18)' }} />
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 8.5, letterSpacing: 2.5, color: 'var(--gold-light)', textTransform: 'uppercase', fontFamily: SANS }}>{FCM.pilot.status}</div>
            <div style={{ fontSize: 11, color: 'rgba(242,237,227,0.55)', fontFamily: SANS, marginTop: 2 }}>{FCM.pilot.daysRemaining} days remaining · {FCM.pilot.progress}% to conversion</div>
          </div>
          <span onClick={() => ctx.go('more')} style={{ fontSize: 9, letterSpacing: 1.5, color: 'var(--gold-light)', textTransform: 'uppercase', fontFamily: SANS, cursor: 'pointer', whiteSpace: 'nowrap' }}>View →</span>
        </div>
      </div>

      {/* metrics */}
      <div style={{ padding: '18px 20px 0' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          {metrics.map((mm) => <Metric key={mm.label} {...mm} />)}
        </div>
      </div>

      {/* interests */}
      <div style={{ padding: '24px 20px 0' }}>
        <SectionLabel>Top Resident Interests</SectionLabel>
        <Card>{FCM.interests.map((b) => <BarRow key={b.label} {...b} c="gold" />)}</Card>
      </div>

      {/* weekly activity */}
      <div style={{ padding: '24px 20px 0' }}>
        <SectionLabel>Weekly Activity</SectionLabel>
        <Card>
          <ColumnChart data={FCM.weekly} />
          <div style={{ fontSize: 10, color: C.taupeLight, fontFamily: SANS, letterSpacing: 0.3, marginTop: 4 }}>Peak: {FCM.weeklyNote}</div>
        </Card>
      </div>

      {/* retention */}
      <div style={{ padding: '24px 20px 0' }}>
        <SectionLabel>Retention Signals</SectionLabel>
        <Card pad={0}>
          {FCM.retention.map((r, i) => {
            const icon = r.kind === 'good' ? { i: 'ti-star', c: C.green } : r.kind === 'new' ? { i: 'ti-user-plus', c: C.blue } : { i: 'ti-alert-circle', c: C.amber };
            return (
              <div key={i} style={{ display: 'flex', gap: 11, padding: '13px 16px', borderBottom: i < FCM.retention.length - 1 ? '0.5px solid rgba(184,151,42,0.1)' : 'none' }}>
                <i className={`ti ${icon.i}`} style={{ fontSize: 14, color: icon.c, marginTop: 1, flexShrink: 0 }} />
                <div>
                  <div style={{ fontSize: 12, color: C.charcoal, fontFamily: SANS, marginBottom: 3 }}>{r.name}</div>
                  <div style={{ fontSize: 10, color: C.taupeLight, fontFamily: SANS, lineHeight: 1.55 }}>{r.note}</div>
                </div>
              </div>);
          })}
        </Card>
      </div>

      {/* trends */}
      <div style={{ padding: '24px 20px 0' }}>
        <SectionLabel>Emerging Trends</SectionLabel>
        <Card>{FCM.trends.map((t) => <TrendRow key={t.label} {...t} />)}</Card>
      </div>

      {/* exec summary (dark) — score now transparent */}
      <div style={{ padding: '24px 20px 0' }}>
        <SectionLabel>Executive Summary</SectionLabel>
        <Card dark>
          <div style={{ fontFamily: SERIF, fontSize: 52, fontWeight: 300, color: C.cream, lineHeight: 1 }}>{h.score}</div>
          <div style={{ fontSize: 9, letterSpacing: 3, color: 'rgba(242,237,227,0.3)', textTransform: 'uppercase', fontFamily: SANS, margin: '5px 0 6px' }}>Community Health Score</div>
          <div onClick={() => setShowCalc(!showCalc)} style={{ fontSize: 9.5, letterSpacing: 1, color: 'var(--gold-light)', fontFamily: SANS, cursor: 'pointer', marginBottom: 14, display: 'inline-flex', alignItems: 'center', gap: 5 }}>
            <i className={`ti ${showCalc ? 'ti-chevron-up' : 'ti-info-circle'}`} style={{ fontSize: 12 }} />{showCalc ? 'Hide calculation' : 'How this is calculated'}
          </div>
          {showCalc &&
            <div style={{ marginBottom: 14, paddingBottom: 12, borderBottom: '0.5px solid rgba(255,255,255,0.06)' }}>
              {h.inputs.map((inp, i) =>
                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '5px 0' }}>
                  <span style={{ fontSize: 10, color: 'rgba(242,237,227,0.45)', fontFamily: SANS }}>{inp.label} <span style={{ color: 'rgba(184,151,42,0.7)' }}>· {inp.weight}%</span></span>
                  <span style={{ fontSize: 10.5, color: 'rgba(242,237,227,0.8)', fontFamily: SANS }}>{inp.val}</span>
                </div>)}
              <div style={{ fontSize: 9.5, color: 'rgba(242,237,227,0.3)', fontFamily: SANS, lineHeight: 1.6, marginTop: 7 }}>{h.note}</div>
            </div>}
          {execRows.map(([k, v], i) =>
            <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: i < execRows.length - 1 ? '0.5px solid rgba(255,255,255,0.06)' : 'none' }}>
              <span style={{ fontSize: 10.5, color: 'rgba(242,237,227,0.3)', fontFamily: SANS }}>{k}</span>
              <span style={{ fontSize: 11, color: 'rgba(242,237,227,0.7)', fontFamily: SANS }}>{v}</span>
            </div>)}
        </Card>
      </div>

      {/* satisfaction link */}
      <div style={{ padding: '24px 20px 0' }}>
        <Card onClick={() => ctx.open('satisfaction')} style={{ display: 'flex', alignItems: 'center', gap: 13 }}>
          <i className="ti ti-mood-happy" style={{ fontSize: 22, color: 'var(--gold-muted)' }} />
          <div style={{ flex: 1 }}>
            <div style={{ fontFamily: SERIF, fontSize: 17, color: C.charcoal }}>Satisfaction & reviews</div>
            <div style={{ fontSize: 10.5, color: C.taupe, fontFamily: SANS, marginTop: 2 }}>4.6 / 5.0 · 38 reviews submitted</div>
          </div>
          <span style={{ fontSize: 15, color: C.taupeLight }}>›</span>
        </Card>
      </div>
    </div>);
}

// ── DAY-1 PULSE ──
function PulseEmpty({ ctx }) {
  return (
    <div style={{ paddingBottom: 28 }}>
      <ScreenHeader eyebrow={`${FCM.building} · Pilot setup`} title="Community Pulse"
        right={<i className="ti ti-settings" style={{ fontSize: 18, color: 'var(--gold-muted)', cursor: 'pointer', marginTop: 2 }} />}>
        <div style={{ marginTop: 13 }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, border: '0.5px solid rgba(184,151,42,0.4)', padding: '6px 14px' }}>
            <div style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--gold)' }} />
            <span style={{ fontSize: 9, letterSpacing: 3, color: 'var(--gold-muted)', textTransform: 'uppercase', fontFamily: SANS }}>Pilot just beginning</span>
          </div>
        </div>
      </ScreenHeader>

      <div style={{ padding: '18px 20px 0' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          {['Active Residents', 'Introductions Made', 'Gatherings Held', 'Community Health'].map((l) =>
            <div key={l} style={{ background: C.white, border: '0.5px solid rgba(184,151,42,0.16)', padding: '15px 16px' }}>
              <div style={{ fontSize: 8.5, letterSpacing: 2, color: C.taupeLight, textTransform: 'uppercase', fontFamily: SANS, marginBottom: 9 }}>{l}</div>
              <div style={{ fontFamily: SERIF, fontSize: 34, fontWeight: 300, color: C.taupeLight, lineHeight: 1, marginBottom: 4 }}>—</div>
              <div style={{ fontSize: 9.5, color: C.taupeLight, fontFamily: SANS }}>Awaiting activity</div>
            </div>)}
        </div>
      </div>

      <EmptyState icon="ti-seeding" title="Your community starts here"
        body="No residents have joined yet. Invite your first neighbors and the Pulse — health, interests, introductions and trends — fills in as they engage."
        action="Invite residents" onAction={() => ctx.go('residents')} />

      <div style={{ padding: '0 20px' }}>
        <div style={{ background: 'rgba(184,151,42,0.06)', border: '0.5px solid rgba(184,151,42,0.2)', padding: '15px 16px' }}>
          <div style={{ fontSize: 9, letterSpacing: 2.5, color: 'var(--gold)', textTransform: 'uppercase', fontFamily: SANS, marginBottom: 10 }}>First week checklist</div>
          {[['ti-user-plus', 'Invite your pilot residents', () => ctx.go('residents')], ['ti-calendar-plus', 'Schedule a welcome gathering', () => ctx.go('events')], ['ti-settings', 'Confirm building details & amenities', () => ctx.go('more')]].map(([icon, label, go], i, arr) =>
            <div key={i} onClick={go} style={{ display: 'flex', alignItems: 'center', gap: 11, padding: '10px 0', borderBottom: i < arr.length - 1 ? '0.5px solid rgba(184,151,42,0.12)' : 'none', cursor: 'pointer' }}>
              <i className={`ti ${icon}`} style={{ fontSize: 16, color: 'var(--gold-muted)' }} />
              <span style={{ flex: 1, fontSize: 12.5, color: C.charcoal, fontFamily: SANS }}>{label}</span>
              <span style={{ fontSize: 14, color: C.taupeLight }}>›</span>
            </div>)}
        </div>
      </div>
    </div>);
}

Object.assign(window, { PulseScreen });
