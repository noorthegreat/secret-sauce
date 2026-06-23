/* Fifth Circle — Settings ecosystem & Trust & Safety. */

function SettingsHub({ ctx }) {
  const me = FC.me;
  return (
    <div style={{ paddingBottom: 30 }}>
      <ScreenHeader back="Home" onBack={() => ctx.go('home')} eyebrow="Your account" title="Settings" />
      <div style={{ padding: '20px 22px 0' }}>
        {/* identity card */}
        <Card pad={16} style={{ display: 'flex', gap: 14, alignItems: 'center', marginBottom: 22 }}>
          <Avatar id="noor" size={56} />
          <div style={{ flex: 1 }}>
            <div style={{ fontFamily: SERIF, fontSize: 20, color: C.charcoal }}>{me.name}</div>
            <div style={{ fontSize: 11, color: C.taupe, fontFamily: SANS, marginTop: 2 }}>{me.occupation} · Unit {me.unit}</div>
          </div>
        </Card>

        <SettingsGroup label="Profile">
          <Row icon="ti-user" label="Edit profile" onClick={() => ctx.open('set_profile')} />
          <Row icon="ti-target" label="Goals & interests" onClick={() => ctx.open('set_profile')} />
          <Row icon="ti-calendar-time" label="Availability" onClick={() => ctx.open('set_profile')} last />
        </SettingsGroup>

        <SettingsGroup label="Preferences">
          <Row icon="ti-bell" label="Notifications" value="On" onClick={() => ctx.open('set_notif')} />
          <Row icon="ti-lock" label="Privacy" value="Building only" onClick={() => ctx.open('set_privacy')} />
          <Row icon="ti-sparkles" label="Concierge & introductions" value="Curated" onClick={() => ctx.open('set_privacy')} last />
        </SettingsGroup>

        <SettingsGroup label="Trust & Safety">
          <Row icon="ti-shield" label="Report a resident" onClick={() => ctx.open('report')} />
          <Row icon="ti-ban" label="Blocked residents" value="0" onClick={() => ctx.open('safety')} />
          <Row icon="ti-book" label="Community guidelines" onClick={() => ctx.open('safety')} />
          <Row icon="ti-lifebuoy" label="Safety resources & support" onClick={() => ctx.open('safety')} last />
        </SettingsGroup>

        <SettingsGroup label="Help & feedback">
          <Row icon="ti-bug" label="Report a bug" onClick={() => ctx.open('appfeedback', 'bug')} />
          <Row icon="ti-message-2-heart" label="Share product feedback" onClick={() => ctx.open('appfeedback', 'idea')} last />
        </SettingsGroup>

        <SettingsGroup label="Account">
          <Row icon="ti-pause" label="Pause introductions" onClick={() => ctx.open('account')} />
          <Row icon="ti-download" label="Download my data" onClick={() => ctx.open('account')} />
          <Row icon="ti-logout" label="Log out" danger onClick={() => ctx.open('account')} last />
        </SettingsGroup>

        <SettingsGroup label="Replay">
          <Row icon="ti-route" label="View onboarding flow" onClick={() => ctx.startOnboarding()} last />
        </SettingsGroup>

        <div style={{ textAlign: 'center', fontSize: 9, letterSpacing: 2, color: C.taupeLight, fontFamily: SANS, padding: '8px 0 4px' }}>Fifth Circle · v2.0 · {FC.building}</div>
      </div>
    </div>
  );
}
function SettingsGroup({ label, children }) {
  return (
    <div style={{ marginBottom: 22 }}>
      <SectionLabel mb={10}>{label}</SectionLabel>
      <div style={{ background: C.white, border: '0.5px solid rgba(184,151,42,0.16)' }}>{children}</div>
    </div>
  );
}

// ── EDIT PROFILE ──
function SetProfile({ ctx }) {
  const me = FC.me;
  const [interests, setInterests] = useState(me.interests);
  const [goals, setGoals] = useState(me.goals);
  const toggleI = t => setInterests(s => s.includes(t) ? s.filter(x => x !== t) : [...s, t]);
  return (
    <div style={{ paddingBottom: 30 }}>
      <ScreenHeader back="Settings" onBack={ctx.back} title="Edit profile" />
      <div style={{ padding: '20px 22px 0' }}>
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 22 }}>
          <div style={{ position: 'relative' }}>
            <Avatar id="noor" size={84} />
            <div style={{ position: 'absolute', bottom: 0, right: 0, width: 26, height: 26, borderRadius: '50%', background: C.charcoal, display: 'flex', alignItems: 'center', justifyContent: 'center', border: `2px solid ${C.cream}` }}>
              <i className="ti ti-camera" style={{ fontSize: 12, color: 'var(--gold)' }} />
            </div>
          </div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          <PrefilledField label="Full name" value={me.name} />
          <PrefilledField label="Occupation" value={me.occupation} />
          <PrefilledField label="Bio" value={me.bio} area />
          <div>
            <FieldLabel>Interests</FieldLabel>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7 }}>
              {FC.interestSuggestions.slice(0, 14).map(t => <Chip key={t} sm sel={interests.includes(t)} onClick={() => toggleI(t)}>{t}</Chip>)}
            </div>
          </div>
          <div>
            <FieldLabel>Here to</FieldLabel>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7 }}>
              {['Friendships', 'Activity Partners', 'Professional Networking', 'Group Hangouts', 'Wellness Communities', 'Creative Circles'].map(g => <Chip key={g} sm sel={goals.includes(g)} onClick={() => setGoals(s => s.includes(g) ? s.filter(x => x !== g) : [...s, g])}>{g}</Chip>)}
            </div>
          </div>
        </div>
        <div style={{ marginTop: 24 }}><BtnDark onClick={ctx.back}>Save changes</BtnDark></div>
      </div>
    </div>
  );
}
function PrefilledField({ label, value, area }) {
  return (
    <div>
      <FieldLabel>{label}</FieldLabel>
      {area
        ? <textarea defaultValue={value} style={{ width: '100%', background: 'transparent', border: 'none', borderBottom: '0.5px solid rgba(184,151,42,0.22)', padding: '9px 0', fontFamily: SERIF, fontStyle: 'italic', fontSize: 16, color: C.charcoal, resize: 'none', height: 70, lineHeight: 1.7 }} />
        : <input defaultValue={value} style={{ width: '100%', background: 'transparent', border: 'none', borderBottom: '0.5px solid rgba(184,151,42,0.22)', padding: '11px 0', fontFamily: SERIF, fontSize: 17, color: C.charcoal }} />}
    </div>
  );
}

// ── NOTIFICATIONS ──
function SetNotif({ ctx }) {
  const [push, setPush] = useState({ intros: true, events: true, messages: true, building: false });
  const [email, setEmail] = useState({ intros: true, matches: true, events: true, announcements: true, community: false });
  const [freq, setFreq] = useState('realtime');
  return (
    <div style={{ paddingBottom: 30 }}>
      <ScreenHeader back="Settings" onBack={ctx.back} title="Notifications" />
      <div style={{ padding: '20px 22px 0' }}>
        <SectionLabel mb={10}>Frequency</SectionLabel>
        <div style={{ marginBottom: 24 }}>
          <Segmented value={freq} onChange={setFreq} options={[{ v: 'realtime', label: 'Real-time' }, { v: 'daily', label: 'Daily' }, { v: 'weekly', label: 'Weekly' }]} />
        </div>
        <ToggleGroup label="Push" state={push} setState={setPush} items={[['intros', 'New introductions'], ['events', 'Event reminders'], ['messages', 'Messages'], ['building', 'Building updates']]} />
        <ToggleGroup label="Email" state={email} setState={setEmail} items={[['intros', 'New introductions'], ['matches', 'Activity matches'], ['events', 'Event reminders'], ['announcements', 'Building announcements'], ['community', 'Community updates']]} />
      </div>
    </div>
  );
}
function ToggleGroup({ label, state, setState, items }) {
  return (
    <div style={{ marginBottom: 24 }}>
      <SectionLabel mb={10}>{label}</SectionLabel>
      <div style={{ background: C.white, border: '0.5px solid rgba(184,151,42,0.16)' }}>
        {items.map(([k, lbl], i) => (
          <div key={k} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '13px 15px', borderBottom: i < items.length - 1 ? '0.5px solid rgba(184,151,42,0.1)' : 'none' }}>
            <span style={{ fontSize: 12.5, color: C.charcoal, fontFamily: SANS, fontWeight: 300 }}>{lbl}</span>
            <Toggle on={state[k]} onClick={() => setState(s => ({ ...s, [k]: !s[k] }))} />
          </div>
        ))}
      </div>
    </div>
  );
}

// ── PRIVACY ──
function SetPrivacy({ ctx }) {
  const [vis, setVis] = useState('building');
  const [introFreq, setIntroFreq] = useState('moderate');
  const [contact, setContact] = useState(true);
  const [pause, setPause] = useState(false);
  const [hide, setHide] = useState(false);
  return (
    <div style={{ paddingBottom: 30 }}>
      <ScreenHeader back="Settings" onBack={ctx.back} title="Privacy" />
      <div style={{ padding: '20px 22px 0' }}>
        <SectionLabel mb={10}>Profile visibility</SectionLabel>
        <div style={{ marginBottom: 8 }}>
          <Segmented value={vis} onChange={setVis} options={[{ v: 'building', label: 'Building' }, { v: 'private', label: 'Private' }]} />
        </div>
        <div style={{ fontSize: 10.5, color: C.taupeLight, fontFamily: SANS, fontStyle: 'italic', marginBottom: 24, lineHeight: 1.5 }}>During the pilot, introductions stay within your building — only residents of Chorus, and only people your concierge introduces you to.</div>

        <SectionLabel mb={10}>Introduction pace</SectionLabel>
        <div style={{ marginBottom: 24 }}>
          <Segmented value={introFreq} onChange={setIntroFreq} options={[{ v: 'low', label: 'Gentle' }, { v: 'moderate', label: 'Moderate' }, { v: 'high', label: 'Open' }]} />
        </div>

        <div style={{ background: C.white, border: '0.5px solid rgba(184,151,42,0.16)' }}>
          {[['Share contact details once connected', contact, setContact], ['Pause all introductions', pause, setPause], ['Hide my profile from search', hide, setHide]].map(([lbl, val, set], i, arr) => (
            <div key={lbl} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 15px', borderBottom: i < arr.length - 1 ? '0.5px solid rgba(184,151,42,0.1)' : 'none' }}>
              <span style={{ fontSize: 12.5, color: C.charcoal, fontFamily: SANS, fontWeight: 300, flex: 1, paddingRight: 12 }}>{lbl}</span>
              <Toggle on={val} onClick={() => set(!val)} />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── REPORT RESIDENT ──
function ReportResident({ ctx }) {
  const [cat, setCat] = useState(null);
  const [done, setDone] = useState(false);
  const cats = ['Harassment', 'Inappropriate behavior', 'Spam', 'Fake profile', 'Safety concern', 'Other'];
  if (done) return (
    <div style={{ paddingBottom: 30 }}>
      <ScreenHeader back="Settings" onBack={ctx.back} title="Report received" />
      <div style={{ padding: '40px 30px', textAlign: 'center' }}>
        <i className="ti ti-shield-check" style={{ fontSize: 26, color: C.green }} />
        <div style={{ fontFamily: SERIF, fontStyle: 'italic', fontSize: 18, color: C.charcoalSoft, marginTop: 16, lineHeight: 1.6 }}>Thank you. Our team reviews every report personally and confidentially. We'll follow up if we need anything.</div>
        <div style={{ marginTop: 24 }}><BtnDark onClick={ctx.back}>Back to settings</BtnDark></div>
      </div>
    </div>
  );
  return (
    <div style={{ paddingBottom: 30 }}>
      <ScreenHeader back="Settings" onBack={ctx.back} eyebrow="Confidential" title="Report a resident" />
      <div style={{ padding: '20px 22px 0' }}>
        <div style={{ fontSize: 12.5, color: C.taupe, fontFamily: SANS, lineHeight: 1.7, marginBottom: 22, fontWeight: 300 }}>Reports are confidential and never shared with the person reported. Our community team handles each one personally.</div>
        <Field label="Resident name or unit" placeholder="Who is this about?" />
        <div style={{ margin: '22px 0' }}>
          <FieldLabel>Reason</FieldLabel>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {cats.map(c => <Chip key={c} sel={cat === c} onClick={() => setCat(c)}>{c}</Chip>)}
          </div>
        </div>
        <Field label="What happened?" placeholder="Share as much as you're comfortable with…" area />
        <div style={{ marginTop: 22 }}><BtnDark onClick={() => setDone(true)} disabled={!cat}>Submit report</BtnDark></div>
      </div>
    </div>
  );
}

// ── SAFETY RESOURCES / GUIDELINES / BLOCKED ──
function SafetyResources({ ctx }) {
  const guidelines = [
    ['Treat every neighbor with warmth and respect', 'ti-heart-handshake'],
    ['Introductions are mutual — never pressure anyone', 'ti-users'],
    ['Keep shared spaces and gatherings welcoming', 'ti-home'],
    ['What’s shared in confidence stays in confidence', 'ti-lock'],
  ];
  return (
    <div style={{ paddingBottom: 30 }}>
      <ScreenHeader back="Settings" onBack={ctx.back} eyebrow="Trust & Safety" title="Safety & support" />
      <div style={{ padding: '20px 22px 0' }}>
        <SectionLabel mb={12}>Community guidelines</SectionLabel>
        <div style={{ background: C.white, border: '0.5px solid rgba(184,151,42,0.16)', padding: '4px 16px', marginBottom: 24 }}>
          {guidelines.map(([g, ic], i) => (
            <div key={i} style={{ display: 'flex', gap: 13, alignItems: 'center', padding: '14px 0', borderBottom: i < guidelines.length - 1 ? '0.5px solid rgba(184,151,42,0.1)' : 'none' }}>
              <i className={`ti ${ic}`} style={{ fontSize: 17, color: 'var(--gold-muted)', flexShrink: 0 }} />
              <span style={{ fontFamily: SERIF, fontSize: 15.5, color: C.charcoal, lineHeight: 1.4 }}>{g}</span>
            </div>
          ))}
        </div>

        <SectionLabel mb={10}>Blocked residents</SectionLabel>
        <div style={{ background: C.white, border: '0.5px solid rgba(184,151,42,0.16)', padding: '18px 16px', marginBottom: 24, textAlign: 'center', fontFamily: SERIF, fontStyle: 'italic', fontSize: 14.5, color: C.taupe }}>You haven't blocked anyone.</div>

        <SectionLabel mb={10}>Get support</SectionLabel>
        <div style={{ background: C.white, border: '0.5px solid rgba(184,151,42,0.16)' }}>
          <Row icon="ti-message" label="Message community team" value="Replies in ~2h" onClick={() => {}} />
          <Row icon="ti-phone" label="Building front desk" value="24/7" onClick={() => {}} />
          <Row icon="ti-lifebuoy" label="Emergency resources" onClick={() => {}} last />
        </div>
      </div>
    </div>
  );
}

// ── ACCOUNT ──
function AccountMgmt({ ctx }) {
  const [pause, setPause] = useState(false);
  return (
    <div style={{ paddingBottom: 30 }}>
      <ScreenHeader back="Settings" onBack={ctx.back} title="Account" />
      <div style={{ padding: '20px 22px 0' }}>
        <div style={{ background: C.white, border: '0.5px solid rgba(184,151,42,0.16)', marginBottom: 24 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 15px', borderBottom: '0.5px solid rgba(184,151,42,0.1)' }}>
            <div>
              <div style={{ fontSize: 12.5, color: C.charcoal, fontFamily: SANS }}>Pause introductions</div>
              <div style={{ fontSize: 10, color: C.taupeLight, fontFamily: SANS, marginTop: 2 }}>Take a quiet break, keep your profile</div>
            </div>
            <Toggle on={pause} onClick={() => setPause(!pause)} />
          </div>
          <Row icon="ti-mail" label="Email address" value="noor@email.com" />
          <Row icon="ti-key" label="Change password" onClick={() => {}} last />
        </div>

        <SectionLabel mb={10}>Your data</SectionLabel>
        <div style={{ background: C.white, border: '0.5px solid rgba(184,151,42,0.16)', marginBottom: 24 }}>
          <Row icon="ti-download" label="Download my data" onClick={() => {}} />
          <Row icon="ti-eye-off" label="What we collect" onClick={() => {}} last />
        </div>

        <SectionLabel mb={10}>Legal</SectionLabel>
        <div style={{ background: C.white, border: '0.5px solid rgba(184,151,42,0.16)', marginBottom: 24 }}>
          <Row label="Terms of Service" onClick={() => {}} />
          <Row label="Privacy Policy" onClick={() => {}} />
          <Row label="Community Guidelines" onClick={() => {}} last />
        </div>

        <div style={{ background: C.white, border: '0.5px solid rgba(184,151,42,0.16)' }}>
          <Row icon="ti-logout" label="Log out" danger onClick={() => {}} />
          <Row icon="ti-trash" label="Delete account" danger onClick={() => {}} last />
        </div>
      </div>
    </div>
  );
}

// ── REPORT A BUG / PRODUCT FEEDBACK ──
function AppFeedback({ id, ctx }) {
  const bug = id === 'bug';
  const [cat, setCat] = useState(null);
  const [rating, setRating] = useState(0);
  const [done, setDone] = useState(false);
  const cfg = bug ?
    { eyebrow: 'Help us improve', title: <>Report a <Em>bug</Em></>, intro: "Something not working as it should? Tell us what happened and we'll look into it.", label: 'Where did it happen?', cats: ['Introductions', 'Circles', 'Events', 'Concierge', 'Profile', 'Notifications', 'Something else'], q: 'What went wrong?', ph: "What you did, what you expected, and what happened instead…" } :
    { eyebrow: 'We\u2019re listening', title: <>Share product <Em>feedback</Em></>, intro: "Ideas, wishes, or thoughts on Fifth Circle — we read every one.", label: 'What\u2019s this about?', cats: ['A new idea', 'Something I love', 'Something confusing', 'A feature request', 'General thoughts'], q: 'Tell us more', ph: "What would make Fifth Circle better for you…" };
  if (done) return (
    <div style={{ paddingBottom: 30 }}>
      <ScreenHeader back="Settings" onBack={ctx.back} title="Thank you" />
      <div style={{ padding: '40px 30px', textAlign: 'center' }}>
        <i className={`ti ${bug ? 'ti-bug' : 'ti-heart-handshake'}`} style={{ fontSize: 26, color: C.green }} />
        <div style={{ fontFamily: SERIF, fontStyle: 'italic', fontSize: 19, color: C.charcoalSoft, marginTop: 16, lineHeight: 1.6 }}>{bug ? "Thank you — your report is with our team. We'll follow up if we need more detail." : "Thank you for helping shape Fifth Circle. Your note is with the team."}</div>
        <div style={{ marginTop: 24 }}><BtnDark onClick={ctx.back}>Back to settings</BtnDark></div>
      </div>
    </div>
  );
  return (
    <div style={{ paddingBottom: 30 }}>
      <ScreenHeader back="Settings" onBack={ctx.back} eyebrow={cfg.eyebrow} title={cfg.title} />
      <div style={{ padding: '20px 22px 0' }}>
        <div style={{ fontSize: 12.5, color: C.taupe, fontFamily: SANS, lineHeight: 1.7, marginBottom: 22, fontWeight: 300 }}>{cfg.intro}</div>
        {!bug && (
          <div style={{ marginBottom: 22 }}>
            <FieldLabel>How are we doing?</FieldLabel>
            <div style={{ display: 'flex', gap: 7 }}>
              {[1, 2, 3, 4, 5].map(n => (
                <span key={n} onClick={() => setRating(n)} style={{ fontFamily: SERIF, fontSize: 30, lineHeight: 1, cursor: 'pointer', color: n <= rating ? 'var(--gold)' : 'rgba(184,151,42,0.22)' }}>★</span>
              ))}
            </div>
          </div>
        )}
        <div style={{ marginBottom: 22 }}>
          <FieldLabel>{cfg.label}</FieldLabel>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {cfg.cats.map(c => <Chip key={c} sel={cat === c} onClick={() => setCat(c)}>{c}</Chip>)}
          </div>
        </div>
        <Field label={cfg.q} placeholder={cfg.ph} area />
        {bug && <div style={{ marginTop: 18 }}><Field label="Steps to reproduce (optional)" placeholder="1. Open Circles  2. Tap a circle…" area /></div>}
        <div style={{ marginTop: 22 }}><BtnDark onClick={() => setDone(true)} disabled={!cat}>{bug ? 'Submit report' : 'Send feedback'}</BtnDark></div>
        <div style={{ fontSize: 10, color: C.taupeLight, fontFamily: SANS, fontStyle: 'italic', marginTop: 12, textAlign: 'center', lineHeight: 1.5 }}>Sent privately to the Fifth Circle team. Never shared with other residents.</div>
      </div>
    </div>
  );
}

Object.assign(window, { SettingsHub, SetProfile, SetNotif, SetPrivacy, ReportResident, SafetyResources, AccountMgmt, AppFeedback });
