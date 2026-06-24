/* Fifth Circle Manager — Events: operations, approvals, requests, planning.
   Stabilization sprint: all actions persist through FCStore; the demand→event
   loop is wired end-to-end; every segment has a real Day-1 empty state. */

const EV_STATUS = {
  published: { c: C.green, b: 'rgba(107,140,90,0.4)', t: 'Published' },
  draft: { c: C.taupe, b: 'rgba(184,151,42,0.3)', t: 'Draft' },
  closed: { c: C.taupeLight, b: 'rgba(140,128,112,0.4)', t: 'Closed' }
};
function EvStatus({ s }) {
  const x = EV_STATUS[s] || EV_STATUS.draft;
  return <span style={{ fontSize: 8, letterSpacing: 2, textTransform: 'uppercase', fontFamily: SANS, padding: '3px 8px', border: `0.5px solid ${x.b}`, color: x.c }}>{x.t}</span>;
}
function btnA(bg, col, bd) {
  return { background: bg, color: col, border: bd ? `0.5px solid ${bd}` : 'none', fontFamily: SANS, fontSize: 9, letterSpacing: 1.5, textTransform: 'uppercase', padding: '7px 13px', cursor: 'pointer' };
}

function EventsScreen({ ctx, initSeg }) {
  const store = useFC();
  const [seg, setSeg] = useState(initSeg || 'events');
  const [view, setView] = useState(null); // {mode:'editor'|'monitor', id, seed, fromSuggestion}

  // Demand → Event: a converted suggestion opens the editor prefilled.
  useEffect(() => {
    if (store.pendingConvert && !(view && view.mode === 'editor')) {
      setSeg('events');
      setView({ mode: 'editor', id: null, seed: store.pendingConvert.seed, fromSuggestion: store.pendingConvert.suggestionId });
    }
  }, [store.pendingConvert]);

  const closeView = () => { setView(null); if (store.pendingConvert) window.FCStore.clearPendingConvert(); };

  if (view && view.mode === 'editor') return <EventEditor id={view.id} seed={view.seed} fromSuggestion={view.fromSuggestion} onBack={closeView} />;
  if (view && view.mode === 'monitor') return <EventMonitor id={view.id} onBack={() => setView(null)} />;

  const pendingN = store.proposals.filter((p) => !p.decision || p.decision === 'hold' || p.decision === 'changes').length;

  return (
    <div style={{ paddingBottom: 28 }}>
      <ScreenHeader eyebrow={FCM.building} title="Events"
        right={seg === 'events' ? <button onClick={() => setView({ mode: 'editor', id: null })} style={{ display: 'flex', alignItems: 'center', gap: 5, background: C.charcoal, color: C.cream, border: 'none', fontFamily: SANS, fontSize: 9, letterSpacing: 1.5, textTransform: 'uppercase', padding: '8px 12px', cursor: 'pointer' }}><i className="ti ti-plus" style={{ fontSize: 12 }} />New</button> : null}>
        <Segmented value={seg} onChange={setSeg} options={[['events', 'Calendar'], ['approvals', `Approvals${pendingN ? ' · ' + pendingN : ''}`], ['requests', 'Requests'], ['planning', 'Planning']]} />
      </ScreenHeader>

      {seg === 'events' && <MyEventsView events={store.events} onOpen={(id, mode) => setView({ mode, id })} onNew={() => setView({ mode: 'editor', id: null })} />}
      {seg === 'approvals' && <ApprovalsView proposals={store.proposals} />}
      {seg === 'requests' && <RequestsView store={store} onConvertGo={() => setSeg('events')} />}
      {seg === 'planning' && <PlanningView store={store} />}
    </div>);
}

// ── MY EVENTS ──
function MyEventsView({ events, onOpen, onNew }) {
  if (!events.length) return (
    <EmptyState icon="ti-calendar-plus" title="No events on the calendar yet"
      body="Create your first gathering, or approve a resident proposal to add one. Once published, RSVPs and attendance appear here."
      action="Create an event" onAction={onNew} />);
  const groups = [
    ['Upcoming', events.filter((e) => e.status === 'published')],
    ['Drafts', events.filter((e) => e.status === 'draft')],
    ['Past', events.filter((e) => e.status === 'closed')]
  ];
  return (
    <div style={{ padding: '18px 20px 0' }}>
      {groups.map(([label, list]) => list.length === 0 ? null : (
        <div key={label} style={{ marginBottom: 22 }}>
          <SectionLabel mb={12}>{label}</SectionLabel>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {list.map((e) => (
              <Card key={e.id} pad={0} onClick={() => onOpen(e.id, e.status === 'draft' ? 'editor' : 'monitor')}>
                <div style={{ display: 'flex' }}>
                  <div style={{ minWidth: 56, background: C.parchment, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '14px 8px', borderRight: '0.5px solid rgba(184,151,42,0.14)' }}>
                    <span style={{ fontFamily: SERIF, fontSize: 24, fontWeight: 300, color: 'var(--gold)', lineHeight: 1 }}>{e.day || '—'}</span>
                    <span style={{ fontSize: 8, letterSpacing: 1.5, color: C.taupeLight, textTransform: 'uppercase', fontFamily: SANS, marginTop: 3 }}>{e.month}</span>
                  </div>
                  <div style={{ flex: 1, padding: '13px 15px', minWidth: 0 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
                      <div style={{ fontFamily: SERIF, fontSize: 16.5, color: C.charcoal, lineHeight: 1.15 }}>{e.title}</div>
                      <EvStatus s={e.status} />
                    </div>
                    <div style={{ fontSize: 10, color: C.taupe, fontFamily: SANS, marginTop: 5 }}>{[e.dow, e.time, e.loc].filter(Boolean).join(' · ')}</div>
                    <div style={{ fontSize: 9.5, color: C.taupeLight, fontFamily: SANS, marginTop: 6, letterSpacing: 0.3 }}>
                      {e.status === 'closed' ? `${e.attended} attended${e.rating ? ` · ${e.rating} ★` : ''}` : e.status === 'draft' ? `Draft · ${e.host || 'Concierge'}` : `${e.rsvp}/${e.cap} RSVP'd${e.waitlist ? ` · ${e.waitlist} waitlist` : ''}`}
                    </div>
                  </div>
                </div>
              </Card>))}
          </div>
        </div>))}
    </div>);
}

// ── EVENT EDITOR (create / edit / convert-from-suggestion) ──
function EventEditor({ id, seed, fromSuggestion, onBack }) {
  const store = useFC();
  const existing = id ? store.events.find((e) => e.id === id) : null;
  const init = existing || seed || { title: '', desc: '', day: '', month: 'Jul', time: '', loc: FCM.locations[0], type: FCM.eventTypes[0], host: 'Concierge', cap: '', announce: true };
  const [f, setF] = useState(Object.assign({ date: init.day ? (init.day + ' ' + (init.month || '')).trim() : '' }, init));
  const set = (k) => (e) => setF({ ...f, [k]: e.target ? e.target.value : e });
  const [saved, setSaved] = useState(false);
  const [missing, setMissing] = useState(false);

  const doSave = (publish) => {
    if (publish && (!f.title || !f.date || !f.time)) { setMissing(true); return; }
    const parts = (f.date || '').trim().split(/\s+/);
    let day = '', month = f.month || 'Jul';
    if (parts.length === 2) { month = parts[0].match(/[A-Za-z]/) ? parts[0] : parts[1]; day = parts[0].match(/\d/) ? parts[0] : parts[1]; }
    else if (parts.length === 1 && parts[0]) { if (parts[0].match(/^\d+$/)) day = parts[0]; }
    const payload = { title: f.title, desc: f.desc, type: f.type, day, month, dow: f.dow || '', time: f.time, loc: f.loc, host: f.host, cap: parseInt(f.cap, 10) || 0 };
    window.FCStore.saveEvent(payload, { publish, fromSuggestion, existingId: existing ? existing.id : null });
    setSaved(true);
  };

  return (
    <div style={{ paddingBottom: 30 }}>
      <ScreenHeader back="Events" onBack={onBack} eyebrow={existing ? 'Edit event' : fromSuggestion ? 'From resident demand' : 'Create event'} title={<>{existing ? 'Refine the' : 'A new'} <Em>gathering.</Em></>} />
      {saved ?
        <div style={{ padding: '40px 22px', textAlign: 'center' }}>
          <div style={{ width: 64, height: 64, borderRadius: '50%', background: 'rgba(107,140,90,0.1)', border: '0.5px solid rgba(107,140,90,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 18px' }}><i className="ti ti-check" style={{ fontSize: 28, color: C.green }} /></div>
          <Title size={24}>{f._published ? 'Published & announced.' : 'On the calendar.'}</Title>
          <div style={{ fontSize: 12, color: C.taupe, fontFamily: SANS, marginTop: 10, lineHeight: 1.7, maxWidth: 290, margin: '10px auto 0' }}>{fromSuggestion ? 'The resident idea has been converted and moved off your requests list. ' : ''}{f.title || 'Your event'} is now in the calendar — open it any time to track RSVPs.</div>
          <div style={{ marginTop: 24 }}><BtnDark onClick={onBack}>Back to events</BtnDark></div>
        </div> :
        <div style={{ padding: '22px 22px 0', display: 'flex', flexDirection: 'column', gap: 20 }}>
          {fromSuggestion &&
            <div style={{ background: 'rgba(184,151,42,0.07)', border: '0.5px solid rgba(184,151,42,0.22)', padding: '12px 14px', display: 'flex', gap: 10 }}>
              <i className="ti ti-bulb" style={{ fontSize: 16, color: 'var(--gold-muted)', flexShrink: 0, marginTop: 1 }} />
              <div style={{ fontSize: 11, color: C.taupe, fontFamily: SANS, lineHeight: 1.6 }}>Prefilled from a resident suggestion. Adjust the details and publish to turn demand into a real gathering.</div>
            </div>}
          <Field label="Title" placeholder="Rooftop Wine & Conversation" value={f.title} onChange={set('title')} />
          <Textarea label="Description" placeholder="What makes this gathering special?" value={f.desc} onChange={set('desc')} rows={3} />
          <PillSelect label="Event type" options={FCM.eventTypes} value={f.type} onChange={(v) => setF({ ...f, type: v })} />
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <Field label="Date" placeholder="Jul 18" value={f.date} onChange={set('date')} />
            <Field label="Time" placeholder="7:00 PM" value={f.time} onChange={set('time')} />
          </div>
          <PillSelect label="Location" options={FCM.locations} value={f.loc} onChange={(v) => setF({ ...f, loc: v })} />
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <Field label="Host" placeholder="Concierge" value={f.host} onChange={set('host')} />
            <Field label="Capacity / RSVP limit" placeholder="24" value={f.cap} onChange={set('cap')} />
          </div>
          {missing && <div style={{ fontSize: 11, color: '#7A2E2E', fontFamily: SANS, letterSpacing: 0.3 }}>Add a title, date and time before publishing.</div>}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 4 }}>
            <BtnDark onClick={() => { setF((p) => ({ ...p, _published: true })); doSave(true); }}>Publish & announce</BtnDark>
            <BtnGhost onClick={() => { setF((p) => ({ ...p, _published: false })); doSave(false); }}>Save as draft</BtnGhost>
          </div>
        </div>}
    </div>);
}

// ── EVENT MONITOR (RSVPs / waitlist / attendance / feedback) ──
function EventMonitor({ id, onBack }) {
  const store = useFC();
  const e = store.events.find((x) => x.id === id);
  if (!e) return <div style={{ padding: 30 }}><BtnGhost onClick={onBack}>Back</BtnGhost></div>;
  const closed = e.status === 'closed';
  const hasGuests = (e.rsvp || 0) > 0;
  const guestSample = ['Sophie L. · 14B', 'Marcus R. · 7A', 'James T. · 11D', 'Clara W. · 2B', 'Elena B. · 5A', 'Liam H. · 12E'].slice(0, Math.min(6, e.rsvp || 0));
  return (
    <div style={{ paddingBottom: 30 }}>
      <ScreenHeader back="Events" onBack={onBack} eyebrow={[e.dow, e.day && (e.day + ' ' + e.month), e.time].filter(Boolean).join(' · ')} title={e.title}
        right={<EvStatus s={e.status} />} />
      <div style={{ padding: '20px 20px 0' }}>
        {e.desc && <div style={{ fontFamily: SERIF, fontStyle: 'italic', fontSize: 15, lineHeight: 1.7, color: C.taupe, marginBottom: 18 }}>{e.desc}</div>}
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 22 }}>
          <Tag>{e.type}</Tag><Tag>{e.loc}</Tag><Tag>Host · {e.host}</Tag>
        </div>

        <SectionLabel>{closed ? 'Final attendance' : 'RSVPs'}</SectionLabel>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, marginBottom: 22 }}>
          {[
            { l: 'Confirmed', v: e.rsvp, sub: `of ${e.cap}` },
            { l: 'Waitlist', v: e.waitlist, sub: 'waiting' },
            closed ? { l: 'Attended', v: e.attended, sub: e.rsvp ? `${Math.round(e.attended / e.rsvp * 100)}%` : '—' } : { l: 'Open seats', v: Math.max(0, e.cap - e.rsvp), sub: 'remaining' }
          ].map((m, i) =>
            <div key={i} style={{ background: C.white, border: '0.5px solid rgba(184,151,42,0.16)', padding: '13px 12px' }}>
              <div style={{ fontSize: 8, letterSpacing: 1.5, color: C.taupeLight, textTransform: 'uppercase', fontFamily: SANS, marginBottom: 7 }}>{m.l}</div>
              <div style={{ fontFamily: SERIF, fontSize: 30, fontWeight: 300, color: C.charcoal, lineHeight: 1 }}>{m.v}</div>
              <div style={{ fontSize: 9.5, color: C.taupeLight, fontFamily: SANS, marginTop: 3 }}>{m.sub}</div>
            </div>)}
        </div>

        {!closed && e.cap > 0 &&
          <div style={{ marginBottom: 22 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
              <span style={{ fontSize: 10, color: C.taupe, fontFamily: SANS }}>Capacity</span>
              <span style={{ fontSize: 10, color: 'var(--gold-muted)', fontFamily: SANS }}>{Math.round(e.rsvp / e.cap * 100)}% full</span>
            </div>
            <ProgressBar pct={e.rsvp / e.cap * 100} />
          </div>}

        <SectionLabel>Guests</SectionLabel>
        {hasGuests ?
          <Card pad={0}>
            {guestSample.map((g, i, arr) => {
              const initials = g.split(' ').slice(0, 2).map((w) => w[0]).join('');
              return (
                <div key={g} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '11px 15px', borderBottom: i < arr.length - 1 ? '0.5px solid rgba(184,151,42,0.1)' : 'none' }}>
                  <Avatar initials={initials} size={32} />
                  <span style={{ flex: 1, fontSize: 12.5, color: C.charcoal, fontFamily: SANS }}>{g}</span>
                  <span style={{ fontSize: 9, letterSpacing: 1, textTransform: 'uppercase', fontFamily: SANS, color: closed ? C.green : 'var(--gold-muted)' }}>{closed ? 'Attended' : 'Confirmed'}</span>
                </div>);
            })}
          </Card> :
          <Card><div style={{ fontSize: 11.5, color: C.taupeLight, fontFamily: SANS, lineHeight: 1.7, textAlign: 'center', padding: '14px 8px' }}>No RSVPs yet. Once you announce this gathering, confirmed guests will appear here.</div></Card>}

        {closed && e.rating &&
          <div style={{ marginTop: 22 }}>
            <SectionLabel>Feedback · {e.rating} ★</SectionLabel>
            <Card>
              <div style={{ fontFamily: SERIF, fontStyle: 'italic', fontSize: 15, lineHeight: 1.7, color: C.charcoalSoft }}>"Easily the best evening I've had in the building — met three neighbors I'll genuinely see again."</div>
              <div style={{ fontSize: 10, color: C.taupeLight, fontFamily: SANS, marginTop: 10 }}>— Sophie L., Unit 14B</div>
            </Card>
          </div>}

        {!closed &&
          <div style={{ marginTop: 22, display: 'flex', flexDirection: 'column', gap: 10 }}>
            <BtnDark onClick={() => window.FCStore.sendReminder(e.id)} disabled={!hasGuests}>{e.reminded ? 'Reminder sent ✓ — send again' : 'Send reminder to guests'}</BtnDark>
            <BtnGhost onClick={() => window.FCStore.closeEvent(e.id)}>Close event & record attendance</BtnGhost>
          </div>}
      </div>
    </div>);
}

// ── EVENT APPROVALS (resident proposals) ──
function ApprovalsView({ proposals }) {
  const [open, setOpen] = useState(null);
  const [noteFor, setNoteFor] = useState(null);
  const [note, setNote] = useState('');
  const DEC = { approve: { t: '✓ Approved · on calendar', c: C.green }, hold: { t: '◷ On hold', c: C.goldMuted }, changes: { t: '↻ Changes requested', c: C.blue }, decline: { t: '✕ Declined', c: C.taupe } };
  const pending = proposals.filter((p) => !p.decision || p.decision === 'hold' || p.decision === 'changes');

  if (!pending.length && !proposals.length) return (
    <EmptyState icon="ti-inbox" title="No proposals awaiting review"
      body="When a resident proposes a gathering, it lands here with their notes, expected turnout and budget — ready for you to approve onto the calendar." />);

  return (
    <div style={{ padding: '18px 20px 0' }}>
      <div style={{ fontSize: 11, color: C.taupe, fontFamily: SANS, lineHeight: 1.6, marginBottom: 16 }}>
        Resident-proposed gatherings awaiting your review. <span style={{ fontFamily: SERIF, fontStyle: 'italic', fontSize: 13, color: C.taupeLight }}>Approve to add to the calendar, or guide it with a note.</span>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {proposals.map((a) => {
          const d = a.decision;
          const isOpen = open === a.id;
          return (
            <Card key={a.id} pad={0} style={{ opacity: d && d !== 'hold' && d !== 'changes' ? 0.72 : 1 }}>
              <div style={{ display: 'flex' }}>
                <div style={{ minWidth: 54, background: C.parchment, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '14px 8px', borderRight: '0.5px solid rgba(184,151,42,0.14)' }}>
                  <span style={{ fontFamily: SERIF, fontSize: 24, fontWeight: 300, color: 'var(--gold)', lineHeight: 1 }}>{a.day}</span>
                  <span style={{ fontSize: 8, letterSpacing: 1.5, color: C.taupeLight, textTransform: 'uppercase', fontFamily: SANS, marginTop: 3 }}>{a.month}</span>
                </div>
                <div style={{ flex: 1, padding: '13px 15px', minWidth: 0 }}>
                  <div style={{ fontFamily: SERIF, fontSize: 16.5, color: C.charcoal, lineHeight: 1.15 }}>{a.name}</div>
                  <div style={{ fontSize: 10, color: C.taupe, fontFamily: SANS, marginTop: 4 }}>{a.by} · Unit {a.unit} · {a.time}</div>
                  <div style={{ fontSize: 10, color: 'var(--gold-muted)', fontFamily: SANS, marginTop: 5, letterSpacing: 0.3 }}>{a.votes} supported · ~{a.rsvpEst} likely RSVPs</div>

                  <div style={{ marginTop: 11, paddingTop: 11, borderTop: '0.5px solid rgba(184,151,42,0.12)', display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {[['Amenity', a.amenity], ['Proposed budget', a.budget], ['Type', a.type]].map(([k, v]) =>
                      <div key={k} style={{ display: 'flex', justifyContent: 'space-between', gap: 10 }}>
                        <span style={{ fontSize: 9.5, letterSpacing: 1, textTransform: 'uppercase', color: C.taupeLight, fontFamily: SANS }}>{k}</span>
                        <span style={{ fontSize: 11, color: C.charcoal, fontFamily: SANS, textAlign: 'right' }}>{v}</span>
                      </div>)}
                    <div style={{ fontFamily: SERIF, fontStyle: 'italic', fontSize: 13, color: C.taupe, lineHeight: 1.6, marginTop: 4 }}>"{a.comments}"</div>
                  </div>

                  {d && d !== 'hold' && d !== 'changes' ?
                    <div style={{ fontSize: 10, letterSpacing: 1.5, textTransform: 'uppercase', fontFamily: SANS, marginTop: 12, color: DEC[d].c }}>{DEC[d].t}</div> :
                    noteFor === a.id ?
                      <div style={{ marginTop: 12 }}>
                        <Textarea placeholder="What should the resident adjust?" value={note} onChange={(e) => setNote(e.target.value)} rows={2} />
                        <div style={{ display: 'flex', gap: 7, marginTop: 9 }}>
                          <button onClick={() => { window.FCStore.decideProposal(a.id, 'changes', note); setNoteFor(null); setNote(''); setOpen(null); }} style={btnA(C.charcoal, C.cream)}>Send note</button>
                          <button onClick={() => { setNoteFor(null); setNote(''); }} style={btnA('transparent', C.taupe, 'rgba(184,151,42,0.2)')}>Cancel</button>
                        </div>
                      </div> :
                      isOpen ?
                        <div>
                          {d === 'hold' && <div style={{ fontSize: 9.5, letterSpacing: 1.5, textTransform: 'uppercase', fontFamily: SANS, marginTop: 11, color: C.goldMuted }}>{DEC.hold.t} — revisit below</div>}
                          {d === 'changes' && <div style={{ fontSize: 9.5, letterSpacing: 1.5, textTransform: 'uppercase', fontFamily: SANS, marginTop: 11, color: C.blue }}>{DEC.changes.t}</div>}
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7, marginTop: 12 }}>
                            <button onClick={() => { window.FCStore.decideProposal(a.id, 'approve'); setOpen(null); }} style={btnA(C.charcoal, C.cream)}>Approve → calendar</button>
                            <button onClick={() => setNoteFor(a.id)} style={btnA('transparent', C.blue, 'rgba(90,122,138,0.4)')}>Request changes</button>
                            <button onClick={() => { window.FCStore.decideProposal(a.id, 'hold'); setOpen(null); }} style={btnA('transparent', C.goldMuted, 'rgba(184,151,42,0.28)')}>Hold</button>
                            <button onClick={() => { window.FCStore.decideProposal(a.id, 'decline'); setOpen(null); }} style={btnA('transparent', C.taupe, 'rgba(184,151,42,0.2)')}>Decline</button>
                          </div>
                        </div> :
                        <div style={{ marginTop: 12 }}><button onClick={() => setOpen(a.id)} style={btnA(C.charcoal, C.cream)}>Review proposal</button></div>}
                </div>
              </div>
            </Card>);
        })}
      </div>
    </div>);
}

// ── COMMUNITY REQUESTS ──
function RequestsView({ store, onConvertGo }) {
  const open = store.suggestions.filter((s) => s.status !== 'archived' && s.status !== 'converted');
  if (!open.length) return (
    <EmptyState icon="ti-bulb" title="No resident ideas yet"
      body="As residents suggest experiences, vendors and venues, they collect here with vote counts — so you can turn real demand into events." />);
  return (
    <div style={{ padding: '18px 20px 0' }}>
      <SectionLabel>Most Requested</SectionLabel>
      <Card style={{ marginBottom: 22 }}>{FCM.requestsTrending.map((b) => <BarRow key={b.label} {...b} c="gold" />)}</Card>

      <SectionLabel>Resident Suggestions</SectionLabel>
      <div style={{ fontSize: 11, color: C.taupe, fontFamily: SANS, lineHeight: 1.6, marginBottom: 12 }}>
        <span style={{ fontFamily: SERIF, fontStyle: 'italic', fontSize: 13.5, color: C.taupeLight }}>Convert turns an idea into a prefilled event draft — demand straight onto your calendar.</span>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {open.map((s) => {
          const shortlisted = s.status === 'shortlisted';
          return (
            <Card key={s.id}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10, marginBottom: 9 }}>
                <span style={{ fontSize: 8.5, letterSpacing: 2, textTransform: 'uppercase', color: 'var(--gold-muted)', fontFamily: SANS }}>{s.kind}{shortlisted ? ' · Shortlisted' : ''}</span>
                <span style={{ fontSize: 10, color: C.taupeLight, fontFamily: SANS, whiteSpace: 'nowrap' }}>{s.votes} votes</span>
              </div>
              <div style={{ fontFamily: SERIF, fontSize: 17, color: C.charcoal, lineHeight: 1.3 }}>{s.text}</div>
              <div style={{ fontSize: 10, color: C.taupe, fontFamily: SANS, marginTop: 6 }}>Suggested by {s.by}</div>
              <div style={{ display: 'flex', gap: 7, marginTop: 13, flexWrap: 'wrap' }}>
                <button onClick={() => { window.FCStore.convertSuggestion(s.id); onConvertGo && onConvertGo(); }} style={btnA(C.charcoal, C.cream)}>Convert to event</button>
                {!shortlisted && <button onClick={() => window.FCStore.shortlistSuggestion(s.id)} style={btnA('transparent', C.goldMuted, 'rgba(184,151,42,0.28)')}>Shortlist</button>}
                <button onClick={() => window.FCStore.archiveSuggestion(s.id)} style={btnA('transparent', C.taupe, 'rgba(184,151,42,0.2)')}>Archive</button>
              </div>
            </Card>);
        })}
      </div>
    </div>);
}

// ── PLANNING & BUDGET ──
// Cost + vendor + interest heuristics that turn a resident idea into a
// budget-aware, vendor-matched event recommendation.
function estimateFor(s) {
  const t = (s.text + ' ' + s.kind).toLowerCase();
  if (/coffee|cart/.test(t)) return { cost: 480, label: '$480 / mo' };
  if (/wine|tasting|sommelier|spirit/.test(t)) return { cost: 450, label: '$450' };
  if (/chef|supper|dinner|table|brunch/.test(t)) return { cost: 720, label: '~$720' };
  if (/florist|flower|workshop|bloom/.test(t)) return { cost: 320, label: '$320' };
  if (/sound bath|meditation|yoga|wellness/.test(t)) return { cost: 200, label: '$200' };
  if (/music|jazz|dj|live/.test(t)) return { cost: 600, label: '$600' };
  if (/garden|courtyard|venue/.test(t)) return { cost: 250, label: '$250' };
  return { cost: 300, label: '~$300' };
}
function vendorFor(s, vendors) {
  const t = (s.text + ' ' + s.kind).toLowerCase();
  const find = (re) => vendors.find((v) => re.test((v.cat + ' ' + v.name).toLowerCase()));
  if (/wine|tasting|sommelier|spirit/.test(t)) return find(/wine|sommelier|cellar/);
  if (/coffee|cart/.test(t)) return find(/coffee/);
  if (/florist|flower|workshop|bloom/.test(t)) return find(/florist|flower|workshop/);
  if (/yoga|sound bath|meditation|wellness/.test(t)) return find(/yoga|wellness|studio/);
  if (/music|jazz|dj|live/.test(t)) return find(/music|sound|dj/);
  if (/chef|supper|dinner|catering|brunch|table/.test(t)) return vendors.find((v) => /supper|catering/.test((v.cat + ' ' + v.name).toLowerCase()) && !/coffee/.test((v.cat + ' ' + v.name).toLowerCase()));
  return null;
}
function interestFor(s) {
  const t = s.text.toLowerCase();
  const map = [[/wine|tasting|food|chef|dinner|supper|brunch|coffee/, 'Food & Wine'], [/yoga|fitness|sound|meditation|wellness/, 'Fitness'], [/art|design|florist|flower|workshop|architecture/, 'Design & Art'], [/music|travel/, 'Travel']];
  for (const [re, label] of map) { if (re.test(t)) { const it = FCM.interests.find((i) => i.label === label); if (it) return it; } }
  return null;
}

function PlanningView({ store }) {
  const p = FCM.planning;
  const fmt = (n) => '$' + n.toLocaleString();
  const empty = store.mode === 'empty';
  if (empty) return (
    <EmptyState icon="ti-coins" title="Planning starts once events do"
      body="Your monthly budget, frequency goals and demand-aware recommendations appear here as soon as the pilot is underway." />);

  const monthlyRemaining = p.monthlyBudget - p.monthlySpent;
  const annualRemaining = p.annualBudget - p.annualSpent;
  const ideas = store.suggestions.filter((s) => s.status === 'open' || s.status === 'shortlisted');
  const recs = ideas.map((s) => {
    const est = estimateFor(s);
    const vendor = vendorFor(s, store.vendors);
    const interest = interestFor(s);
    return { s, est, vendor, interest, fits: est.cost <= monthlyRemaining, score: s.votes + (interest ? interest.pct / 2 : 0) };
  }).sort((a, b) => (b.fits - a.fits) || (b.score - a.score));

  const draftFrom = (r) => window.FCStore.saveEvent({
    title: r.s.text.length > 42 ? r.s.text.slice(0, 42) + '…' : r.s.text,
    desc: 'From resident demand (' + r.s.votes + ' votes)' + (r.interest ? ' · matches “' + r.interest.label + '” interest' : '') + '. Est. ' + r.est.label + (r.vendor ? ' · vendor: ' + r.vendor.name : '') + '.',
    type: FCM.eventTypes[0], day: '', month: 'Jul', dow: '', time: '', loc: FCM.locations[0], host: r.vendor ? r.vendor.name : 'Concierge', cap: Math.max(12, r.s.votes)
  }, { publish: false, fromSuggestion: r.s.id });

  return (
    <div style={{ padding: '18px 20px 0' }}>
      <SectionLabel>Monthly Budget · June</SectionLabel>
      <Card style={{ marginBottom: 14 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 12 }}>
          <span style={{ fontFamily: SERIF, fontSize: 30, fontWeight: 300, color: C.charcoal }}>{fmt(p.monthlySpent)}</span>
          <span style={{ fontSize: 11, color: C.taupe, fontFamily: SANS }}>of {fmt(p.monthlyBudget)}</span>
        </div>
        <ProgressBar pct={p.monthlySpent / p.monthlyBudget * 100} />
        <div style={{ fontSize: 10, color: C.taupeLight, fontFamily: SANS, marginTop: 8 }}>{fmt(monthlyRemaining)} remaining this month</div>
      </Card>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 22 }}>
        <Card>
          <div style={{ fontSize: 8.5, letterSpacing: 1.5, color: C.taupeLight, textTransform: 'uppercase', fontFamily: SANS, marginBottom: 8 }}>Annual remaining</div>
          <div style={{ fontFamily: SERIF, fontSize: 24, fontWeight: 300, color: C.charcoal, lineHeight: 1 }}>{fmt(annualRemaining)}</div>
          <div style={{ fontSize: 9.5, color: C.taupeLight, fontFamily: SANS, marginTop: 4 }}>of {fmt(p.annualBudget)}</div>
        </Card>
        <Card>
          <div style={{ fontSize: 8.5, letterSpacing: 1.5, color: C.taupeLight, textTransform: 'uppercase', fontFamily: SANS, marginBottom: 8 }}>Gatherings / mo</div>
          <div style={{ fontFamily: SERIF, fontSize: 24, fontWeight: 300, color: C.charcoal, lineHeight: 1 }}>{p.frequencyActual} <span style={{ fontSize: 14, color: C.green }}>/ {p.frequencyGoal}</span></div>
          <div style={{ fontSize: 9.5, color: C.green, fontFamily: SANS, marginTop: 4 }}>Goal exceeded</div>
        </Card>
      </div>

      <SectionLabel>Recommended for Chorus</SectionLabel>
      <div style={{ fontSize: 11, color: C.taupe, fontFamily: SANS, lineHeight: 1.6, marginBottom: 12 }}>
        <span style={{ fontFamily: SERIF, fontStyle: 'italic', fontSize: 13.5, color: C.taupeLight }}>Ranked by resident interest &amp; votes, fit to your {fmt(monthlyRemaining)} left this month, and matched to your vendor list.</span>
      </div>
      {recs.length === 0 ?
        <EmptyState compact icon="ti-bulb" title="No open ideas to plan from"
          body="As residents suggest experiences, budget-aware recommendations with matched vendors appear here." /> :
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {recs.map((r) => (
            <Card key={r.s.id}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10 }}>
                <div style={{ fontFamily: SERIF, fontSize: 17, color: C.charcoal, lineHeight: 1.25, flex: 1 }}>{r.s.text}</div>
                <StatusPill color={r.fits ? C.green : C.amber} soft={r.fits ? 'rgba(107,140,90,0.4)' : 'rgba(196,135,74,0.4)'}>{r.fits ? 'Fits budget' : 'Over budget'}</StatusPill>
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7, marginTop: 10 }}>
                <span style={{ fontSize: 9.5, letterSpacing: 0.5, color: 'var(--gold-muted)', fontFamily: SANS, display: 'inline-flex', alignItems: 'center', gap: 4 }}><i className="ti ti-flame" style={{ fontSize: 12 }} />{r.s.votes} votes</span>
                {r.interest && <span style={{ fontSize: 9.5, color: C.taupe, fontFamily: SANS, display: 'inline-flex', alignItems: 'center', gap: 4 }}><i className="ti ti-heart" style={{ fontSize: 12, color: 'var(--gold-muted)' }} />{r.interest.label} · {r.interest.pct}%</span>}
              </div>
              <div style={{ marginTop: 11, paddingTop: 11, borderTop: '0.5px solid rgba(184,151,42,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: 8.5, letterSpacing: 1.5, color: C.taupeLight, textTransform: 'uppercase', fontFamily: SANS, marginBottom: 4 }}>Vendor</div>
                  {r.vendor ?
                    <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                      <Avatar initials={r.vendor.initials} size={24} />
                      <span style={{ fontSize: 12, color: C.charcoal, fontFamily: SANS }}>{r.vendor.name}</span>
                    </div> :
                    <span style={{ fontSize: 11, color: C.taupeLight, fontFamily: SANS, fontStyle: 'italic' }}>No vendor matched yet</span>}
                </div>
                <div style={{ textAlign: 'right', flexShrink: 0 }}>
                  <div style={{ fontSize: 8.5, letterSpacing: 1.5, color: C.taupeLight, textTransform: 'uppercase', fontFamily: SANS, marginBottom: 4 }}>Est.</div>
                  <span style={{ fontSize: 13, color: r.fits ? 'var(--gold-muted)' : C.amber, fontFamily: SERIF, fontStyle: 'italic' }}>{r.est.label}</span>
                </div>
              </div>
              <div style={{ marginTop: 13 }}>
                <button onClick={() => draftFrom(r)} style={btnA(C.charcoal, C.cream)}>Draft this event</button>
              </div>
            </Card>))}
        </div>}
    </div>);
}

Object.assign(window, { EventsScreen });
