/* Fifth Circle Manager — More hub + Communications, Trust & Safety, Feedback. */

function MoreScreen({ ctx }) {
  const [view, setView] = useState('hub');
  const go = (v) => setView(v);
  const back = () => setView('hub');
  if (view === 'comms') return <Communications onBack={back} />;
  if (view === 'safety') return <TrustSafety onBack={back} />;
  if (view === 'feedback') return <FeedbackCenter onBack={back} />;
  if (view === 'settings') return <BuildingSettings onBack={back} />;
  if (view === 'pilot') return <PilotProgram onBack={back} />;
  if (view === 'billing') return <Billing onBack={back} />;
  if (view === 'team') return <TeamRoles onBack={back} />;
  if (view === 'vendors') return <VendorDirectory onBack={back} />;
  if (view === 'audit') return <AuditLog onBack={back} />;
  return <MoreHub go={go} />;
}

function MoreHub({ go }) {
  const store = useFC();
  const openReports = FCM.reports.filter((r) => r.status !== 'resolved').length;
  const vendorRecs = store.vendorRecs.length;
  const groups = [
    ['Operations', [
      { icon: 'ti-send', label: 'Communications', sub: 'Announcements, reminders, updates', v: 'comms' },
      { icon: 'ti-shield-half', label: 'Trust & Safety', sub: 'Reports & technical issues', v: 'safety', badge: openReports },
      { icon: 'ti-message-2', label: 'Feedback Center', sub: 'Feature requests & roadmap', v: 'feedback' }
    ]],
    ['Building', [
      { icon: 'ti-settings', label: 'Building Settings', sub: 'Info, amenities, guidelines, codes', v: 'settings' },
      { icon: 'ti-building-store', label: 'Vendor Directory', sub: `${store.vendors.length} partners${vendorRecs ? ' · ' + vendorRecs + ' to review' : ''}`, v: 'vendors', badge: vendorRecs || undefined },
      { icon: 'ti-users-group', label: 'Team & Roles', sub: `${FCM.team.length} members`, v: 'team' }
    ]],
    ['Program', [
      { icon: 'ti-rosette', label: 'Pilot Program', sub: `${FCM.pilot.daysRemaining} days remaining`, v: 'pilot' },
      { icon: 'ti-receipt', label: 'Billing & Subscription', sub: FCM.billing.status, v: 'billing' },
      { icon: 'ti-history', label: 'Activity Log', sub: 'Who changed what', v: 'audit' }
    ]]
  ];
  return (
    <div style={{ paddingBottom: 28 }}>
      <ScreenHeader eyebrow={FCM.building} title="More" sub="Operations & settings" />
      <div style={{ padding: '18px 20px 0' }}>
        {groups.map(([label, items]) => (
          <div key={label} style={{ marginBottom: 22 }}>
            <SectionLabel mb={10}>{label}</SectionLabel>
            <Card pad={0}>
              {items.map((it, i) => <Row key={it.v} icon={it.icon} label={it.label} sub={it.sub} badge={it.badge || undefined} onClick={() => go(it.v)} last={i === items.length - 1} />)}
            </Card>
          </div>))}
        <div style={{ textAlign: 'center', padding: '8px 0 4px' }}>
          <div style={{ fontSize: 9, letterSpacing: 3, color: C.taupeLight, textTransform: 'uppercase', fontFamily: SANS }}>{FCM.manager.name} · {FCM.manager.role}</div>
          <div style={{ fontSize: 10, color: 'var(--gold-muted)', fontFamily: SANS, marginTop: 6, cursor: 'pointer', letterSpacing: 0.5 }}>Sign out</div>
        </div>
      </div>
    </div>);
}

// ── COMMUNICATIONS ──
function Communications({ onBack }) {
  const store = useFC();
  const [compose, setCompose] = useState(false);
  if (compose) return <Compose onBack={() => setCompose(false)} />;
  if (store.mode === 'empty') return (
    <div style={{ paddingBottom: 28 }}>
      <ScreenHeader back="More" onBack={onBack} eyebrow="Communications" title="Messages"
        right={<button onClick={() => setCompose(true)} style={{ display: 'flex', alignItems: 'center', gap: 5, background: C.charcoal, color: C.cream, border: 'none', fontFamily: SANS, fontSize: 9, letterSpacing: 1.5, textTransform: 'uppercase', padding: '8px 12px', cursor: 'pointer' }}><i className="ti ti-pencil" style={{ fontSize: 12 }} />New</button>} />
      <EmptyState icon="ti-send" title="No messages sent yet"
        body="Welcome your residents, announce your first gathering, or share a community update. Sent messages and open rates collect here."
        action="Compose a message" onAction={() => setCompose(true)} />
    </div>);
  return (
    <div style={{ paddingBottom: 28 }}>
      <ScreenHeader back="More" onBack={onBack} eyebrow="Communications" title="Messages"
        right={<button onClick={() => setCompose(true)} style={{ display: 'flex', alignItems: 'center', gap: 5, background: C.charcoal, color: C.cream, border: 'none', fontFamily: SANS, fontSize: 9, letterSpacing: 1.5, textTransform: 'uppercase', padding: '8px 12px', cursor: 'pointer' }}><i className="ti ti-pencil" style={{ fontSize: 12 }} />New</button>} />
      <div style={{ padding: '18px 20px 0' }}>
        {FCM.comms.scheduled.length > 0 && <>
          <SectionLabel>Scheduled</SectionLabel>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 22 }}>
            {FCM.comms.scheduled.map((m, i) =>
              <Card key={i}>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10 }}>
                  <div style={{ fontFamily: SERIF, fontSize: 16, color: C.charcoal }}>{m.title}</div>
                  <StatusPill color={C.goldMuted}><i className="ti ti-clock" style={{ fontSize: 11 }} />Scheduled</StatusPill>
                </div>
                <div style={{ fontSize: 10.5, color: C.taupe, fontFamily: SANS, marginTop: 6 }}>{m.kind} · {m.channel}</div>
                <div style={{ fontSize: 10, color: C.taupeLight, fontFamily: SANS, marginTop: 3 }}>{m.when}</div>
              </Card>)}
          </div>
        </>}
        <SectionLabel>Sent</SectionLabel>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {FCM.comms.sent.map((m, i) =>
            <Card key={i}>
              <div style={{ fontFamily: SERIF, fontSize: 16, color: C.charcoal }}>{m.title}</div>
              <div style={{ fontSize: 10.5, color: C.taupe, fontFamily: SANS, marginTop: 6 }}>{m.kind} · {m.channel}</div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 9, paddingTop: 9, borderTop: '0.5px solid rgba(184,151,42,0.1)' }}>
                <span style={{ fontSize: 10, color: C.taupeLight, fontFamily: SANS }}>{m.when}</span>
                <span style={{ fontSize: 10, color: 'var(--gold-muted)', fontFamily: SANS }}>{m.reach} · {m.open} opened</span>
              </div>
            </Card>)}
        </div>
      </div>
    </div>);
}

function Compose({ onBack }) {
  const [sent, setSent] = useState(false);
  const [kind, setKind] = useState(FCM.comms.templates[0]);
  const [channels, setChannels] = useState(['Push', 'In-app']);
  const [mode, setMode] = useState('now');
  const toggleCh = (c) => setChannels((s) => s.includes(c) ? s.filter((x) => x !== c) : [...s, c]);
  if (sent) return (
    <div style={{ paddingBottom: 30 }}>
      <ScreenHeader back="Communications" onBack={onBack} eyebrow="Communications" title="Compose" />
      <div style={{ padding: '40px 22px', textAlign: 'center' }}>
        <div style={{ width: 64, height: 64, borderRadius: '50%', background: 'rgba(107,140,90,0.1)', border: '0.5px solid rgba(107,140,90,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 18px' }}><i className="ti ti-send" style={{ fontSize: 26, color: C.green }} /></div>
        <Title size={24}>{mode === 'now' ? 'Message sent.' : 'Scheduled.'}</Title>
        <div style={{ fontSize: 12, color: C.taupe, fontFamily: SANS, marginTop: 10, lineHeight: 1.7, maxWidth: 270, margin: '10px auto 0' }}>Reaching 34 residents via {channels.join(' · ')}.</div>
        <div style={{ marginTop: 24 }}><BtnDark onClick={onBack}>Back to messages</BtnDark></div>
      </div>
    </div>);
  return (
    <div style={{ paddingBottom: 30 }}>
      <ScreenHeader back="Communications" onBack={onBack} eyebrow="New message" title={<>Reach your <Em>community.</Em></>} />
      <div style={{ padding: '22px 22px 0', display: 'flex', flexDirection: 'column', gap: 20 }}>
        <PillSelect label="Type" options={FCM.comms.templates} value={kind} onChange={setKind} />
        <Field label="Subject" placeholder="Rooftop Wine — this Thursday" />
        <Textarea label="Message" placeholder="Write something warm and brief…" rows={4} />
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <label style={{ fontSize: 9, letterSpacing: 3, color: C.taupe, textTransform: 'uppercase', fontFamily: SANS }}>Channels</label>
          <div style={{ display: 'flex', gap: 7 }}>
            {['Email', 'Push', 'In-app'].map((c) => {
              const sel = channels.includes(c);
              return <div key={c} onClick={() => toggleCh(c)} style={{ border: `0.5px solid ${sel ? 'var(--gold)' : 'rgba(184,151,42,0.22)'}`, background: sel ? 'rgba(184,151,42,0.1)' : 'transparent', color: sel ? 'var(--gold-muted)' : C.taupe, padding: '8px 14px', fontSize: 10, letterSpacing: 1.2, textTransform: 'uppercase', fontFamily: SANS, cursor: 'pointer' }}>{c}</div>;
            })}
          </div>
        </div>
        <PillSelect label="Delivery" options={['Send now', 'Schedule']} value={mode === 'now' ? 'Send now' : 'Schedule'} onChange={(v) => setMode(v === 'Send now' ? 'now' : 'later')} />
        <div style={{ background: 'rgba(184,151,42,0.06)', border: '0.5px solid rgba(184,151,42,0.2)', padding: '13px 15px', fontSize: 11, color: C.taupe, fontFamily: SANS, lineHeight: 1.6 }}>
          <span style={{ fontFamily: SERIF, fontStyle: 'italic', fontSize: 13.5, color: C.taupeLight }}>Preview:</span> Reaching ~34 residents · {channels.join(' · ') || 'no channel selected'}
        </div>
        <BtnDark onClick={() => setSent(true)} mt={4} disabled={!channels.length}>{mode === 'now' ? 'Send now' : 'Schedule message'}</BtnDark>
      </div>
    </div>);
}

// ── TRUST & SAFETY ──
const SEV = { Critical: C.amber, High: C.amber, Medium: C.goldMuted, Low: C.taupeLight };
const RSTATUS = { open: { c: C.amber, t: 'Open' }, investigating: { c: C.goldMuted, t: 'Investigating' }, resolved: { c: C.green, t: 'Resolved' } };
function TrustSafety({ onBack }) {
  const [seg, setSeg] = useState('reports');
  return (
    <div style={{ paddingBottom: 28 }}>
      <ScreenHeader back="More" onBack={onBack} eyebrow="Trust & Safety" title="Safety">
        <Segmented value={seg} onChange={setSeg} options={[['reports', 'Resident reports'], ['tech', 'Technical issues']]} />
      </ScreenHeader>
      {seg === 'reports' ?
        <div style={{ padding: '18px 20px 0', display: 'flex', flexDirection: 'column', gap: 10 }}>
          {FCM.reports.map((r) => <SafetyReport key={r.id} r={r} />)}
        </div> :
        <div style={{ padding: '18px 20px 0', display: 'flex', flexDirection: 'column', gap: 10 }}>
          {FCM.techIssues.map((t, i) =>
            <Card key={i} style={{ display: 'flex', alignItems: 'center', gap: 13 }}>
              <span style={{ width: 8, height: 8, borderRadius: '50%', background: SEV[t.severity], flexShrink: 0 }} />
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13, color: C.charcoal, fontFamily: SANS }}>{t.label}</div>
                <div style={{ fontSize: 10, color: C.taupeLight, fontFamily: SANS, marginTop: 3 }}>{t.when}</div>
              </div>
              <StatusPill color={SEV[t.severity]} soft="rgba(184,151,42,0.2)">{t.severity}</StatusPill>
            </Card>)}
        </div>}
    </div>);
}
function SafetyReport({ r }) {
  const [status, setStatus] = useState(r.status);
  const [note, setNote] = useState('');
  const [expanded, setExpanded] = useState(false);
  const s = RSTATUS[status];
  return (
    <Card>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10 }}>
        <div style={{ fontFamily: SERIF, fontSize: 16.5, color: C.charcoal }}>{r.subject}</div>
        <StatusPill color={s.c} soft={`${s.c}55`}>{s.t}</StatusPill>
      </div>
      <div style={{ fontSize: 10.5, color: C.taupe, fontFamily: SANS, marginTop: 6 }}>From {r.by} · about {r.about} · {r.when}</div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 8 }}>
        <span style={{ width: 6, height: 6, borderRadius: '50%', background: SEV[r.severity] }} />
        <span style={{ fontSize: 10, color: SEV[r.severity], fontFamily: SANS, letterSpacing: 0.5 }}>{r.severity} severity</span>
      </div>
      <div style={{ fontFamily: SERIF, fontStyle: 'italic', fontSize: 13.5, color: C.taupe, lineHeight: 1.6, marginTop: 10 }}>{r.note}</div>
      {status !== 'resolved' && (expanded ?
        <div style={{ marginTop: 13 }}>
          <Textarea placeholder="Add an internal note…" value={note} onChange={(e) => setNote(e.target.value)} rows={2} />
          <div style={{ display: 'flex', gap: 7, marginTop: 10 }}>
            {status === 'open' && <button onClick={() => setStatus('investigating')} style={btnTS('transparent', C.goldMuted, 'rgba(184,151,42,0.3)')}>Mark investigating</button>}
            <button onClick={() => setStatus('resolved')} style={btnTS(C.charcoal, C.cream)}>Resolve</button>
          </div>
        </div> :
        <div style={{ marginTop: 13 }}><button onClick={() => setExpanded(true)} style={btnTS('transparent', C.charcoal, 'rgba(184,151,42,0.25)')}>Add note · update status</button></div>)}
      {status === 'resolved' && <div style={{ marginTop: 11, fontSize: 10, letterSpacing: 1.5, textTransform: 'uppercase', color: C.green, fontFamily: SANS }}>✓ Resolved & logged</div>}
    </Card>);
}
function btnTS(bg, col, bd) {
  return { background: bg, color: col, border: bd ? `0.5px solid ${bd}` : 'none', fontFamily: SANS, fontSize: 9, letterSpacing: 1.5, textTransform: 'uppercase', padding: '8px 13px', cursor: 'pointer' };
}

// ── FEEDBACK CENTER (simple) ──
const FB_COLOR = { Submitted: C.taupeLight, 'Under Review': C.goldMuted, Planned: C.blue, 'In Development': C.gold, Released: C.green };
function FeedbackCenter({ onBack }) {
  return (
    <div style={{ paddingBottom: 28 }}>
      <ScreenHeader back="More" onBack={onBack} eyebrow="Feedback" title="Product Feedback" sub="From residents & your team" />
      <div style={{ padding: '18px 20px 0' }}>
        <SectionLabel>Roadmap</SectionLabel>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 22 }}>
          {FCM.feedback.map((f, i) =>
            <Card key={i}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10 }}>
                <div style={{ fontFamily: SERIF, fontSize: 16, color: C.charcoal, lineHeight: 1.3, flex: 1 }}>{f.title}</div>
                <span style={{ fontSize: 10, color: C.taupeLight, fontFamily: SANS, whiteSpace: 'nowrap' }}>▲ {f.votes}</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 10 }}>
                <Tag>{f.cat}</Tag>
                <StatusPill color={FB_COLOR[f.status]} soft={`${FB_COLOR[f.status]}55`}>{f.status}</StatusPill>
              </div>
            </Card>)}
        </div>
        <BtnDark>Submit feedback</BtnDark>
      </div>
    </div>);
}

Object.assign(window, { MoreScreen });
