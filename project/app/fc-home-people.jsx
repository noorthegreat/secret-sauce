/* Fifth Circle — Home & People screens. */

// ── MATCH CHECKLIST ──
// Lands on Home right after onboarding. The resident chose what they're looking for;
// this is the short, goal-dependent set of steps that gives the concierge enough to
// make viable matches. Disappears once every step is done.
function MatchChecklist({ ctx }) {
  const ids = (window.selectedGoalIds ? window.selectedGoalIds() : FC.goalOptions.filter((g) => FC.me.goals.includes(g.label)).map((g) => g.id));
  const items = FC.goalOptions.filter((g) => ids.includes(g.id));
  if (!items.length) return null;
  const isDone = (id) => window.goalPrefDone ? window.goalPrefDone(id) : false;
  const done = items.filter((g) => isDone(g.id)).length;
  if (done === items.length) return null; // all complete → step aside
  const pct = Math.round((done / items.length) * 100);
  return (
    <div style={{ padding: '16px 22px 0' }}>
      <Card lift pad={0} style={{ overflow: 'hidden', border: '0.5px solid rgba(184,151,42,0.45)' }}>
        <div style={{ background: C.charcoal, padding: '16px 18px 15px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
            <i className="ti ti-checklist" style={{ fontSize: 15, color: 'var(--gold-light)' }} />
            <span style={{ fontSize: 9, letterSpacing: 2.5, textTransform: 'uppercase', color: 'var(--gold-light)', fontFamily: SANS }}>Before your first introductions</span>
          </div>
          <div style={{ fontFamily: SERIF, fontSize: 21, color: C.cream, lineHeight: 1.25 }}>Tell your concierge a little more</div>
          <div style={{ fontSize: 11.5, color: 'rgba(242,237,227,0.62)', fontFamily: SANS, fontWeight: 300, lineHeight: 1.55, marginTop: 7 }}>You told us what you're hoping to find. A few quick details on each lets us introduce you to neighbours who actually fit — so your first matches are worth your time.</div>
          {/* progress */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 14 }}>
            <div style={{ flex: 1, height: 3, background: 'rgba(242,237,227,0.14)', borderRadius: 2, overflow: 'hidden' }}>
              <div style={{ width: `${pct}%`, height: '100%', background: 'var(--gold)', transition: 'width .4s ease' }} />
            </div>
            <span style={{ fontSize: 9, letterSpacing: 1.5, textTransform: 'uppercase', color: 'var(--gold-light)', fontFamily: SANS, flexShrink: 0 }}>{done}/{items.length} done</span>
          </div>
        </div>
        {/* steps */}
        <div>
          {items.map((g, i) => {
            const d = isDone(g.id);
            return (
              <div key={g.id} onClick={() => ctx.open('goalpref', g.id)} style={{ display: 'flex', gap: 13, alignItems: 'center', padding: '13px 18px', cursor: 'pointer', borderTop: i ? '0.5px solid rgba(184,151,42,0.14)' : 'none', background: d ? 'rgba(107,140,90,0.05)' : C.white }}>
                {/* checkbox */}
                <div style={{ width: 24, height: 24, borderRadius: '50%', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', border: `1px solid ${d ? C.green : 'var(--gold)'}`, background: d ? C.green : 'transparent' }}>
                  {d && <i className="ti ti-check" style={{ fontSize: 14, color: C.white }} />}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontFamily: SERIF, fontSize: 16, color: C.charcoal, lineHeight: 1.15, textDecoration: d ? 'line-through' : 'none', textDecorationColor: 'rgba(60,49,33,0.3)' }}>{g.label}</div>
                  <div style={{ fontSize: 10.5, color: C.taupe, fontFamily: SANS, marginTop: 2, fontWeight: 300 }}>{g.desc}</div>
                </div>
                {!d && <span style={{ fontSize: 9, letterSpacing: 1.5, textTransform: 'uppercase', color: 'var(--gold-muted)', fontFamily: SANS, flexShrink: 0, whiteSpace: 'nowrap' }}>Start →</span>}
              </div>);
          })}
        </div>
      </Card>
    </div>);
}

// ── HOME ──
function HomeScreen({ ctx, tone }) {
  const me = FC.me;
  const con = FC.concierge;
  const refined = ctx.refined,newArrival = ctx.newArrival;
  const intros = newArrival ? { new: [], pending: [], accepted: [], past: [] } : FC.introductions;
  const [gi, setGi] = useState(0);
  useEffect(() => {
    if (!refined || newArrival || !con.greetings) return;
    const id = setInterval(() => setGi((g) => (g + 1) % con.greetings.length), 5000);
    return () => clearInterval(id);
  }, [refined, newArrival]);
  const noteText = newArrival ? con.dayOne :
  refined && con.greetings ? con.greetings[gi % con.greetings.length] :
  tone === 'warm' ?
  "Two neighbors caught my eye for you this week \u2014 both designers at heart. I think you'd genuinely enjoy them. The Sunday Coffee Circle has a seat open, too." :
  tone === 'reserved' ?
  "Two introductions are ready for your review this week. One open seat remains in the Sunday Coffee Circle." :
  con.note;
  return (
    <div style={{ paddingBottom: 28 }}>
      {/* greeting */}
      <div style={{ padding: '24px 22px 18px', background: C.parchment, borderBottom: '0.5px solid rgba(184,151,42,0.18)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div onClick={() => ctx.open('building')} style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 9, cursor: 'pointer' }}>
            <span style={{ fontSize: 9, letterSpacing: 3, color: C.taupe, textTransform: 'uppercase', fontFamily: SANS }} data-comment-anchor="98588cd725-img-29-13">Wednesday · Chorus</span>
            <i className="ti ti-chevron-right" style={{ fontSize: 13, color: C.taupeLight }} />
          </div>
          <i className="ti ti-settings" onClick={() => ctx.open('settings')} style={{ fontSize: 18, color: 'var(--gold-muted)', cursor: 'pointer', marginTop: -2 }} />
        </div>
        <Title size={32}>Good evening, <Em>{me.name.split(' ')[0]}.</Em></Title>
      </div>

      {/* match checklist — appears until the resident's goal details are complete */}
      <MatchChecklist ctx={ctx} />

      {/* concierge note */}
      <div style={{ padding: '18px 22px 4px' }}>
        <div style={{ marginBottom: 11, display: 'flex', alignItems: 'center', gap: 8 }}>
          <i className="ti ti-sparkles" style={{ fontSize: 13, color: 'var(--gold)' }} />
          <span style={{ fontSize: 9, letterSpacing: 3, color: 'var(--gold-muted)', textTransform: 'uppercase', fontFamily: SANS }}>From your concierge</span>
        </div>
        <div style={{ fontFamily: SERIF, fontStyle: 'italic', fontSize: 19, lineHeight: 1.55, color: C.charcoalSoft, minHeight: 56, transition: 'opacity .4s ease' }}>{noteText}</div>
        {refined && <div style={{ fontFamily: SERIF, fontStyle: 'italic', fontSize: 14, color: 'var(--gold-muted)', marginTop: 10 }}>— the {FC.building.split(' ')[0]} concierge</div>}
        <div onClick={() => ctx.go('concierge')} style={{ marginTop: 12, fontSize: 10, letterSpacing: 2, textTransform: 'uppercase', color: 'var(--gold-muted)', fontFamily: SANS, cursor: 'pointer', display: 'inline-block', borderBottom: '0.5px solid rgba(184,151,42,0.4)', paddingBottom: 2 }}>Open concierge →</div>
      </div>

      {/* next meetup nudge — keeps the meet loop visible: "what happens now" */}
      {!newArrival && (() => {
        const up = FC.introductions.accepted.find((it) => it.meet && it.meet.stage === 'upcoming');
        if (!up) return null;
        const r = FC.residents[up.id];
        return (
          <div style={{ padding: '14px 22px 0' }}>
            <Card onClick={() => ctx.go('people')} lift style={{ padding: 0, overflow: 'hidden' }}>
              <div style={{ background: 'rgba(107,140,90,0.09)', borderBottom: '0.5px solid rgba(107,140,90,0.25)', padding: '9px 15px', display: 'flex', alignItems: 'center', gap: 8 }}>
                <i className="ti ti-calendar-heart" style={{ fontSize: 14, color: C.green }} />
                <span style={{ fontSize: 8.5, letterSpacing: 2, textTransform: 'uppercase', color: '#4F6B43', fontFamily: SANS }}>Your next meetup</span>
              </div>
              <div style={{ display: 'flex', gap: 13, alignItems: 'center', padding: '13px 15px' }}>
                <Avatar id={r.id} size={42} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontFamily: SERIF, fontSize: 16.5, color: C.charcoal, lineHeight: 1.1 }}>{r.name.split(' ')[0]} · {up.meet.place}</div>
                  <div style={{ fontSize: 10.5, color: C.taupe, fontFamily: SANS, marginTop: 3 }}>{up.meet.when}</div>
                </div>
                <span style={{ fontSize: 15, color: C.taupeLight }}>›</span>
              </div>
            </Card>
          </div>);
      })()}

      {/* introductions — the hero journey */}
      <div style={{ padding: '26px 22px 4px' }}>
        <SectionLabel mb={6}>Curated introductions</SectionLabel>
        <div style={{ fontFamily: SERIF, fontStyle: 'italic', fontSize: 14.5, color: C.taupe, lineHeight: 1.5, marginBottom: 16 }}>The heart of Fifth Circle — a few neighbours, thoughtfully chosen for you.</div>
        {newArrival ?
        <PreparingState line="Your first introductions are being considered. They'll arrive quietly, within a few days — and never more than you asked for." /> :
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {intros.new.map((it) => {
            const r = FC.residents[it.id];
            return (
              <Card key={it.id} onClick={() => ctx.open('intro', it.id)} style={{ display: 'flex', gap: 14, alignItems: 'center' }}>
                <Avatar id={it.id} size={50} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontFamily: SERIF, fontSize: 18, color: C.charcoal, lineHeight: 1.1 }}>{r.name}</div>
                  <div style={{ fontSize: 11, color: C.taupe, fontFamily: SANS, marginTop: 2 }}>{r.occupation}</div>
                  <div style={{ display: 'flex', gap: 5, marginTop: 9, flexWrap: 'wrap' }}>
                    {r.shared.slice(0, 3).map((s) => <Tag key={s} shared>{s}</Tag>)}
                  </div>
                </div>
                {ctx.visual ?
                <div style={{ flexShrink: 0, paddingLeft: 4 }}>
                  <AffinityRings compat={r.compat} word={r.affinityWord} size={42} />
                </div> :
                refined ?
                <div style={{ textAlign: 'right', flexShrink: 0, maxWidth: 82 }}>
                  <div style={{ fontFamily: SERIF, fontStyle: 'italic', fontSize: 15, color: 'var(--gold-muted)', lineHeight: 1.25 }}>{r.affinityWord}</div>
                </div> :
                <div style={{ textAlign: 'center', flexShrink: 0 }}>
                  <div style={{ fontFamily: SERIF, fontSize: 22, color: 'var(--gold)', lineHeight: 1 }}>{r.compat}<span style={{ fontSize: 11 }}>%</span></div>
                  <div style={{ fontSize: 7.5, letterSpacing: 1.5, color: C.taupeLight, textTransform: 'uppercase', fontFamily: SANS, marginTop: 2 }}>Affinity</div>
                </div>}
              </Card>);

          })}
        </div>}
      </div>

      {/* supportive ways to connect */}
      <div style={{ padding: '30px 22px 0' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 11, marginBottom: 2 }}>
          <div style={{ height: '0.5px', flex: 1, background: 'rgba(184,151,42,0.25)' }} />
          <span style={{ fontSize: 8.5, letterSpacing: 2.5, textTransform: 'uppercase', color: C.taupeLight, fontFamily: SANS }}>More ways to connect</span>
          <div style={{ height: '0.5px', flex: 1, background: 'rgba(184,151,42,0.25)' }} />
        </div>
      </div>

      {/* suggested circle */}
      <div style={{ padding: '20px 22px 4px' }}>
        <SectionLabel>A circle that suits you</SectionLabel>
        <CircleMini circle={FC.circles[0]} onClick={() => ctx.open('circle', 'coffee')} />
      </div>

      {/* upcoming gatherings */}
      <div style={{ padding: '26px 22px 4px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
          <SectionLabel mb={14}>Upcoming gatherings</SectionLabel>
          <span onClick={() => ctx.go('events')} style={{ fontSize: 9, letterSpacing: 2, textTransform: 'uppercase', color: C.taupeLight, fontFamily: SANS, cursor: 'pointer' }}>All →</span>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {[FC.events.building[1], FC.events.resident[0]].map((ev) => <EventRow key={ev.id} ev={ev} onClick={() => ctx.open('event', ev.id)} />)}
        </div>
      </div>

      {refined && !newArrival && <LivingBuilding con={con} />}
    </div>);

}

// compact circle preview
function CircleMini({ circle, onClick }) {
  return (
    <Card onClick={onClick} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <div style={{ fontFamily: SERIF, fontSize: 19, color: C.charcoal }}>{circle.name}</div>
          <div style={{ fontSize: 10, letterSpacing: 1, color: C.taupe, fontFamily: SANS, marginTop: 3 }}>{circle.cadence}</div>
        </div>
        <div style={{ display: 'flex', marginLeft: 8 }}>
          {circle.members.slice(0, 3).map((m, i) =>
          <div key={m} style={{ marginLeft: i ? -10 : 0 }}><Avatar id={m} size={30} /></div>
          )}
        </div>
      </div>
      <div style={{ fontFamily: SERIF, fontStyle: 'italic', fontSize: 13.5, lineHeight: 1.6, color: C.taupe }}>{circle.why}</div>
    </Card>);

}

// event row used in lists
function EventRow({ ev, onClick }) {
  return (
    <Card onClick={onClick} pad={0} style={{ display: 'flex' }}>
      <div style={{ minWidth: 54, background: C.parchment, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '14px 8px', borderRight: '0.5px solid rgba(184,151,42,0.14)' }}>
        <span style={{ fontFamily: SERIF, fontSize: 24, fontWeight: 300, color: 'var(--gold)', lineHeight: 1 }}>{ev.day}</span>
        <span style={{ fontSize: 8, letterSpacing: 1.5, color: C.taupeLight, textTransform: 'uppercase', fontFamily: SANS, marginTop: 3 }}>{ev.month}</span>
      </div>
      <div style={{ flex: 1, padding: '13px 15px', minWidth: 0 }}>
        <div style={{ fontFamily: SERIF, fontSize: 16.5, color: C.charcoal, lineHeight: 1.1 }}>{ev.title}</div>
        <div style={{ fontSize: 10.5, color: C.taupe, fontFamily: SANS, marginTop: 4 }}>{ev.dow} · {ev.time} · {ev.loc}</div>
        <div style={{ fontSize: 9, color: C.taupeLight, fontFamily: SANS, marginTop: 6, letterSpacing: 0.5 }}>Hosted by {ev.host} · {ev.attending}/{ev.cap}</div>
      </div>
    </Card>);

}

// ── PEOPLE ──
function PeopleScreen({ ctx }) {
  const [tab, setTab] = useState('intros');
  const refined = ctx.refined,newArrival = ctx.newArrival;
  const intros = newArrival ? { new: [], pending: [], accepted: [], past: [] } : FC.introductions;
  return (
    <div style={{ paddingBottom: 28 }}>
      <ScreenHeader eyebrow="Your neighbors" title={<>People</>}>
        <div style={{ display: 'flex', marginTop: 14, marginLeft: -2 }}>
          {[['intros', 'Introductions'], ['directory', 'Connections']].map(([id, label]) =>
          <div key={id} onClick={() => setTab(id)} style={{
            paddingRight: 22, paddingBottom: 2, cursor: 'pointer',
            fontSize: 10, letterSpacing: 2, textTransform: 'uppercase', fontFamily: SANS,
            color: tab === id ? 'var(--gold-muted)' : C.taupeLight,
            borderBottom: tab === id ? '1px solid var(--gold)' : '1px solid transparent', paddingBottom: 6
          }}>{label}</div>
          )}
        </div>
      </ScreenHeader>

      {tab === 'intros' ?
      <div style={{ padding: '18px 22px 0' }}>
          {newArrival ?
        <PreparingState line="No introductions just yet. I'm considering who in the building you'd genuinely enjoy — you'll hear from me within a few days." /> :
        <>
          <IntroGroup label="New introductions" list={intros.new} ctx={ctx} action refined={refined} />
          <IntroGroup label="Pending" list={intros.pending} ctx={ctx} refined={refined} />
          </>}
        </div> :

      <div style={{ padding: '18px 22px 0' }}>
          <div style={{ fontSize: 11, color: C.taupe, fontFamily: SANS, lineHeight: 1.6, marginBottom: 14, letterSpacing: 0.2 }}>Neighbours you've actually connected with. <span style={{ fontFamily: SERIF, fontStyle: 'italic', fontSize: 13.5, color: C.taupeLight }}>Fifth Circle has no building-wide directory — you only see people the concierge has introduced and you've met.</span></div>
          {newArrival ?
        <PreparingState line="No connections yet — your first introductions are being considered. We'll never show you a building-wide list; only people you've actually met." /> :
        <ConnectionsList intros={intros} ctx={ctx} />}
        </div>
      }
    </div>);

}

// ── CONNECTIONS — meet-loop aware list ──
function ConnectionsList({ intros, ctx }) {
  const all = [...intros.accepted, ...intros.past].filter((it, i, arr) => arr.findIndex((x) => x.id === it.id) === i);
  const live = all.filter((it) => it.meet && (it.meet.stage === 'upcoming' || it.meet.stage === 'coordinating'));
  const met = all.filter((it) => it.meet && it.meet.stage === 'met');
  return (
    <div>
      {live.length > 0 &&
      <div style={{ marginBottom: 24 }}>
        <SectionLabel mb={12}>Upcoming meetups</SectionLabel>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 11 }}>
          {live.map((it) => <MeetupCard key={it.id} it={it} ctx={ctx} />)}
        </div>
      </div>}
      {met.length > 0 &&
      <div style={{ marginBottom: 24 }}>
        <SectionLabel mb={12}>You've met</SectionLabel>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 11 }}>
          {met.map((it) => <MeetupCard key={it.id} it={it} ctx={ctx} />)}
        </div>
      </div>}
    </div>);
}

function MeetupCard({ it, ctx }) {
  const r = FC.residents[it.id];
  const m = it.meet;
  const name = r.name.split(' ')[0];
  const stageMeta = {
    coordinating: { badge: 'Concierge coordinating', color: 'var(--gold-muted)', icon: 'ti-dots' },
    upcoming: { badge: 'Upcoming', color: C.green, icon: 'ti-calendar' },
    met: { badge: 'Met', color: C.taupe, icon: 'ti-check' },
  }[m.stage];
  return (
    <Card pad={0} lift={ctx.visual} style={{ overflow: 'hidden' }}>
      <div onClick={() => ctx.open('profile', r.id)} style={{ display: 'flex', gap: 13, alignItems: 'center', padding: 15, cursor: 'pointer' }}>
        <Avatar id={r.id} size={46} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontFamily: SERIF, fontSize: 17, color: C.charcoal }}>{r.name}</div>
          <div style={{ fontSize: 11, color: C.taupe, fontFamily: SANS, marginTop: 2 }}>{r.occupation} · {r.unit}</div>
        </div>
        <span style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 8.5, letterSpacing: 1.5, color: stageMeta.color, textTransform: 'uppercase', fontFamily: SANS, flexShrink: 0 }}>
          <i className={`ti ${stageMeta.icon}`} style={{ fontSize: 13 }} />{stageMeta.badge}
        </span>
      </div>
      {m.stage === 'coordinating' &&
      <div style={{ background: 'rgba(184,151,42,0.05)', borderTop: '0.5px solid rgba(184,151,42,0.14)', padding: '11px 15px', fontFamily: SERIF, fontStyle: 'italic', fontSize: 13.5, color: C.taupe, lineHeight: 1.5 }}>Your concierge is finding a time you both share. We'll confirm it here.</div>}
      {m.stage === 'upcoming' &&
      <div style={{ background: 'rgba(107,140,90,0.07)', borderTop: '0.5px solid rgba(107,140,90,0.25)', padding: '12px 15px', display: 'flex', alignItems: 'center', gap: 16 }}>
        <span style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 11.5, color: C.charcoalSoft, fontFamily: SANS }}><i className="ti ti-calendar" style={{ fontSize: 14, color: 'var(--gold-muted)' }} />{m.when}</span>
        <span style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 11.5, color: C.charcoalSoft, fontFamily: SANS }}><i className="ti ti-map-pin" style={{ fontSize: 14, color: 'var(--gold-muted)' }} />{m.place}</span>
      </div>}
      {m.stage === 'met' && !m.feedbackGiven &&
      <div onClick={() => ctx.open('meetfeedback', r.id)} style={{ borderTop: '0.5px solid rgba(184,151,42,0.14)', padding: '13px 15px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer' }}>
        <span style={{ fontFamily: SERIF, fontStyle: 'italic', fontSize: 14, color: C.charcoalSoft }}>How did it go with {name}?</span>
        <span style={{ fontSize: 9, letterSpacing: 2, textTransform: 'uppercase', color: 'var(--gold-muted)', fontFamily: SANS }}>Share →</span>
      </div>}
    </Card>);
}

function IntroGroup({ label, list, ctx, action, refined }) {
  if (!list.length) return null;
  return (
    <div style={{ marginBottom: 24 }}>
      <SectionLabel mb={12}>{label}</SectionLabel>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {list.map((it) => {
          const r = FC.residents[it.id];
          return (
            <Card key={it.id} onClick={() => ctx.open(action ? 'intro' : 'profile', it.id)} style={{ display: 'flex', gap: 13, alignItems: 'center' }}>
              <Avatar id={it.id} size={46} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontFamily: SERIF, fontSize: 17, color: C.charcoal }}>{r.name}</div>
                <div style={{ fontSize: 11, color: C.taupe, fontFamily: SANS, marginTop: 2 }}>{r.occupation}</div>
                {it.note && <div style={{ fontSize: 9.5, color: C.taupeLight, fontFamily: SANS, marginTop: 5, letterSpacing: 0.5 }}>{it.note}</div>}
              </div>
              {action ?
              ctx.visual ?
              <div style={{ flexShrink: 0, paddingLeft: 2 }}><AffinityRings compat={r.compat} word={r.affinityWord} size={38} /></div> :
              refined ?
              <div style={{ textAlign: 'right', flexShrink: 0, maxWidth: 80 }}><div style={{ fontFamily: SERIF, fontStyle: 'italic', fontSize: 14, color: 'var(--gold-muted)', lineHeight: 1.2 }}>{r.affinityWord}</div></div> :
              <div style={{ textAlign: 'center', flexShrink: 0 }}><div style={{ fontFamily: SERIF, fontSize: 20, color: 'var(--gold)', lineHeight: 1 }}>{r.compat}<span style={{ fontSize: 10 }}>%</span></div></div> :
              <span style={{ fontSize: 15, color: C.taupeLight }}>›</span>}
            </Card>);

        })}
      </div>
    </div>);

}

// ── INTRO REVIEW (detail) ──
function IntroReview({ id, ctx, tone }) {
  const r = FC.residents[id];
  const refined = ctx.refined;
  const [state, setState] = useState('open'); // open | accepted | declined
  const placeOpts = ['The Lobby Bar', 'The Sky Deck', 'The Terrace'];
  const timeOpts = ['Sat · 10:00 AM', 'Sun · 9:30 AM', 'Wed · 6:30 PM'];
  const [place, setPlace] = useState(placeOpts[0]);
  // Availability is asked fresh for every introduction (schedules change) — but we
  // prefill from the times shared last time so the resident only tweaks what's new.
  const savedAvail = (() => { try { return JSON.parse(localStorage.getItem('fc-avail') || '[]'); } catch (e) { return []; } })();
  const [avail, setAvail] = useState(savedAvail);
  const [prefilled] = useState(savedAvail.length > 0);
  const [scheduled, setScheduled] = useState(false);
  const [confirmed, setConfirmed] = useState(false);
  const [shareNum, setShareNum] = useState(false);
  const whyText = tone === 'reserved' ? r.why.split('.')[0] + '.' : r.why;
  return (
    <div style={{ paddingBottom: 30 }}>
      <ScreenHeader back="People" onBack={ctx.back} eyebrow="A possible introduction" title={<>{r.name.split(' ')[0]} <Em>& you</Em></>} />
      <div style={{ padding: '22px 22px 0', display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
        <Avatar id={id} size={92} drop={ctx.visual} />
        <div style={{ fontFamily: SERIF, fontSize: 26, color: C.charcoal, marginTop: 16 }}>{r.name}</div>
        <div style={{ fontSize: 11.5, color: C.taupe, fontFamily: SANS, marginTop: 4, letterSpacing: 0.5 }}>{r.occupation} · Unit {r.unit}</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 16 }}>
          {ctx.visual ?
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 9, letterSpacing: 2, color: C.taupeLight, textTransform: 'uppercase', fontFamily: SANS, marginBottom: 8 }}>The concierge's read</div>
            <AffinityRings compat={r.compat} word={r.affinityWord} size={58} />
          </div> :
          refined ?
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 9, letterSpacing: 2, color: C.taupeLight, textTransform: 'uppercase', fontFamily: SANS, marginBottom: 5 }}>The concierge's read</div>
            <div style={{ fontFamily: SERIF, fontStyle: 'italic', fontSize: 23, color: 'var(--gold-muted)', lineHeight: 1 }}>{r.affinityWord}</div>
          </div> :
          <>
          <div style={{ fontFamily: SERIF, fontSize: 30, color: 'var(--gold)', lineHeight: 1 }}>{r.compat}<span style={{ fontSize: 15 }}>%</span></div>
          <div style={{ textAlign: 'left' }}><div style={{ fontSize: 9, letterSpacing: 2, color: C.taupeLight, textTransform: 'uppercase', fontFamily: SANS }}>Affinity</div></div>
          </>}
        </div>
      </div>

      <div style={{ padding: '24px 22px 0' }}>
        <ConciergeWhisper pad="16px 16px">Why we thought to introduce you: {whyText}</ConciergeWhisper>
      </div>

      <div style={{ padding: '22px 22px 0' }}>
        <SectionLabel mb={10}>What you share</SectionLabel>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 18 }}>
          {r.shared.map((s) => <Tag key={s} shared>{s}</Tag>)}
        </div>
        <SectionLabel mb={10}>Both here for</SectionLabel>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 18 }}>
          {r.sharedGoals.map((s) => <Tag key={s}>{s}</Tag>)}
        </div>
        <SectionLabel mb={8}>About {r.name.split(' ')[0]}</SectionLabel>
        <div style={{ fontFamily: SERIF, fontStyle: 'italic', fontSize: 15, lineHeight: 1.8, color: C.taupe }}>"{r.bio}"</div>
      </div>

      {r.activities && r.activities.length > 0 &&
      <div style={{ padding: '24px 22px 0' }}>
          <SectionLabel mb={10}>Where they're active</SectionLabel>
          {state === 'accepted' ?
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {r.activities.map((a) =>
          <div key={a.name} style={{ background: C.white, border: '0.5px solid rgba(184,151,42,0.16)', padding: '13px 15px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 8 }}>
                    <span style={{ fontFamily: SERIF, fontSize: 17, color: C.charcoal }}>{a.name}</span>
                    <span style={{ fontSize: 8.5, letterSpacing: 1.5, textTransform: 'uppercase', color: 'var(--gold-muted)', fontFamily: SANS }}>{a.skill}</span>
                  </div>
                  <div style={{ display: 'flex', gap: 16 }} data-comment-anchor="46aa88b77f-div-284-19">
                    <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: C.taupe, fontFamily: SANS }}><i className="ti ti-map-pin" style={{ fontSize: 13, color: 'var(--gold-muted)' }} />{a.where}</span>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: C.taupe, fontFamily: SANS }}><i className="ti ti-clock" style={{ fontSize: 13, color: 'var(--gold-muted)' }} />{a.when}</span>
                  </div>
                </div>
          )}
            </div> :

        <div style={{ background: 'rgba(184,151,42,0.05)', border: '0.5px dashed rgba(184,151,42,0.35)', padding: '16px', display: 'flex', gap: 12, alignItems: 'center' }}>
              <i className="ti ti-lock" style={{ fontSize: 18, color: 'var(--gold-muted)', flexShrink: 0 }} />
              <div style={{ fontSize: 11.5, color: C.taupe, fontFamily: SANS, lineHeight: 1.6 }}>{r.name.split(' ')[0]} is up for {r.activities.map((a) => a.name).join(' & ').toLowerCase()} together. <span style={{ fontFamily: SERIF, fontStyle: 'italic', fontSize: 13.5, color: C.taupeLight }}>Their spots and times unlock once you both connect — for privacy.</span></div>
            </div>
        }
        </div>
      }

      <div style={{ padding: '26px 22px 0' }}>
        {state === 'open' &&
        <>
            <BtnDark onClick={() => setState('accepted')}>Accept introduction</BtnDark>
            <div style={{ display: 'flex', gap: 10, marginTop: 10 }}>
              <button onClick={() => setState('declined')} style={{ flex: 1, background: 'transparent', border: '0.5px solid rgba(184,151,42,0.3)', color: C.taupe, fontFamily: SANS, fontSize: 9, letterSpacing: 2, textTransform: 'uppercase', padding: '13px', cursor: 'pointer' }}>Not now</button>
              <button onClick={ctx.back} style={{ flex: 1, background: 'transparent', border: '0.5px solid rgba(184,151,42,0.3)', color: C.taupe, fontFamily: SANS, fontSize: 9, letterSpacing: 2, textTransform: 'uppercase', padding: '13px', cursor: 'pointer' }}>Suggest another</button>
            </div>
          </>
        }
        {state === 'accepted' &&
        <div>
            <div style={{ background: C.white, border: `0.5px solid ${STONE}`, borderRadius: ctx.visual ? RAD : 0, boxShadow: ctx.visual ? SHADOW : 'none', padding: '16px 16px 18px', marginBottom: 14 }}>
              <div style={{ fontSize: 8.5, letterSpacing: 2, color: C.taupeLight, textTransform: 'uppercase', fontFamily: SANS, marginBottom: 14, textAlign: 'center' }}>Your introduction, step by step</div>
              <MeetProgress stage={confirmed ? 'upcoming' : scheduled ? 'coordinating' : 'coordinating'} />
            </div>
            {refined && !scheduled &&
          <div style={{ marginBottom: 14 }}>
              <ConciergeWhisper pad="16px 16px">{r.name.split(' ')[0]}, meet {r.name} — you'll have {r.shared.slice(0, 2).join(' and ').toLowerCase()} to talk about. I'll find you a time whenever you're ready.</ConciergeWhisper>
            </div>}
            {!scheduled &&
            <div style={{ background: 'rgba(107,140,90,0.08)', border: '0.5px solid rgba(107,140,90,0.4)', padding: '16px', textAlign: 'center', marginBottom: 18 }}>
              <i className="ti ti-check" style={{ fontSize: 20, color: C.green }} />
              <div style={{ fontFamily: SERIF, fontStyle: 'italic', fontSize: 16, color: C.charcoalSoft, marginTop: 8, lineHeight: 1.5 }}>{r.name.split(' ')[0]} said yes too. Let's set your first meeting.</div>
            </div>}

            {confirmed ?
          <ConfirmedMeetCard r={r} place={place} avail={avail} visual={ctx.visual} shareNum={shareNum} setShareNum={setShareNum} /> :
          scheduled ?
          <div style={{ background: C.white, border: '0.5px solid rgba(184,151,42,0.25)', padding: '16px' }}>
                <div style={{ display: 'flex', gap: 13, alignItems: 'center' }}>
                  <div style={{ width: 44, height: 44, borderRadius: '50%', background: 'rgba(184,151,42,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <i className="ti ti-calendar-check" style={{ fontSize: 20, color: 'var(--gold-muted)' }} />
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontFamily: SERIF, fontSize: 17, color: C.charcoal }}>Your availability is in</div>
                    <div style={{ fontSize: 11, color: C.taupe, fontFamily: SANS, marginTop: 2 }}>{place} · with {r.name.split(' ')[0]}</div>
                  </div>
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 12 }}>
                  {avail.map((t) => <Tag key={t} shared>{t}</Tag>)}
                </div>
                <div style={{ fontSize: 10, letterSpacing: 1.5, textTransform: 'uppercase', color: C.green, fontFamily: SANS, marginTop: 13, textAlign: 'center' }}>Shared with {r.name.split(' ')[0]} & your concierge ✓</div>
                <div style={{ fontFamily: SERIF, fontStyle: 'italic', fontSize: 13.5, color: C.taupeLight, textAlign: 'center', marginTop: 4, lineHeight: 1.5 }}>Your concierge is finding the time you both share, then will confirm it here.</div>
                <div style={{ marginTop: 14, borderTop: '0.5px solid rgba(184,151,42,0.14)', paddingTop: 14 }}>
                  <BtnDark onClick={() => setConfirmed(true)}>See the confirmed time</BtnDark>
                </div>
              </div> :

          <div style={{ background: C.white, border: '0.5px solid rgba(184,151,42,0.25)', padding: '16px' }}>
                <div style={{ fontSize: 8.5, letterSpacing: 2, color: C.taupeLight, textTransform: 'uppercase', fontFamily: SANS, marginBottom: 9 }}>Where · your concierge picked the spot</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, border: '0.5px solid rgba(184,151,42,0.25)', background: 'rgba(184,151,42,0.06)', padding: '12px 14px', marginBottom: 18 }} data-comment-anchor="263f791cdb-div-347-17">
                  <i className="ti ti-map-pin" style={{ fontSize: 17, color: 'var(--gold-muted)' }} />
                  <span style={{ fontFamily: SERIF, fontSize: 17, color: C.charcoal }}>{place}</span>
                </div>
                <div style={{ fontSize: 8.5, letterSpacing: 2, color: C.taupeLight, textTransform: 'uppercase', fontFamily: SANS, marginBottom: 11 }}>{prefilled ? 'When you\u2019re free \u00b7 schedule changed? update it' : 'When you\u2019re free \u00b7 tap the times that work'}</div>
                {prefilled &&
                <div style={{ display: 'flex', gap: 9, alignItems: 'flex-start', background: 'rgba(184,151,42,0.07)', border: '0.5px solid rgba(184,151,42,0.28)', padding: '11px 13px', marginBottom: 13 }}>
                  <i className="ti ti-history" style={{ fontSize: 15, color: 'var(--gold-muted)', flexShrink: 0, marginTop: 1 }} />
                  <div style={{ fontSize: 10.5, color: C.charcoalSoft, fontFamily: SANS, lineHeight: 1.5, fontWeight: 300 }}>These are the times you shared for your last introduction. Adjust any that have changed for {r.name.split(' ')[0]}.</div>
                </div>}
                <div data-comment-anchor="ad78826fe7-div-312-17">
                  <AvailabilityCalendar value={avail} onChange={setAvail} />
                </div>
                <div style={{ fontSize: 10, color: C.taupe, fontFamily: SANS, textAlign: 'center', margin: '14px 0 16px', minHeight: 13 }}>{avail.length ? `${avail.length} time${avail.length > 1 ? 's' : ''} selected — the more you offer, the easier to match` : 'Tap any days and times you’re free'}</div>
                <BtnDark disabled={!avail.length} onClick={() => { try { localStorage.setItem('fc-avail', JSON.stringify(avail)); } catch (e) {} setScheduled(true); }}>Send my availability</BtnDark>
              </div>
          }
          </div>
        }
        {state === 'declined' &&
        <div style={{ padding: '16px', textAlign: 'center', fontFamily: SERIF, fontStyle: 'italic', fontSize: 15, color: C.taupe }}>No introduction made. We'll keep this in mind for next time.</div>
        }
      </div>
    </div>);

}

// ── CONFIRMED MEETUP — the locked first meeting (close of the meet loop) ──
function ConfirmedMeetCard({ r, place, avail, visual, shareNum, setShareNum }) {
  const first = (avail && avail.length) ? avail[0] : 'Sat · Jun 21';
  const when = `${first} · 10:00 AM`;
  const name = r.name.split(' ')[0];
  return (
    <div style={{ background: C.white, border: `0.5px solid ${STONE}`, borderRadius: visual ? RAD : 0, boxShadow: visual ? SHADOW_LIFT : 'none', overflow: 'hidden' }}>
      <div style={{ background: 'rgba(107,140,90,0.1)', borderBottom: '0.5px solid rgba(107,140,90,0.3)', padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 9 }}>
        <i className="ti ti-calendar-heart" style={{ fontSize: 17, color: C.green }} />
        <span style={{ fontSize: 9.5, letterSpacing: 2, textTransform: 'uppercase', color: '#4F6B43', fontFamily: SANS }}>Meetup confirmed</span>
      </div>
      <div style={{ padding: '18px 16px 16px' }}>
        <div style={{ display: 'flex', gap: 13, alignItems: 'center', marginBottom: 16 }}>
          <Avatar id={r.id} size={48} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontFamily: SERIF, fontSize: 19, color: C.charcoal, lineHeight: 1.1 }}>Coffee with {name}</div>
            <div style={{ fontSize: 11, color: C.taupe, fontFamily: SANS, marginTop: 3 }}>Your first introduction, in person</div>
          </div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 1, marginBottom: 16 }}>
          {[['ti-calendar', when], ['ti-map-pin', place]].map(([ic, txt]) => (
            <div key={ic} style={{ display: 'flex', alignItems: 'center', gap: 11, padding: '11px 0', borderBottom: ic === 'ti-calendar' ? '0.5px solid rgba(184,151,42,0.12)' : 'none' }}>
              <i className={`ti ${ic}`} style={{ fontSize: 16, color: 'var(--gold-muted)', flexShrink: 0 }} />
              <span style={{ fontFamily: SERIF, fontSize: 16, color: C.charcoal }}>{txt}</span>
            </div>
          ))}
        </div>
        <div style={{ display: 'flex', gap: 9, marginBottom: 14 }}>
          <button style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7, background: C.charcoal, color: C.cream, border: 'none', fontFamily: SANS, fontSize: 9, letterSpacing: 2, textTransform: 'uppercase', padding: '13px', cursor: 'pointer' }}><i className="ti ti-calendar-plus" style={{ fontSize: 14 }} />Add to calendar</button>
          <button style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7, background: 'transparent', color: C.taupe, border: '0.5px solid rgba(184,151,42,0.3)', fontFamily: SANS, fontSize: 9, letterSpacing: 2, textTransform: 'uppercase', padding: '13px', cursor: 'pointer' }}><i className="ti ti-message" style={{ fontSize: 14, color: 'var(--gold-muted)' }} />Via concierge</button>
        </div>
        <div style={{ borderTop: '0.5px solid rgba(184,151,42,0.12)', paddingTop: 13 }}>
          {shareNum ?
          <div style={{ display: 'flex', gap: 10, alignItems: 'center', justifyContent: 'center' }}>
            <i className="ti ti-phone" style={{ fontSize: 14, color: 'var(--gold-muted)' }} />
            <span style={{ fontFamily: SERIF, fontStyle: 'italic', fontSize: 14, color: C.charcoalSoft }}>Numbers exchanged — {name} can reach you now.</span>
          </div> :
          <BtnGhost onClick={() => setShareNum(true)}>Share my number with {name} (optional)</BtnGhost>}
        </div>
        <div style={{ fontFamily: SERIF, fontStyle: 'italic', fontSize: 13, color: C.taupeLight, textAlign: 'center', marginTop: 13, lineHeight: 1.5 }}>You'll find this under People → Connections, with a gentle reminder the day before.</div>
      </div>
    </div>);
}

// ── LIVING BUILDING — community in motion (no feed) ──
function LivingBuilding({ con }) {
  const dot = (s) =>
  <svg viewBox="0 0 24 24" width={s} height={s} style={{ flexShrink: 0 }}>
    <circle cx="12" cy="12" r="10" fill="none" stroke="var(--gold)" strokeWidth="1.5" />
    <circle cx="12" cy="12" r="5" fill="none" stroke="var(--gold)" strokeWidth="1.5" />
    <circle cx="12" cy="12" r="1.6" fill="var(--gold)" />
  </svg>;
  return (
    <div style={{ padding: '32px 22px 4px' }}>
      <SectionLabel>The building this week</SectionLabel>

      {/* seasonal moment — drop a real photo */}
      <div style={{ position: 'relative', marginBottom: 14, background: C.charcoalSoft, overflow: 'hidden' }}>
        <image-slot id="fc-home-moment" shape="rect" src={window.RES('img/amenity-skydeck.png')} placeholder="Drop a rooftop or amenity photo" style={{ display: 'block', width: '100%', height: '186px' }}></image-slot>
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(28,25,21,0.82) 0%, rgba(28,25,21,0.15) 52%, rgba(28,25,21,0.05) 100%)', pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', left: 16, right: 16, bottom: 14, pointerEvents: 'none' }}>
          <div style={{ fontSize: 9, letterSpacing: 3, textTransform: 'uppercase', color: 'var(--gold-light)', fontFamily: SANS, marginBottom: 6 }}>{con.season.tag}</div>
          <div style={{ fontFamily: SERIF, fontStyle: 'italic', fontSize: 17, color: C.cream, lineHeight: 1.4 }}>{con.season.line}</div>
        </div>
      </div>

      {/* community in motion */}
      <div style={{ background: C.white, border: '0.5px solid rgba(184,151,42,0.16)', padding: '4px 16px', marginBottom: 14 }}>
        {con.pulse.map((p, i) =>
        <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 0', borderBottom: i < con.pulse.length - 1 ? '0.5px solid rgba(184,151,42,0.1)' : 'none' }}>
            <span style={{ fontSize: 12.5, color: C.charcoal, fontFamily: SANS, fontWeight: 300 }}>{p.label}</span>
            <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 10.5, letterSpacing: 0.5, color: p.dir === 'up' ? C.green : C.taupe, fontFamily: SANS }}>
              {p.dir === 'up' && <i className="ti ti-trending-up" style={{ fontSize: 14 }} />}{p.trend}
            </span>
          </div>
        )}
      </div>

      {/* quiet milestones */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
        {con.milestones.map((m, i) =>
        <div key={i} style={{ display: 'flex', gap: 11, alignItems: 'center' }}>
            {dot(13)}
            <span style={{ fontSize: 11.5, color: C.taupe, fontFamily: SANS, letterSpacing: 0.2 }}>{m}</span>
          </div>
        )}
      </div>
    </div>);

}

Object.assign(window, { HomeScreen, PeopleScreen, IntroReview, EventRow, CircleMini, LivingBuilding, BuildingProfile });

// ── CHORUS BUILDING PROFILE — building identity & amenities ──
function BuildingProfile({ ctx }) {
  const b = FC.buildingProfile;
  return (
    <div style={{ paddingBottom: 30 }}>
      {/* hero with Chorus identity */}
      <div style={{ position: 'relative', height: 248, background: C.charcoalSoft }}>
        <img src={window.RES(`img/${b.hero}.png`)} alt="" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }} />
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(18,13,8,0.92) 0%, rgba(18,13,8,0.35) 55%, rgba(18,13,8,0.5) 100%)' }} />
        <div onClick={ctx.back} style={{ position: 'absolute', top: 16, left: 16, width: 34, height: 34, borderRadius: '50%', background: 'rgba(18,13,8,0.5)', backdropFilter: 'blur(6px)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
          <i className="ti ti-arrow-left" style={{ fontSize: 17, color: C.cream }} />
        </div>
        <div style={{ position: 'absolute', left: 22, right: 22, bottom: 20 }}>
          <div style={{ fontSize: 9, letterSpacing: 3, textTransform: 'uppercase', color: 'var(--gold-light)', fontFamily: SANS, marginBottom: 12 }}>{b.kind}</div>
          <img src={window.RES(b.logo)} alt={b.name} style={{ height: 30, filter: 'invert(1)', marginBottom: 12 }} />
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 11.5, color: 'rgba(242,237,227,0.75)', fontFamily: SANS, letterSpacing: 0.5 }}>
            <i className="ti ti-map-pin" style={{ fontSize: 14, color: 'var(--gold-light)' }} />{b.location}
          </div>
        </div>
      </div>

      {/* stats */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', borderBottom: '0.5px solid rgba(184,151,42,0.16)' }}>
        {b.stats.map((s, i) =>
        <div key={s.label} style={{ padding: '18px 12px', textAlign: 'center', borderLeft: i ? '0.5px solid rgba(184,151,42,0.12)' : 'none' }}>
            <div style={{ fontFamily: SERIF, fontSize: 24, color: 'var(--gold)', lineHeight: 1 }}>{s.value}</div>
            <div style={{ fontSize: 8.5, letterSpacing: 1.5, textTransform: 'uppercase', color: C.taupeLight, fontFamily: SANS, marginTop: 6 }}>{s.label}</div>
          </div>
        )}
      </div>

      {/* blurb + co-brand */}
      <div style={{ padding: '22px 22px 6px' }}>
        <div style={{ fontFamily: SERIF, fontStyle: 'italic', fontSize: 17, lineHeight: 1.65, color: C.charcoalSoft }}>{b.blurb}</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 9, marginTop: 16 }}>
          <Logo size={20} />
          <span style={{ fontSize: 9, letterSpacing: 2, textTransform: 'uppercase', color: C.taupe, fontFamily: SANS }}>Fifth Circle · at Chorus</span>
        </div>
      </div>

      {/* amenities */}
      <div style={{ padding: '26px 22px 0' }}>
        <SectionLabel>Amenities &amp; gathering spaces</SectionLabel>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {b.amenities.map((a) =>
          <Card key={a.name} pad={0} lift style={{ overflow: 'hidden' }}>
              <div style={{ position: 'relative', height: 132, background: C.charcoalSoft }}>
                <img src={window.RES(`img/${a.photo}.png`)} alt={a.name} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }} />
                <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(18,13,8,0.9) 0%, rgba(18,13,8,0.12) 60%, rgba(18,13,8,0) 100%)' }} />
                <div style={{ position: 'absolute', left: 16, right: 16, bottom: 13 }}>
                  <div style={{ fontFamily: SERIF, fontSize: 21, color: C.cream, lineHeight: 1.05 }}>{a.name}</div>
                  <div style={{ fontSize: 10.5, color: 'rgba(242,237,227,0.78)', fontFamily: SANS, marginTop: 4, letterSpacing: 0.3 }}>{a.sub}</div>
                </div>
              </div>
            </Card>
          )}
        </div>
      </div>
    </div>);
}