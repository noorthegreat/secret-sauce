/* Fifth Circle Manager — Residents area + Introductions segment.
   Stabilization sprint: live roster from FCStore with search + status filters,
   persistent access changes (with confirmation), and Day-1 empty states. */

const PART = {
  High: C.green, Medium: C.goldMuted, Low: C.amber, 'At risk': C.amber, None: C.taupeLight
};
const ONB = {
  Complete: { c: C.green }, 'In progress': { c: C.goldMuted }, Stalled: { c: C.amber }, 'Not started': { c: C.taupeLight }
};

function ResidentsScreen({ ctx }) {
  const store = useFC();
  const [seg, setSeg] = useState('people');
  const [openId, setOpenId] = useState(null);
  const [invite, setInvite] = useState(false);
  const [q, setQ] = useState('');
  const [filter, setFilter] = useState('all');

  if (invite) return <InviteResident onBack={() => setInvite(false)} />;
  if (openId) return <ResidentDetail id={openId} onBack={() => setOpenId(null)} />;

  const residents = store.residents;
  const m = window.FCStore.metrics();
  const summary = `${m.active} active · ${m.newcomers} new · ${m.risk} at risk · ${m.pending} pending`;
  const count = (st) => residents.filter((r) => r.status === st).length;
  const filtered = residents.filter((r) => {
    if (filter !== 'all' && r.status !== filter) return false;
    if (q && !(`${r.name} ${r.unit}`.toLowerCase().includes(q.toLowerCase()))) return false;
    return true;
  });

  return (
    <div style={{ paddingBottom: 28 }}>
      <ScreenHeader eyebrow={FCM.building} title="Residents" sub={seg === 'people' ? (residents.length ? summary : 'No residents yet') : '61 made · 78% accepted'}
        right={seg === 'people' ? <button onClick={() => setInvite(true)} style={{ display: 'flex', alignItems: 'center', gap: 5, background: C.charcoal, color: C.cream, border: 'none', fontFamily: SANS, fontSize: 9, letterSpacing: 1.5, textTransform: 'uppercase', padding: '8px 12px', cursor: 'pointer' }}><i className="ti ti-plus" style={{ fontSize: 12 }} />Invite</button> : null}>
        <Segmented value={seg} onChange={setSeg} options={[['people', 'Residents'], ['intros', 'Introductions']]} />
      </ScreenHeader>

      {seg === 'people' ?
        (residents.length === 0 ?
          <EmptyState icon="ti-users" title="No residents enrolled yet"
            body="Invite your pilot residents to begin. Each receives a warm welcome with the building access code, and appears here as they set up their profile."
            action="Invite a resident" onAction={() => setInvite(true)} /> :
          <div style={{ padding: '16px 20px 0' }}>
            <div style={{ marginBottom: 12 }}><SearchField value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search name or unit" /></div>
            <div style={{ marginBottom: 16 }}>
              <FilterChips value={filter} onChange={setFilter} options={[
                ['all', 'All', residents.length], ['active', 'Active', count('active')], ['new', 'New', count('new')],
                ['risk', 'At risk', count('risk')], ['inactive', 'Inactive', count('inactive')], ['pending', 'Pending', count('pending')]
              ]} />
            </div>
            {filtered.length === 0 ?
              <div style={{ padding: '30px 10px', textAlign: 'center', fontSize: 12, color: C.taupeLight, fontFamily: SANS }}>No residents match “{q || filter}”.</div> :
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {filtered.map((r) => (
                  <Card key={r.initials} onClick={() => setOpenId(r.initials)} style={{ display: 'flex', gap: 13, alignItems: 'center' }}>
                    <Avatar initials={r.initials} size={44} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
                        <div style={{ fontFamily: SERIF, fontSize: 17, color: C.charcoal }}>{r.name}</div>
                        <div style={{ fontSize: 10, color: C.taupeLight, fontFamily: SANS, letterSpacing: 0.5 }}>Unit {r.unit}</div>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 5 }}>
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 10, color: PART[r.participation] || C.taupe, fontFamily: SANS }}>
                          <span style={{ width: 5, height: 5, borderRadius: '50%', background: PART[r.participation] || C.taupe }} />{r.participation}
                        </span>
                        <span style={{ fontSize: 10, color: C.taupeLight, fontFamily: SANS }}>· {r.onboarding}</span>
                      </div>
                    </div>
                    <Badge kind={r.suspended ? 'suspended' : r.status} />
                  </Card>))}
              </div>}
          </div>) :
        <IntrosView ctx={ctx} store={store} />}
    </div>);
}

// ── RESIDENT DETAIL ──
function ResidentDetail({ id, onBack }) {
  const store = useFC();
  const r = store.residents.find((x) => x.initials === id);
  const [resent, setResent] = useState(false);
  const [confirm, setConfirm] = useState(null); // 'suspend' | 'restore'
  if (!r) return <div style={{ padding: 30 }}><BtnGhost onClick={onBack}>Back</BtnGhost></div>;
  const suspended = !!r.suspended;
  const stat = (l, v) => (
    <div style={{ flex: 1, textAlign: 'center' }}>
      <div style={{ fontFamily: SERIF, fontSize: 26, fontWeight: 300, color: C.charcoal, lineHeight: 1 }}>{v == null ? '—' : v}</div>
      <div style={{ fontSize: 8, letterSpacing: 1.5, color: C.taupeLight, textTransform: 'uppercase', fontFamily: SANS, marginTop: 5 }}>{l}</div>
    </div>);
  return (
    <div style={{ paddingBottom: 30, position: 'relative' }}>
      <ScreenHeader back="Residents" onBack={onBack} eyebrow={`Unit ${r.unit} · Joined ${r.joined}`} title={r.name}
        right={<Badge kind={suspended ? 'suspended' : r.status} />} />
      <div style={{ padding: '22px 22px 0', display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
        <Avatar initials={r.initials} size={84} />
      </div>

      <div style={{ padding: '22px 22px 0' }}>
        <SectionLabel>Onboarding & participation</SectionLabel>
        <Card style={{ marginBottom: 14 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <span style={{ fontSize: 12, color: C.charcoal, fontFamily: SANS }}>Onboarding</span>
            <StatusPill color={(ONB[r.onboarding] || {}).c}>{r.onboarding}</StatusPill>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: 12, color: C.charcoal, fontFamily: SANS }}>Participation</span>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 11, color: PART[r.participation] || C.taupe, fontFamily: SANS }}>
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: PART[r.participation] || C.taupe }} />{r.participation}
            </span>
          </div>
        </Card>

        <Card style={{ display: 'flex', marginBottom: 14 }}>
          {stat('Introductions', r.intros)}
          <div style={{ width: '0.5px', background: 'rgba(184,151,42,0.14)' }} />
          {stat('Events', r.events)}
          <div style={{ width: '0.5px', background: 'rgba(184,151,42,0.14)' }} />
          {stat('Active', null)}
        </Card>
        <div style={{ fontSize: 10.5, color: C.taupeLight, fontFamily: SANS, textAlign: 'center', marginTop: -6, marginBottom: 18 }}>Last active · {r.active}</div>

        <SectionLabel>Introduction activity</SectionLabel>
        <Card pad={0} style={{ marginBottom: 22 }}>
          {(r.intros ? ['Sophie L. — Met · Coffee', 'Noor S. — Pending response'] : ['No introductions yet']).map((t, i, arr) =>
            <div key={i} style={{ padding: '12px 15px', fontSize: 12, color: r.intros ? C.charcoal : C.taupeLight, fontFamily: SANS, borderBottom: i < arr.length - 1 ? '0.5px solid rgba(184,151,42,0.1)' : 'none' }}>{t}</div>)}
        </Card>

        {suspended &&
          <div style={{ background: 'rgba(122,46,46,0.06)', border: '0.5px solid rgba(122,46,46,0.25)', padding: '12px 14px', marginBottom: 14, display: 'flex', gap: 10 }}>
            <i className="ti ti-lock" style={{ fontSize: 15, color: '#7A2E2E', flexShrink: 0, marginTop: 1 }} />
            <div style={{ fontSize: 11, color: '#7A2E2E', fontFamily: SANS, lineHeight: 1.6 }}>Access suspended. This resident can’t sign in or join gatherings until restored.</div>
          </div>}

        {/* actions */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {r.status === 'pending' || r.invited ?
            (resent ?
              <div style={{ textAlign: 'center', fontSize: 11, letterSpacing: 1.5, textTransform: 'uppercase', color: C.green, fontFamily: SANS, padding: '12px' }}>✓ Invitation resent</div> :
              <BtnDark onClick={() => { window.FCStore.resendInvite(r.initials); setResent(true); }}>Resend invitation</BtnDark>) :
            <BtnGhost onClick={() => window.FCStore.toast('Message thread opened with ' + r.name.split(' ')[0])}>Message {r.name.split(' ')[0]}</BtnGhost>}
          {r.status !== 'pending' && (suspended ?
            <BtnGhost onClick={() => setConfirm('restore')}>Restore access</BtnGhost> :
            <BtnGhost danger onClick={() => setConfirm('suspend')}>Suspend resident access</BtnGhost>)}
        </div>
      </div>

      {confirm === 'suspend' &&
        <ConfirmSheet title={`Suspend ${r.name}’s access?`}
          body="They’ll be signed out and removed from upcoming gatherings until you restore access. This is logged in the activity record."
          confirmLabel="Suspend access" danger
          onCancel={() => setConfirm(null)}
          onConfirm={() => { window.FCStore.setSuspended(r.initials, true); setConfirm(null); }} />}
      {confirm === 'restore' &&
        <ConfirmSheet title={`Restore ${r.name}’s access?`}
          body="They’ll regain access to the community and gatherings immediately."
          confirmLabel="Restore access"
          onCancel={() => setConfirm(null)}
          onConfirm={() => { window.FCStore.setSuspended(r.initials, false); setConfirm(null); }} />}
    </div>);
}

// ── INVITE RESIDENT ──
function InviteResident({ onBack }) {
  const [sent, setSent] = useState(false);
  const [method, setMethod] = useState('Email invitation');
  const [f, setF] = useState({ first: '', last: '', unit: '', email: '' });
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
  const submit = () => {
    const first = f.first || 'New', last = f.last || 'Resident';
    const initials = (first[0] + (last[0] || '')).toUpperCase();
    window.FCStore.addResident({
      initials: initials + Math.floor(Math.random() * 9), name: `${first} ${last[0] || ''}.`.trim(), unit: f.unit || '—',
      joined: 'Today', intros: null, events: null, active: 'Pending', status: 'pending', onboarding: 'Not started', participation: 'None', invited: true
    });
    setSent(true);
  };
  return (
    <div style={{ paddingBottom: 30 }}>
      <ScreenHeader back="Residents" onBack={onBack} eyebrow="Add a resident" title={<>Invite a <Em>neighbor.</Em></>} />
      {sent ?
        <div style={{ padding: '40px 22px', textAlign: 'center' }}>
          <div style={{ width: 64, height: 64, borderRadius: '50%', background: 'rgba(107,140,90,0.1)', border: '0.5px solid rgba(107,140,90,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 18px' }}><i className="ti ti-send" style={{ fontSize: 26, color: C.green }} /></div>
          <Title size={24}>Invitation sent.</Title>
          <div style={{ fontSize: 12, color: C.taupe, fontFamily: SANS, marginTop: 10, lineHeight: 1.7, maxWidth: 270, margin: '10px auto 0' }}>They’ll receive a warm welcome with their access code and a link to set up their profile, and now appear in your roster as Pending.</div>
          <div style={{ marginTop: 24 }}><BtnDark onClick={onBack}>Back to residents</BtnDark></div>
        </div> :
        <div style={{ padding: '22px 22px 0', display: 'flex', flexDirection: 'column', gap: 20 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <Field label="First name" placeholder="Nina" value={f.first} onChange={set('first')} />
            <Field label="Last name" placeholder="Kelly" value={f.last} onChange={set('last')} />
          </div>
          <Field label="Unit" placeholder="6D" value={f.unit} onChange={set('unit')} />
          <Field label="Email" placeholder="nina@email.com" value={f.email} onChange={set('email')} />
          <PillSelect label="Send via" options={['Email invitation', 'Access code only', 'Email + access code']} value={method} onChange={setMethod} />
          <div style={{ background: 'rgba(184,151,42,0.06)', border: '0.5px solid rgba(184,151,42,0.2)', padding: '14px 15px', display: 'flex', gap: 11 }}>
            <i className="ti ti-key" style={{ fontSize: 16, color: 'var(--gold-muted)', flexShrink: 0, marginTop: 1 }} />
            <div style={{ fontSize: 11, color: C.taupe, fontFamily: SANS, lineHeight: 1.6 }}>Building access code <span style={{ color: C.charcoal, fontFamily: SERIF, fontSize: 13 }}>{FCM.settings.accessCode}</span> will be included automatically.</div>
          </div>
          <BtnDark onClick={submit} mt={4}>Send invitation</BtnDark>
        </div>}
    </div>);
}

// ── INTRODUCTIONS (segment) ──
function IntrosView({ ctx, store }) {
  if (store.mode === 'empty' || !store.intros.length) return (
    <EmptyState icon="ti-heart-handshake" title="No introductions yet"
      body="As residents complete their profiles, Fifth Circle introduces neighbors with shared interests and activities. Matches and outcomes will show here." />);
  return (
    <div style={{ padding: '18px 20px 0' }}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, marginBottom: 22 }}>
        {FCM.introStats.map((m) =>
          <div key={m.label} style={{ background: C.white, border: '0.5px solid rgba(184,151,42,0.16)', padding: '13px 11px' }}>
            <div style={{ fontSize: 8, letterSpacing: 1.5, color: C.taupeLight, textTransform: 'uppercase', fontFamily: SANS, marginBottom: 8, lineHeight: 1.3 }}>{m.label}</div>
            <div style={{ fontFamily: SERIF, fontSize: 30, fontWeight: 300, color: C.charcoal, lineHeight: 1 }}>{m.val}</div>
          </div>)}
      </div>

      <SectionLabel>Introduction Log</SectionLabel>
      <Card pad={0} style={{ marginBottom: 22 }}>
        {store.intros.map((m, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '13px 16px', borderBottom: i < store.intros.length - 1 ? '0.5px solid rgba(184,151,42,0.1)' : 'none' }}>
            <div style={{ display: 'flex' }}>
              <Avatar initials={m.a} size={30} />
              <div style={{ marginLeft: -9 }}><Avatar initials={m.b} size={30} /></div>
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 12.5, color: C.charcoal, fontFamily: SANS }}>{m.names}</div>
              <div style={{ fontSize: 10, color: C.taupeLight, fontFamily: SANS, marginTop: 2 }}>{m.meta}</div>
            </div>
            <div style={{ textAlign: 'right', flexShrink: 0 }}>
              <Badge kind={m.outcome === 'met' ? 'met' : 'pending'} />
              {m.detail && <div style={{ fontSize: 9.5, color: C.taupeLight, fontFamily: SANS, marginTop: 4 }}>{m.detail}</div>}
            </div>
          </div>))}
      </Card>

      <SectionLabel>Introduction Outcomes</SectionLabel>
      <Card style={{ marginBottom: 22 }}>{FCM.introOutcomes.map((b) => <BarRow key={b.label} {...b} />)}</Card>

      <SectionLabel>Top Match Reasons</SectionLabel>
      <Card>{FCM.matchReasons.map((b) => <BarRow key={b.label} {...b} c="gold" />)}</Card>
    </div>);
}

Object.assign(window, { ResidentsScreen });
