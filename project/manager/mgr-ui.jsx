/* Fifth Circle Manager — shared UI primitives (mirrors the resident app). */
const { useState, useRef, useEffect } = React;

const C = {
  cream: '#F3EDE2', creamDeep: '#EAE2D4', parchment: '#E8DFD0',
  charcoal: '#1C1915', charcoalSoft: '#302D26',
  gold: 'var(--gold)', goldLight: 'var(--gold-light)', goldMuted: 'var(--gold-muted)',
  taupe: '#8A8070', taupeLight: '#B4A898', white: '#FDFAF5',
  green: '#6B8C5A', amber: '#C4874A', blue: '#5A7A8A'
};
const SERIF = "'Cormorant Garamond',serif";
const SANS = "'Jost',sans-serif";

// ── Bullseye mark ──
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
const Wordmark = ({ light, size = 13, ls = 7 }) =>
  <div style={{ fontFamily: SERIF, fontSize: size, letterSpacing: ls, fontWeight: 400, color: light ? 'rgba(242,237,227,0.55)' : C.charcoal }}>FIFTH CIRCLE</div>;

// ── Type helpers ──
const Eyebrow = ({ children, c }) =>
  <div style={{ fontSize: 9, letterSpacing: 4, color: c || C.goldMuted, textTransform: 'uppercase', fontFamily: SANS }}>{children}</div>;
const SectionLabel = ({ children, mb = 14 }) =>
  <div style={{ fontSize: 9, letterSpacing: 3, color: 'var(--gold)', textTransform: 'uppercase', fontFamily: SANS, marginBottom: mb }}>{children}</div>;
const Title = ({ children, size = 28, color }) =>
  <div style={{ fontFamily: SERIF, fontSize: size, fontWeight: 300, color: color || C.charcoal, lineHeight: 1.12 }}>{children}</div>;
const Em = ({ children }) => <em style={{ fontStyle: 'italic', color: 'var(--gold)' }}>{children}</em>;

// ── Avatar (initials) ──
const GRADS = {
  SL: 'linear-gradient(145deg,#3a4436,#556b4d)', MR: 'linear-gradient(145deg,#4a3a3a,#6b4d4d)',
  AK: 'linear-gradient(145deg,#43354a,#5e4566)', JT: 'linear-gradient(145deg,#2e3a44,#3d5566)',
  CW: 'linear-gradient(145deg,#44402e,#6b6240)', DM: 'linear-gradient(145deg,#3a3526,#5a4d2e)',
  TR: 'linear-gradient(145deg,#3d3a32,#5a544a)', NK: 'linear-gradient(145deg,#5a4d2e,#8a6e18)',
  NS: 'linear-gradient(145deg,#3a3526,#5a4d2e)', JK: 'linear-gradient(145deg,#2e3a44,#3d5566)'
};
function Avatar({ initials, size = 44, sel }) {
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%', flexShrink: 0,
      border: sel ? '0.5px solid var(--gold)' : '0.5px solid rgba(184,151,42,0.3)',
      background: GRADS[initials] || C.charcoalSoft, color: C.cream,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontFamily: SERIF, fontSize: size * 0.34, letterSpacing: 0.5, fontWeight: 400
    }}>{initials}</div>);
}

// ── Tag / Chip ──
const Tag = ({ children, shared }) =>
  <span style={{
    fontSize: 10, letterSpacing: 1.5, textTransform: 'uppercase', fontFamily: SANS,
    color: shared ? 'var(--gold-muted)' : C.taupe,
    border: `0.5px solid ${shared ? 'rgba(184,151,42,0.45)' : 'rgba(184,151,42,0.18)'}`,
    background: shared ? 'rgba(184,151,42,0.08)' : 'transparent',
    padding: '5px 11px', whiteSpace: 'nowrap'
  }}>{children}</span>;

// ── Status badge ──
const BADGE = {
  active: { c: C.green, b: 'rgba(107,140,90,0.4)', t: 'Active' },
  pending: { c: C.goldMuted, b: 'rgba(184,151,42,0.35)', t: 'Pending' },
  new: { c: C.blue, b: 'rgba(90,122,138,0.4)', t: 'New' },
  risk: { c: C.amber, b: 'rgba(196,135,74,0.4)', t: 'At Risk' },
  inactive: { c: C.amber, b: 'rgba(196,135,74,0.4)', t: 'Inactive' },
  suspended: { c: '#7A2E2E', b: 'rgba(122,46,46,0.4)', t: 'Suspended' },
  met: { c: C.green, b: 'rgba(107,140,90,0.4)', t: 'Met' }
};
function Badge({ kind, children }) {
  const s = BADGE[kind] || BADGE.pending;
  return <span style={{ fontSize: 8, letterSpacing: 2, textTransform: 'uppercase', fontFamily: SANS, padding: '3px 8px', border: `0.5px solid ${s.b}`, color: s.c }}>{children || s.t}</span>;
}

// ── Buttons ──
function BtnDark({ children, onClick, disabled, full = true, mt = 0 }) {
  return (
    <button onClick={disabled ? undefined : onClick} style={{
      width: full ? '100%' : 'auto', background: disabled ? 'rgba(28,25,21,0.08)' : C.charcoal,
      color: disabled ? C.taupeLight : C.cream, border: 'none', cursor: disabled ? 'default' : 'pointer',
      fontFamily: SANS, fontSize: 10, letterSpacing: 3, textTransform: 'uppercase', padding: '15px 28px', marginTop: mt
    }}>{children}</button>);
}
function BtnGhost({ children, onClick, active, danger, sm }) {
  const col = danger ? '#7A2E2E' : active ? 'var(--gold-muted)' : C.taupe;
  const bd = danger ? 'rgba(122,46,46,0.4)' : active ? 'var(--gold)' : 'rgba(184,151,42,0.25)';
  return (
    <button onClick={onClick} style={{
      background: active ? 'rgba(184,151,42,0.1)' : 'transparent', border: `0.5px solid ${bd}`, color: col,
      fontFamily: SANS, fontSize: sm ? 8 : 9, letterSpacing: 2, textTransform: 'uppercase',
      padding: sm ? '6px 11px' : '9px 16px', cursor: 'pointer', whiteSpace: 'nowrap'
    }}>{children}</button>);
}

// ── Card ──
const Card = ({ children, onClick, style, dark, pad = 16 }) =>
  <div onClick={onClick} style={{
    background: dark ? C.charcoal : C.white, padding: pad, cursor: onClick ? 'pointer' : 'default',
    border: dark ? 'none' : '0.5px solid rgba(184,151,42,0.16)', ...style
  }}>{children}</div>;

// ── Inputs ──
function Field({ label, placeholder, type, value, onChange }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <label style={{ fontSize: 9, letterSpacing: 3, color: C.taupe, textTransform: 'uppercase', fontFamily: SANS }}>{label}</label>
      <input type={type || 'text'} placeholder={placeholder} value={value} onChange={onChange} style={{
        background: 'transparent', border: 'none', borderBottom: '0.5px solid rgba(184,151,42,0.28)',
        padding: '10px 0', fontSize: 16, color: C.charcoal, fontFamily: SERIF, fontWeight: 300, outline: 'none', width: '100%'
      }} />
    </div>);
}
function Textarea({ label, placeholder, value, onChange, rows = 3 }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      {label && <label style={{ fontSize: 9, letterSpacing: 3, color: C.taupe, textTransform: 'uppercase', fontFamily: SANS }}>{label}</label>}
      <textarea rows={rows} placeholder={placeholder} value={value} onChange={onChange} style={{
        background: C.white, border: '0.5px solid rgba(184,151,42,0.28)', padding: '12px 13px',
        fontSize: 13.5, color: C.charcoal, fontFamily: SERIF, fontWeight: 300, outline: 'none', width: '100%', resize: 'none', lineHeight: 1.6
      }} />
    </div>);
}
// ── Pill select (chip row) ──
function PillSelect({ label, options, value, onChange }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {label && <label style={{ fontSize: 9, letterSpacing: 3, color: C.taupe, textTransform: 'uppercase', fontFamily: SANS }}>{label}</label>}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7 }}>
        {options.map((o) => {
          const sel = value === o;
          return (
            <div key={o} onClick={() => onChange(o)} style={{
              border: `0.5px solid ${sel ? 'var(--gold)' : 'rgba(184,151,42,0.22)'}`, background: sel ? 'rgba(184,151,42,0.1)' : 'transparent',
              color: sel ? 'var(--gold-muted)' : C.taupe, padding: '7px 12px', fontSize: 9.5, letterSpacing: 1.2, textTransform: 'uppercase',
              fontFamily: SANS, cursor: 'pointer', whiteSpace: 'nowrap'
            }}>{o}</div>);
        })}
      </div>
    </div>);
}
// ── Segmented control (in-screen tabs) ──
function Segmented({ options, value, onChange }) {
  return (
    <div style={{ display: 'flex', gap: 0, marginTop: 14, marginLeft: -2, flexWrap: 'wrap' }}>
      {options.map(([id, label]) => {
        const a = value === id;
        return (
          <div key={id} onClick={() => onChange(id)} style={{
            paddingRight: 20, paddingBottom: 6, cursor: 'pointer', fontSize: 10, letterSpacing: 1.5, textTransform: 'uppercase', fontFamily: SANS,
            color: a ? 'var(--gold-muted)' : C.taupeLight, borderBottom: a ? '1px solid var(--gold)' : '1px solid transparent'
          }}>{label}</div>);
      })}
    </div>);
}
// ── Settings list row ──
function Row({ icon, label, value, sub, onClick, danger, last, badge }) {
  return (
    <div onClick={onClick} style={{ display: 'flex', alignItems: 'center', gap: 13, padding: '14px 16px', cursor: onClick ? 'pointer' : 'default', borderBottom: last ? 'none' : '0.5px solid rgba(184,151,42,0.1)' }}>
      {icon && <i className={`ti ${icon}`} style={{ fontSize: 17, color: danger ? '#7A2E2E' : 'var(--gold-muted)', width: 20, flexShrink: 0 }} />}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13, letterSpacing: 0.3, color: danger ? '#7A2E2E' : C.charcoal, fontFamily: SANS, fontWeight: 300 }}>{label}</div>
        {sub && <div style={{ fontSize: 10.5, color: C.taupeLight, fontFamily: SANS, marginTop: 2 }}>{sub}</div>}
      </div>
      {badge != null && <span style={{ background: 'var(--gold)', color: C.cream, fontSize: 8.5, fontFamily: SANS, fontWeight: 500, padding: '2px 7px', borderRadius: 10 }}>{badge}</span>}
      {value && <span style={{ fontSize: 11, color: C.taupeLight, fontFamily: SANS }}>{value}</span>}
      {onClick && !danger && <span style={{ fontSize: 15, color: C.taupeLight }}>›</span>}
    </div>);
}
// ── Progress bar ──
function ProgressBar({ pct, color }) {
  return (
    <div style={{ height: 5, borderRadius: 3, background: 'rgba(184,151,42,0.12)', overflow: 'hidden' }}>
      <div style={{ height: 5, borderRadius: 3, width: Math.min(100, pct) + '%', background: color || 'var(--gold)' }} />
    </div>);
}
// ── Status pill (generic) ──
function StatusPill({ children, color, soft }) {
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 8.5, letterSpacing: 1.8, textTransform: 'uppercase', fontFamily: SANS, color: color || C.goldMuted, border: `0.5px solid ${soft || 'rgba(184,151,42,0.35)'}`, padding: '4px 9px', whiteSpace: 'nowrap' }}>{children}</span>);
}

// ── Toggle ──
function Toggle({ on, onClick }) {
  return (
    <div onClick={onClick} style={{ width: 40, height: 23, borderRadius: 12, flexShrink: 0, cursor: 'pointer', background: on ? 'var(--gold)' : 'rgba(140,128,112,0.28)', position: 'relative', transition: 'background .15s' }}>
      <div style={{ position: 'absolute', top: 2.5, left: on ? 19.5 : 2.5, width: 18, height: 18, borderRadius: '50%', background: C.white, transition: 'left .15s', boxShadow: '0 1px 2px rgba(0,0,0,0.2)' }} />
    </div>);
}

// ── Metric card ──
const TREND = { up: C.green, gold: C.goldMuted, warn: C.amber };
function Metric({ label, val, trend, kind }) {
  return (
    <div style={{ background: C.white, border: '0.5px solid rgba(184,151,42,0.16)', padding: '15px 16px' }}>
      <div style={{ fontSize: 8.5, letterSpacing: 2, color: C.taupeLight, textTransform: 'uppercase', fontFamily: SANS, marginBottom: 9 }}>{label}</div>
      <div style={{ fontFamily: SERIF, fontSize: 34, fontWeight: 300, color: C.charcoal, lineHeight: 1, marginBottom: 4 }}>{val}</div>
      {trend && <div style={{ fontSize: 9.5, color: TREND[kind] || C.taupeLight, fontFamily: SANS, letterSpacing: 0.3 }}>{trend}</div>}
    </div>);
}

// ── Horizontal bar row ──
const BARCOL = { gold: 'var(--gold)', taupe: C.taupeLight, goldsoft: 'rgba(184,151,42,0.32)', amber: C.amber };
function BarRow({ label, n, pct, c }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 11 }}>
      <span style={{ fontSize: 11, color: C.taupe, fontFamily: SANS, width: 120, flexShrink: 0 }}>{label}</span>
      <div style={{ flex: 1, height: 2, background: 'rgba(184,151,42,0.12)' }}>
        <div style={{ height: 2, width: pct + '%', background: BARCOL[c] || 'var(--gold)' }} />
      </div>
      <span style={{ fontSize: 11, color: C.taupeLight, fontFamily: SANS, width: 26, textAlign: 'right', flexShrink: 0 }}>{n}</span>
    </div>);
}

// ── Satisfaction bar (thicker, rounded) ──
const SATCOL = { excellent: C.green, good: 'var(--gold)', neutral: C.taupeLight, poor: C.amber };
function SatRow({ label, pct, c }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
      <span style={{ fontSize: 11, color: C.taupe, fontFamily: SANS, width: 104, flexShrink: 0 }}>{label}</span>
      <div style={{ flex: 1, height: 6, borderRadius: 3, background: 'rgba(184,151,42,0.1)' }}>
        <div style={{ height: 6, borderRadius: 3, width: pct + '%', background: SATCOL[c] }} />
      </div>
      <span style={{ fontSize: 10, color: C.taupeLight, fontFamily: SANS, width: 32, textAlign: 'right', flexShrink: 0 }}>{pct}%</span>
    </div>);
}

// ── Weekly / column chart ──
function ColumnChart({ data, height = 88, keyName = 'd' }) {
  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', gap: 6, height, marginBottom: 8 }}>
      {data.map((b, i) => (
        <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5, flex: 1 }}>
          <div style={{ width: '100%', height: b.h + '%', borderRadius: 1, background: b.hi ? 'var(--gold)' : 'rgba(184,151,42,0.18)' }} />
          <div style={{ fontSize: 8, letterSpacing: 1, color: C.taupeLight, textTransform: 'uppercase', fontFamily: SANS }}>{b[keyName]}</div>
        </div>
      ))}
    </div>);
}

// ── Trend row ──
function TrendRow({ label, dir, val }) {
  const up = dir === 'up';
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 9 }}>
      <span style={{ fontSize: 11.5, color: C.taupe, fontFamily: SANS, flex: 1 }}>{label}</span>
      <span style={{ fontSize: 12, color: up ? C.green : C.taupeLight }}>{up ? '↑' : '→'}</span>
      <span style={{ fontSize: 11, color: C.taupeLight, fontFamily: SANS, width: 46, textAlign: 'right' }}>{val}</span>
    </div>);
}

// ── Panel header (label + optional action) ──
function PanelHead({ children, action, onAction }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 13, paddingBottom: 11, borderBottom: '0.5px solid rgba(184,151,42,0.14)' }}>
      <span style={{ fontSize: 9, letterSpacing: 3, color: 'var(--gold)', textTransform: 'uppercase', fontFamily: SANS }}>{children}</span>
      {action && <span onClick={onAction} style={{ fontSize: 9, letterSpacing: 1.5, color: C.charcoal, textTransform: 'uppercase', fontFamily: SANS, borderBottom: '0.5px solid ' + C.charcoal, paddingBottom: 1, cursor: 'pointer' }}>{action}</span>}
    </div>);
}

// ── Sentiment pill ──
function SentimentPill({ text }) {
  return (
    <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, border: '0.5px solid rgba(107,140,90,0.4)', padding: '6px 14px' }}>
      <div style={{ width: 6, height: 6, borderRadius: '50%', background: C.green }} />
      <span style={{ fontSize: 9, letterSpacing: 3, color: C.green, textTransform: 'uppercase', fontFamily: SANS }}>{text}</span>
    </div>);
}

// ── Screen header (sticky parchment) ──
function ScreenHeader({ eyebrow, title, sub, right, back, onBack, children }) {
  return (
    <div style={{ background: C.parchment, padding: '16px 20px 14px', borderBottom: '0.5px solid rgba(184,151,42,0.2)', position: 'sticky', top: 0, zIndex: 5 }}>
      {back &&
        <div style={{ marginBottom: 12 }}>
          <button onClick={onBack} style={{ background: 'none', border: 'none', padding: 0, fontSize: 9, letterSpacing: 2, textTransform: 'uppercase', color: C.taupeLight, fontFamily: SANS, cursor: 'pointer' }}>‹ {back}</button>
        </div>}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div style={{ minWidth: 0 }}>
          {eyebrow && <div style={{ marginBottom: 6 }}><Eyebrow>{eyebrow}</Eyebrow></div>}
          <Title>{title}</Title>
          {sub && <div style={{ fontSize: 9.5, letterSpacing: 2, color: C.taupeLight, textTransform: 'uppercase', fontFamily: SANS, marginTop: 6 }}>{sub}</div>}
        </div>
        {right}
      </div>
      {children}
    </div>);
}

// ── Period chip ──
const Period = ({ children, dark }) =>
  <button style={{
    fontSize: 8.5, letterSpacing: 1.5, color: dark ? C.cream : C.goldMuted, textTransform: 'uppercase',
    border: '0.5px solid ' + (dark ? C.charcoal : 'rgba(184,151,42,0.32)'), background: dark ? C.charcoal : 'transparent',
    padding: '8px 12px', cursor: 'pointer', fontFamily: SANS, whiteSpace: 'nowrap'
  }}>{children}</button>;

// ── Tab bar ──
const MTABS = [
  { id: 'pulse', label: 'Pulse', icon: 'ti-layout-dashboard' },
  { id: 'events', label: 'Events', icon: 'ti-calendar-event' },
  { id: 'residents', label: 'Residents', icon: 'ti-users' },
  { id: 'reports', label: 'Report', icon: 'ti-file-text' },
  { id: 'more', label: 'More', icon: 'ti-dots' }
];
function TabBar({ active, onTab, badge }) {
  return (
    <div style={{ flexShrink: 0, display: 'flex', background: C.parchment, borderTop: '0.5px solid rgba(184,151,42,0.2)', padding: '9px 6px 5px' }}>
      {MTABS.map((t) => {
        const a = active === t.id;
        const b = badge && badge[t.id];
        return (
          <div key={t.id} onClick={() => onTab(t.id)} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, cursor: 'pointer', padding: '2px 0', position: 'relative' }}>
            <div style={{ position: 'relative' }}>
              <i className={`ti ${t.icon}`} style={{ fontSize: 19, color: a ? 'var(--gold)' : 'rgba(140,128,112,0.55)' }} />
              {b && <span style={{ position: 'absolute', top: -4, right: -9, background: 'var(--gold)', color: C.cream, fontSize: 7.5, fontFamily: SANS, fontWeight: 500, padding: '1px 4px', borderRadius: 8 }}>{b}</span>}
            </div>
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
    <div style={{ width: 390, flexShrink: 0, borderRadius: 48, overflow: 'hidden', display: 'flex', flexDirection: 'column', position: 'relative', height: 'min(844px, calc(100vh - 96px))', background: C.parchment, boxShadow: '0 0 0 9px #0D0B09,0 0 0 11px rgba(255,255,255,0.03),0 36px 90px rgba(0,0,0,0.7)' }}>
      <div style={{ position: 'absolute', top: 11, left: '50%', transform: 'translateX(-50%)', width: 120, height: 34, background: '#0D0B09', borderRadius: 22, zIndex: 30 }} />
      <StatusBar />
      <div ref={scrollRef} style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden', background: C.cream, position: 'relative' }}>{children}</div>
      <ToastHost />
      {footer}
      <div style={{ height: 26, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: C.parchment, borderTop: '0.5px solid rgba(184,151,42,0.1)' }}>
        <div style={{ width: 120, height: 4, background: 'rgba(28,25,21,0.16)', borderRadius: 3 }} />
      </div>
    </div>);
}

// ── Empty state (Day-1 / no data) ──
function EmptyState({ icon, title, body, action, onAction, compact }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', padding: compact ? '34px 28px' : '52px 30px' }}>
      <div style={{ width: 60, height: 60, borderRadius: '50%', border: '0.5px solid rgba(184,151,42,0.3)', background: C.parchment, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 18 }}>
        <i className={`ti ${icon || 'ti-sparkles'}`} style={{ fontSize: 26, color: 'var(--gold-muted)' }} />
      </div>
      <div style={{ fontFamily: SERIF, fontSize: 21, fontWeight: 300, color: C.charcoal, lineHeight: 1.25, maxWidth: 260 }}>{title}</div>
      {body && <div style={{ fontSize: 11.5, color: C.taupe, fontFamily: SANS, lineHeight: 1.7, marginTop: 10, maxWidth: 250 }}>{body}</div>}
      {action && <div style={{ marginTop: 22 }}><button onClick={onAction} style={{ background: C.charcoal, color: C.cream, border: 'none', fontFamily: SANS, fontSize: 9.5, letterSpacing: 2, textTransform: 'uppercase', padding: '12px 22px', cursor: 'pointer' }}>{action}</button></div>}
    </div>);
}

// ── Search field (roster) ──
function SearchField({ value, onChange, placeholder }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 9, background: C.white, border: '0.5px solid rgba(184,151,42,0.22)', padding: '9px 13px' }}>
      <i className="ti ti-search" style={{ fontSize: 15, color: C.taupeLight }} />
      <input value={value} onChange={onChange} placeholder={placeholder || 'Search'} style={{ flex: 1, background: 'transparent', border: 'none', fontSize: 13, color: C.charcoal, fontFamily: SANS, fontWeight: 300 }} />
      {value && <i className="ti ti-x" onClick={() => onChange({ target: { value: '' } })} style={{ fontSize: 14, color: C.taupeLight, cursor: 'pointer' }} />}
    </div>);
}

// ── Filter chips ──
function FilterChips({ options, value, onChange }) {
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7 }}>
      {options.map(([id, label, n]) => {
        const sel = value === id;
        return (
          <div key={id} onClick={() => onChange(id)} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, border: `0.5px solid ${sel ? 'var(--gold)' : 'rgba(184,151,42,0.22)'}`, background: sel ? 'rgba(184,151,42,0.1)' : 'transparent', color: sel ? 'var(--gold-muted)' : C.taupe, padding: '6px 11px', fontSize: 9.5, letterSpacing: 1, textTransform: 'uppercase', fontFamily: SANS, cursor: 'pointer' }}>
            {label}{n != null && <span style={{ fontSize: 9, color: sel ? 'var(--gold)' : C.taupeLight }}>{n}</span>}
          </div>);
      })}
    </div>);
}

// ── Toast host (action confirmation) ──
function ToastHost() {
  const s = useFC();
  if (!s.toasts.length) return null;
  return (
    <div style={{ position: 'absolute', left: 14, right: 14, bottom: 96, zIndex: 40, display: 'flex', flexDirection: 'column', gap: 8, pointerEvents: 'none' }}>
      {s.toasts.map((t) => (
        <div key={t.id} style={{ display: 'flex', alignItems: 'center', gap: 10, background: C.charcoal, color: C.cream, padding: '12px 15px', boxShadow: '0 10px 30px rgba(0,0,0,0.4)', animation: 'fcToast .22s ease' }}>
          <i className="ti ti-check" style={{ fontSize: 15, color: 'var(--gold-light)', flexShrink: 0 }} />
          <span style={{ fontSize: 11.5, fontFamily: SANS, lineHeight: 1.5, letterSpacing: 0.2 }}>{t.text}</span>
        </div>))}
    </div>);
}

// ── Confirm sheet (destructive actions) ──
function ConfirmSheet({ title, body, confirmLabel, danger, onConfirm, onCancel }) {
  return (
    <div style={{ position: 'absolute', inset: 0, zIndex: 50, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', background: 'rgba(13,11,9,0.55)' }} onClick={onCancel}>
      <div onClick={(e) => e.stopPropagation()} style={{ background: C.cream, padding: '24px 22px 26px', borderTop: '2px solid var(--gold)' }}>
        <div style={{ fontFamily: SERIF, fontSize: 22, fontWeight: 300, color: C.charcoal, lineHeight: 1.2 }}>{title}</div>
        {body && <div style={{ fontSize: 12, color: C.taupe, fontFamily: SANS, lineHeight: 1.7, marginTop: 10 }}>{body}</div>}
        <div style={{ display: 'flex', gap: 10, marginTop: 22 }}>
          <button onClick={onCancel} style={{ flex: 1, background: 'transparent', border: '0.5px solid rgba(184,151,42,0.3)', color: C.taupe, fontFamily: SANS, fontSize: 9.5, letterSpacing: 2, textTransform: 'uppercase', padding: '13px', cursor: 'pointer' }}>Cancel</button>
          <button onClick={onConfirm} style={{ flex: 1, background: danger ? '#7A2E2E' : C.charcoal, border: 'none', color: C.cream, fontFamily: SANS, fontSize: 9.5, letterSpacing: 2, textTransform: 'uppercase', padding: '13px', cursor: 'pointer' }}>{confirmLabel || 'Confirm'}</button>
        </div>
      </div>
    </div>);
}

Object.assign(window, {
  C, SERIF, SANS, Logo, Wordmark, Eyebrow, SectionLabel, Title, Em, Avatar, Tag, Badge,
  BtnDark, BtnGhost, Card, Field, Textarea, PillSelect, Segmented, Row, ProgressBar, StatusPill,
  Toggle, Metric, BarRow, SatRow, ColumnChart, TrendRow,
  PanelHead, SentimentPill, ScreenHeader, Period, MTABS, TabBar, Phone, StatusBar,
  EmptyState, SearchField, FilterChips, ToastHost, ConfirmSheet
});
