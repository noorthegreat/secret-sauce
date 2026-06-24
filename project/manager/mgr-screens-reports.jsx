/* Fifth Circle Manager — Satisfaction & Executive Report. */

// ── SATISFACTION ──
function SatisfactionScreen({ ctx }) {
  const store = useFC();
  if (store.mode === 'empty') return (
    <div style={{ paddingBottom: 28 }}>
      <ScreenHeader eyebrow="Post-outing reviews" title="Satisfaction"
        right={ctx.back && <span onClick={ctx.back} style={{ fontSize: 9, letterSpacing: 2, textTransform: 'uppercase', color: C.taupeLight, fontFamily: SANS, cursor: 'pointer', marginTop: 4 }}>‹ Back</span>} />
      <EmptyState icon="ti-mood-smile" title="No reviews yet"
        body="After your first gatherings and introductions, residents are invited to share how it went. Their ratings and what made connections work will appear here." />
    </div>);
  return (
    <div style={{ paddingBottom: 28 }}>
      <ScreenHeader eyebrow="Post-outing reviews" title="Satisfaction" sub="From resident reviews"
        right={ctx.back && <span onClick={ctx.back} style={{ fontSize: 9, letterSpacing: 2, textTransform: 'uppercase', color: C.taupeLight, fontFamily: SANS, cursor: 'pointer', marginTop: 4 }}>‹ Back</span>} />

      <div style={{ padding: '18px 20px 0' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          {FCM.satMetrics.map((m) => <Metric key={m.label} {...m} />)}
        </div>
      </div>

      <div style={{ padding: '24px 20px 0' }}>
        <SectionLabel>Introduction Experience</SectionLabel>
        <Card>
          {FCM.introExperience.map((s) => <SatRow key={s.label} {...s} />)}
          <div style={{ height: '0.5px', background: 'rgba(184,151,42,0.12)', margin: '16px 0' }} />
          <div style={{ fontSize: 9, letterSpacing: 3, color: 'var(--gold)', textTransform: 'uppercase', fontFamily: SANS, marginBottom: 12 }}>Would Meet Again</div>
          {FCM.wouldMeetAgain.map((s) => <SatRow key={s.label} {...s} />)}
        </Card>
      </div>

      <div style={{ padding: '24px 20px 0' }}>
        <SectionLabel>What Made It Work</SectionLabel>
        <Card>{FCM.whatWorked.map((b) => <BarRow key={b.label} {...b} c="gold" />)}</Card>
      </div>

      <div style={{ padding: '24px 20px 0' }}>
        <SectionLabel>Event Ratings</SectionLabel>
        <Card>{FCM.eventRatings.map((b) => <BarRow key={b.label} {...b} c="gold" />)}</Card>
      </div>
    </div>);
}

// ── EXECUTIVE REPORT ──
function ReportScreen({ ctx }) {
  const store = useFC();
  const r = FCM.report;
  if (store.mode === 'empty') return (
    <div style={{ paddingBottom: 28 }}>
      <ScreenHeader eyebrow="Prepared by Fifth Circle" title={<>Monthly <Em>Report</Em></>} sub={FCM.building} />
      <EmptyState icon="ti-file-text" title="Your first report is on its way"
        body="Fifth Circle prepares a monthly community report once the pilot has 30 days of activity. Health, highlights, growth and recommendations will be summarised here for you and your ownership." />
    </div>);
  return (
    <div style={{ paddingBottom: 28 }}>
      <ScreenHeader eyebrow="Prepared by Fifth Circle" title={<>{r.title} <Em>Report</Em></>} sub={FCM.building}
        right={<Period dark>PDF</Period>} />

      {/* hero scores (dark) */}
      <div style={{ padding: '18px 20px 0' }}>
        <div style={{ background: C.charcoal, padding: '26px 20px', display: 'flex', flexDirection: 'column', gap: 18 }}>
          {r.hero.map((h, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingBottom: i < r.hero.length - 1 ? 18 : 0, borderBottom: i < r.hero.length - 1 ? '0.5px solid rgba(255,255,255,0.07)' : 'none' }}>
              <div>
                <div style={{ fontSize: 9, letterSpacing: 3, color: 'rgba(184,151,42,0.6)', textTransform: 'uppercase', fontFamily: SANS, marginBottom: 5 }}>{h.label}</div>
                <div style={{ fontSize: 10, letterSpacing: 2, color: h.good ? C.green : 'rgba(242,237,227,0.3)', textTransform: 'uppercase', fontFamily: SANS }}>{h.sub}</div>
              </div>
              <div style={{ fontFamily: SERIF, fontSize: 56, fontWeight: 300, color: C.cream, lineHeight: 1 }}>{h.val}</div>
            </div>))}
        </div>
      </div>

      {/* highlights */}
      <div style={{ padding: '24px 20px 0' }}>
        <SectionLabel>This Month's Highlights</SectionLabel>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {r.highlights.map((h, i) =>
            <div key={i} style={{ padding: '13px 15px', background: C.parchment, border: '0.5px solid rgba(184,151,42,0.18)' }}>
              <div style={{ fontSize: 9, letterSpacing: 2, color: 'var(--gold)', textTransform: 'uppercase', fontFamily: SANS, marginBottom: 5 }}>{h.k}</div>
              <div style={{ fontFamily: SERIF, fontSize: 21, color: C.charcoal }}>{h.v}</div>
            </div>)}
        </div>
      </div>

      {/* growth */}
      <div style={{ padding: '24px 20px 0' }}>
        <SectionLabel>Engagement Growth</SectionLabel>
        <Card>
          <ColumnChart data={r.growth} keyName="m" height={100} />
          <div style={{ fontSize: 10, color: C.taupeLight, fontFamily: SANS, marginTop: 4 }}>{r.growthNote}</div>
        </Card>
      </div>

      {/* recommendations */}
      <div style={{ padding: '24px 20px 0' }}>
        <SectionLabel>Key Recommendations</SectionLabel>
        <Card style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {r.recommendations.map((rec, i) => {
            const col = rec.c === 'green' ? C.green : rec.c === 'amber' ? C.amber : 'var(--gold)';
            return (
              <div key={i} style={{ paddingLeft: 13, borderLeft: `2px solid ${col}` }}>
                <div style={{ fontSize: 12, color: C.charcoal, fontFamily: SANS, marginBottom: 4, lineHeight: 1.4 }}>{rec.t}</div>
                <div style={{ fontSize: 10.5, color: C.taupeLight, fontFamily: SANS, lineHeight: 1.6 }}>{rec.d}</div>
              </div>);
          })}
        </Card>
      </div>
    </div>);
}

Object.assign(window, { SatisfactionScreen, ReportScreen });
