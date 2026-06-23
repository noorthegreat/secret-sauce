/* Fifth Circle — shared UI primitives. Exports to window. */
const { useState, useRef, useEffect } = React;

// ── tokens (mirrors :root) ──
const C = {
  cream: '#F3EDE2', creamDeep: '#EAE2D4', parchment: '#E8DFD0',
  charcoal: '#1C1915', charcoalSoft: '#302D26',
  gold: 'var(--gold)', goldLight: 'var(--gold-light)', goldMuted: 'var(--gold-muted)',
  taupe: '#8A8070', taupeLight: '#B4A898', white: '#FDFAF5', green: '#6B8C5A',
  line: 'rgba(184,151,42,0.18)', lineSoft: 'rgba(184,151,42,0.1)'
};
const SERIF = "'Cormorant Garamond',serif";
const SANS = "'Jost',sans-serif";

// ── Visual-refinement context ──
// false = original (gold hairlines, gradient initials).
// true  = refined surface (warm-stone borders + depth, rationed gold, photographic faces).
const FCVisual = React.createContext(false);
const useVisual = () => React.useContext(FCVisual);

// Depth tokens for refined surfaces
const STONE = 'rgba(60,49,33,0.12)';        // warm-stone border, replaces the gold hairline
const STONE_SOFT = 'rgba(60,49,33,0.07)';
const SHADOW = '0 1px 2px rgba(28,25,21,0.04), 0 6px 18px rgba(28,25,21,0.07)';
const SHADOW_LIFT = '0 2px 4px rgba(28,25,21,0.05), 0 14px 34px rgba(28,25,21,0.11)';
const RAD = 14;

const GRADS = {
  sebastian: 'linear-gradient(145deg,#3a3526,#5a4d2e)', mara: 'linear-gradient(145deg,#4a3a3a,#6b4d4d)',
  david: 'linear-gradient(145deg,#2e3a44,#3d5566)', priya: 'linear-gradient(145deg,#43354a,#5e4566)',
  elena: 'linear-gradient(145deg,#3a4436,#556b4d)', theo: 'linear-gradient(145deg,#44402e,#6b6240)',
  noor: 'linear-gradient(145deg,#5a4d2e,#8a6e18)'
};

// ── Avatar ──
// In visual mode renders a photographic portrait (graceful gradient-initial fallback).
// `drop` makes it a real-photo drop target (used for the large hero portraits).
function Avatar({ id, size = 44, sel, drop }) {
  const visual = useVisual();
  const r = FC.residents[id] || { initials: '··' };
  const ring = sel ? '0.5px solid var(--gold)' : visual ? '0.5px solid rgba(60,49,33,0.18)' : '0.5px solid rgba(184,151,42,0.3)';
  const initials = (
    <div style={{
      width: size, height: size, borderRadius: '50%', flexShrink: 0,
      background: GRADS[id] || C.charcoalSoft, color: C.cream,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontFamily: SERIF, fontSize: size * 0.34, letterSpacing: 0.5, fontWeight: 400
    }}>{r.initials}</div>);
  if (!visual || !FC.residents[id]) {
    return <div style={{ borderRadius: '50%', flexShrink: 0, border: ring }}>{initials}</div>;
  }
  const src = window.RES(`img/faces/${id}.png`);
  if (drop) {
    return (
      <div className="fc-face" style={{ width: size, height: size, borderRadius: '50%', flexShrink: 0, position: 'relative', boxShadow: sel ? '0 0 0 2px var(--gold)' : '0 8px 22px rgba(28,25,21,0.28)' }}>
        <image-slot id={`fc-face-${id}`} src={src} shape="circle" placeholder="Drop a portrait"
          style={{ width: size, height: size, display: 'block' }}></image-slot>
      </div>);
  }
  return (
    <div style={{ width: size, height: size, borderRadius: '50%', flexShrink: 0, overflow: 'hidden', border: ring, position: 'relative', background: GRADS[id] }}>
      <img src={src} alt={r.name || ''} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
    </div>);
}

// ── Availability calendar — pick days × time-of-day in a mini grid ──
// value/onChange use slot strings like "Thu 18 · Morning". Days are the next
// six from a fixed "today" (the app's mock Wednesday, Jun 17 2026).
const AVAIL_BANDS = [
  { id: 'Morning', sub: '8–11a' },
  { id: 'Midday', sub: '12–3p' },
  { id: 'Evening', sub: '6–9p' }
];
function availDays() {
  const DOW = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const out = [];
  for (let i = 0; i < 6; i++) {
    const d = new Date(2026, 5, 18 + i);
    out.push({ key: `${DOW[d.getDay()]} ${d.getDate()}`, dow: DOW[d.getDay()], date: d.getDate() });
  }
  return out;
}
function AvailabilityCalendar({ value = [], onChange }) {
  const days = React.useMemo(availDays, []);
  const toggle = (slot) => onChange(value.includes(slot) ? value.filter((s) => s !== slot) : [...value, slot]);
  const cell = (sel) => ({
    height: 40, borderRadius: 8, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
    border: `0.5px solid ${sel ? 'var(--gold)' : 'rgba(60,49,33,0.18)'}`,
    background: sel ? 'rgba(184,151,42,0.14)' : 'transparent', transition: 'all .12s'
  });
  return (
    <div>
      {/* band header */}
      <div style={{ display: 'grid', gridTemplateColumns: '52px 1fr 1fr 1fr', gap: 6, marginBottom: 7 }}>
        <span />
        {AVAIL_BANDS.map((b) => (
          <div key={b.id} style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 9, letterSpacing: 1, textTransform: 'uppercase', color: 'var(--gold-muted)', fontFamily: SANS }}>{b.id}</div>
            <div style={{ fontSize: 8.5, color: C.taupeLight, fontFamily: SANS, marginTop: 1 }}>{b.sub}</div>
          </div>
        ))}
      </div>
      {/* day rows */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {days.map((d) => (
          <div key={d.key} style={{ display: 'grid', gridTemplateColumns: '52px 1fr 1fr 1fr', gap: 6, alignItems: 'center' }}>
            <div style={{ textAlign: 'center', lineHeight: 1 }}>
              <div style={{ fontSize: 8.5, letterSpacing: 1, textTransform: 'uppercase', color: C.taupe, fontFamily: SANS }}>{d.dow}</div>
              <div style={{ fontFamily: SERIF, fontSize: 18, color: C.charcoal, marginTop: 2 }}>{d.date}</div>
            </div>
            {AVAIL_BANDS.map((b) => {
              const slot = `${d.key} · ${b.id}`;
              const sel = value.includes(slot);
              return (
                <div key={b.id} onClick={() => toggle(slot)} style={cell(sel)}>
                  {sel && <i className="ti ti-check" style={{ fontSize: 15, color: 'var(--gold-muted)' }} />}
                </div>);
            })}
          </div>
        ))}
      </div>
    </div>);
}

// ── Meet-loop progress — introduction → real-world meeting ──
// stage: 'accepted' | 'coordinating' | 'upcoming' | 'met'
const MEET_STEPS = [
  { key: 'accepted', label: 'Accepted' },
  { key: 'coordinating', label: 'Coordinating' },
  { key: 'upcoming', label: 'Confirmed' },
  { key: 'met', label: 'Met' },
];
function MeetProgress({ stage = 'accepted' }) {
  const idx = Math.max(0, MEET_STEPS.findIndex((s) => s.key === stage));
  return (
    <div style={{ display: 'flex', alignItems: 'flex-start' }}>
      {MEET_STEPS.map((s, i) => {
        const done = i < idx, active = i === idx;
        const on = done || active;
        return (
          <div key={s.key} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', position: 'relative' }}>
            {i > 0 && <div style={{ position: 'absolute', top: 7, right: '50%', width: '100%', height: 1, background: i <= idx ? 'var(--gold)' : 'rgba(60,49,33,0.18)' }} />}
            <div style={{ width: 15, height: 15, borderRadius: '50%', position: 'relative', zIndex: 1, background: done ? 'var(--gold)' : active ? 'var(--gold)' : C.white, border: `1px solid ${on ? 'var(--gold)' : 'rgba(60,49,33,0.25)'}`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              {done && <i className="ti ti-check" style={{ fontSize: 9, color: C.cream }} />}
              {active && <div style={{ width: 5, height: 5, borderRadius: '50%', background: C.cream }} />}
            </div>
            <span style={{ fontSize: 8, letterSpacing: 1, textTransform: 'uppercase', fontFamily: SANS, marginTop: 7, color: on ? 'var(--gold-muted)' : C.taupeLight, textAlign: 'center' }}>{s.label}</span>
          </div>);
      })}
    </div>);
}

// ── Affinity, drawn as the bullseye rings (replaces the percentage) ──
// rings fill from the outside in as compatibility rises — the mark *is* the metric.
function AffinityRings({ compat = 80, size = 46, word }) {
  const lit = compat >= 90 ? 5 : compat >= 85 ? 4 : compat >= 80 ? 3 : compat >= 74 ? 2 : 1;
  const radii = [4, 9.5, 15, 20.5, 26];
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
      <svg viewBox="0 0 60 60" width={size} height={size} style={{ display: 'block' }}>
        <circle cx="30" cy="30" r="4" fill="var(--gold)" />
        {radii.slice(1).map((rr, i) => (
          <circle key={i} cx="30" cy="30" r={rr} fill="none"
            stroke={i + 1 < lit ? 'var(--gold)' : 'rgba(60,49,33,0.18)'}
            strokeWidth={i + 1 < lit ? 1.6 : 1} />
        ))}
      </svg>
      {word && <div style={{ fontFamily: SERIF, fontStyle: 'italic', fontSize: size * 0.3, color: 'var(--gold-muted)', lineHeight: 1, textAlign: 'center' }}>{word}</div>}
    </div>);
}

// ── Eyebrow / labels ──
const Eyebrow = ({ children, c }) =>
<div style={{ fontSize: 9, letterSpacing: 4, color: c || C.goldMuted, textTransform: 'uppercase', fontFamily: SANS }}>{children}</div>;

const SectionLabel = ({ children, mb = 14 }) => {
  const visual = useVisual();
  return <div style={{ fontSize: 9, letterSpacing: 3, color: visual ? 'rgba(138,128,112,0.85)' : 'var(--gold)', textTransform: 'uppercase', fontFamily: SANS, marginBottom: mb }}>{children}</div>;
};

// Title with optional italic gold emphasis (use <em>)
function Title({ children, size = 28 }) {
  return <div style={{ fontFamily: SERIF, fontSize: size, fontWeight: 300, color: C.charcoal, lineHeight: 1.12 }}>{children}</div>;
}
const Em = ({ children }) => <em style={{ fontStyle: 'italic', color: 'var(--gold)' }}>{children}</em>;

// ── Chip ──
const Chip = ({ children, sel, onClick, sm }) => {
  const visual = useVisual();
  const idle = visual ? 'rgba(60,49,33,0.2)' : 'rgba(184,151,42,0.22)';
  return (
  <div onClick={onClick} style={{
    border: `0.5px solid ${sel ? 'var(--gold)' : idle}`,
    background: sel ? 'rgba(184,151,42,0.1)' : 'transparent',
    color: sel ? 'var(--gold-muted)' : C.taupe,
    borderRadius: visual ? 7 : 0,
    padding: sm ? '6px 11px' : '8px 14px', fontSize: sm ? 9 : 10, letterSpacing: 1.5,
    textTransform: 'uppercase', fontFamily: SANS, cursor: onClick ? 'pointer' : 'default',
    transition: 'all .12s', whiteSpace: 'nowrap'
  }}>{children}</div>);
};

// ── RangeBar — draggable dual-thumb range slider ──
function RangeBar({ min = 18, max = 75, value = [30, 49], onChange, step = 1, format = (v) => v }) {
  const trackRef = useRef(null);
  const [lo, hi] = value;
  const span = max - min;
  const pct = (v) => (v - min) / span * 100;
  const drag = (which) => (e) => {
    e.preventDefault();
    const move = (ev) => {
      const t = trackRef.current;if (!t) return;
      const rect = t.getBoundingClientRect();
      const clientX = ev.touches ? ev.touches[0].clientX : ev.clientX;
      let raw = min + (clientX - rect.left) / rect.width * span;
      raw = Math.round(raw / step) * step;
      raw = Math.max(min, Math.min(max, raw));
      if (which === 'lo') onChange([Math.min(raw, hi), hi]);else
      onChange([lo, Math.max(raw, lo)]);
    };
    const up = () => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
      window.removeEventListener('touchmove', move);
      window.removeEventListener('touchend', up);
    };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
    window.addEventListener('touchmove', move, { passive: false });
    window.addEventListener('touchend', up);
  };
  const thumb = (left, which) =>
  <div onPointerDown={drag(which)} onTouchStart={drag(which)} style={{
    position: 'absolute', left: `${left}%`, top: '50%', transform: 'translate(-50%,-50%)',
    width: 26, height: 26, borderRadius: '50%', background: C.white, border: '0.5px solid var(--gold)',
    boxShadow: '0 1px 4px rgba(28,25,21,0.18)', cursor: 'grab', touchAction: 'none', zIndex: 2,
    display: 'flex', alignItems: 'center', justifyContent: 'center'
  }}>
      <div style={{ width: 9, height: 9, borderRadius: '50%', background: 'var(--gold)' }} />
    </div>;

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
        <span style={{ fontFamily: SERIF, fontSize: 26, fontWeight: 300, color: 'var(--gold-muted)', lineHeight: 1 }}>{format(lo)}</span>
        <span style={{ fontFamily: SERIF, fontStyle: 'italic', fontSize: 15, color: C.taupeLight, alignSelf: 'center' }}>to</span>
        <span style={{ fontFamily: SERIF, fontSize: 26, fontWeight: 300, color: 'var(--gold-muted)', lineHeight: 1 }}>{format(hi)}</span>
      </div>
      <div ref={trackRef} style={{ position: 'relative', height: 26, display: 'flex', alignItems: 'center', userSelect: 'none' }}>
        <div style={{ position: 'absolute', left: 0, right: 0, height: 3, background: 'rgba(184,151,42,0.2)' }} />
        <div style={{ position: 'absolute', left: `${pct(lo)}%`, width: `${pct(hi) - pct(lo)}%`, height: 3, background: 'var(--gold)' }} />
        {thumb(pct(lo), 'lo')}
        {thumb(pct(hi), 'hi')}
      </div>
    </div>);

}

// ── ChipPicker — selectable chips with custom "+ add" ──
// value: string[] (selected). options: suggested labels. Custom additions
// are remembered locally and rendered alongside the suggestions.
function ChipPicker({ options = [], value = [], onChange, max, sm = true, addLabel = 'Add your own' }) {
  const [extra, setExtra] = useState([]);
  const [adding, setAdding] = useState(false);
  const [draft, setDraft] = useState('');
  const all = [...options, ...extra.filter((e) => !options.includes(e))];
  const atMax = max != null && value.length >= max;
  const toggle = (t) => {
    if (value.includes(t)) onChange(value.filter((x) => x !== t));else
    if (!atMax) onChange([...value, t]);
  };
  const commit = () => {
    const t = draft.trim();
    if (t && !all.some((o) => o.toLowerCase() === t.toLowerCase()) && !atMax) {
      setExtra((e) => [...e, t]);
      onChange([...value, t]);
    }
    setDraft('');setAdding(false);
  };
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7, alignItems: 'center' }}>
      {all.map((t) => <Chip key={t} sm={sm} sel={value.includes(t)} onClick={() => toggle(t)}>{t}</Chip>)}
      {adding ?
      <input
        autoFocus value={draft} onChange={(e) => setDraft(e.target.value)}
        onBlur={commit} onKeyDown={(e) => {if (e.key === 'Enter') {e.preventDefault();commit();}if (e.key === 'Escape') {setDraft('');setAdding(false);}}}
        placeholder={addLabel}
        style={{ border: '0.5px solid var(--gold)', background: 'rgba(184,151,42,0.06)', color: C.charcoal, padding: sm ? '6px 11px' : '8px 14px', fontSize: sm ? 9 : 10, letterSpacing: 1.5, textTransform: 'uppercase', fontFamily: SANS, width: 120 }} /> :


      <div onClick={() => !atMax && setAdding(true)} style={{
        display: 'inline-flex', alignItems: 'center', gap: 5, cursor: atMax ? 'default' : 'pointer',
        border: '0.5px dashed rgba(184,151,42,0.45)', background: 'transparent', color: atMax ? C.taupeLight : 'var(--gold-muted)',
        padding: sm ? '6px 11px' : '8px 14px', fontSize: sm ? 9 : 10, letterSpacing: 1.5, textTransform: 'uppercase', fontFamily: SANS, opacity: atMax ? 0.4 : 1
      }}>
          <i className="ti ti-plus" style={{ fontSize: sm ? 11 : 13 }} />Add
        </div>
      }
    </div>);

}

// small read-only tag (serif)
const Tag = ({ children, shared }) => {
  const visual = useVisual();
  const idleBorder = visual ? 'rgba(60,49,33,0.16)' : 'rgba(184,151,42,0.18)';
  return (
  <span style={{
    fontSize: 10, letterSpacing: 1.5, textTransform: 'uppercase', fontFamily: SANS,
    color: shared ? 'var(--gold-muted)' : C.taupe,
    border: `0.5px solid ${shared ? 'rgba(184,151,42,0.45)' : idleBorder}`,
    background: shared ? 'rgba(184,151,42,0.08)' : 'transparent',
    borderRadius: visual ? 6 : 0,
    padding: '5px 11px', whiteSpace: 'nowrap'
  }}>{children}</span>);
};


// ── Buttons ──
function BtnDark({ children, onClick, disabled, full = true, mt = 0 }) {
  return (
    <button onClick={disabled ? undefined : onClick} style={{
      width: full ? '100%' : 'auto', background: disabled ? 'rgba(28,25,21,0.08)' : C.charcoal,
      color: disabled ? C.taupeLight : C.cream, border: 'none', cursor: disabled ? 'default' : 'pointer',
      fontFamily: SANS, fontSize: 10, letterSpacing: 3, textTransform: 'uppercase',
      padding: '15px 28px', marginTop: mt
    }}>{children}</button>);

}
function BtnGhost({ children, onClick, active, danger, sm }) {
  const col = danger ? '#7A2E2E' : active ? 'var(--gold-muted)' : C.taupe;
  const bd = danger ? 'rgba(122,46,46,0.4)' : active ? 'var(--gold)' : 'rgba(184,151,42,0.25)';
  return (
    <button onClick={onClick} style={{
      background: active ? 'rgba(184,151,42,0.1)' : 'transparent', border: `0.5px solid ${bd}`,
      color: col, fontFamily: SANS, fontSize: sm ? 8 : 9, letterSpacing: 2, textTransform: 'uppercase',
      padding: sm ? '6px 11px' : '9px 16px', cursor: 'pointer', whiteSpace: 'nowrap'
    }}>{children}</button>);

}

// ── Card ──
const Card = ({ children, onClick, style, dark, pad = 16, lift }) => {
  const visual = useVisual();
  const refinedSurface = visual && !dark ? {
    border: `0.5px solid ${lift ? STONE : STONE_SOFT}`,
    borderRadius: RAD,
    boxShadow: lift ? SHADOW_LIFT : SHADOW
  } : {
    border: dark ? 'none' : '0.5px solid rgba(184,151,42,0.16)'
  };
  return (
  <div onClick={onClick} style={{
    background: dark ? C.charcoal : C.white,
    padding: pad, cursor: onClick ? 'pointer' : 'default',
    ...refinedSurface, ...style
  }}>{children}</div>);
};


// ── Toggle switch ──
function Toggle({ on, onClick }) {
  return (
    <div onClick={onClick} style={{
      width: 40, height: 23, borderRadius: 12, flexShrink: 0, cursor: 'pointer',
      background: on ? 'var(--gold)' : 'rgba(140,128,112,0.28)', position: 'relative', transition: 'background .15s'
    }}>
      <div style={{
        position: 'absolute', top: 2.5, left: on ? 19.5 : 2.5, width: 18, height: 18, borderRadius: '50%',
        background: C.white, transition: 'left .15s', boxShadow: '0 1px 2px rgba(0,0,0,0.2)'
      }} />
    </div>);

}

// ── Segmented control ──
function Segmented({ options, value, onChange }) {
  return (
    <div style={{ display: 'flex', border: '0.5px solid rgba(184,151,42,0.2)', background: C.white }}>
      {options.map((o, i) => {
        const a = value === o.v;
        return (
          <div key={o.v} onClick={() => onChange(o.v)} style={{
            flex: 1, padding: '11px 4px', textAlign: 'center', cursor: 'pointer',
            fontFamily: SANS, fontSize: 9, letterSpacing: 1.5, textTransform: 'uppercase',
            color: a ? 'var(--gold-muted)' : C.taupeLight, background: a ? 'rgba(232,223,208,0.55)' : 'transparent',
            borderLeft: i ? '0.5px solid rgba(184,151,42,0.18)' : 'none'
          }}>{o.label}</div>);

      })}
    </div>);

}

// ── List row (settings) ──
function Row({ icon, label, value, onClick, danger, last }) {
  return (
    <div onClick={onClick} style={{
      display: 'flex', alignItems: 'center', gap: 12, padding: '14px 15px', cursor: onClick ? 'pointer' : 'default',
      borderBottom: last ? 'none' : '0.5px solid rgba(184,151,42,0.1)'
    }}>
      {icon && <i className={`ti ${icon}`} style={{ fontSize: 16, color: danger ? '#7A2E2E' : 'var(--gold-muted)', width: 18 }} />}
      <span style={{ flex: 1, fontSize: 12.5, letterSpacing: 0.5, color: danger ? '#7A2E2E' : C.charcoal, fontFamily: SANS, fontWeight: 300 }}>{label}</span>
      {value && <span style={{ fontSize: 11, color: C.taupeLight, fontFamily: SANS }}>{value}</span>}
      {onClick && !danger && <span style={{ fontSize: 15, color: C.taupeLight }}>›</span>}
    </div>);

}

// ── Screen header (sticky parchment) ──
function ScreenHeader({ eyebrow, title, back, onBack, right, children }) {
  return (
    <div style={{ background: C.parchment, padding: '16px 22px 14px', borderBottom: '0.5px solid rgba(184,151,42,0.2)', position: 'sticky', top: 0, zIndex: 5 }} data-comment-anchor="263d92fbd6-div-254-5">
      {(back || right) &&
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, minHeight: 14 }}>
          {back ? <button onClick={onBack} style={{ background: 'none', border: 'none', padding: 0, fontSize: 9, letterSpacing: 2, textTransform: 'uppercase', color: C.taupeLight, fontFamily: SANS, cursor: 'pointer' }}>‹ {back}</button> : <span />}
          {right}
        </div>
      }
      {eyebrow && <div style={{ marginBottom: 6 }}><Eyebrow>{eyebrow}</Eyebrow></div>}
      <Title>{title}</Title>
      {children}
    </div>);

}

// ── Tab bar ──
const TABS = [
{ id: 'home', label: 'Home', icon: 'ti-home' },
{ id: 'people', label: 'People', icon: 'ti-users' },
{ id: 'circles', label: 'Circles', icon: 'ti-circles' },
{ id: 'events', label: 'Events', icon: 'ti-calendar-event' },
{ id: 'concierge', label: 'Concierge', icon: 'ti-sparkles' }];

function TabBar({ active, onTab }) {
  return (
    <div style={{
      flexShrink: 0, display: 'flex', background: C.parchment,
      borderTop: '0.5px solid rgba(184,151,42,0.2)', padding: '9px 6px 5px'
    }}>
      {TABS.map((t) => {
        const a = active === t.id;
        return (
          <div key={t.id} onClick={() => onTab(t.id)} style={{
            flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, cursor: 'pointer', padding: '2px 0'
          }}>
            <i className={`ti ${t.icon}`} style={{ fontSize: 19, color: a ? 'var(--gold)' : 'rgba(140,128,112,0.55)' }} />
            <span style={{ fontSize: 8, letterSpacing: 1, textTransform: 'uppercase', fontFamily: SANS, color: a ? 'var(--gold-muted)' : 'rgba(140,128,112,0.6)' }}>{t.label}</span>
          </div>);

      })}
    </div>);

}

// ── iPhone frame ──
function StatusBar() {
  return (
    <div style={{ height: 50, flexShrink: 0, display: 'flex', alignItems: 'flex-end', padding: '0 26px 8px', justifyContent: 'space-between', background: C.parchment, position: 'relative', zIndex: 20 }}>
      <span style={{ fontSize: 15, fontWeight: 600, color: C.charcoal, fontFamily: SANS }}>9:41</span>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <div style={{ display: 'flex', gap: 1.5, alignItems: 'flex-end' }}>
          {[4, 7, 10, 13].map((h, i) => <div key={i} style={{ width: 3, height: h, background: C.charcoal, opacity: i === 3 ? 0.25 : 0.7 }} />)}
        </div>
        <svg width="15" height="11" viewBox="0 0 16 12" fill="none"><path d="M8 2.4C10.5 2.4 12.7 3.5 14.2 5.2L15.5 3.9C13.6 1.8 11 0.5 8 0.5C5 0.5 2.4 1.8 0.5 3.9L1.8 5.2C3.3 3.5 5.5 2.4 8 2.4Z" fill="#1C1915" opacity="0.7" /><path d="M8 5.6C9.7 5.6 11.2 6.3 12.3 7.5L13.6 6.2C12.1 4.7 10.2 3.7 8 3.7C5.8 3.7 3.9 4.7 2.4 6.2L3.7 7.5C4.8 6.3 6.3 5.6 8 5.6Z" fill="#1C1915" opacity="0.7" /><circle cx="8" cy="10.5" r="1.5" fill="#1C1915" opacity="0.7" /></svg>
        <div style={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <div style={{ width: 22, height: 11, border: '1.5px solid rgba(28,25,21,0.7)', borderRadius: 2, padding: 1.5 }}><div style={{ width: '70%', height: '100%', background: 'rgba(28,25,21,0.7)' }} /></div>
          <div style={{ width: 2, height: 5, background: 'rgba(28,25,21,0.4)' }} />
        </div>
      </div>
    </div>);

}
function Phone({ children, footer, scrollRef }) {
  return (
    <div style={{
      width: 390, flexShrink: 0, borderRadius: 48, overflow: 'hidden', display: 'flex', flexDirection: 'column',
      position: 'relative', height: 'min(844px, calc(100vh - 96px))', background: C.parchment,
      boxShadow: '0 0 0 9px #0D0B09,0 0 0 11px rgba(255,255,255,0.03),0 36px 90px rgba(0,0,0,0.7)'
    }}>
      <div style={{ position: 'absolute', top: 11, left: '50%', transform: 'translateX(-50%)', width: 120, height: 34, background: '#0D0B09', borderRadius: 22, zIndex: 30 }} />
      <StatusBar />
      <div ref={scrollRef} style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden', background: C.cream, position: 'relative' }}>{children}</div>
      {footer}
      <div style={{ height: 26, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: C.parchment, borderTop: '0.5px solid rgba(184,151,42,0.1)' }}>
        <div style={{ width: 120, height: 4, background: 'rgba(28,25,21,0.16)', borderRadius: 3 }} />
      </div>
    </div>);

}

// concierge whisper line (italic, used across app)
function ConciergeWhisper({ children, pad = '14px 16px' }) {
  return (
    <div style={{ display: 'flex', gap: 11, padding: pad, background: 'rgba(184,151,42,0.06)', border: '0.5px solid rgba(184,151,42,0.2)' }}>
      <i className="ti ti-sparkles" style={{ fontSize: 14, color: 'var(--gold)', marginTop: 2, flexShrink: 0 }} />
      <div style={{ fontFamily: SERIF, fontStyle: 'italic', fontSize: 14.5, lineHeight: 1.65, color: C.charcoalSoft }}>{children}</div>
    </div>);

}

// ── Concierge "preparing" empty state — warm, optimistic, bullseye watermark ──
function PreparingState({ line, sub, label = 'From your concierge', icon = 'ti-sparkles' }) {
  return (
    <div style={{ position: 'relative', overflow: 'hidden', background: C.white, border: '0.5px solid rgba(184,151,42,0.18)', padding: '36px 26px', display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
      <svg viewBox="0 0 200 200" style={{ position: 'absolute', width: 250, opacity: 0.055, top: '50%', left: '50%', transform: 'translate(-50%,-50%)' }}>
        <circle cx="100" cy="100" r="92" fill="none" stroke="var(--gold)" strokeWidth="1.5" />
        <circle cx="100" cy="100" r="66" fill="none" stroke="var(--gold)" strokeWidth="1.5" />
        <circle cx="100" cy="100" r="40" fill="none" stroke="var(--gold)" strokeWidth="1.5" />
        <circle cx="100" cy="100" r="14" fill="var(--gold)" />
      </svg>
      <div style={{ position: 'relative' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, marginBottom: 14 }}>
          <i className={`ti ${icon}`} style={{ fontSize: 13, color: 'var(--gold)' }} />
          <span style={{ fontSize: 9, letterSpacing: 3, textTransform: 'uppercase', color: 'var(--gold-muted)', fontFamily: SANS }}>{label}</span>
        </div>
        <div style={{ fontFamily: SERIF, fontStyle: 'italic', fontSize: 18, lineHeight: 1.55, color: C.charcoalSoft, maxWidth: 290, margin: '0 auto' }}>{line}</div>
        {sub && <div style={{ fontSize: 11, color: C.taupe, fontFamily: SANS, marginTop: 12, lineHeight: 1.6, maxWidth: 260, margin: '12px auto 0' }}>{sub}</div>}
      </div>
    </div>);

}

// ── Fifth Circle bullseye mark ──
function Logo({ size = 64, light }) {
  const ring = light ? 'rgba(242,237,227,0.85)' : C.charcoal;
  const center = light ? '#F3EDE2' : C.charcoal;
  return (
    <svg viewBox="0 0 400 400" width={size} height={size} style={{ display: 'block' }}>
      <circle cx="200" cy="200" r="186" fill="none" stroke="var(--gold)" strokeWidth="5" />
      <circle cx="200" cy="200" r="150" fill="none" stroke={ring} strokeWidth="3.5" />
      <circle cx="200" cy="200" r="112" fill="none" stroke={ring} strokeWidth="3.5" />
      <circle cx="200" cy="200" r="74" fill="none" stroke={ring} strokeWidth="3" />
      <circle cx="200" cy="200" r="38" fill="none" stroke={ring} strokeWidth="2.5" />
      <circle cx="200" cy="200" r="11" fill={center} />
    </svg>);

}
// Wordmark — stacked or inline
function Wordmark({ light, size = 13, ls = 7 }) {
  return <div style={{ fontFamily: SERIF, fontSize: size, letterSpacing: ls, fontWeight: 400, color: light ? 'rgba(242,237,227,0.55)' : C.charcoal }}>FIFTH CIRCLE</div>;
}

Object.assign(window, {
  C, SERIF, SANS, FCVisual, useVisual, Avatar, AffinityRings, MeetProgress, AvailabilityCalendar, Eyebrow, SectionLabel, Title, Em, Chip, Tag,
  STONE, STONE_SOFT, SHADOW, SHADOW_LIFT, RAD,
  BtnDark, BtnGhost, Card, Toggle, Segmented, Row, ScreenHeader, TABS, TabBar,
  Phone, StatusBar, ConciergeWhisper, Logo, Wordmark, ChipPicker, RangeBar, PreparingState
});