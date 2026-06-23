/* Fifth Circle — App shell: router, screen-jump rail, tweaks. */

const TWEAK_DEFAULTS = /*EDITMODE-BEGIN*/{
  "accent": ["#B8972A", "#D4AE3C", "#9A7E22"],
  "surface": "refined",
  "tone": "balanced",
  "refinements": "after",
  "resident": "established"
} /*EDITMODE-END*/;

const RAIL = [
{ g: 'Welcome' },
{ k: 'landing', l: 'Landing · welcome' },
{ k: 'onboarding', l: 'Onboarding flow' },
{ g: 'Main · tabs' },
{ k: 'tab:home', l: 'Resident Home' },
{ k: 'tab:people', l: 'People & Introductions' },
{ k: 'tab:circles', l: 'Curated Circles' },
{ k: 'tab:events', l: 'Events & Gatherings' },
{ k: 'tab:concierge', l: 'Concierge' },
{ g: 'Detail screens' },
{ k: 'goalpref:activity', l: 'Goal · Activity partners', tab: 'concierge' },
{ k: 'goalpref:professional', l: 'Goal · Professional', tab: 'concierge' },
{ k: 'intro:ethan', l: 'Introduction review', tab: 'people' },
{ k: 'profile:alex', l: 'Resident profile', tab: 'people' },
{ k: 'meetfeedback:james', l: 'Post-meetup feedback', tab: 'people' },
{ k: 'circle:coffee', l: 'Circle detail', tab: 'circles' },
{ k: 'event:wine', l: 'Event detail', tab: 'events' },
{ k: 'building', l: 'Chorus building profile', tab: 'home' },
{ k: 'suggest', l: 'Suggest a gathering', tab: 'events' },
{ k: 'feedback', l: 'Post-event feedback', tab: 'events' },
{ g: 'Settings' },
{ k: 'settings', l: 'Settings hub', tab: 'home' },
{ k: 'set_profile', l: 'Edit profile', tab: 'home' },
{ k: 'set_notif', l: 'Notifications', tab: 'home' },
{ k: 'set_privacy', l: 'Privacy', tab: 'home' },
{ g: 'Trust & Safety' },
{ k: 'report', l: 'Report a resident', tab: 'home' },
{ k: 'safety', l: 'Safety & support', tab: 'home' },
{ k: 'account', l: 'Account', tab: 'home' },
{ g: 'Help & feedback' },
{ k: 'appfeedback:bug', l: 'Report a bug', tab: 'home' },
{ k: 'appfeedback:idea', l: 'Product feedback', tab: 'home' }];


function App() {
  const [t, setTweak] = useTweaks(TWEAK_DEFAULTS);
  const [mode, setMode] = useState('app'); // app | onboarding
  const [obStart, setObStart] = useState('landing');
  const [tab, setTab] = useState('home');
  const [stack, setStack] = useState([]); // [{view,id}]
  const scrollRef = useRef(null);
  const [railKey, setRailKey] = useState('tab:home');

  const accent = Array.isArray(t.accent) ? t.accent : TWEAK_DEFAULTS.accent;
  const tone = t.tone || 'balanced';
  const refined = (t.refinements || 'after') !== 'before';
  const newArrival = t.resident === 'new arrival';
  const visual = (t.surface || 'refined') === 'refined';

  const scrollTop = () => {if (scrollRef.current) scrollRef.current.scrollTop = 0;};

  const ctx = {
    go: (tb) => {setTab(tb);setStack([]);setMode('app');setRailKey('tab:' + tb);scrollTop();},
    open: (view, id) => {setStack((s) => [...s, { view, id }]);scrollTop();},
    back: () => {setStack((s) => s.slice(0, -1));scrollTop();},
    startOnboarding: () => {setObStart('landing');setMode('onboarding');setRailKey('landing');scrollTop();},
    refined, newArrival, visual
  };

  const jump = (item) => {
    setRailKey(item.k);
    if (item.k === 'landing') {setObStart('landing');setMode('onboarding');scrollTop();return;}
    if (item.k === 'onboarding') {setObStart('consent');setMode('onboarding');scrollTop();return;}
    setMode('app');
    if (item.k.startsWith('tab:')) {setTab(item.k.slice(4));setStack([]);scrollTop();return;}
    // detail screen
    const base = item.tab || 'home';
    setTab(base);
    if (item.k.includes(':')) {
      const [view, id] = item.k.split(':');
      setStack([{ view, id }]);
    } else {
      setStack([{ view: item.k, id: null }]);
    }
    scrollTop();
  };

  // ── render current screen ──
  let content;
  if (mode === 'onboarding') {
    content = <Onboarding key={obStart} start={obStart} refined={refined} onExit={() => ctx.go('home')} />;
  } else if (stack.length) {
    const top = stack[stack.length - 1];
    content = renderDetail(top.view, top.id, ctx, tone);
  } else {
    content = renderTab(tab, ctx, tone);
  }

  const showTabBar = mode === 'app';

  return (
    <div style={{ '--gold': accent[0], '--gold-light': accent[1], '--gold-muted': accent[2], display: 'flex', minHeight: '100vh', width: '100%', background: '#1C1915', justifyContent: 'center' }}>
      {/* Screen-jump rail */}
      <div style={{ width: 232, flexShrink: 0, borderRight: '0.5px solid rgba(255,255,255,0.06)', height: '100vh', position: 'sticky', top: 0, display: 'flex', flexDirection: 'column' }}>
        <div style={{ padding: '24px 24px 18px', borderBottom: '0.5px solid rgba(255,255,255,0.05)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 11, marginBottom: 8 }}>
            <Logo size={26} light />
            <div style={{ fontFamily: SERIF, fontSize: 13, letterSpacing: 6, color: 'rgba(242,237,227,0.42)', fontWeight: 300 }}>FIFTH CIRCLE</div>
          </div>
          <div style={{ fontSize: 8.5, letterSpacing: 3, textTransform: 'uppercase', color: 'var(--gold-muted)', marginTop: 7, fontFamily: SANS }}>Resident App · v2</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginTop: 11, paddingTop: 11, borderTop: '0.5px solid rgba(255,255,255,0.06)' }}>
            <span style={{ fontSize: 8, letterSpacing: 2, textTransform: 'uppercase', color: 'rgba(242,237,227,0.3)', fontFamily: SANS }}>Deployed at</span>
            <span style={{ fontSize: 9.5, letterSpacing: 2, textTransform: 'uppercase', color: 'rgba(242,237,227,0.6)', fontFamily: SANS }} data-comment-anchor="0f22db65d9-img-111-13">Chorus</span>
          </div>
        </div>
        <div style={{ flex: 1, overflowY: 'auto', padding: '8px 0 24px' }}>
          {RAIL.map((item, i) => item.g ?
          <div key={i} style={{ fontSize: 8.5, letterSpacing: 3, textTransform: 'uppercase', color: 'rgba(184,151,42,0.4)', padding: '16px 24px 6px', fontFamily: SANS }}>{item.g}</div> :

          <div key={i} onClick={() => jump(item)} style={{ display: 'flex', alignItems: 'center', padding: '9px 24px', cursor: 'pointer', userSelect: 'none', background: railKey === item.k ? 'rgba(255,255,255,0.04)' : 'transparent', borderLeft: `1px solid ${railKey === item.k ? 'var(--gold)' : 'transparent'}` }}>
              <span style={{ fontSize: 10, letterSpacing: 1.5, textTransform: 'uppercase', fontFamily: SANS, color: railKey === item.k ? 'rgba(242,237,227,0.9)' : 'rgba(242,237,227,0.32)' }}>{item.l}</span>
            </div>
          )}
        </div>
      </div>

      {/* Phone stage */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-start', padding: '40px 24px', gap: 16, overflowY: 'auto', height: '100vh' }} data-comment-anchor="f21d456d74-div-127-7">
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 8.5, letterSpacing: 4, textTransform: 'uppercase', color: 'var(--gold-muted)', fontFamily: SANS }}>{mode === 'onboarding' ? railKey === 'landing' ? 'Welcome' : 'Onboarding' : 'Resident experience'}</div>
          <div style={{ fontFamily: SERIF, fontStyle: 'italic', fontSize: 19, color: 'rgba(242,237,227,0.45)', marginTop: 3 }} data-comment-anchor="931b10f14f-div-150-3">{mode === 'onboarding' ? railKey === 'landing' ? 'The front door' : 'Becoming a member' : currentLabel(mode, stack, tab)}</div>
        </div>
        <Phone scrollRef={scrollRef} footer={showTabBar ? <TabBar active={tab} onTab={ctx.go} /> : null}>
          <FCVisual.Provider value={visual}>{content}</FCVisual.Provider>
        </Phone>
      </div>

      <TweaksPanel title="Tweaks">
        <TweakSection label="Surface" />
        <TweakRadio label="Visual" value={t.surface || 'refined'} options={['hairline', 'refined']}
        onChange={(v) => setTweak('surface', v)} />
        <TweakSection label="Palette" />
        <TweakColor label="Gold accent" value={t.accent}
        options={[["#B8972A", "#D4AE3C", "#9A7E22"], ["#A8843C", "#C6A14E", "#8C6A24"], ["#9C7B4A", "#C2A06A", "#7E6038"], ["#8C8A5A", "#ADA978", "#6E6C40"]]}
        onChange={(v) => setTweak('accent', v)} data-comment-anchor="2d20cb55ad-div-120-38" />
        <TweakSection label="Concierge" />
        <TweakRadio label="Tone" value={t.tone} options={['warm', 'balanced', 'reserved']}
        onChange={(v) => setTweak('tone', v)} />
        <TweakSection label="Pilot refinements" />
        <TweakRadio label="Version" value={t.refinements || 'after'} options={['before', 'after']}
        onChange={(v) => setTweak('refinements', v)} />
        <TweakRadio label="Resident" value={t.resident || 'established'} options={['established', 'new arrival']}
        onChange={(v) => setTweak('resident', v)} />
      </TweaksPanel>
    </div>);

}

function renderTab(tab, ctx, tone) {
  switch (tab) {
    case 'home':return <HomeScreen ctx={ctx} tone={tone} />;
    case 'people':return <PeopleScreen ctx={ctx} />;
    case 'circles':return <CirclesScreen ctx={ctx} />;
    case 'events':return <EventsScreen ctx={ctx} />;
    case 'concierge':return <ConciergeScreen ctx={ctx} tone={tone} />;
    default:return <HomeScreen ctx={ctx} tone={tone} />;
  }
}
function renderDetail(view, id, ctx, tone) {
  switch (view) {
    case 'profile':return <ProfileScreen id={id} ctx={ctx} />;
    case 'intro':return <IntroReview id={id} ctx={ctx} tone={tone} />;
    case 'circle':return <CircleDetail id={id} ctx={ctx} />;
    case 'event':return <EventDetail id={id} ctx={ctx} />;
    case 'suggest':return <SuggestEvent ctx={ctx} />;
    case 'feedback':return <EventFeedback ctx={ctx} />;
    case 'settings':return <SettingsHub ctx={ctx} />;
    case 'set_profile':return <SetProfile ctx={ctx} />;
    case 'set_notif':return <SetNotif ctx={ctx} />;
    case 'set_privacy':return <SetPrivacy ctx={ctx} />;
    case 'report':return <ReportResident ctx={ctx} />;
    case 'safety':return <SafetyResources ctx={ctx} />;
    case 'account':return <AccountMgmt ctx={ctx} />;
    case 'building':return <BuildingProfile ctx={ctx} />;
    case 'goalpref':return <GoalPrefScreen id={id} ctx={ctx} />;
    case 'meetfeedback':return <MeetFeedback id={id} ctx={ctx} />;
    case 'appfeedback':return <AppFeedback id={id} ctx={ctx} />;
    default:return <HomeScreen ctx={ctx} tone={tone} />;
  }
}
function currentLabel(mode, stack, tab) {
  if (mode === 'onboarding') return 'Becoming a member';
  const L = { profile: 'Resident profile', intro: 'Introduction', circle: 'Circle', event: 'Gathering', suggest: 'Suggest a gathering', feedback: 'Feedback', settings: 'Settings', set_profile: 'Edit profile', set_notif: 'Notifications', set_privacy: 'Privacy', report: 'Report', safety: 'Safety & support', account: 'Account', appfeedback: 'Feedback', building: 'Chorus', meetfeedback: 'After your meetup', goalpref: 'Sharpen your matches' };
  if (stack.length) return L[stack[stack.length - 1].view] || '';
  const T = { home: 'Your home', people: 'People', circles: 'Circles', events: 'Gatherings', concierge: 'Concierge' };
  return T[tab] || '';
}

ReactDOM.createRoot(document.getElementById('root')).render(<App />);