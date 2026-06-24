/* Fifth Circle Manager — Building Settings, Pilot, Billing, Team, Vendors, Audit. */

// ── BUILDING SETTINGS (+ Personalization) ──
function BuildingSettings({ onBack }) {
  const s = FCM.settings;
  const [autoApprove, setAutoApprove] = useState(false);
  const [requireMgr, setRequireMgr] = useState(s.approvalRules.requireManager);
  return (
    <div style={{ paddingBottom: 28 }}>
      <ScreenHeader back="More" onBack={onBack} eyebrow="Building Settings" title="Settings" />
      <div style={{ padding: '18px 20px 0' }}>
        <SectionLabel>Building Information</SectionLabel>
        <Card pad={0} style={{ marginBottom: 22 }}>
          <Row label="Name" value={s.info.name} />
          <Row label="Address" value={s.info.address.split(',')[0]} />
          <Row label="Units" value={s.info.units} />
          <Row label="Manager" value={s.info.manager} last />
        </Card>

        <SectionLabel>Amenities</SectionLabel>
        <Card style={{ marginBottom: 22 }}>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7 }}>
            {s.amenities.map((a) => <Tag key={a} shared>{a}</Tag>)}
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 5, border: '0.5px dashed rgba(184,151,42,0.45)', color: 'var(--gold-muted)', padding: '5px 11px', fontSize: 10, letterSpacing: 1.5, textTransform: 'uppercase', fontFamily: SANS, cursor: 'pointer' }}><i className="ti ti-plus" style={{ fontSize: 11 }} />Add</div>
          </div>
        </Card>

        <SectionLabel>Community Guidelines</SectionLabel>
        <Card style={{ marginBottom: 22 }}>
          <div style={{ fontFamily: SERIF, fontStyle: 'italic', fontSize: 15, lineHeight: 1.7, color: C.taupe }}>"{s.guidelines}"</div>
          <div style={{ marginTop: 12 }}><BtnGhost>Edit guidelines</BtnGhost></div>
        </Card>

        <SectionLabel>Resident Access</SectionLabel>
        <Card style={{ marginBottom: 22 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ fontSize: 12, color: C.charcoal, fontFamily: SANS }}>Access code</div>
              <div style={{ fontFamily: SERIF, fontSize: 18, color: 'var(--gold-muted)', marginTop: 3, letterSpacing: 1 }}>{s.accessCode}</div>
            </div>
            <BtnGhost sm>Regenerate</BtnGhost>
          </div>
        </Card>

        <SectionLabel>Event Approval Rules</SectionLabel>
        <Card pad={0} style={{ marginBottom: 22 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 16px', borderBottom: '0.5px solid rgba(184,151,42,0.1)' }}>
            <div style={{ flex: 1, paddingRight: 12 }}>
              <div style={{ fontSize: 13, color: C.charcoal, fontFamily: SANS }}>Auto-shortlist popular proposals</div>
              <div style={{ fontSize: 10.5, color: C.taupeLight, fontFamily: SANS, marginTop: 2 }}>At {s.approvalRules.autoThreshold}+ resident votes</div>
            </div>
            <Toggle on={autoApprove} onClick={() => setAutoApprove(!autoApprove)} />
          </div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 16px' }}>
            <div style={{ flex: 1, paddingRight: 12 }}>
              <div style={{ fontSize: 13, color: C.charcoal, fontFamily: SANS }}>Require manager approval</div>
              <div style={{ fontSize: 10.5, color: C.taupeLight, fontFamily: SANS, marginTop: 2 }}>Before any event is published</div>
            </div>
            <Toggle on={requireMgr} onClick={() => setRequireMgr(!requireMgr)} />
          </div>
        </Card>

        {/* PERSONALIZATION */}
        <SectionLabel>Building Personalization</SectionLabel>
        <Card style={{ marginBottom: 14 }}>
          <div style={{ fontSize: 8.5, letterSpacing: 2, color: 'var(--gold)', textTransform: 'uppercase', fontFamily: SANS, marginBottom: 8 }}>Description</div>
          <div style={{ fontFamily: SERIF, fontStyle: 'italic', fontSize: 15, lineHeight: 1.7, color: C.taupe }}>{s.personalization.description}</div>
        </Card>
        <Card style={{ marginBottom: 14 }}>
          <div style={{ fontSize: 8.5, letterSpacing: 2, color: 'var(--gold)', textTransform: 'uppercase', fontFamily: SANS, marginBottom: 10 }}>Building photography</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            {['Hero image', 'Rooftop', 'Lobby', 'Amenities'].map((p) =>
              <div key={p} style={{ aspectRatio: '4/3', background: 'repeating-linear-gradient(45deg, #EAE2D4, #EAE2D4 8px, #E8DFD0 8px, #E8DFD0 16px)', border: '0.5px solid rgba(184,151,42,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <span style={{ fontFamily: 'monospace', fontSize: 9, color: C.taupeLight, textTransform: 'uppercase', letterSpacing: 0.5 }}>{p}</span>
              </div>)}
          </div>
        </Card>
        <Card>
          <div style={{ fontSize: 8.5, letterSpacing: 2, color: 'var(--gold)', textTransform: 'uppercase', fontFamily: SANS, marginBottom: 10 }}>Neighborhood highlights</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
            {s.personalization.neighborhood.map((n, i) =>
              <div key={i} style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                <i className="ti ti-map-pin" style={{ fontSize: 14, color: 'var(--gold-muted)' }} />
                <span style={{ fontSize: 12, color: C.taupe, fontFamily: SANS }}>{n}</span>
              </div>)}
          </div>
        </Card>
      </div>
    </div>);
}

// ── PILOT PROGRAM ──
function PilotProgram({ onBack }) {
  const p = FCM.pilot;
  return (
    <div style={{ paddingBottom: 28 }}>
      <ScreenHeader back="More" onBack={onBack} eyebrow="Pilot Program" title="Pilot Status" />
      <div style={{ padding: '18px 20px 0' }}>
        <Card dark style={{ marginBottom: 22, textAlign: 'center', padding: '28px 20px' }}>
          <StatusPill color={C.green} soft="rgba(107,140,90,0.5)"><span style={{ width: 5, height: 5, borderRadius: '50%', background: C.green }} />{p.status}</StatusPill>
          <div style={{ fontFamily: SERIF, fontSize: 64, fontWeight: 300, color: C.cream, lineHeight: 1, marginTop: 16 }}>{p.daysRemaining}</div>
          <div style={{ fontSize: 9, letterSpacing: 3, color: 'rgba(242,237,227,0.4)', textTransform: 'uppercase', fontFamily: SANS, marginTop: 6 }}>Days remaining</div>
          <div style={{ marginTop: 18, paddingTop: 18, borderTop: '0.5px solid rgba(255,255,255,0.08)', display: 'flex', justifyContent: 'space-around' }}>
            {[['Started', p.start], ['Converts', p.conversionDate]].map(([k, v]) =>
              <div key={k}>
                <div style={{ fontSize: 8.5, letterSpacing: 2, color: 'rgba(184,151,42,0.6)', textTransform: 'uppercase', fontFamily: SANS, marginBottom: 5 }}>{k}</div>
                <div style={{ fontFamily: SERIF, fontSize: 15, color: C.cream }}>{v}</div>
              </div>)}
          </div>
        </Card>

        <SectionLabel>Pilot Targets</SectionLabel>
        <Card style={{ marginBottom: 22 }}>
          {p.targets.map((t, i) =>
            <div key={i} style={{ marginBottom: i < p.targets.length - 1 ? 16 : 0 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 7 }}>
                <span style={{ fontSize: 12, color: C.charcoal, fontFamily: SANS }}>{t.label}</span>
                <span style={{ fontSize: 11, color: t.pct >= 100 ? C.green : 'var(--gold-muted)', fontFamily: SANS }}>{t.val}</span>
              </div>
              <ProgressBar pct={t.pct} color={t.pct >= 100 ? C.green : 'var(--gold)'} />
            </div>)}
        </Card>

        <SectionLabel>Conversion Timeline</SectionLabel>
        <Card pad={0}>
          {p.milestones.map((m, i) =>
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 13, padding: '14px 16px', borderBottom: i < p.milestones.length - 1 ? '0.5px solid rgba(184,151,42,0.1)' : 'none' }}>
              <div style={{ width: 22, height: 22, borderRadius: '50%', border: `1px solid ${m.done ? C.green : 'rgba(184,151,42,0.35)'}`, background: m.done ? 'rgba(107,140,90,0.12)' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                {m.done && <i className="ti ti-check" style={{ fontSize: 13, color: C.green }} />}
              </div>
              <span style={{ flex: 1, fontSize: 12.5, color: m.done ? C.charcoal : C.taupe, fontFamily: SANS }}>{m.label}</span>
              <span style={{ fontSize: 10.5, color: C.taupeLight, fontFamily: SANS }}>{m.date}</span>
            </div>)}
        </Card>
      </div>
    </div>);
}

// ── BILLING (light) ──
function Billing({ onBack }) {
  const b = FCM.billing;
  return (
    <div style={{ paddingBottom: 28 }}>
      <ScreenHeader back="More" onBack={onBack} eyebrow="Billing & Subscription" title="Billing" />
      <div style={{ padding: '18px 20px 0' }}>
        <Card style={{ marginBottom: 22 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <div style={{ fontSize: 8.5, letterSpacing: 2, color: 'var(--gold)', textTransform: 'uppercase', fontFamily: SANS, marginBottom: 6 }}>Current plan</div>
              <div style={{ fontFamily: SERIF, fontSize: 22, color: C.charcoal }}>{b.plan}</div>
            </div>
            <StatusPill color={C.green} soft="rgba(107,140,90,0.4)">{b.status}</StatusPill>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 14, paddingTop: 14, borderTop: '0.5px solid rgba(184,151,42,0.12)' }}>
            <span style={{ fontSize: 11, color: C.taupe, fontFamily: SANS }}>Converts {b.renewal}</span>
            <span style={{ fontSize: 11, color: 'var(--gold-muted)', fontFamily: SANS }}>{b.monthly}</span>
          </div>
        </Card>

        <SectionLabel>Plans</SectionLabel>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 22 }}>
          {b.tiers.map((t) =>
            <Card key={t.name} style={{ border: t.current ? '0.5px solid var(--gold)' : '0.5px solid rgba(184,151,42,0.16)', background: t.current ? 'rgba(184,151,42,0.05)' : C.white }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                <div style={{ fontFamily: SERIF, fontSize: 18, color: C.charcoal }}>{t.name}</div>
                <div style={{ fontFamily: SERIF, fontSize: 16, color: 'var(--gold-muted)' }}>{t.price}</div>
              </div>
              <div style={{ fontSize: 10.5, color: C.taupe, fontFamily: SANS, marginTop: 5 }}>{t.note}{t.current ? ' · Current' : ''}</div>
            </Card>)}
        </div>

        <SectionLabel>Payment & Invoices</SectionLabel>
        <Card pad={0}>
          <Row icon="ti-credit-card" label="Payment method" value={b.method} />
          {b.invoices.map((inv, i) => <Row key={i} icon="ti-file-invoice" label={inv.id} sub={inv.date} value={inv.amount} last />)}
        </Card>
        <div style={{ fontSize: 10.5, color: C.taupeLight, fontFamily: SANS, textAlign: 'center', marginTop: 14, lineHeight: 1.6, fontStyle: 'italic' }}>Billing activates at pilot conversion. Nothing is charged during your pilot.</div>
      </div>
    </div>);
}

// ── TEAM & ROLES ──
function TeamRoles({ onBack }) {
  return (
    <div style={{ paddingBottom: 28 }}>
      <ScreenHeader back="More" onBack={onBack} eyebrow="Team & Roles" title="Your Team"
        right={<button style={{ display: 'flex', alignItems: 'center', gap: 5, background: C.charcoal, color: C.cream, border: 'none', fontFamily: SANS, fontSize: 9, letterSpacing: 1.5, textTransform: 'uppercase', padding: '8px 12px', cursor: 'pointer' }}><i className="ti ti-plus" style={{ fontSize: 12 }} />Add</button>} />
      <div style={{ padding: '18px 20px 0' }}>
        <SectionLabel>Members</SectionLabel>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 22 }}>
          {FCM.team.map((m, i) =>
            <Card key={i} style={{ display: 'flex', alignItems: 'center', gap: 13 }}>
              <Avatar initials={m.initials} size={42} />
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
                  <div style={{ fontFamily: SERIF, fontSize: 16.5, color: C.charcoal }}>{m.name}</div>
                  {m.you && <span style={{ fontSize: 8.5, letterSpacing: 1.5, color: 'var(--gold-muted)', textTransform: 'uppercase', fontFamily: SANS }}>You</span>}
                </div>
                <div style={{ fontSize: 10.5, color: C.taupe, fontFamily: SANS, marginTop: 3 }}>{m.role} · {m.access}</div>
              </div>
              {!m.you && <span style={{ fontSize: 15, color: C.taupeLight }}>›</span>}
            </Card>)}
        </div>

        <SectionLabel>Roles</SectionLabel>
        <Card pad={0}>
          {FCM.roles.map((r, i) =>
            <div key={i} style={{ padding: '13px 16px', borderBottom: i < FCM.roles.length - 1 ? '0.5px solid rgba(184,151,42,0.1)' : 'none' }}>
              <div style={{ fontSize: 13, color: C.charcoal, fontFamily: SANS }}>{r.name}</div>
              <div style={{ fontSize: 10.5, color: C.taupeLight, fontFamily: SANS, marginTop: 3, lineHeight: 1.55 }}>{r.desc}</div>
            </div>)}
        </Card>
      </div>
    </div>);
}

// ── VENDOR DIRECTORY (+ resident recommendations) ──
const VSTATUS = { Preferred: C.green, Active: C.goldMuted, New: C.blue };
function VendorDirectory({ onBack }) {
  const store = useFC();
  const recs = store.vendorRecs;
  const vendors = store.vendors;
  return (
    <div style={{ paddingBottom: 28 }}>
      <ScreenHeader back="More" onBack={onBack} eyebrow="Vendor Directory" title="Vendors"
        right={<button onClick={() => window.FCStore.toast('Add-a-vendor form — coming in your next build')} style={{ display: 'flex', alignItems: 'center', gap: 5, background: C.charcoal, color: C.cream, border: 'none', fontFamily: SANS, fontSize: 9, letterSpacing: 1.5, textTransform: 'uppercase', padding: '8px 12px', cursor: 'pointer' }}><i className="ti ti-plus" style={{ fontSize: 12 }} />Add</button>} />
      <div style={{ padding: '18px 20px 0' }}>

        {/* Resident recommendations — approval queue */}
        {recs.length > 0 &&
          <div style={{ marginBottom: 24 }}>
            <SectionLabel mb={6}>Recommended by Residents · {recs.length}</SectionLabel>
            <div style={{ fontSize: 11, color: C.taupe, fontFamily: SANS, lineHeight: 1.6, marginBottom: 12 }}>
              <span style={{ fontFamily: SERIF, fontStyle: 'italic', fontSize: 13.5, color: C.taupeLight }}>Vendors your residents have suggested. Approve to add them to the Chorus list and your planning recommendations.</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {recs.map((v) => (
                <Card key={v.id} style={{ borderLeft: '2px solid var(--gold)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 13 }}>
                    <Avatar initials={v.initials} size={42} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontFamily: SERIF, fontSize: 16.5, color: C.charcoal }}>{v.name}</div>
                      <div style={{ fontSize: 10.5, color: C.taupe, fontFamily: SANS, marginTop: 3 }}>{v.cat} · {v.typical}</div>
                    </div>
                    <span style={{ fontSize: 10, color: C.taupeLight, fontFamily: SANS, whiteSpace: 'nowrap' }}>▲ {v.votes}</span>
                  </div>
                  <div style={{ fontFamily: SERIF, fontStyle: 'italic', fontSize: 13, color: C.taupe, lineHeight: 1.6, marginTop: 10 }}>"{v.note}"</div>
                  <div style={{ fontSize: 10, color: C.taupeLight, fontFamily: SANS, marginTop: 6 }}>Recommended by {v.by} · Unit {v.unit}</div>
                  <div style={{ display: 'flex', gap: 8, marginTop: 13 }}>
                    <button onClick={() => window.FCStore.approveVendor(v.id)} style={{ display: 'inline-flex', alignItems: 'center', gap: 5, background: C.charcoal, color: C.cream, border: 'none', fontFamily: SANS, fontSize: 9, letterSpacing: 1.5, textTransform: 'uppercase', padding: '8px 14px', cursor: 'pointer' }}><i className="ti ti-plus" style={{ fontSize: 12 }} />Add to list</button>
                    <button onClick={() => window.FCStore.declineVendor(v.id)} style={{ background: 'transparent', color: C.taupe, border: '0.5px solid rgba(184,151,42,0.22)', fontFamily: SANS, fontSize: 9, letterSpacing: 1.5, textTransform: 'uppercase', padding: '8px 14px', cursor: 'pointer' }}>Decline</button>
                  </div>
                </Card>))}
            </div>
          </div>}

        <SectionLabel>Your Chorus Vendors</SectionLabel>
        {vendors.length === 0 ?
          <EmptyState compact icon="ti-building-store" title="No vendors yet"
            body="Add trusted partners, or approve a resident recommendation above, to power your event planning." /> :
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {vendors.map((v) => (
              <Card key={v.id} style={{ display: 'flex', alignItems: 'center', gap: 13 }}>
                <Avatar initials={v.initials} size={42} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
                    <div style={{ fontFamily: SERIF, fontSize: 16.5, color: C.charcoal }}>{v.name}</div>
                    {v.fromResident && <span style={{ fontSize: 8, letterSpacing: 1.5, color: 'var(--gold-muted)', textTransform: 'uppercase', fontFamily: SANS }}>Resident pick</span>}
                  </div>
                  <div style={{ fontSize: 10.5, color: C.taupe, fontFamily: SANS, marginTop: 3 }}>{v.cat}{v.typical ? ' · ' + v.typical : ''}</div>
                  <div style={{ fontSize: 10, color: C.taupeLight, fontFamily: SANS, marginTop: 3 }}>{v.last}</div>
                </div>
                <StatusPill color={VSTATUS[v.status]} soft={`${VSTATUS[v.status]}55`}>{v.status}</StatusPill>
              </Card>))}
          </div>}
      </div>
    </div>);
}

// ── AUDIT LOG ──
function AuditLog({ onBack }) {
  const store = useFC();
  const audit = store.audit;
  return (
    <div style={{ paddingBottom: 28 }}>
      <ScreenHeader back="More" onBack={onBack} eyebrow="Activity Log" title="Activity" sub="Recent platform changes" />
      <div style={{ padding: '18px 20px 0' }}>
        {audit.length === 0 ?
          <EmptyState icon="ti-history" title="No activity yet" body="Every approval, invitation, event and access change you make is recorded here for an auditable trail." /> :
        <Card pad={0}>
          {audit.map((a, i) =>
            <div key={i} style={{ display: 'flex', gap: 13, padding: '14px 16px', borderBottom: i < audit.length - 1 ? '0.5px solid rgba(184,151,42,0.1)' : 'none' }}>
              <i className={`ti ${a.icon}`} style={{ fontSize: 16, color: 'var(--gold-muted)', flexShrink: 0, marginTop: 1 }} />
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 12.5, color: C.charcoal, fontFamily: SANS }}><span style={{ color: C.taupe }}>{a.who}</span> · {a.action}</div>
                <div style={{ fontSize: 11, color: 'var(--gold-muted)', fontFamily: SERIF, fontStyle: 'italic', marginTop: 2 }}>{a.target}</div>
                <div style={{ fontSize: 10, color: C.taupeLight, fontFamily: SANS, marginTop: 3 }}>{a.when}</div>
              </div>
            </div>)}
        </Card>}
      </div>
    </div>);
}

Object.assign(window, { BuildingSettings, PilotProgram, Billing, TeamRoles, VendorDirectory, AuditLog });
