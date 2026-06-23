/* Fifth Circle — Onboarding flow (consent → verification → profile → goals → interests → availability → compatibility → intro prefs). */

// Which selected goals unlock a dedicated detail screen, in order.
const GOAL_DETAIL = [
{ id: 'friendship', step: 'g_friendship' },
{ id: 'activity', step: 'g_activity' },
{ id: 'professional', step: 'g_professional' },
{ id: 'group', step: 'g_group' }];


function Onboarding({ onExit, start, refined }) {
  const [goals, setGoals] = useState(['friendship', 'activity']);

  // Persist what the resident says they're looking for, so the Concierge tab can
  // surface the matching goal-detail screens ("Sharpen your matches") for exactly
  // those goals. Cleared completion flags whenever the goal set changes.
  React.useEffect(() => {
    try {localStorage.setItem('fc-goals', JSON.stringify(goals));} catch (e) {}
  }, [goals]);

  // Build the flow dynamically. The refined (approved) flow is streamlined to the
  // essentials — profile, goals, interests, availability, agreement — so a new
  // resident reaches their first introduction fast. Deeper compatibility prompts
  // and goal-specific detail move in-app (Concierge → "Help your concierge understand you").
  const goalSteps = GOAL_DETAIL.filter((g) => goals.includes(g.id)).map((g) => g.step);
  const steps = refined ?
  ['landing', 'verify', 'consent', 'profile', 'goals', 'interests', 'availability', 'intro', 'done'] :
  ['landing', 'verify', 'consent', 'profile', 'goals', 'interests', ...goalSteps, 'availability', 'compat', 'intro', 'done'];
  const [step, setStep] = useState(start === 'consent' ? 1 : 0);
  const cur = steps[step];
  const next = () => setStep((s) => Math.min(s + 1, steps.length - 1));
  const back = () => step === 0 || start === 'consent' && step === 1 ? onExit() : setStep((s) => Math.max(0, s - 1));
  const chrome = cur !== 'landing' && cur !== 'done';
  const total = steps.length - 2; // exclude landing + done
  const idx = step - 1; // consent = 0
  const dark = cur === 'profile';
  return (
    <div style={{ minHeight: '100%', display: 'flex', flexDirection: 'column', background: dark ? C.charcoal : C.cream }}>
      {/* progress header */}
      {chrome &&
      <div style={{ background: dark ? C.charcoal : C.parchment, padding: '16px 22px 14px', borderBottom: `0.5px solid ${dark ? 'rgba(184,151,42,0.15)' : 'rgba(184,151,42,0.2)'}`, position: 'sticky', top: 0, zIndex: 5 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <button onClick={back} style={{ background: 'none', border: 'none', padding: 0, fontSize: 9, letterSpacing: 2, textTransform: 'uppercase', color: C.taupeLight, fontFamily: SANS, cursor: 'pointer' }}>‹ Back</button>
            <span style={{ fontSize: 9, letterSpacing: 2, color: C.taupeLight, textTransform: 'uppercase', fontFamily: SANS }}>Step {idx + 1} of {total}</span>
          </div>
          <div style={{ display: 'flex', gap: 3 }}>
            {Array.from({ length: total }).map((_, i) => <div key={i} style={{ flex: 1, height: 1.5, background: i <= idx ? 'var(--gold)' : 'rgba(184,151,42,0.2)' }} />)}
          </div>
        </div>
      }
      <div style={{ flex: 1 }}>
        {cur === 'landing' && <LandingScreen onJoin={next} onExit={onExit} />}
        {cur === 'consent' && <ObConsent next={next} refined={refined} />}
        {cur === 'verify' && <ObVerify next={next} />}
        {cur === 'profile' && <ObProfile next={next} />}
        {cur === 'goals' && <ObGoals next={next} goals={goals} setGoals={setGoals} />}
        {cur === 'interests' && <ObInterests next={next} />}
        {cur === 'g_friendship' && <ObFriendship next={next} refined={refined} />}
        {cur === 'g_activity' && <ObActivity next={next} />}
        {cur === 'g_professional' && <ObProfessional next={next} />}
        {cur === 'g_group' && <ObGroup next={next} />}
        {cur === 'availability' && <ObAvailability next={next} />}
        {cur === 'compat' && <ObCompat next={next} refined={refined} />}
        {cur === 'intro' && <ObIntroPref next={next} />}
        {cur === 'done' && <ObDone onExit={onExit} />}
      </div>
    </div>);

}

// ── LANDING / WELCOME (public marketing gate) ──
function LandingScreen({ onJoin, onExit }) {
  const steps = [
  ['01', 'Private by Design', 'No public profiles. No social feed. One building, one private community — by invitation only.'],
  ['02', 'Thoughtful Introductions', "We'd love to introduce you to a few neighbours who share your interests. Curated, not algorithmic."],
  ['03', 'A Quiet Concierge', 'An attentive presence that learns how to introduce you to the right people, at the right moment.']];

  const amenities = [
  ['amenity-skydeck', 'The Sky Deck', 'Unhurried evening introductions over the city skyline.'],
  ['amenity-lobbybar', 'The Lobby Bar', 'Coffee by day, a glass of something good by night.'],
  ['amenity-gym', 'The Fitness Center', 'Find a training partner who keeps your pace and schedule.'],
  ['amenity-pool', 'The Pool', 'Morning lengths and the easy conversation that follows.'],
  ['amenity-workspace', 'The Workspace', 'Co-work beside professional neighbours who share your world.'],
  ['amenity-gameroom', 'The Game Room', 'Vinyl nights, billiards, and the building’s easy crowd.']];

  return (
    <div style={{ background: C.cream }}>
      {/* nav */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '18px 22px' }}>
        <Wordmark size={12} ls={5} />
        <span onClick={onExit} style={{ fontSize: 9, letterSpacing: 2, textTransform: 'uppercase', color: C.taupe, fontFamily: SANS, border: '0.5px solid rgba(184,151,42,0.4)', padding: '8px 13px', cursor: 'pointer' }}>Sign in</span>
      </div>

      {/* hero */}
      <div style={{ padding: '14px 26px 30px', display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }} data-comment-anchor="38241d085e-div-82-7">
        <div style={{ margin: '8px 0 26px' }}><Logo size={128} /></div>
        <div style={{ fontSize: 9, letterSpacing: 4, color: 'var(--gold-muted)', textTransform: 'uppercase', fontFamily: SANS, marginBottom: 16 }}>Private residential communities</div>
        <div style={{ fontFamily: SERIF, fontSize: 38, fontWeight: 400, color: C.charcoal, lineHeight: 1.06, letterSpacing: '-0.5px', marginBottom: 18 }}>Meaningful connections, <Em>close to home.</Em></div>
        <div style={{ fontSize: 13, color: C.taupe, lineHeight: 1.85, fontWeight: 300, fontFamily: SANS, maxWidth: 300, marginBottom: 26 }}>You know colleagues across the world, but not the neighbour down the hall. Fifth Circle changes that.</div>
        <button onClick={onJoin} style={{ width: '100%', background: C.charcoal, color: C.cream, border: 'none', fontFamily: SANS, fontSize: 10, letterSpacing: 3, textTransform: 'uppercase', padding: '16px', cursor: 'pointer' }}>Join your building →</button>
        <div style={{ fontFamily: SERIF, fontStyle: 'italic', fontSize: 16, color: 'var(--gold-muted)', marginTop: 20 }}>"The circle closest to home."</div>
      </div>

      {/* how it works */}
      <div style={{ background: C.parchment, padding: '30px 26px', borderTop: '0.5px solid rgba(184,151,42,0.18)' }} data-comment-anchor="19e858d506-div-105-7">
        <div style={{ textAlign: 'center', marginBottom: 24 }}>
          <div style={{ fontSize: 9, letterSpacing: 4, color: 'var(--gold-muted)', textTransform: 'uppercase', fontFamily: SANS, marginBottom: 10 }}>How it works</div>
          <div style={{ fontFamily: SERIF, fontSize: 28, color: C.charcoal }}>Connection, <Em>by design.</Em></div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          {steps.map(([n, h, p]) =>
          <div key={n} style={{ padding: '18px 0', borderTop: '0.5px solid rgba(184,151,42,0.18)' }}>
              <div style={{ fontFamily: SERIF, fontSize: 30, color: 'rgba(184,151,42,0.4)', lineHeight: 1, marginBottom: 8 }}>{n}</div>
              <div style={{ fontFamily: SERIF, fontSize: 20, color: C.charcoal, marginBottom: 7 }}>{h}</div>
              <div style={{ fontSize: 12.5, color: C.taupe, lineHeight: 1.7, fontWeight: 300, fontFamily: SANS }}>{p}</div>
            </div>
          )}
        </div>
      </div>

      {/* amenities */}
      <div style={{ padding: '30px 26px' }}>
        <div style={{ textAlign: 'center', marginBottom: 22 }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 7, marginBottom: 12 }}>
            <span style={{ fontSize: 9, letterSpacing: 4, color: 'var(--gold-muted)', textTransform: 'uppercase', fontFamily: SANS }}>At</span>
            <img src={window.RES('img/chorus-logo.png')} alt="Chorus" style={{ height: 12, opacity: 0.8 }} />
          </div>
          <div style={{ fontFamily: SERIF, fontSize: 26, color: C.charcoal, lineHeight: 1.12 }}>Matched at the spaces <Em>you already love.</Em></div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {amenities.map(([photo, name, desc]) =>
          <div key={name} style={{ background: C.white, border: `0.5px solid ${STONE_SOFT}`, borderRadius: RAD, boxShadow: SHADOW, overflow: 'hidden' }}>
              <div style={{ position: 'relative', height: 150, background: C.charcoalSoft }}>
                <img src={window.RES(`img/${photo}.png`)} alt={name} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }} />
                <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(18,13,8,0.88) 0%, rgba(18,13,8,0.1) 58%, rgba(18,13,8,0) 100%)' }} />
                <div style={{ position: 'absolute', left: 16, right: 16, bottom: 13 }}>
                  <div style={{ fontFamily: SERIF, fontSize: 20, color: C.cream, lineHeight: 1.05 }}>{name}</div>
                  <div style={{ fontSize: 11, color: 'rgba(242,237,227,0.8)', lineHeight: 1.5, fontFamily: SANS, fontWeight: 300, marginTop: 4 }}>{desc}</div>
                </div>
              </div>
            </div>
          )}
        </div>
        <div style={{ textAlign: 'center', fontSize: 9, letterSpacing: 3, color: C.taupeLight, textTransform: 'uppercase', fontFamily: SANS, marginTop: 22 }}>Seven amenities · One community</div>
      </div>

      {/* closing CTA */}
      <div style={{ background: C.charcoal, padding: '38px 26px', textAlign: 'center' }}>
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 24 }}><Logo size={72} light /></div>
        <div style={{ fontFamily: SERIF, fontSize: 30, fontWeight: 400, color: C.cream, lineHeight: 1.1, marginBottom: 16 }}>Your building is already <Em>home.</Em></div>
        <div style={{ fontSize: 12.5, color: 'rgba(242,237,227,0.5)', lineHeight: 1.8, fontWeight: 300, fontFamily: SANS, maxWidth: 280, margin: '0 auto 26px' }}>Let it become a community, too. Join the residents of {FC.building} on Fifth Circle.</div>
        <button onClick={onJoin} style={{ background: C.cream, color: C.charcoal, border: 'none', fontFamily: SANS, fontSize: 10, letterSpacing: 3, textTransform: 'uppercase', padding: '15px 32px', cursor: 'pointer' }}>Join your building →</button>
      </div>

      {/* footer */}
      <div style={{ padding: '22px 26px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Wordmark size={11} ls={4} />
        <span style={{ fontSize: 8.5, letterSpacing: 1.5, color: C.taupeLight, fontFamily: SANS }}>By invitation</span>
      </div>
    </div>);

}

// ── shared onboarding controls ──
const ObSection = ({ label, children, mb = 20 }) =>
<div style={{ marginBottom: mb }}>
    <div style={{ fontSize: 9, letterSpacing: 3, textTransform: 'uppercase', color: 'var(--gold-muted)', fontFamily: SANS, marginBottom: 11 }}>{label}</div>
    {children}
  </div>;

function PickRow({ options, value, onChange, multi }) {
  const sel = multi ? value : [value];
  const toggle = (v) => {
    if (multi) onChange(value.includes(v) ? value.filter((x) => x !== v) : [...value, v]);else
    onChange(v);
  };
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7 }}>
      {options.map((o) => <Chip key={o} sm sel={sel.includes(o)} onClick={() => toggle(o)}>{o}</Chip>)}
    </div>);

}
function NumPick({ options, value, onChange }) {
  return (
    <div style={{ display: 'flex', gap: 8 }}>
      {options.map((o) => {
        const on = value === o.v;
        return (
          <div key={o.v} onClick={() => onChange(o.v)} style={{ flex: 1, height: 72, border: `0.5px solid ${on ? 'var(--gold)' : 'rgba(184,151,42,0.2)'}`, background: on ? 'rgba(232,223,208,0.5)' : C.white, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', gap: 3 }}>
            <div style={{ fontFamily: SERIF, fontSize: 24, fontWeight: 300, color: on ? 'var(--gold-muted)' : C.charcoal, lineHeight: 1 }}>{o.num}</div>
            <div style={{ fontSize: 8, letterSpacing: 1, textTransform: 'uppercase', color: C.taupeLight, fontFamily: SANS }}>{o.label}</div>
          </div>);

      })}
    </div>);

}
function GoalBadge({ icon, label }) {
  return (
    <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, border: '0.5px solid rgba(184,151,42,0.3)', padding: '7px 13px', marginBottom: 16 }}>
      <i className={`ti ${icon}`} style={{ fontSize: 14, color: 'var(--gold-muted)' }} />
      <span style={{ fontSize: 9, letterSpacing: 2.5, textTransform: 'uppercase', color: 'var(--gold-muted)', fontFamily: SANS }}>{label}</span>
    </div>);

}
const ObConciergeField = ({ q, placeholder }) =>
<div style={{ background: 'rgba(184,151,42,0.06)', border: '0.5px solid rgba(184,151,42,0.22)', padding: 16 }}>
    <div style={{ display: 'flex', gap: 9, marginBottom: 10 }}>
      <i className="ti ti-sparkles" style={{ fontSize: 13, color: 'var(--gold)', marginTop: 2 }} />
      <div style={{ fontFamily: SERIF, fontSize: 15.5, color: C.charcoal, lineHeight: 1.4 }}>{q}</div>
    </div>
    <textarea placeholder={placeholder} style={{ width: '100%', background: 'transparent', border: 'none', fontFamily: SERIF, fontStyle: 'italic', fontSize: 16, color: C.charcoal, resize: 'none', height: 56, lineHeight: 1.65 }} data-comment-anchor="a43eb7055f-textarea-195-5" />
  </div>;


const ObEyebrow = ({ children }) => <div style={{ fontSize: 9, letterSpacing: 4, color: 'var(--gold-muted)', textTransform: 'uppercase', fontFamily: SANS, marginBottom: 8 }} data-comment-anchor="14f164aa37-div-199-37">{children}</div>;
const ObHead = ({ children, light }) => <div style={{ fontFamily: SERIF, fontSize: 27, fontWeight: 300, color: light ? C.cream : C.charcoal, lineHeight: 1.15, marginBottom: 10 }}>{children}</div>;
const ObBody = ({ children, light }) => <div style={{ fontSize: 13, color: light ? 'rgba(242,237,227,0.5)' : C.taupe, lineHeight: 1.8, fontWeight: 300, fontFamily: SANS }} data-comment-anchor="8c2de6f190-div-201-41">{children}</div>;

function ObConsent({ next, refined }) {
  const [checked, setChecked] = useState([false, false, false, false, false, false]);
  const [agreed, setAgreed] = useState(false);
  const all = checked.every(Boolean);
  const toggle = (i) => setChecked((c) => c.map((v, j) => j === i ? !v : v));
  if (refined) {
    return (
      <div style={{ padding: '22px 22px 30px' }}>
        <ObEyebrow>Community Standards</ObEyebrow>
        <ObHead>Before <Em>you begin</Em></ObHead>
        <ObBody>A private community works on trust. Three promises we make to you:</ObBody>
        <div style={{ marginTop: 20, display: 'flex', flexDirection: 'column', gap: 10 }}>
          {FC.consentPromises.map((p, i) =>
          <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 12, background: 'rgba(184,151,42,0.06)', border: '0.5px solid rgba(184,151,42,0.2)', padding: '14px 15px' }}>
              <i className="ti ti-sparkles" style={{ fontSize: 14, color: 'var(--gold)', marginTop: 2, flexShrink: 0 }} />
              <span style={{ fontFamily: SERIF, fontStyle: 'italic', fontSize: 15.5, color: C.charcoalSoft, lineHeight: 1.45 }}>{p}</span>
            </div>
          )}
        </div>
        <div onClick={() => setAgreed(!agreed)} style={{ display: 'flex', alignItems: 'flex-start', gap: 12, padding: '20px 0 4px', marginTop: 6, cursor: 'pointer', borderTop: '0.5px solid rgba(184,151,42,0.12)' }}>
          <div style={{ width: 18, height: 18, flexShrink: 0, marginTop: 1, border: `0.5px solid ${agreed ? 'var(--gold)' : 'rgba(184,151,42,0.3)'}`, background: agreed ? 'var(--gold)' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            {agreed && <i className="ti ti-check" style={{ fontSize: 11, color: C.cream }} />}
          </div>
          <span style={{ fontSize: 13, color: agreed ? C.charcoal : C.taupe, lineHeight: 1.55, fontWeight: 300, fontFamily: SANS }}>{FC.consentAgreement}</span>
        </div>
        <div style={{ marginTop: 22 }}><BtnDark onClick={next} disabled={!agreed}>Continue</BtnDark></div>
      </div>);

  }
  return (
    <div style={{ padding: '22px 22px 30px' }}>
      <ObEyebrow>Community Standards</ObEyebrow>
      <ObHead>Before <Em>you begin</Em></ObHead>
      <ObBody>A private community works on trust. Please review and accept how we operate.</ObBody>
      <div style={{ marginTop: 20 }}>
        {FC.consentItems.map((label, i) =>
        <div key={i} onClick={() => toggle(i)} style={{ display: 'flex', alignItems: 'flex-start', gap: 12, padding: '14px 0', borderBottom: '0.5px solid rgba(184,151,42,0.1)', cursor: 'pointer' }}>
            <div style={{ width: 18, height: 18, flexShrink: 0, marginTop: 1, border: `0.5px solid ${checked[i] ? 'var(--gold)' : 'rgba(184,151,42,0.3)'}`, background: checked[i] ? 'var(--gold)' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              {checked[i] && <i className="ti ti-check" style={{ fontSize: 11, color: C.cream }} />}
            </div>
            <span style={{ fontSize: 13, color: checked[i] ? C.charcoal : C.taupe, lineHeight: 1.55, fontWeight: 300, fontFamily: SANS }}>{label}</span>
          </div>
        )}
      </div>
      <div style={{ marginTop: 24 }}><BtnDark onClick={next} disabled={!all}>Continue</BtnDark></div>
    </div>);

}

function ObVerify({ next }) {
  const [code, setCode] = useState('');
  return (
    <div style={{ padding: '22px 22px 30px' }}>
      <ObEyebrow>Resident Verification</ObEyebrow>
      <ObHead>Confirm your <Em>residence</Em></ObHead>
      <ObBody>Fifth Circle is only for verified residents of your building.</ObBody>
      <div style={{ display: 'flex', alignItems: 'center', gap: 9, marginTop: 16, padding: '12px 14px', border: '0.5px solid rgba(184,151,42,0.25)', background: 'rgba(184,151,42,0.05)' }}>
        <img src={window.RES('img/chorus-logo.png')} alt="Chorus" style={{ height: 13, opacity: 0.85 }} />
        <span style={{ fontSize: 9.5, letterSpacing: 1.5, textTransform: 'uppercase', color: C.taupe, fontFamily: SANS }}>Verifying your residence at Chorus</span>
      </div>
      <div style={{ marginTop: 22, display: 'flex', flexDirection: 'column', gap: 20 }} data-comment-anchor="53e4219379-div-234-7">
        <Field label="Building" placeholder="Chorus" />
        <Field label="Unit" placeholder="Tower A · 23" />
        <Field label="Email" placeholder="you@email.com" />
        <Field label="Phone" placeholder="+1 (555) 000-0000" />
        <Field label="Invite code" placeholder="CHORUS-31C" />
        <div>
          <FieldLabel>Verification code</FieldLabel>
          <input value={code} onChange={(e) => setCode(e.target.value.slice(0, 6))} placeholder="······" maxLength={6} style={{ width: '100%', background: 'transparent', border: 'none', borderBottom: '0.5px solid rgba(184,151,42,0.3)', padding: '10px 0', textAlign: 'center', fontFamily: SERIF, fontSize: 30, letterSpacing: 12, color: C.charcoal }} />
          <div style={{ fontSize: 10, color: C.taupeLight, fontFamily: SANS, marginTop: 10, fontStyle: 'italic' }}>We sent a code to your unit's registered email.</div>
        </div>
      </div>
      <div style={{ marginTop: 26 }}><BtnDark onClick={next}>Verify & continue</BtnDark></div>
    </div>);

}

function ObProfile({ next }) {
  return (
    <div style={{ padding: '22px 22px 30px' }}>
      <ObEyebrow>Your Profile</ObEyebrow>
      <ObHead light>Tell us about <Em>yourself</Em></ObHead>
      <ObBody light>The more you share, the more thoughtful your introductions.</ObBody>
      <div style={{ display: 'flex', justifyContent: 'center', gap: 12, margin: '22px 0' }}>
        {[0, 1, 2].map((n) =>
        <div key={n} style={{ width: n === 0 ? 92 : 72, height: n === 0 ? 92 : 72, borderRadius: 14, background: 'rgba(255,255,255,0.04)', border: '0.5px dashed rgba(184,151,42,0.4)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 5, cursor: 'pointer', alignSelf: 'center' }} data-comment-anchor={n === 0 ? '883b19e91d-i-259-11' : undefined}>
            <i className="ti ti-camera" style={{ fontSize: n === 0 ? 22 : 17, color: 'rgba(184,151,42,0.5)' }} />
            <span style={{ fontSize: 7.5, letterSpacing: 1.5, color: C.taupeLight, textTransform: 'uppercase', fontFamily: SANS }}>{n === 0 ? 'Main photo' : 'Add'}</span>
          </div>
        )}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
        <DarkField label="Full name" placeholder="Noor Haddad" />
        <DarkField label="Date of birth" placeholder="YYYY-MM-DD" type="date" hint="Used to determine your age — never shown to other residents." />
        <DarkField label="Occupation" placeholder="Product Designer" />
        <DarkField label="Short bio" placeholder="A few words about you…" area />
      </div>
      <div style={{ marginTop: 24 }}>
        <button onClick={next} style={{ width: '100%', background: 'transparent', border: '0.5px solid rgba(242,237,227,0.4)', color: C.cream, fontFamily: SANS, fontSize: 10, letterSpacing: 3, textTransform: 'uppercase', padding: '15px', cursor: 'pointer' }}>Continue</button>
      </div>
    </div>);

}
function DarkField({ label, placeholder, area, type, hint }) {
  return (
    <div>
      <div style={{ fontSize: 9, letterSpacing: 3, textTransform: 'uppercase', color: 'rgba(242,237,227,0.45)', fontFamily: SANS, marginBottom: 9 }}>{label}</div>
      {area ?
      <textarea placeholder={placeholder} style={{ width: '100%', background: 'rgba(255,255,255,0.03)', border: '0.5px solid rgba(255,255,255,0.1)', padding: '12px 14px', fontFamily: SERIF, fontStyle: 'italic', fontSize: 16, color: C.cream, resize: 'none', height: 64, lineHeight: 1.6 }} /> :
      <input type={type || 'text'} placeholder={placeholder} style={{ width: '100%', background: 'rgba(255,255,255,0.03)', border: '0.5px solid rgba(255,255,255,0.1)', padding: '13px 14px', fontFamily: SERIF, fontSize: 16, color: C.cream, colorScheme: 'dark' }} />}
      {hint && <div style={{ fontSize: 9.5, color: 'rgba(242,237,227,0.4)', fontFamily: SANS, fontStyle: 'italic', marginTop: 7, lineHeight: 1.5 }}>{hint}</div>}
    </div>);

}

function ObGoals({ next, goals, setGoals }) {
  const sel = goals;
  const toggle = (id) => setGoals((s) => s.includes(id) ? s.filter((x) => x !== id) : [...s, id]);
  return (
    <div style={{ padding: '22px 22px 30px' }}>
      <ObEyebrow>Connection types</ObEyebrow>
      <ObHead>What are you <Em>hoping to find?</Em></ObHead>
      <ObBody>Choose as many as feel right. You can change these anytime.</ObBody>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginTop: 20 }}>
        {FC.goalOptions.map((g) => {
          const on = sel.includes(g.id);
          return (
            <div key={g.id} onClick={() => toggle(g.id)} style={{ border: `0.5px solid ${on ? 'var(--gold)' : 'rgba(184,151,42,0.2)'}`, background: on ? 'rgba(232,223,208,0.4)' : C.white, padding: '16px 14px', cursor: 'pointer' }}>
              <div style={{ width: 38, height: 38, borderRadius: '50%', border: `0.5px solid ${on ? 'var(--gold)' : 'rgba(184,151,42,0.3)'}`, background: on ? 'var(--gold)' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 12 }}>
                <i className={`ti ${g.icon}`} style={{ fontSize: 18, color: on ? C.white : 'var(--gold-muted)' }} />
              </div>
              <div style={{ fontFamily: SERIF, fontSize: 16, color: on ? 'var(--gold-muted)' : C.charcoal, lineHeight: 1.1 }}>{g.label}</div>
              <div style={{ fontSize: 10.5, color: C.taupeLight, fontFamily: SANS, marginTop: 4, lineHeight: 1.4 }}>{g.desc}</div>
            </div>);

        })}
      </div>
      <div style={{ marginTop: 24 }}><BtnDark onClick={next} disabled={!sel.length}>Continue</BtnDark></div>
    </div>);

}

function ObInterests({ next }) {
  const [picked, setPicked] = useState(['Design', 'Coffee', 'Travel', 'Art']);
  return (
    <div style={{ padding: '22px 22px 30px' }}>
      <ObEyebrow>Interests</ObEyebrow>
      <ObHead>What do you <Em>love?</Em></ObHead>
      <ObBody>Pick a few, or add your own. Your concierge uses these to understand you, never to rank you.</ObBody>
      <div style={{ marginTop: 18 }} data-comment-anchor="5131c41b96-div-319-9">
        <div style={{ fontSize: 9, letterSpacing: 2, color: C.taupeLight, textTransform: 'uppercase', fontFamily: SANS, marginBottom: 12 }}>{picked.length} selected · max 10</div>
        <ChipPicker options={FC.interestSuggestions} value={picked} onChange={setPicked} max={10} addLabel="New interest" />
      </div>
      <div style={{ marginTop: 24 }}><BtnDark onClick={next}>Continue</BtnDark></div>
    </div>);

}

function ObAvailability({ next }) {
  const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  const WD = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
  const DOW = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const [view, setView] = useState({ y: 2026, m: 5 });
  const [avail, setAvail] = useState({ '2026-5-20': [{ from: '08:00', to: '12:00' }], '2026-5-21': [{ from: '09:00', to: '11:00' }], '2026-5-24': [{ from: '18:00', to: '20:00' }] });
  const [sel, setSel] = useState('2026-5-20');
  const dk = (y, m, d) => `${y}-${m}-${d}`;
  const firstDow = new Date(view.y, view.m, 1).getDay();
  const daysIn = new Date(view.y, view.m + 1, 0).getDate();
  const cells = [...Array(firstDow).fill(null), ...Array.from({ length: daysIn }, (_, i) => i + 1)];
  const shift = (delta) => setView((v) => {const m = v.m + delta;return { y: v.y + Math.floor(m / 12), m: (m % 12 + 12) % 12 };});
  const writeDay = (items) => setAvail((a) => {const c = { ...a };if (items.length) c[sel] = items;else delete c[sel];return c;});
  const selItems = sel ? avail[sel] || [] : [];
  const ranges = selItems.filter((x) => typeof x === 'object');
  const addRange = () => writeDay([...selItems, { from: '13:00', to: '15:00' }]);
  const setRange = (idx, k, v) => {let n = -1;writeDay(selItems.map((x) => typeof x === 'object' ? (n++, n === idx ? { ...x, [k]: v } : x) : x));};
  const rmRange = (idx) => {let n = -1;writeDay(selItems.filter((x) => typeof x !== 'object' || ++n !== idx));};
  const fmtTime = (t) => {if (!t) return '';const [h, m] = t.split(':').map(Number);const ap = h < 12 ? 'AM' : 'PM';const hh = h % 12 || 12;return `${hh}:${String(m).padStart(2, '0')} ${ap}`;};
  const daysSet = Object.keys(avail).length;
  const sp = sel ? sel.split('-').map(Number) : null;
  const selLabel = sp ? `${DOW[new Date(sp[0], sp[1], sp[2]).getDay()]}, ${MONTHS[sp[1]].slice(0, 3)} ${sp[2]}` : '';
  return (
    <div style={{ padding: '22px 22px 30px' }}>
      <ObEyebrow>Availability</ObEyebrow>
      <ObHead>When are you <Em>around?</Em></ObHead>
      <ObBody>Set your usual free times as a starting point. You'll confirm fresh availability with each introduction — so if your week changes, your matches always reflect it.</ObBody>

      {/* month calendar */}
      <div style={{ marginTop: 22, background: C.white, border: '0.5px solid rgba(184,151,42,0.2)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '13px 16px', background: C.parchment, borderBottom: '0.5px solid rgba(184,151,42,0.16)' }}>
          <i className="ti ti-chevron-left" onClick={() => shift(-1)} style={{ fontSize: 18, color: 'var(--gold-muted)', cursor: 'pointer' }} />
          <div style={{ fontFamily: SERIF, fontSize: 18, color: C.charcoal, letterSpacing: 0.5 }}>{MONTHS[view.m]} {view.y}</div>
          <i className="ti ti-chevron-right" onClick={() => shift(1)} style={{ fontSize: 18, color: 'var(--gold-muted)', cursor: 'pointer' }} />
        </div>
        <div style={{ padding: '12px 12px 14px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', marginBottom: 4 }}>
            {WD.map((w, i) => <div key={i} style={{ textAlign: 'center', fontSize: 8.5, letterSpacing: 1, textTransform: 'uppercase', color: C.taupeLight, fontFamily: SANS, paddingBottom: 6 }}>{w}</div>)}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: 2 }}>
            {cells.map((d, i) => {
              if (!d) return <div key={i} />;
              const k = dk(view.y, view.m, d);
              const has = (avail[k] || []).length;
              const isSel = sel === k;
              return (
                <div key={i} onClick={() => setSel(k)} style={{ aspectRatio: '1', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', borderRadius: '50%', background: isSel ? 'var(--gold)' : has ? 'rgba(184,151,42,0.1)' : 'transparent', position: 'relative' }}>
                  <span style={{ fontFamily: SERIF, fontSize: 16, color: isSel ? C.cream : C.charcoal }}>{d}</span>
                  {has > 0 && <div style={{ position: 'absolute', bottom: 5, width: 4, height: 4, borderRadius: '50%', background: isSel ? C.cream : 'var(--gold)' }} />}
                </div>);

            })}
          </div>
        </div>
      </div>

      {/* per-day time ranges */}
      {sel &&
      <div style={{ marginTop: 14, background: C.white, border: '0.5px solid rgba(184,151,42,0.2)', padding: 16 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 12 }}>
            <div style={{ fontFamily: SERIF, fontSize: 18, color: C.charcoal }}>{selLabel}</div>
            <span style={{ fontSize: 8.5, letterSpacing: 1.5, textTransform: 'uppercase', color: C.taupeLight, fontFamily: SANS }}>{selItems.length || 'No'} time{selItems.length === 1 ? '' : 's'}</span>
          </div>

          {ranges.length > 0 ?
        <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
              {ranges.map((r, i) =>
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <input type="time" value={r.from} onChange={(e) => setRange(i, 'from', e.target.value)} style={{ flex: 1, background: C.white, border: '0.5px solid rgba(184,151,42,0.25)', padding: '9px 10px', fontFamily: SERIF, fontSize: 15, color: C.charcoal }} />
                  <span style={{ fontFamily: SERIF, fontStyle: 'italic', fontSize: 14, color: C.taupeLight }}>to</span>
                  <input type="time" value={r.to} onChange={(e) => setRange(i, 'to', e.target.value)} style={{ flex: 1, background: C.white, border: '0.5px solid rgba(184,151,42,0.25)', padding: '9px 10px', fontFamily: SERIF, fontSize: 15, color: C.charcoal }} />
                  <i className="ti ti-x" onClick={() => rmRange(i)} style={{ fontSize: 13, color: C.taupeLight, cursor: 'pointer' }} />
                </div>
          )}
            </div> :
        <div style={{ fontSize: 11.5, color: C.taupeLight, fontFamily: SANS, fontStyle: 'italic' }}>Add the hours you're free on this day.</div>
        }
          <div onClick={addRange} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, cursor: 'pointer', marginTop: 13, color: 'var(--gold-muted)', border: '0.5px dashed rgba(184,151,42,0.45)', padding: '7px 12px', fontSize: 9, letterSpacing: 1.5, textTransform: 'uppercase', fontFamily: SANS }}>
            <i className="ti ti-plus" style={{ fontSize: 12 }} />Add a time range
          </div>
        </div>
      }
      <div style={{ fontSize: 9, letterSpacing: 2, color: C.taupeLight, textTransform: 'uppercase', fontFamily: SANS, marginTop: 12, marginBottom: 4 }}>{daysSet} day{daysSet === 1 ? '' : 's'} with availability</div>

      <div style={{ marginTop: 22 }}><BtnDark onClick={next}>Continue</BtnDark></div>
    </div>);

}

function ObCompat({ next, refined }) {
  const [active, setActive] = useState(0);
  const prompts = refined ? FC.compatPrompts.slice(0, 1) : FC.compatPrompts;
  return (
    <div style={{ padding: '22px 22px 30px' }}>
      <ObEyebrow>A quiet conversation</ObEyebrow>
      <ObHead>Help us <Em>understand you</Em></ObHead>
      <ObBody>Answer as little or as much as you like, in your words. There are no right answers.</ObBody>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14, marginTop: 20 }}>
        {prompts.map((p, i) =>
        <div key={p.id} style={{ background: C.white, border: `0.5px solid ${active === i ? 'var(--gold)' : 'rgba(184,151,42,0.18)'}`, padding: 16 }}>
            <div style={{ fontFamily: SERIF, fontSize: 16, color: C.charcoal, lineHeight: 1.35, marginBottom: i === active ? 12 : 0 }}>{p.q}</div>
            {active === i ?
          <>
                <textarea autoFocus placeholder={p.placeholder} style={{ width: '100%', background: 'transparent', border: 'none', fontFamily: SERIF, fontStyle: 'italic', fontSize: 16, color: C.charcoal, resize: 'none', height: 64, lineHeight: 1.7 }} />
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '0.5px solid rgba(184,151,42,0.12)', paddingTop: 11 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 7, color: 'var(--gold-muted)', cursor: 'pointer' }}>
                    <i className="ti ti-microphone" style={{ fontSize: 15 }} />
                    <span style={{ fontSize: 9, letterSpacing: 2, textTransform: 'uppercase', fontFamily: SANS }}>Voice note</span>
                  </div>
                  {i < prompts.length - 1 && <span onClick={() => setActive(i + 1)} style={{ fontSize: 9, letterSpacing: 2, textTransform: 'uppercase', color: C.taupe, fontFamily: SANS, cursor: 'pointer' }}>Next ›</span>}
                </div>
              </> :

          <div onClick={() => setActive(i)} style={{ fontSize: 10.5, color: 'var(--gold-muted)', fontFamily: SANS, letterSpacing: 1, textTransform: 'uppercase', cursor: 'pointer', marginTop: 8 }}>Answer →</div>
          }
          </div>
        )}
      </div>
      <div style={{ marginTop: 22 }}><BtnDark onClick={next}>Continue</BtnDark></div>
    </div>);

}

function ObIntroPref({ next }) {
  const [sel, setSel] = useState('curated');
  const [pace, setPace] = useState('open');
  const [limit, setLimit] = useState('2');
  const opts = [
  { id: 'immediate', label: 'Introduce me directly', desc: 'When a strong match appears, make the introduction' },
  { id: 'curated', label: 'Curated circles first', desc: 'Ease in through small groups before one-to-ones' },
  { id: 'review', label: 'Let me review first', desc: 'Nothing happens until you approve it' }];

  return (
    <div style={{ padding: '22px 22px 30px' }}>
      <ObEyebrow>Almost there</ObEyebrow>
      <ObHead>How should we <Em>introduce you?</Em></ObHead>
      <ObBody>You're always in control. This simply sets the pace.</ObBody>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, margin: '20px 0 26px' }}>
        {opts.map((o) => {
          const on = sel === o.id;
          return (
            <div key={o.id} onClick={() => setSel(o.id)} style={{ display: 'flex', gap: 13, alignItems: 'center', border: `0.5px solid ${on ? 'var(--gold)' : 'rgba(184,151,42,0.18)'}`, background: on ? 'rgba(232,223,208,0.4)' : C.white, padding: '15px 15px', cursor: 'pointer' }}>
              <div style={{ width: 18, height: 18, borderRadius: '50%', border: `0.5px solid ${on ? 'var(--gold)' : 'rgba(184,151,42,0.3)'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                {on && <div style={{ width: 9, height: 9, borderRadius: '50%', background: 'var(--gold)' }} />}
              </div>
              <div>
                <div style={{ fontFamily: SERIF, fontSize: 17, color: C.charcoal }}>{o.label}</div>
                <div style={{ fontSize: 11, color: C.taupe, fontFamily: SANS, marginTop: 2, lineHeight: 1.4 }}>{o.desc}</div>
              </div>
            </div>);

        })}
      </div>
      <ObSection label="How should introductions arrive?">
        <Segmented value={pace} onChange={setPace} options={[{ v: 'open', label: 'As they come' }, { v: 'limit', label: 'Set a limit' }]} />
        {pace === 'limit' &&
        <div style={{ marginTop: 12 }}>
            <NumPick value={limit} onChange={setLimit} options={[{ v: '1', num: '1', label: 'a week' }, { v: '2', num: '2', label: 'a week' }, { v: '4', num: '4', label: 'a month' }]} />
          </div>
        }
        <div style={{ fontSize: 10.5, color: C.taupeLight, fontFamily: SANS, fontStyle: 'italic', marginTop: 12, lineHeight: 1.5 }}>You can adjust this anytime, or pause introductions altogether.</div>
      </ObSection>
      <BtnDark onClick={next}>Enter Fifth Circle</BtnDark>
    </div>);

}

// ── GOAL-SPECIFIC DETAIL SCREENS ──
function ObFriendship({ next, refined }) {
  const [age, setAge] = useState([30, 49]);
  const [gender, setGender] = useState(['Anyone']);
  const [types, setTypes] = useState(['A close confidant']);
  const [stage, setStage] = useState(['New in town']);
  const [convo, setConvo] = useState(['Deep conversations', 'Ideas & curiosity']);
  return (
    <div style={{ padding: '22px 22px 30px' }}>
      <GoalBadge icon="ti-heart" label="Friendships" />
      <ObHead>The friendships you're <Em>after</Em></ObHead>
      <ObBody>A few quiet signals help your concierge find people you'll genuinely click with.</ObBody>
      <div style={{ marginTop: 22 }}>
        {!refined && <>
        <ObSection label="Age range you connect with">
          <RangeBar min={18} max={75} value={age} onChange={setAge} format={(v) => v >= 75 ? '75+' : v} />
        </ObSection>
        <ObSection label="Gender preference">
          <PickRow multi value={gender} onChange={setGender} options={['Anyone', 'Women', 'Men']} />
        </ObSection>
        </>}
        <ObSection label="Type of friendship">
          <ChipPicker options={['A close confidant', 'An easygoing regular', 'A spontaneous plan-maker', 'Someone to explore the city with', 'A steady, low-key friend']} value={types} onChange={setTypes} sm={false} addLabel="Add your own" />
        </ObSection>
        <ObSection label="Life stage">
          <ChipPicker options={['New in town', 'Early career', 'Parent', 'Empty nester', 'Retired']} value={stage} onChange={setStage} addLabel="Add yours" />
        </ObSection>
        <ObSection label="Conversations you enjoy">
          <ChipPicker options={['Deep conversations', 'Lighthearted', 'Ideas & curiosity', 'Local life', 'Work & craft']} value={convo} onChange={setConvo} addLabel="Add a topic" />
        </ObSection>
        <ObSection label="" mb={22}>
          <ObConciergeField q="Describe the kind of friend you're hoping to find." placeholder="Someone to grab a spontaneous coffee with, who's up for a last-minute plan…" />
        </ObSection>
      </div>
      <BtnDark onClick={next}>Continue</BtnDark>
    </div>);

}

function ObActivity({ next }) {
  const acts = ['Running', 'Climbing', 'Tennis', 'Hiking', 'Cycling', 'Yoga', 'Swimming', 'Strength', 'Pilates'];
  const [picked, setPicked] = useState(['Running', 'Yoga']);
  const [detail, setDetail] = useState({
    Running: { skill: 'inter', slots: [{ place: 'Riverside Loop', time: 'Sat · 7:00 AM' }] },
    Yoga: { skill: 'beg', slots: [{ place: 'Floor 42 Terrace', time: 'Sun · 9:00 AM' }] }
  });
  const ensure = (a) => detail[a] || { skill: 'inter', slots: [] };
  const setD = (a, k, v) => setDetail((d) => ({ ...d, [a]: { ...ensure(a), [k]: v } }));
  const addSlot = (a) => setDetail((d) => ({ ...d, [a]: { ...ensure(a), slots: [...(ensure(a).slots || []), { place: '', time: '' }] } }));
  const setSlot = (a, i, k, v) => setDetail((d) => ({ ...d, [a]: { ...ensure(a), slots: ensure(a).slots.map((s, j) => j === i ? { ...s, [k]: v } : s) } }));
  const rmSlot = (a, i) => setDetail((d) => ({ ...d, [a]: { ...ensure(a), slots: ensure(a).slots.filter((_, j) => j !== i) } }));
  const slotInput = (val, onChange, ph) => <input value={val} onChange={(e) => onChange(e.target.value)} placeholder={ph} style={{ width: '100%', background: 'transparent', border: 'none', borderBottom: '0.5px solid rgba(184,151,42,0.22)', padding: '7px 0', fontFamily: SERIF, fontSize: 15, color: C.charcoal }} />;
  return (
    <div style={{ padding: '22px 22px 30px' }}>
      <GoalBadge icon="ti-run" label="Activity Partners" />
      <ObHead>What do you want a <Em>partner for?</Em></ObHead>
      <ObBody>Pick your activities, or add your own. Add where and when you go so matches can simply join you.</ObBody>
      <div style={{ marginTop: 22 }} data-comment-anchor="857f561f6a-div-498-7">
        <ObSection label="Activities" mb={14}>
          <div data-comment-anchor="bfa0057cff-div-500-11">
            <ChipPicker options={acts} value={picked} onChange={setPicked} addLabel="New activity" />
          </div>
        </ObSection>
        {picked.map((a) => {
          const d = ensure(a);
          return (
            <div key={a} style={{ background: C.white, border: '0.5px solid rgba(184,151,42,0.2)', padding: 15, marginBottom: 12 }}>
              <div style={{ fontFamily: SERIF, fontSize: 17, color: C.charcoal, marginBottom: 13, paddingBottom: 10, borderBottom: '0.5px solid rgba(184,151,42,0.14)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                {a}
                <i className="ti ti-x" onClick={() => setPicked((p) => p.filter((x) => x !== a))} style={{ fontSize: 13, color: C.taupeLight, cursor: 'pointer' }} />
              </div>
              <div style={{ fontSize: 8.5, letterSpacing: 2, textTransform: 'uppercase', color: C.taupeLight, fontFamily: SANS, marginBottom: 8 }}>Skill level</div>
              <Segmented value={d.skill || 'inter'} onChange={(v) => setD(a, 'skill', v)} options={[{ v: 'beg', label: 'Beginner' }, { v: 'inter', label: 'Intermediate' }, { v: 'adv', label: 'Advanced' }]} />

              <div style={{ fontSize: 8.5, letterSpacing: 2, textTransform: 'uppercase', color: C.taupeLight, fontFamily: SANS, margin: '16px 0 4px' }}>Where & when you go</div>
              <div style={{ fontSize: 10, color: C.taupeLight, fontFamily: SANS, fontStyle: 'italic', marginBottom: 10 }}>Shown to matches so they can join you.</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {(d.slots || []).map((s, i) =>
                <div key={i} style={{ display: 'flex', gap: 10, alignItems: 'flex-end' }}>
                    <div style={{ flex: 1.3, display: 'flex', alignItems: 'center', gap: 7 }}>
                      <i className="ti ti-map-pin" style={{ fontSize: 14, color: 'var(--gold-muted)', marginBottom: 7 }} />
                      {slotInput(s.place, (v) => setSlot(a, i, 'place', v), 'Where')}
                    </div>
                    <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 7 }}>
                      <i className="ti ti-clock" style={{ fontSize: 14, color: 'var(--gold-muted)', marginBottom: 7 }} />
                      {slotInput(s.time, (v) => setSlot(a, i, 'time', v), 'When')}
                    </div>
                    {d.slots.length > 1 && <i className="ti ti-x" onClick={() => rmSlot(a, i)} style={{ fontSize: 12, color: C.taupeLight, cursor: 'pointer', marginBottom: 9 }} />}
                  </div>
                )}
              </div>
              <div onClick={() => addSlot(a)} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, cursor: 'pointer', marginTop: 13, color: 'var(--gold-muted)', border: '0.5px dashed rgba(184,151,42,0.45)', padding: '7px 12px', fontSize: 9, letterSpacing: 1.5, textTransform: 'uppercase', fontFamily: SANS }}>
                <i className="ti ti-plus" style={{ fontSize: 12 }} />Add a time
              </div>
            </div>);

        })}
      </div>
      <BtnDark onClick={next}>Continue</BtnDark>
    </div>);

}

function ObProfessional({ next }) {
  const [stage, setStage] = useState('founder');
  const [objs, setObjs] = useState(['Founder network', 'Industry peers']);
  return (
    <div style={{ padding: '22px 22px 30px' }}>
      <GoalBadge icon="ti-briefcase" label="Professional" />
      <ObHead>Your professional <Em>chapter</Em></ObHead>
      <ObBody>So introductions come with a reason — "why we thought this might be valuable."</ObBody>
      <div style={{ marginTop: 22, display: 'flex', flexDirection: 'column', gap: 20 }}>
        <Field label="Industry" placeholder="Design, Architecture, Finance…" />
        <Field label="Role or title" placeholder="Founder, Designer, Investor…" />
        <ObSection label="Career stage" mb={0}>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7 }}>
            {[['student', 'Student'], ['early', 'Early career'], ['mid', 'Mid-career'], ['senior', 'Senior'], ['founder', 'Founder'], ['exec', 'Executive']].map(([v, l]) =>
            <Chip key={v} sm sel={stage === v} onClick={() => setStage(v)}>{l}</Chip>
            )}
          </div>
        </ObSection>
        <ObSection label="Networking objectives" mb={0}>
          <PickRow multi value={objs} onChange={setObjs} options={['Mentor', 'Mentee', 'Hiring', 'Job seeking', 'Founder network', 'Investors', 'Industry peers', 'Accountability']} />
        </ObSection>
        <ObSection label="Expertise you'd happily share" mb={0}>
          <Field label="" placeholder="Product design, fundraising, hiring…" />
        </ObSection>
        <ObConciergeField q="What would make a professional introduction worth your time?" placeholder="Someone a step ahead, generous with what they've learned…" />
      </div>
      <div style={{ marginTop: 22 }}><BtnDark onClick={next}>Continue</BtnDark></div>
    </div>);

}

function ObGroup({ next }) {
  const [match, setMatch] = useState(['People to go to dinner with', 'Meet new neighbours']);
  return (
    <div style={{ padding: '22px 22px 30px' }}>
      <GoalBadge icon="ti-users" label="Group Hangouts" />
      <ObHead>The gatherings you'd <Em>show up for</Em></ObHead>
      <ObBody>Your concierge forms small, compatible groups of 3–6 — never a crowded room. You'll settle on how often once your group is formed.</ObBody>
      <div style={{ marginTop: 22 }}>
        <ObSection label="What would you like to get matched on?">
          <ChipPicker
            options={['People to go to dinner with', 'Matched on interests', 'Similar stage of life', 'Meet new neighbours', 'Creative projects', 'Weekend adventures']}
            value={match} onChange={setMatch} sm={false} addLabel="Add your own" />
        </ObSection>
        <ObConciergeField q="What kind of gathering do you most look forward to?" placeholder="A long dinner where no one's watching the clock…" />
      </div>
      <div style={{ marginTop: 22 }}><BtnDark onClick={next}>Continue</BtnDark></div>
    </div>);

}

function ObDone({ onExit }) {
  return (
    <div style={{ minHeight: '100%', background: C.charcoal, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '40px 30px', textAlign: 'center', position: 'relative', overflow: 'hidden' }}>
      <svg viewBox="0 0 200 200" style={{ position: 'absolute', width: 360, opacity: 0.06 }}>
        <circle cx="100" cy="100" r="92" fill="none" stroke="#B8972A" strokeWidth="1.5" />
        <circle cx="100" cy="100" r="64" fill="none" stroke="#B8972A" strokeWidth="1.5" />
        <circle cx="100" cy="100" r="36" fill="none" stroke="#B8972A" strokeWidth="1.5" />
        <circle cx="100" cy="100" r="12" fill="#B8972A" />
      </svg>
      <div style={{ position: 'relative' }}>
        <div style={{ fontSize: 9, letterSpacing: 5, color: 'var(--gold-light)', textTransform: 'uppercase', fontFamily: SANS, marginBottom: 18 }}>Welcome to</div>
        <img src={window.RES('img/chorus-logo.png')} alt="Chorus" style={{ height: 26, filter: 'invert(1)', opacity: 0.92, marginBottom: 22 }} />
        <div style={{ fontFamily: SERIF, fontSize: 32, fontWeight: 300, color: C.cream, lineHeight: 1.15, marginBottom: 18 }}>You're part of the <Em>circle.</Em></div>
        <div style={{ fontSize: 13, color: 'rgba(242,237,227,0.5)', lineHeight: 1.8, fontFamily: SANS, maxWidth: 280, margin: '0 auto 30px' }}>Your concierge is already getting to know Chorus. The first introductions will arrive quietly.</div>
        <button onClick={onExit} style={{ background: C.cream, color: C.charcoal, border: 'none', fontFamily: SANS, fontSize: 10, letterSpacing: 3, textTransform: 'uppercase', padding: '15px 36px', cursor: 'pointer' }}>Enter your home</button>
      </div>
    </div>);

}

Object.assign(window, { Onboarding, ObFriendship, ObActivity, ObProfessional, ObGroup });