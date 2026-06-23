/* Fifth Circle — Concierge screen, Suggest Event, Feedback, Onboarding flow. */

// ── CONCIERGE ──
function ConciergeScreen({ ctx, tone }) {
  const con = FC.concierge;
  const refined = ctx.refined, newArrival = ctx.newArrival;
  const open = tone === 'warm'
    ? "Good evening, Noor. I've been quietly getting to know the building, and a few introductions feel right this week. No rush \u2014 only when you're ready."
    : tone === 'reserved'
      ? "Good evening. A few curated suggestions are ready for your review."
      : "Good evening, Noor. I've been thinking about who you might enjoy meeting. A few quiet suggestions, whenever you'd like them.";
  return (
    <div style={{ paddingBottom: 30 }}>
      {/* dark hero */}
      <div style={{ background: C.charcoal, padding: '26px 22px 26px', position: 'relative', overflow: 'hidden' }}>
        <svg viewBox="0 0 200 200" style={{ position: 'absolute', right: -60, top: '50%', transform: 'translateY(-50%)', width: 220, opacity: 0.06 }}>
          <circle cx="100" cy="100" r="92" fill="none" stroke="#B8972A" strokeWidth="1.5" />
          <circle cx="100" cy="100" r="66" fill="none" stroke="#B8972A" strokeWidth="1.5" />
          <circle cx="100" cy="100" r="40" fill="none" stroke="#B8972A" strokeWidth="1.5" />
          <circle cx="100" cy="100" r="14" fill="#B8972A" />
        </svg>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16, position: 'relative' }}>
          <i className="ti ti-sparkles" style={{ fontSize: 14, color: 'var(--gold)' }} />
          <span style={{ fontSize: 9, letterSpacing: 4, color: 'var(--gold-light)', textTransform: 'uppercase', fontFamily: SANS }}>Your concierge</span>
        </div>
        <div style={{ fontFamily: SERIF, fontStyle: 'italic', fontSize: 21, lineHeight: 1.55, color: C.cream, position: 'relative' }}>{open}</div>
        {refined && <div style={{ fontFamily: SERIF, fontStyle: 'italic', fontSize: 15, color: 'var(--gold-light)', marginTop: 14, position: 'relative' }}>— the {FC.building.split(' ')[0]} concierge</div>}
      </div>

      {/* how introductions work — thoughtfully curated, technology-enabled, privacy-first */}
      <div style={{ padding: '22px 22px 0' }}>
        <SectionLabel>How introductions work</SectionLabel>
        <div style={{ background: C.white, border: '0.5px solid rgba(184,151,42,0.16)', padding: '4px 16px' }}>
          {FC.howItWorks.map((h, i) => (
            <div key={i} style={{ display: 'flex', gap: 13, alignItems: 'flex-start', padding: '15px 0', borderBottom: i < FC.howItWorks.length - 1 ? '0.5px solid rgba(184,151,42,0.1)' : 'none' }}>
              <div style={{ width: 34, height: 34, borderRadius: '50%', border: '0.5px solid rgba(184,151,42,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 1 }}>
                <i className={`ti ${h.icon}`} style={{ fontSize: 16, color: 'var(--gold-muted)' }} />
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontFamily: SERIF, fontSize: 16, color: C.charcoal, lineHeight: 1.2 }}>{h.title}</div>
                <div style={{ fontSize: 11, color: C.taupe, fontFamily: SANS, lineHeight: 1.6, marginTop: 4, fontWeight: 300 }}>{h.line}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* suggestions */}
      <div style={{ padding: '24px 22px 0' }}>
        <SectionLabel>This week</SectionLabel>
        {newArrival ?
        <PreparingState label="From your concierge" line="Nothing pressing this week — and that's by design. I only reach out when someone genuinely fits. Settle in; I'm paying attention." /> :
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {con.suggestions.map((s, i) => <SuggestionCard key={i} s={s} ctx={ctx} />)}
        </div>}
      </div>

      {/* conversation starters */}
      <div style={{ padding: '26px 22px 0' }}>
        <SectionLabel>If you'd like an opening</SectionLabel>
        <div style={{ background: C.white, border: '0.5px solid rgba(184,151,42,0.16)', padding: '6px 16px' }}>
          {con.starters.map((s, i) => (
            <div key={i} style={{ display: 'flex', gap: 11, padding: '14px 0', borderBottom: i < con.starters.length - 1 ? '0.5px solid rgba(184,151,42,0.1)' : 'none' }}>
              <i className="ti ti-message-circle" style={{ fontSize: 14, color: 'var(--gold-muted)', marginTop: 3, flexShrink: 0 }} />
              <div style={{ fontFamily: SERIF, fontStyle: 'italic', fontSize: 14.5, lineHeight: 1.6, color: C.taupe }}>{s}</div>
            </div>
          ))}
        </div>
      </div>

      {/* sharpen your matches — per-goal detail, relocated from onboarding to first point-of-need */}
      <GoalRefineSection ctx={ctx} />

      {/* deepen — optional, moved out of onboarding to reduce first-run friction */}
      <div style={{ padding: '26px 22px 0' }}>
        <DeepenCard />
      </div>

      {/* ask field */}
      <div style={{ padding: '26px 22px 0' }}>
        <SectionLabel>Ask quietly</SectionLabel>
        <div style={{ background: C.white, border: '0.5px solid rgba(184,151,42,0.22)', padding: 16 }}>
          <textarea placeholder="Who in the building loves film? Find me a tennis partner for weekends…" style={{ width: '100%', background: 'transparent', border: 'none', fontFamily: SERIF, fontStyle: 'italic', fontSize: 16, color: C.charcoal, resize: 'none', height: 56, lineHeight: 1.6 }} />
          <div style={{ display: 'flex', justifyContent: 'flex-end', borderTop: '0.5px solid rgba(184,151,42,0.12)', paddingTop: 12 }}>
            <BtnGhost active>Ask concierge</BtnGhost>
          </div>
        </div>
        <div style={{ fontSize: 10, color: C.taupeLight, fontFamily: SANS, fontStyle: 'italic', marginTop: 10, lineHeight: 1.6 }}>Your concierge learns quietly from what you accept and decline. It never shares your requests with other residents.</div>
      </div>
    </div>
  );
}

// ── SHARPEN YOUR MATCHES ──
// Per-goal detail screens (Activity, Professional, …) were cut from onboarding to
// speed time-to-first-intro. They live here now: the resident completes each goal's
// signal in-app, after they're already in. Completion persists in localStorage.
const GOAL_PREF = {
  friendship: { comp: 'ObFriendship', icon: 'ti-heart', label: 'Friendships', desc: 'The people you click with' },
  activity: { comp: 'ObActivity', icon: 'ti-run', label: 'Activity Partners', desc: 'Your activities, pace & where you go' },
  professional: { comp: 'ObProfessional', icon: 'ti-briefcase', label: 'Professional', desc: 'Your chapter & what makes an intro worth it' },
  group: { comp: 'ObGroup', icon: 'ti-users', label: 'Group Hangouts', desc: 'The gatherings you’d show up to' },
};
function goalPrefDone(id) { try { return localStorage.getItem('fc-goalpref-' + id) === '1'; } catch (e) { return false; } }

// The goals the resident chose at signup (persisted from onboarding); falls back
// to their profile goals for the seeded demo resident.
function selectedGoalIds() {
  try {
    const saved = JSON.parse(localStorage.getItem('fc-goals') || 'null');
    if (Array.isArray(saved) && saved.length) return saved;
  } catch (e) {}
  return FC.goalOptions.filter((g) => FC.me.goals.includes(g.label)).map((g) => g.id);
}

function GoalRefineSection({ ctx }) {
  const ids = selectedGoalIds();
  const mine = FC.goalOptions.filter((g) => ids.includes(g.id) && GOAL_PREF[g.id]);
  if (!mine.length) return null;
  const done = mine.filter((g) => goalPrefDone(g.id)).length;
  const remaining = mine.length - done;
  const allDone = remaining === 0;
  return (
    <div style={{ padding: '26px 22px 0' }}>
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 10 }}>
        <SectionLabel mb={0}>Sharpen your matches</SectionLabel>
        <span style={{ fontSize: 9, letterSpacing: 1.5, textTransform: 'uppercase', fontFamily: SANS, color: allDone ? C.green : 'var(--gold-muted)' }}>{done}/{mine.length} complete</span>
      </div>

      {/* why-it-matters callout — makes the ask unmissable */}
      {allDone ?
      <div style={{ display: 'flex', gap: 11, alignItems: 'center', background: 'rgba(107,140,90,0.08)', border: '0.5px solid rgba(107,140,90,0.4)', padding: '13px 15px', marginBottom: 14 }}>
        <i className="ti ti-circle-check" style={{ fontSize: 19, color: C.green, flexShrink: 0 }} />
        <div style={{ fontSize: 11.5, color: C.charcoalSoft, fontFamily: SANS, lineHeight: 1.55, fontWeight: 300 }}>All set — your concierge has what it needs to introduce you well.</div>
      </div> :
      <div style={{ display: 'flex', gap: 11, alignItems: 'flex-start', background: 'rgba(184,151,42,0.09)', border: '0.5px solid rgba(184,151,42,0.4)', padding: '13px 15px', marginBottom: 14 }}>
        <i className="ti ti-sparkles" style={{ fontSize: 18, color: 'var(--gold-muted)', flexShrink: 0, marginTop: 1 }} />
        <div style={{ fontSize: 11.5, color: C.charcoalSoft, fontFamily: SANS, lineHeight: 1.55, fontWeight: 300 }}>
          <strong style={{ fontWeight: 500, color: C.charcoal }}>Your matches depend on this.</strong> You told us what you're looking for — now add a little detail to each, so your concierge can introduce you to the right neighbours. <span style={{ color: 'var(--gold-muted)' }}>{remaining} to complete.</span>
        </div>
      </div>}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {mine.map((g) => {
          const isDone = goalPrefDone(g.id);
          return (
            <Card key={g.id} onClick={() => ctx.open('goalpref', g.id)} lift={!isDone} style={{ display: 'flex', gap: 14, alignItems: 'center', borderColor: isDone ? undefined : 'rgba(184,151,42,0.4)' }}>
              <div style={{ width: 44, height: 44, borderRadius: '50%', border: `0.5px solid ${isDone ? 'rgba(184,151,42,0.3)' : 'var(--gold)'}`, background: isDone ? 'transparent' : 'rgba(184,151,42,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <i className={`ti ${g.icon}`} style={{ fontSize: 19, color: 'var(--gold-muted)' }} />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div style={{ fontFamily: SERIF, fontSize: 17, color: C.charcoal, lineHeight: 1.15 }}>{g.label}</div>
                  {!isDone && <span style={{ fontSize: 7.5, letterSpacing: 1.5, textTransform: 'uppercase', fontFamily: SANS, color: 'var(--gold-muted)', border: '0.5px solid rgba(184,151,42,0.45)', borderRadius: 3, padding: '2px 6px', flexShrink: 0 }}>Needed</span>}
                </div>
                <div style={{ fontSize: 10.5, color: C.taupe, fontFamily: SANS, marginTop: 3, fontWeight: 300 }}>{g.desc}</div>
              </div>
              {isDone ?
              <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 9, letterSpacing: 1.5, textTransform: 'uppercase', color: C.green, fontFamily: SANS, flexShrink: 0 }}><i className="ti ti-check" style={{ fontSize: 13 }} />Added</span> :
              <span style={{ fontSize: 9, letterSpacing: 1.5, textTransform: 'uppercase', color: 'var(--gold-muted)', fontFamily: SANS, flexShrink: 0, whiteSpace: 'nowrap' }}>Add details →</span>}
            </Card>);
        })}
      </div>
    </div>);
}

// Wraps an onboarding goal-detail component as a standalone in-app screen.
function GoalPrefScreen({ id, ctx }) {
  const g = GOAL_PREF[id] || GOAL_PREF.activity;
  const Comp = window[g.comp];
  const save = () => { try { localStorage.setItem('fc-goalpref-' + id, '1'); } catch (e) {} ctx.back(); };
  return (
    <div style={{ paddingBottom: 30 }}>
      <div style={{ padding: '16px 22px 6px', background: C.parchment, borderBottom: '0.5px solid rgba(184,151,42,0.16)', position: 'sticky', top: 0, zIndex: 5 }}>
        <button onClick={ctx.back} style={{ background: 'none', border: 'none', padding: 0, fontSize: 9, letterSpacing: 2, textTransform: 'uppercase', color: C.taupeLight, fontFamily: SANS, cursor: 'pointer' }}>‹ Concierge</button>
        <div style={{ fontSize: 8.5, letterSpacing: 3, textTransform: 'uppercase', color: 'var(--gold-muted)', fontFamily: SANS, marginTop: 8 }}>Sharpen your matches</div>
      </div>
      {Comp ? <Comp next={save} refined={ctx.refined} /> :
      <div style={{ padding: 30, textAlign: 'center', fontFamily: SERIF, fontStyle: 'italic', color: C.taupe }}>This goal has no extra detail to add.</div>}
    </div>);
}

// Optional, in-app personalization — the deeper "quiet conversation" prompts,
// moved out of onboarding so a new resident reaches their first intro faster.
function DeepenCard() {
  const [open, setOpen] = useState(false);
  return (
    <div style={{ background: C.white, border: '0.5px solid rgba(184,151,42,0.2)', padding: open ? '16px' : '15px 16px' }}>
      <div onClick={() => setOpen((o) => !o)} style={{ display: 'flex', gap: 12, alignItems: 'center', cursor: 'pointer' }}>
        <i className="ti ti-message-2-heart" style={{ fontSize: 18, color: 'var(--gold-muted)', flexShrink: 0 }} />
        <div style={{ flex: 1 }}>
          <div style={{ fontFamily: SERIF, fontSize: 16.5, color: C.charcoal, lineHeight: 1.2 }}>Help your concierge understand you</div>
          <div style={{ fontSize: 10.5, color: C.taupeLight, fontFamily: SANS, marginTop: 3 }}>Optional · a few words sharpen your introductions</div>
        </div>
        <i className={`ti ${open ? 'ti-chevron-up' : 'ti-chevron-down'}`} style={{ fontSize: 16, color: C.taupeLight }} />
      </div>
      {open &&
      <div style={{ marginTop: 16, display: 'flex', flexDirection: 'column', gap: 14 }}>
        {FC.compatPrompts.map((p) => (
          <div key={p.id}>
            <div style={{ fontFamily: SERIF, fontSize: 15, color: C.charcoal, lineHeight: 1.35, marginBottom: 9 }}>{p.q}</div>
            <textarea placeholder={p.placeholder} style={{ width: '100%', background: 'rgba(184,151,42,0.05)', border: '0.5px solid rgba(184,151,42,0.18)', padding: '11px 13px', fontFamily: SERIF, fontStyle: 'italic', fontSize: 15.5, color: C.charcoal, resize: 'none', height: 60, lineHeight: 1.6 }} />
          </div>
        ))}
        <BtnGhost active>Save for my concierge</BtnGhost>
      </div>}
    </div>
  );
}

function SuggestionCard({ s, ctx }) {
  const icons = { introduction: 'ti-user-plus', circle: 'ti-circles', event: 'ti-calendar-event' };
  const target = s.kind === 'introduction' ? () => ctx.open('intro', s.refId) : s.kind === 'circle' ? () => ctx.open('circle', s.refId) : () => ctx.open('event', s.refId);
  const r = s.kind === 'introduction' ? FC.residents[s.refId] : null;
  return (
    <Card onClick={target} style={{ display: 'flex', gap: 14, alignItems: 'flex-start' }}>
      {r ? <Avatar id={r.id} size={46} /> : (
        <div style={{ width: 46, height: 46, borderRadius: '50%', border: '0.5px solid rgba(184,151,42,0.35)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <i className={`ti ${icons[s.kind]}`} style={{ fontSize: 19, color: 'var(--gold-muted)' }} />
        </div>
      )}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 8, letterSpacing: 2, color: 'var(--gold-muted)', textTransform: 'uppercase', fontFamily: SANS, marginBottom: 5 }}>{s.kind}</div>
        <div style={{ fontFamily: SERIF, fontSize: 17, color: C.charcoal, lineHeight: 1.15, marginBottom: 6 }}>{s.title}</div>
        <div style={{ fontFamily: SERIF, fontStyle: 'italic', fontSize: 13.5, lineHeight: 1.6, color: C.taupe }}>{s.line}</div>
      </div>
    </Card>
  );
}

// ── SUGGEST EVENT ──
function SuggestEvent({ ctx }) {
  const [cat, setCat] = useState(null);
  const [done, setDone] = useState(false);
  const refined = ctx.refined;
  const cats = ['Dining', 'Fitness', 'Arts & Culture', 'Social', 'Learning', 'Wellness'];
  if (done) return (
    <div style={{ paddingBottom: 30 }}>
      <ScreenHeader back="Gatherings" onBack={ctx.back} title="Thank you" />
      <div style={{ padding: '40px 30px', textAlign: 'center' }}>
        {refined ? <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 8 }}><Logo size={48} /></div> : <i className="ti ti-check" style={{ fontSize: 26, color: C.green }} />}
        <div style={{ fontFamily: SERIF, fontStyle: 'italic', fontSize: 19, color: C.charcoalSoft, marginTop: 16, lineHeight: 1.6 }}>Your idea is with the building. We'll gather interest and let you know if it moves forward.</div>
        <div style={{ marginTop: 24 }}><BtnDark onClick={ctx.back}>Back to gatherings</BtnDark></div>
      </div>
    </div>
  );
  return (
    <div style={{ paddingBottom: 30 }}>
      <ScreenHeader back="Gatherings" onBack={ctx.back} eyebrow="Propose to the community" title={<>Suggest a <Em>gathering</Em></>} />
      <div style={{ padding: '20px 22px 0', display: 'flex', flexDirection: 'column', gap: 22 }}>
        <Field label="What's the idea?" placeholder="e.g. Rooftop Film Night, Sunday Long Run…" />
        <div>
          <FieldLabel>Category</FieldLabel>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7 }}>
            {cats.map(c => <Chip key={c} sel={cat === c} onClick={() => setCat(c)}>{c}</Chip>)}
          </div>
        </div>
        <Field label="Preferred amenity" placeholder="Rooftop, The Parlour, Coffee Bar…" />
        <Field label="Ideal group size" placeholder="An intimate 6, or an open 30…" />
        <Field label="Describe it" placeholder="A few words on the feel of the gathering…" area />
        <Field label="When works" placeholder="Weekend evenings this summer…" />
        <BtnDark onClick={() => setDone(true)}>Submit idea</BtnDark>
      </div>
    </div>
  );
}

const FieldLabel = ({ children }) => <div style={{ fontSize: 9, letterSpacing: 3, textTransform: 'uppercase', color: C.taupe, fontFamily: SANS, marginBottom: 10 }}>{children}</div>;
function Field({ label, placeholder, area }) {
  return (
    <div>
      <FieldLabel>{label}</FieldLabel>
      {area
        ? <textarea placeholder={placeholder} style={{ width: '100%', background: 'transparent', border: 'none', borderBottom: '0.5px solid rgba(184,151,42,0.22)', padding: '9px 0', fontFamily: SERIF, fontStyle: 'italic', fontSize: 16, color: C.charcoal, resize: 'none', height: 70, lineHeight: 1.6 }} />
        : <input placeholder={placeholder} style={{ width: '100%', background: 'transparent', border: 'none', borderBottom: '0.5px solid rgba(184,151,42,0.22)', padding: '11px 0', fontFamily: SERIF, fontSize: 17, color: C.charcoal }} />}
    </div>
  );
}

// ── POST-EVENT FEEDBACK ──
function EventFeedback({ ctx }) {
  const [rating, setRating] = useState(4);
  const refined = ctx.refined;
  const [again, setAgain] = useState('yes');
  const [seeAgain, setSeeAgain] = useState(['maya']);
  const [done, setDone] = useState(false);
  const attendees = ['maya', 'james', 'kevin', 'sophie'];
  const toggleSee = id => setSeeAgain(s => s.includes(id) ? s.filter(x => x !== id) : [...s, id]);
  if (done) return (
    <div style={{ paddingBottom: 30 }}>
      <ScreenHeader back="Events" onBack={ctx.back} title="Thank you" />
      <div style={{ padding: '40px 30px', textAlign: 'center' }}>
        {refined ? <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 8 }}><Logo size={48} /></div> : <i className="ti ti-check" style={{ fontSize: 26, color: C.green }} />}
        <div style={{ fontFamily: SERIF, fontStyle: 'italic', fontSize: 19, color: C.charcoalSoft, marginTop: 16, lineHeight: 1.6 }}>Noted. Where interest is mutual, we'll quietly open a connection. Your concierge will use this to suggest better gatherings.</div>
        <div style={{ marginTop: 24 }}><BtnDark onClick={ctx.back}>Done</BtnDark></div>
      </div>
    </div>
  );
  return (
    <div style={{ paddingBottom: 30 }}>
      <ScreenHeader back="Events" onBack={ctx.back} eyebrow="After the gathering" title="A few words" />
      <div style={{ padding: '20px 22px 0' }}>
        <Card pad={15} style={{ display: 'flex', gap: 13, alignItems: 'center', marginBottom: 22 }}>
          <div style={{ minWidth: 44, height: 44, background: C.parchment, border: '0.5px solid rgba(184,151,42,0.25)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
            <span style={{ fontFamily: SERIF, fontSize: 18, color: 'var(--gold)', lineHeight: 1 }}>27</span>
            <span style={{ fontSize: 7, letterSpacing: 1.5, color: C.taupeLight, textTransform: 'uppercase', fontFamily: SANS }}>Jun</span>
          </div>
          <div>
            <div style={{ fontFamily: SERIF, fontSize: 18, color: C.charcoal }}>Wine Tasting Evening</div>
            <div style={{ fontSize: 10.5, color: C.taupe, fontFamily: SANS, marginTop: 2 }}>7:00 PM · The Lobby Bar</div>
          </div>
        </Card>

        <SectionLabel mb={12}>How was it?</SectionLabel>
        <div style={{ display: 'flex', gap: 7, marginBottom: 24 }}>
          {[1, 2, 3, 4, 5].map(n => (
            <span key={n} onClick={() => setRating(n)} style={{ fontFamily: SERIF, fontSize: 32, lineHeight: 1, cursor: 'pointer', color: n <= rating ? 'var(--gold)' : 'rgba(184,151,42,0.2)' }}>★</span>
          ))}
        </div>

        <SectionLabel mb={12}>Would you attend again?</SectionLabel>
        <div style={{ display: 'flex', gap: 8, marginBottom: 24 }}>
          {['yes', 'maybe', 'no'].map(v => (
            <button key={v} onClick={() => setAgain(v)} style={{
              flex: 1, padding: '11px', textTransform: 'uppercase', fontFamily: SANS, fontSize: 9, letterSpacing: 2, cursor: 'pointer',
              border: `0.5px solid ${again === v ? (v === 'no' ? 'rgba(122,46,46,0.5)' : 'var(--gold)') : 'rgba(184,151,42,0.2)'}`,
              background: again === v ? (v === 'no' ? 'rgba(122,46,46,0.06)' : 'rgba(232,223,208,0.5)') : 'transparent',
              color: again === v ? (v === 'no' ? '#7A2E2E' : 'var(--gold-muted)') : C.taupeLight,
            }}>{v}</button>
          ))}
        </div>

        <SectionLabel mb={12}>Anyone you'd like to see again?</SectionLabel>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 9, marginBottom: 24 }}>
          {attendees.map(id => {
            const r = FC.residents[id]; const on = seeAgain.includes(id);
            return (
              <div key={id} onClick={() => toggleSee(id)} style={{ display: 'flex', gap: 12, alignItems: 'center', cursor: 'pointer', border: `0.5px solid ${on ? 'var(--gold)' : 'rgba(184,151,42,0.16)'}`, background: on ? 'rgba(232,223,208,0.4)' : C.white, padding: '10px 13px' }}>
                <Avatar id={id} size={38} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontFamily: SERIF, fontSize: 16, color: C.charcoal }}>{r.name}</div>
                  <div style={{ fontSize: 10, color: C.taupe, fontFamily: SANS }}>{r.occupation}</div>
                </div>
                <div style={{ width: 20, height: 20, border: `0.5px solid ${on ? 'var(--gold)' : 'rgba(184,151,42,0.3)'}`, background: on ? 'var(--gold)' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  {on && <i className="ti ti-check" style={{ fontSize: 12, color: C.white }} />}
                </div>
              </div>
            );
          })}
        </div>

        <Field label="What did you enjoy?" placeholder="Share what made it special…" area />
        <div style={{ marginTop: 20 }}><BtnDark onClick={() => setDone(true)}>Submit feedback</BtnDark></div>
      </div>
    </div>
  );
}

// ── POST-MEETUP FEEDBACK (close of the meet loop) ──
function MeetFeedback({ id, ctx }) {
  const r = FC.residents[id] || FC.residents.alex;
  const name = r.name.split(' ')[0];
  const [met, setMet] = useState(null);
  const [again, setAgain] = useState(null);
  const [done, setDone] = useState(false);
  if (done) return (
    <div style={{ paddingBottom: 30 }}>
      <ScreenHeader back="People" onBack={ctx.back} title="Thank you" />
      <div style={{ padding: '40px 30px', textAlign: 'center' }}>
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 8 }}><Logo size={48} /></div>
        <div style={{ fontFamily: SERIF, fontStyle: 'italic', fontSize: 19, color: C.charcoalSoft, marginTop: 16, lineHeight: 1.6 }}>Thank you. Your concierge learns quietly from this — it only sharpens who you're introduced to next. {name} never sees your notes.</div>
        <div style={{ marginTop: 24 }}><BtnDark onClick={ctx.back}>Done</BtnDark></div>
      </div>
    </div>
  );
  return (
    <div style={{ paddingBottom: 30 }}>
      <ScreenHeader back="People" onBack={ctx.back} eyebrow="After your meetup" title={<>How was meeting <Em>{name}?</Em></>} />
      <div style={{ padding: '20px 22px 0' }}>
        <Card pad={15} style={{ display: 'flex', gap: 13, alignItems: 'center', marginBottom: 24 }}>
          <Avatar id={r.id} size={48} />
          <div>
            <div style={{ fontFamily: SERIF, fontSize: 18, color: C.charcoal }}>{r.name}</div>
            <div style={{ fontSize: 10.5, color: C.taupe, fontFamily: SANS, marginTop: 2 }}>{r.occupation}</div>
          </div>
        </Card>

        <SectionLabel mb={12}>Did you two meet up?</SectionLabel>
        <div style={{ display: 'flex', gap: 8, marginBottom: 24 }}>
          {[['yes', 'We met'], ['rescheduling', 'Rescheduling'], ['no', "Didn't happen"]].map(([v, l]) => (
            <button key={v} onClick={() => setMet(v)} style={{ flex: 1, padding: '12px 6px', textTransform: 'uppercase', fontFamily: SANS, fontSize: 8.5, letterSpacing: 1.5, cursor: 'pointer', border: `0.5px solid ${met === v ? 'var(--gold)' : 'rgba(184,151,42,0.2)'}`, background: met === v ? 'rgba(232,223,208,0.5)' : C.white, color: met === v ? 'var(--gold-muted)' : C.taupeLight }}>{l}</button>
          ))}
        </div>

        <SectionLabel mb={12}>Would you like to see {name} again?</SectionLabel>
        <div style={{ display: 'flex', gap: 8, marginBottom: 24 }}>
          {[['yes', 'Yes, gladly'], ['maybe', 'Maybe'], ['no', 'Not really']].map(([v, l]) => (
            <button key={v} onClick={() => setAgain(v)} style={{ flex: 1, padding: '12px 6px', textTransform: 'uppercase', fontFamily: SANS, fontSize: 8.5, letterSpacing: 1.5, cursor: 'pointer', border: `0.5px solid ${again === v ? 'var(--gold)' : 'rgba(184,151,42,0.2)'}`, background: again === v ? 'rgba(232,223,208,0.5)' : C.white, color: again === v ? 'var(--gold-muted)' : C.taupeLight }}>{l}</button>
          ))}
        </div>

        <Field label="Anything for your concierge? (optional)" placeholder="What you enjoyed, or what you'd like next time…" area />
        <div style={{ marginTop: 22 }}><BtnDark onClick={() => setDone(true)} disabled={!met}>Share with concierge</BtnDark></div>
        <div style={{ fontSize: 10, color: C.taupeLight, fontFamily: SANS, fontStyle: 'italic', marginTop: 12, textAlign: 'center', lineHeight: 1.5 }}>Private to your concierge. {name} is never shown your answers.</div>
      </div>
    </div>
  );
}

Object.assign(window, { ConciergeScreen, GoalRefineSection, GoalPrefScreen, SuggestEvent, EventFeedback, MeetFeedback, Field, FieldLabel, selectedGoalIds, goalPrefDone, GOAL_PREF });
