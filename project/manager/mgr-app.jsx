/* Fifth Circle Manager — App shell: rail, phone stage, tabs, tweaks. */

const _mqp = new URLSearchParams(window.location.search);
const MGR_EMBED = _mqp.get('embed') === '1';
const MGR_INIT_SCREEN = _mqp.get('screen') || null;

const TWEAK_DEFAULTS = {
  "accent": ["#B8972A", "#D4AE3C", "#9A7E22"],
  "building": "Chorus Apartments",
  "buildingState": "active"
};

const RAIL = [
  { g: 'Access' },
  { k: 'auth:login', l: 'Manager login' },
  { k: 'auth:register', l: 'Building registration' },
  { k: 'auth:pending', l: 'Pending approval' },
  { g: 'Main · tabs' },
  { k: 'tab:pulse', l: 'Community Pulse' },
  { k: 'tab:events', l: 'Events' },
  { k: 'tab:residents', l: 'Residents' },
  { k: 'tab:reports', l: 'Executive Report' },
  { k: 'tab:more', l: 'More · operations' },
  { g: 'Detail' },
  { k: 'satisfaction', l: 'Satisfaction & reviews', tab: 'pulse' }
];

// Parse initial screen from URL for embed mode
function parseInitScreen(screen) {
  if (!screen) return { mode: 'auth', tab: 'pulse', stack: [], seg: null };
  if (screen.startsWith('auth:')) return { mode: 'auth', authView: screen.slice(5), tab: 'pulse', stack: [], seg: null };
  if (screen.startsWith('tab:')) return { mode: 'app', tab: screen.slice(4), stack: [], seg: null };
  if (screen.startsWith('events:')) return { mode: 'app', tab: 'events', stack: [], seg: screen.slice(7) };
  if (screen === 'vendor') return { mode: 'app', tab: 'more', stack: [{ view: 'vendor', id: null }], seg: null };
  return { mode: 'app', tab: screen, stack: [], seg: null };
}

function App() {
  const [t, setTweak] = useTweaks(TWEAK_DEFAULTS);
  const store = useFC();
  const mtr = window.FCStore.metrics();
  useEffect(() => { window.FCStore.setMode(t.buildingState || 'active'); }, [t.buildingState]);
  const _init = parseInitScreen(MGR_INIT_SCREEN);
  const [mode, setMode] = useState(MGR_EMBED ? (_init.mode || 'app') : 'auth');
  const [authView, setAuthView] = useState(_init.authView || 'login');
  const [tab, setTab] = useState(_init.tab || 'pulse');
  const [stack, setStack] = useState(_init.stack || []);
  const [initSeg, setInitSeg] = useState(_init.seg || null);
  const [railKey, setRailKey] = useState(MGR_EMBED ? (MGR_INIT_SCREEN || 'tab:pulse') : 'auth:login');
  const scrollRef = useRef(null);
  const accent = Array.isArray(t.accent) ? t.accent : TWEAK_DEFAULTS.accent;
  const scrollTop = () => { if (scrollRef.current) scrollRef.current.scrollTop = 0; };

  const ctx = {
    auth: (v) => { setMode('auth'); setAuthView(v); setRailKey('auth:' + v); scrollTop(); },
    enter: (tb) => { setMode('app'); setTab(tb || 'pulse'); setStack([]); setInitSeg(null); setRailKey('tab:' + (tb || 'pulse')); scrollTop(); },
    go: (tb) => { setMode('app'); setTab(tb); setStack([]); setInitSeg(null); setRailKey('tab:' + tb); scrollTop(); },
    open: (view, id) => { setStack((s) => [...s, { view, id }]); scrollTop(); },
    back: () => { setStack((s) => s.slice(0, -1)); scrollTop(); }
  };

  // Embed API: postMessage or window.mgrJump(screen)
  useEffect(() => {
    const doJump = (screen) => {
      const p = parseInitScreen(screen);
      setMode(p.mode); setTab(p.tab); setStack(p.stack); setInitSeg(p.seg);
      if (p.authView) setAuthView(p.authView);
      scrollTop();
    };
    if (MGR_EMBED && MGR_INIT_SCREEN) doJump(MGR_INIT_SCREEN);
    const handler = (e) => { if (e.data && e.data.type === 'mgr:jump' && e.data.screen) doJump(e.data.screen); };
    window.addEventListener('message', handler);
    window.mgrJump = doJump;
    return () => window.removeEventListener('message', handler);
  }, []);

  const jump = (item) => {
    setRailKey(item.k);
    if (item.k.startsWith('auth:')) { setMode('auth'); setAuthView(item.k.slice(5)); scrollTop(); return; }
    setMode('app');
    if (item.k.startsWith('tab:')) { setTab(item.k.slice(4)); setStack([]); scrollTop(); return; }
    setTab(item.tab || 'pulse'); setStack([{ view: item.k, id: null }]); scrollTop();
  };

  let content, label;
  if (mode === 'auth') {
    content = authView === 'register' ? <RegisterScreen ctx={ctx} /> : authView === 'pending' ? <PendingScreen ctx={ctx} /> : <LoginScreen ctx={ctx} />;
    label = authView === 'register' ? 'Building registration' : authView === 'pending' ? 'Pending approval' : 'Manager login';
  } else if (stack.length) {
    const top = stack[stack.length - 1];
    content = top.view === 'satisfaction' ? <SatisfactionScreen ctx={ctx} /> :
              top.view === 'vendor' ? <VendorDirectory ctx={ctx} /> :
              renderTab(tab, ctx, initSeg);
    label = top.view === 'vendor' ? 'Vendor Directory' : 'Satisfaction';
  } else {
    content = renderTab(tab, ctx, initSeg);
    label = { pulse: 'Community pulse', events: 'Event operations', residents: 'Residents', reports: 'Executive report', more: 'Operations & settings' }[tab];
  }

  const showTabBar = mode === 'app' && !stack.length;

  // Embed mode: bare content only, no rail or phone chrome
  if (MGR_EMBED) {
    return (
      <div style={{ '--gold': accent[0], '--gold-light': accent[1], '--gold-muted': accent[2], width: '100%', minHeight: '100%', background: '#F3EDE2', display: 'flex', flexDirection: 'column' }}>
        {content}
        {showTabBar && <TabBar active={tab} onTab={ctx.go} badge={{ events: mtr.proposalsPending || undefined, more: FCM.reports.filter((r) => r.status !== 'resolved').length }} />}
      </div>
    );
  }

  return (
    <div style={{ '--gold': accent[0], '--gold-light': accent[1], '--gold-muted': accent[2], display: 'flex', minHeight: '100vh', width: '100%', background: '#1C1915', justifyContent: 'center' }}>
      {/* rail */}
      <div style={{ width: 232, flexShrink: 0, borderRight: '0.5px solid rgba(255,255,255,0.06)', height: '100vh', position: 'sticky', top: 0, display: 'flex', flexDirection: 'column' }}>
        <div style={{ padding: '24px 24px 18px', borderBottom: '0.5px solid rgba(255,255,255,0.05)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 11, marginBottom: 8 }}>
            <Logo size={26} light />
            <div style={{ fontFamily: SERIF, fontSize: 13, letterSpacing: 6, color: 'rgba(242,237,227,0.42)', fontWeight: 300 }}>FIFTH CIRCLE</div>
          </div>
          <div style={{ fontSize: 8.5, letterSpacing: 3, textTransform: 'uppercase', color: 'var(--gold-muted)', marginTop: 7, fontFamily: SANS }}>Management Portal</div>
          <div style={{ fontSize: 9, color: 'rgba(184,151,42,0.4)', marginTop: 3, fontFamily: SANS, letterSpacing: 0.5 }}>{FCM.building}</div>
        </div>
        <div style={{ flex: 1, overflowY: 'auto', padding: '8px 0 24px' }}>
          {RAIL.map((item, i) => item.g ?
            <div key={i} style={{ fontSize: 8.5, letterSpacing: 3, textTransform: 'uppercase', color: 'rgba(184,151,42,0.4)', padding: '16px 24px 6px', fontFamily: SANS }}>{item.g}</div> :
            <div key={i} onClick={() => jump(item)} style={{ display: 'flex', alignItems: 'center', padding: '9px 24px', cursor: 'pointer', userSelect: 'none', background: railKey === item.k ? 'rgba(255,255,255,0.04)' : 'transparent', borderLeft: `1px solid ${railKey === item.k ? 'var(--gold)' : 'transparent'}` }}>
              <span style={{ fontSize: 10, letterSpacing: 1.5, textTransform: 'uppercase', fontFamily: SANS, color: railKey === item.k ? 'rgba(242,237,227,0.9)' : 'rgba(242,237,227,0.32)' }}>{item.l}</span>
            </div>)}
        </div>
      </div>

      {/* phone stage */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-start', padding: '40px 24px', gap: 16, overflowY: 'auto', height: '100vh' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 8.5, letterSpacing: 4, textTransform: 'uppercase', color: 'var(--gold-muted)', fontFamily: SANS }}>{mode === 'auth' ? 'Access' : 'Manager experience'}</div>
          <div style={{ fontFamily: SERIF, fontStyle: 'italic', fontSize: 19, color: 'rgba(242,237,227,0.45)', marginTop: 3 }}>{label}</div>
        </div>
        <Phone scrollRef={scrollRef} footer={showTabBar ? <TabBar active={tab} onTab={ctx.go} badge={{ events: mtr.proposalsPending || undefined, more: FCM.reports.filter((r) => r.status !== 'resolved').length }} /> : null}>
          {content}
        </Phone>
      </div>

      <TweaksPanel title="Tweaks">
        <TweakSection label="Palette" />
        <TweakColor label="Gold accent" value={t.accent}
          options={[["#B8972A", "#D4AE3C", "#9A7E22"], ["#A8843C", "#C6A14E", "#8C6A24"], ["#9C7B4A", "#C2A06A", "#7E6038"], ["#8C8A5A", "#ADA978", "#6E6C40"]]}
          onChange={(v) => setTweak('accent', v)} />
        <TweakSection label="Building state" />
        <TweakRadio label="Activity" value={t.buildingState}
          options={[{ value: "active", label: "Live pilot" }, { value: "empty", label: "Day one" }]}
          onChange={(v) => { setTweak('buildingState', v); window.FCStore.setMode(v); }} />
      </TweaksPanel>
    </div>);
}

function renderTab(tab, ctx, initSeg) {
  switch (tab) {
    case 'pulse': return <PulseScreen ctx={ctx} />;
    case 'events': return <EventsScreen ctx={ctx} initSeg={initSeg} />;
    case 'residents': return <ResidentsScreen ctx={ctx} />;
    case 'reports': return <ReportScreen ctx={ctx} />;
    case 'more': return <MoreScreen ctx={ctx} />;
    default: return <PulseScreen ctx={ctx} />;
  }
}

ReactDOM.createRoot(document.getElementById('root')).render(<App />);
