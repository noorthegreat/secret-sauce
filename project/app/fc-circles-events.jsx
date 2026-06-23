/* Fifth Circle — Circles, Events, Profile detail. */

// ── PROFILE detail (any resident) ──
function ProfileScreen({ id, ctx }) {
  const r = FC.residents[id];
  return (
    <div style={{ paddingBottom: 30 }}>
      <ScreenHeader back="Back" onBack={ctx.back} eyebrow={`Unit ${r.unit}`} title={r.name} />
      <div style={{ padding: '20px 22px 0', display: 'flex', gap: 16, alignItems: 'center' }}>
        <Avatar id={id} size={72} drop={ctx.visual} />
        <div>
          <div style={{ fontSize: 12, color: C.taupe, fontFamily: SANS }}>{r.occupation}</div>
          <div style={{ fontSize: 10.5, color: C.taupeLight, fontFamily: SANS, marginTop: 3, letterSpacing: 0.5 }}>{r.industry}</div>
        </div>
      </div>
      <div style={{ padding: '20px 22px 0' }}>
        <SectionLabel mb={8}>About</SectionLabel>
        <div style={{ fontFamily: SERIF, fontStyle: 'italic', fontSize: 15, lineHeight: 1.8, color: C.taupe, marginBottom: 20 }}>"{r.bio}"</div>
        <SectionLabel mb={10}>Interests</SectionLabel>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 20 }}>
          {r.interests.map((s) => <Tag key={s} shared={r.shared && r.shared.includes(s)}>{s}</Tag>)}
        </div>
        {r.sharedGoals && <>
          <SectionLabel mb={10}>Here to</SectionLabel>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 20 }}>
            {r.sharedGoals.map((s) => <Tag key={s}>{s}</Tag>)}
          </div>
        </>}
      </div>
      <div style={{ padding: '4px 22px 0' }}>
        <BtnDark onClick={() => ctx.open('intro', id)}>Request an introduction</BtnDark>
      </div>
    </div>);

}

// ── CIRCLES ──
function CirclesScreen({ ctx }) {
  const [tab, setTab] = useState('discover');
  const refined = ctx.refined,newArrival = ctx.newArrival;
  const mine = newArrival ? [] : FC.circles.filter((c) => c.joined);
  const discover = FC.circles.filter((c) => !c.joined);
  const list = tab === 'mine' ? mine : discover;
  return (
    <div style={{ paddingBottom: 28 }}>
      <ScreenHeader eyebrow="Curated by your concierge" title={<>Circles</>}>
        <div style={{ display: 'flex', marginTop: 14 }}>
          {[['discover', 'Discover'], ['mine', `My circles · ${mine.length}`]].map(([id, label]) =>
          <div key={id} onClick={() => setTab(id)} style={{
            paddingRight: 22, paddingBottom: 6, cursor: 'pointer', fontSize: 10, letterSpacing: 2, textTransform: 'uppercase', fontFamily: SANS,
            color: tab === id ? 'var(--gold-muted)' : C.taupeLight, borderBottom: tab === id ? '1px solid var(--gold)' : '1px solid transparent'
          }}>{label}</div>
          )}
        </div>
      </ScreenHeader>

      <div style={{ padding: '16px 22px 0' }}>
        {tab === 'discover' &&
        <ConciergeWhisper pad="14px 16px">Small groups of 3 to 6 residents, matched on shared interests and pace. Each is hand-formed, never an open room.</ConciergeWhisper>
        }
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 16 }}>
          {list.map((c) => <CircleCard key={c.id} c={c} onClick={() => ctx.open('circle', c.id)} />)}
          {!list.length && (refined ?
          <PreparingState label="From your concierge" line="Your concierge is hand-forming a circle for you. We'd rather it be right than fast — you'll be introduced once the group is ready." /> :
          <div style={{ fontFamily: SERIF, fontStyle: 'italic', fontSize: 15, color: C.taupe, padding: '20px 0', textAlign: 'center' }}>You haven't joined a circle yet.</div>)}
        </div>
      </div>
    </div>);

}

function CircleCard({ c, onClick }) {
  const visual = useVisual();
  const statusBadge = c.joined ? <span style={{ fontSize: 9, letterSpacing: 2, color: C.green, textTransform: 'uppercase', fontFamily: SANS }}>Member ✓</span> :
    c.status === 'full' ? <span style={{ fontSize: 9, letterSpacing: 2, color: C.taupeLight, textTransform: 'uppercase', fontFamily: SANS }}>Full · Waitlist</span> :
    <span style={{ fontSize: 9, letterSpacing: 2, color: 'var(--gold-muted)', textTransform: 'uppercase', fontFamily: SANS }}>View →</span>;
  if (visual) {
    return (
      <Card onClick={onClick} pad={0} lift style={{ overflow: 'hidden' }}>
        <div style={{ position: 'relative', height: 126, background: C.charcoalSoft }}>
          <img src={window.RES(`img/${c.photo}.png`)} alt="" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }} />
          <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(18,13,8,0.92) 0%, rgba(18,13,8,0.3) 58%, rgba(18,13,8,0.08) 100%)' }} />
          <div style={{ position: 'absolute', top: 12, right: 12, display: 'flex' }}>
            {c.members.slice(0, 3).map((m, i) => <div key={m} style={{ marginLeft: i ? -10 : 0 }}><Avatar id={m} size={30} /></div>)}
          </div>
          <div style={{ position: 'absolute', left: 16, right: 16, bottom: 13 }}>
            <div style={{ fontSize: 8.5, letterSpacing: 2.5, color: 'var(--gold-light)', textTransform: 'uppercase', fontFamily: SANS, marginBottom: 6 }}>{c.type}</div>
            <div style={{ fontFamily: SERIF, fontSize: 22, color: C.cream, lineHeight: 1.05 }}>{c.name}</div>
          </div>
        </div>
        <div style={{ padding: '13px 16px' }}>
          <div style={{ display: 'flex', gap: 16, marginBottom: 11 }}>
            <Meta icon="ti-clock" text={c.cadence} />
            <Meta icon="ti-users" text={`${c.size} of ${c.cap}`} />
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: `0.5px solid ${STONE_SOFT}`, paddingTop: 11 }}>
            <span style={{ fontSize: 10.5, color: C.taupe, fontFamily: SANS }}>{c.place}</span>
            {statusBadge}
          </div>
        </div>
      </Card>);
  }
  return (
    <Card onClick={onClick} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: 8.5, letterSpacing: 2.5, color: 'var(--gold-muted)', textTransform: 'uppercase', fontFamily: SANS, marginBottom: 5 }}>{c.type}</div>
          <div style={{ fontFamily: SERIF, fontSize: 20, color: C.charcoal, lineHeight: 1.05 }}>{c.name}</div>
        </div>
        <div style={{ display: 'flex', marginLeft: 10, flexShrink: 0 }}>
          {c.members.slice(0, 3).map((m, i) => <div key={m} style={{ marginLeft: i ? -10 : 0 }}><Avatar id={m} size={30} /></div>)}
        </div>
      </div>
      <div style={{ display: 'flex', gap: 16 }}>
        <Meta icon="ti-clock" text={c.cadence} />
        <Meta icon="ti-users" text={`${c.size} of ${c.cap}`} />
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '0.5px solid rgba(184,151,42,0.12)', paddingTop: 11 }}>
        <span style={{ fontSize: 10.5, color: C.taupe, fontFamily: SANS }}>{c.place}</span>
        {statusBadge}
      </div>
    </Card>);
}
const Meta = ({ icon, text }) =>
<div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
    <i className={`ti ${icon}`} style={{ fontSize: 13, color: C.taupeLight }} />
    <span style={{ fontSize: 10.5, color: C.taupe, fontFamily: SANS }}>{text}</span>
  </div>;


function CircleDetail({ id, ctx }) {
  const c = FC.circles.find((x) => x.id === id);
  const [joined, setJoined] = useState(c.joined);
  const [requested, setRequested] = useState(false);
  const [openToNew, setOpenToNew] = useState(c.openToNew !== false); // my consent, member view
  const accepting = c.openToNew !== false && c.status !== 'full';
  const placeOpts = [...new Set(['Lobby Coffee Bar', c.place, 'Rooftop Garden'])];
  const [place, setPlace] = useState('Lobby Coffee Bar');
  const [topic, setTopic] = useState(c.sharedInterests[0]);
  const othersOpen = Math.max(0, c.size - 1);
  return (
    <div style={{ paddingBottom: 30 }}>
      <ScreenHeader back="Circles" onBack={ctx.back} eyebrow={c.type} title={c.name} />
      <div style={{ padding: '20px 22px 0' }}>
        <ConciergeWhisper pad="16px 16px">{c.why}</ConciergeWhisper>
      </div>
      <div style={{ padding: '22px 22px 0' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1, background: 'rgba(184,151,42,0.16)', border: '0.5px solid rgba(184,151,42,0.16)', marginBottom: 22 }}>
          <Stat label="Cadence" value={c.cadence} />
          <Stat label="Atmosphere" value={c.atmosphere} />
          <Stat label="Meeting place" value={c.place} />
          <Stat label="Members" value={`${c.size} of ${c.cap}`} />
        </div>
        <SectionLabel mb={10}>Shared interests</SectionLabel>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 22 }}>
          {c.sharedInterests.map((s) => <Tag key={s} shared>{s}</Tag>)}
        </div>

        {joined ?
        <>
          <SectionLabel mb={12}>Members</SectionLabel>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {c.members.map((m) => {
              const r = FC.residents[m];
              return (
                <div key={m} onClick={() => ctx.open('profile', m)} style={{ display: 'flex', gap: 12, alignItems: 'center', cursor: 'pointer' }}>
                  <Avatar id={m} size={40} />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontFamily: SERIF, fontSize: 16, color: C.charcoal }}>{r.name}</div>
                    <div style={{ fontSize: 10.5, color: C.taupe, fontFamily: SANS }}>{r.occupation}</div>
                  </div>
                  <span style={{ fontSize: 14, color: C.taupeLight }}>›</span>
                </div>);

            })}
          </div>
        </> :

        <>
          <SectionLabel mb={12}>Who's inside</SectionLabel>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, background: C.white, border: '0.5px solid rgba(184,151,42,0.16)', padding: '14px 15px' }}>
            <div style={{ display: 'flex' }}>
              {Array.from({ length: Math.min(c.size, 4) }).map((_, i) =>
              <div key={i} style={{ marginLeft: i ? -10 : 0, width: 34, height: 34, borderRadius: '50%', background: C.parchment, border: '0.5px solid rgba(184,151,42,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <i className="ti ti-user" style={{ fontSize: 14, color: 'rgba(184,151,42,0.5)' }} />
                </div>
              )}
            </div>
            <div style={{ flex: 1, fontSize: 11.5, color: C.taupe, fontFamily: SANS, lineHeight: 1.5 }}>{c.size} residents, matched by the concierge. <span style={{ fontStyle: 'italic', fontFamily: SERIF, fontSize: 14, color: C.taupeLight }}>Names are visible once you're in the circle.</span></div>
          </div>
        </>
        }
      </div>

      {joined &&
      <div style={{ padding: '24px 22px 0' }}>
        <SectionLabel mb={10}>Your first gathering</SectionLabel>
        <ConciergeWhisper pad="14px 16px">I'd suggest meeting at the <strong style={{ fontWeight: 500, fontStyle: 'normal', color: 'var(--gold-muted)' }}>{place}</strong>, around your shared love of <strong style={{ fontWeight: 500, fontStyle: 'normal', color: 'var(--gold-muted)' }}>{topic}</strong>. It's your call — adjust either below.</ConciergeWhisper>
        <div style={{ marginTop: 16 }}>
          <div style={{ fontSize: 8.5, letterSpacing: 2, color: C.taupeLight, textTransform: 'uppercase', fontFamily: SANS, marginBottom: 9 }}>Meeting place</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7, marginBottom: 16 }}>
            {placeOpts.map((p) => <Chip key={p} sm sel={place === p} onClick={() => setPlace(p)}>{p}</Chip>)}
          </div>
          <div style={{ fontSize: 8.5, letterSpacing: 2, color: C.taupeLight, textTransform: 'uppercase', fontFamily: SANS, marginBottom: 9 }}>Anchor it around</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7 }}>
            {c.sharedInterests.map((s) => <Chip key={s} sm sel={topic === s} onClick={() => setTopic(s)}>{s}</Chip>)}
          </div>
        </div>
      </div>
      }

      {joined &&
      <div style={{ padding: '24px 22px 0' }}>
        <SectionLabel mb={10}>New members</SectionLabel>
        <div style={{ background: C.white, border: '0.5px solid rgba(184,151,42,0.16)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 15px', borderBottom: '0.5px solid rgba(184,151,42,0.1)' }}>
            <span style={{ fontSize: 12.5, color: C.charcoal, fontFamily: SANS, fontWeight: 300, flex: 1, paddingRight: 12 }}>I'm open to new members</span>
            <Toggle on={openToNew} onClick={() => setOpenToNew(!openToNew)} />
          </div>
          <div style={{ padding: '12px 15px', fontSize: 10.5, color: C.taupe, fontFamily: SANS, fontStyle: 'italic', lineHeight: 1.6 }}>
            The concierge introduces someone new only when every member is open. {othersOpen} other member{othersOpen === 1 ? ' is' : 's are'} open right now{openToNew ? ' — including you.' : '. You\u2019ve paused yours.'}
          </div>
        </div>
      </div>
      }

      <div style={{ padding: '26px 22px 0' }}>
        {joined ?
        <div style={{ background: 'rgba(107,140,90,0.08)', border: '0.5px solid rgba(107,140,90,0.4)', padding: '15px', textAlign: 'center', fontFamily: SERIF, fontStyle: 'italic', fontSize: 15, color: C.charcoalSoft }}>You're part of this circle. Next gathering details will arrive soon.</div> :
        accepting ?
        <>
          <BtnDark onClick={() => setJoined(true)}>Join this circle</BtnDark>
          <div style={{ fontFamily: SERIF, fontStyle: 'italic', fontSize: 13.5, color: C.taupeLight, textAlign: 'center', lineHeight: 1.55, marginTop: 11 }} data-comment-anchor="cf3461aaa7-div-204-9">Open to any resident \u2014 step in whenever you like. The members are simply let know when someone new joins.</div>
        </> :
        <>
          <div style={{ fontSize: 11.5, color: C.taupe, fontFamily: SANS, textAlign: 'center', lineHeight: 1.6, marginBottom: 12 }}>This circle is at capacity right now. It opens up when the group is ready for someone new.</div>
          <BtnGhost onClick={() => setRequested(true)} active={requested}>{requested ? 'We\u2019ll let you know \u2713' : 'Notify me if they open up'}</BtnGhost>
        </>
        }
      </div>
    </div>);

}
const Stat = ({ label, value }) =>
<div style={{ background: C.white, padding: '14px 14px' }}>
    <div style={{ fontSize: 8, letterSpacing: 2, color: C.taupeLight, textTransform: 'uppercase', fontFamily: SANS, marginBottom: 6 }}>{label}</div>
    <div style={{ fontFamily: SERIF, fontSize: 14.5, color: C.charcoal, lineHeight: 1.25 }}>{value}</div>
  </div>;


// ── EVENTS ──
function EventsScreen({ ctx }) {
  const [tab, setTab] = useState('all');
  const ev = FC.events;
  return (
    <div style={{ paddingBottom: 80 }}>
      <ScreenHeader eyebrow="Community" title={<>Gatherings</>}>
        <div style={{ display: 'flex', marginTop: 14 }}>
          {[['all', 'Upcoming'], ['proposed', 'Proposed']].map(([id, label]) =>
          <div key={id} onClick={() => setTab(id)} style={{
            paddingRight: 22, paddingBottom: 6, cursor: 'pointer', fontSize: 10, letterSpacing: 2, textTransform: 'uppercase', fontFamily: SANS,
            color: tab === id ? 'var(--gold-muted)' : C.taupeLight, borderBottom: tab === id ? '1px solid var(--gold)' : '1px solid transparent'
          }}>{label}</div>
          )}
        </div>
      </ScreenHeader>

      {tab === 'all' ?
      <div style={{ padding: '20px 22px 0' }} data-comment-anchor="98db7604ab-div-191-9">
          <EvCat label="Building Events" list={ev.building} ctx={ctx} />
          <EvCat label="Resident Gatherings" list={ev.resident} ctx={ctx} />
          <MgmtConsiderationCard c={ev.consideration} />
        </div> :

      <div style={{ padding: '20px 22px 0' }}>
          <div style={{ fontSize: 10.5, color: C.taupe, fontFamily: SANS, marginBottom: 14, letterSpacing: 0.3 }}>Ideas proposed by residents. Vote to show the building there's interest.</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 11 }}>
            {ev.proposed.map((p) => <ProposedCard key={p.id} p={p} />)}
          </div>
        </div>
      }

      <div onClick={() => ctx.open('suggest')} style={{ position: 'sticky', bottom: 0, marginTop: 18, padding: '15px 22px', background: C.charcoal, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 9, cursor: 'pointer', borderTop: '0.5px solid rgba(184,151,42,0.25)' }}>
        <i className="ti ti-plus" style={{ fontSize: 14, color: 'var(--gold)' }} />
        <span style={{ fontSize: 10, letterSpacing: 3, textTransform: 'uppercase', color: C.cream, fontFamily: SANS }}>Suggest a gathering</span>
      </div>
    </div>);

}
// Management is weighing a future event — residents vote to signal demand.
function MgmtConsiderationCard({ c }) {
  if (!c) return null;
  const [vote, setVote] = useState(c.vote);
  const yes = c.yes + (vote === 'yes' && c.vote !== 'yes' ? 1 : 0);
  const no = c.no + (vote === 'no' && c.vote !== 'no' ? 1 : 0);
  const pct = Math.min(100, Math.round(yes / c.threshold * 100));
  return (
    <div style={{ marginBottom: 26, background: C.charcoal, border: '0.5px solid rgba(184,151,42,0.3)', padding: '18px 18px 16px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
        <i className="ti ti-building-community" style={{ fontSize: 14, color: 'var(--gold)' }} />
        <span style={{ fontSize: 9, letterSpacing: 2.5, textTransform: 'uppercase', color: 'var(--gold-light)', fontFamily: SANS }}>The building is considering</span>
      </div>
      <div style={{ fontFamily: SERIF, fontSize: 23, color: C.cream, lineHeight: 1.1, marginBottom: 4 }} data-comment-anchor="72310a4438-div-272-7">{c.title}</div>
      <div style={{ fontSize: 10, letterSpacing: 1.5, textTransform: 'uppercase', color: 'rgba(184,151,42,0.7)', fontFamily: SANS, marginBottom: 11 }}>{c.when}</div>
      <div style={{ fontFamily: SERIF, fontStyle: 'italic', fontSize: 15, color: 'rgba(242,237,227,0.7)', lineHeight: 1.6, marginBottom: 16 }}>{c.line}</div>

      {/* interest meter */}
      <div style={{ height: 4, background: 'rgba(242,237,227,0.12)', marginBottom: 7 }}>
        <div style={{ width: `${pct}%`, height: '100%', background: 'var(--gold)', transition: 'width .25s' }} />
      </div>
      <div style={{ fontSize: 9.5, color: 'rgba(242,237,227,0.5)', fontFamily: SANS, letterSpacing: 0.5, marginBottom: 15 }}>{yes} of {c.threshold} interested — {pct >= 100 ? "it's happening" : `${c.threshold - yes} more to make it happen`}</div>

      <div style={{ display: 'flex', gap: 9 }}>
        <button onClick={() => setVote(vote === 'yes' ? null : 'yes')} style={{ flex: 1, padding: '12px', cursor: 'pointer', fontFamily: SANS, fontSize: 9.5, letterSpacing: 2, textTransform: 'uppercase', border: `0.5px solid ${vote === 'yes' ? 'var(--gold)' : 'rgba(242,237,227,0.25)'}`, background: vote === 'yes' ? 'var(--gold)' : 'transparent', color: vote === 'yes' ? C.charcoal : C.cream }}>
          {vote === 'yes' ? "I'm in ✓" : "I'd come"}
        </button>
        <button onClick={() => setVote(vote === 'no' ? null : 'no')} style={{ flex: 1, padding: '12px', cursor: 'pointer', fontFamily: SANS, fontSize: 9.5, letterSpacing: 2, textTransform: 'uppercase', border: `0.5px solid ${vote === 'no' ? 'rgba(242,237,227,0.5)' : 'rgba(242,237,227,0.25)'}`, background: vote === 'no' ? 'rgba(242,237,227,0.1)' : 'transparent', color: 'rgba(242,237,227,0.65)' }}>
          Not for me
        </button>
      </div>
    </div>);

}

function EvCat({ label, list, ctx }) {
  return (
    <div style={{ marginBottom: 26 }}>
      <SectionLabel mb={12}>{label}</SectionLabel>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {list.map((e) => <EventRow key={e.id} ev={e} onClick={() => ctx.open('event', e.id)} />)}
      </div>
    </div>);

}
function ProposedCard({ p }) {
  const [voted, setVoted] = useState(p.voted);
  const badge = p.status.startsWith('Approved') ?
  { c: C.green, bd: 'rgba(107,140,90,0.4)' } :
  p.status === 'Under Review' ? { c: 'var(--gold-muted)', bd: 'rgba(184,151,42,0.4)' } : { c: C.taupeLight, bd: 'rgba(184,151,42,0.2)' };
  return (
    <Card>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10, gap: 10 }}>
        <div style={{ fontFamily: SERIF, fontSize: 18, color: C.charcoal, flex: 1 }}>{p.title}</div>
        <span style={{ fontSize: 8, letterSpacing: 1.5, textTransform: 'uppercase', color: badge.c, border: `0.5px solid ${badge.bd}`, padding: '4px 9px', whiteSpace: 'nowrap', fontFamily: SANS, flexShrink: 0 }}>{p.status}</span>
      </div>
      <div style={{ display: 'flex', gap: 16, marginBottom: 13 }}>
        <span style={{ fontSize: 10.5, color: C.taupe, fontFamily: SANS }}>{p.votes + (voted && !p.voted ? 1 : 0)} votes</span>
        <span style={{ fontSize: 10.5, color: C.taupe, fontFamily: SANS }}>{p.interested} interested</span>
      </div>
      <BtnGhost onClick={() => setVoted(!voted)} active={voted}>{voted ? 'Voted ✓' : 'Vote +1'}</BtnGhost>
    </Card>);

}

function EventDetail({ id, ctx }) {
  const all = [...FC.events.building, ...FC.events.circles, ...FC.events.resident];
  const ev = all.find((e) => e.id === id);
  const refined = ctx.refined;
  const evPhoto = ev.photo || 'amenity-skydeck';
  const [rsvp, setRsvp] = useState(ev.rsvp);
  const [voted, setVoted] = useState(false);
  const votes = (ev.votes || 0) + (voted ? 1 : 0);
  const full = ev.attending >= ev.cap && !rsvp;
  // similar attendees: residents sharing event interests
  const similar = Object.values(FC.residents).filter((r) => r.id !== 'noor' && r.interests.some((i) => ev.interests.includes(i))).slice(0, 4);
  return (
    <div style={{ paddingBottom: 30 }}>
      <ScreenHeader back="Gatherings" onBack={ctx.back} eyebrow={ev.host === 'Building' ? 'Building event' : `Hosted by ${ev.host}`} title={ev.title} />
      {ctx.visual &&
      <div style={{ background: C.charcoalSoft }}>
        <image-slot id={`fc-event-${ev.id}`} shape="rect" src={window.RES(`img/${evPhoto}.png`)} placeholder="Drop an event photo" style={{ display: 'block', width: '100%', height: '172px' }}></image-slot>
      </div>}
      <div style={{ padding: '20px 22px 0' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1, background: 'rgba(184,151,42,0.16)', border: '0.5px solid rgba(184,151,42,0.16)', marginBottom: 20 }}>
          <Stat label="When" value={`${ev.dow} ${ev.month} ${ev.day} · ${ev.time}`} />
          <Stat label="Where" value={ev.loc} />
        </div>
        {ev.rating &&
        <div style={{ display: 'flex', border: '0.5px solid rgba(184,151,42,0.16)', marginBottom: 20 }}>
            <div style={{ flex: 1, padding: '14px 16px', borderRight: '0.5px solid rgba(184,151,42,0.16)' }}>
              <div style={{ fontSize: 8, letterSpacing: 2, color: C.taupeLight, textTransform: 'uppercase', fontFamily: SANS, marginBottom: 7 }}>Resident rating</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{ display: 'flex', gap: 1.5 }}>
                  {[1, 2, 3, 4, 5].map((n) => <span key={n} style={{ fontFamily: SERIF, fontSize: 16, lineHeight: 1, color: n <= Math.round(ev.rating) ? 'var(--gold)' : 'rgba(184,151,42,0.25)' }}>★</span>)}
                </div>
                <span style={{ fontFamily: SERIF, fontSize: 17, color: C.charcoal }}>{ev.rating.toFixed(1)}</span>
              </div>
              <div style={{ fontSize: 9.5, color: C.taupeLight, fontFamily: SANS, marginTop: 5 }}>{ev.ratings} ratings</div>
            </div>
            <div onClick={() => setVoted((v) => !v)} style={{ width: 128, padding: '14px 16px', cursor: 'pointer', display: 'flex', flexDirection: 'column', justifyContent: 'center', background: voted ? 'rgba(184,151,42,0.08)' : 'transparent' }}>
              <div style={{ fontSize: 8, letterSpacing: 2, color: C.taupeLight, textTransform: 'uppercase', fontFamily: SANS, marginBottom: 7 }}>Bring it back</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <i className={`ti ${voted ? 'ti-heart-filled' : 'ti-heart'}`} style={{ fontSize: 17, color: 'var(--gold-muted)' }} />
                <span style={{ fontFamily: SERIF, fontSize: 17, color: C.charcoal }}>{votes}</span>
              </div>
              <div style={{ fontSize: 9.5, color: voted ? 'var(--gold-muted)' : C.taupeLight, fontFamily: SANS, marginTop: 5, letterSpacing: 0.5 }}>{voted ? 'Voted ✓' : 'Tap to vote'}</div>
            </div>
          </div>
        }
        <SectionLabel mb={10}>Themes</SectionLabel>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 22 }}>
          {ev.interests.map((s) => <Tag key={s} shared>{s}</Tag>)}
        </div>
        <ConciergeWhisper pad="14px 16px">{similar.length} residents who share your interests are going. A good chance to put a few faces to names.</ConciergeWhisper>
        <div style={{ marginTop: 22 }}>
          <SectionLabel mb={12}>You may know</SectionLabel>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {similar.map((r) =>
            <div key={r.id} onClick={() => ctx.open('profile', r.id)} style={{ display: 'flex', gap: 12, alignItems: 'center', cursor: 'pointer' }}>
                <Avatar id={r.id} size={38} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontFamily: SERIF, fontSize: 15.5, color: C.charcoal }}>{r.name}</div>
                  <div style={{ fontSize: 10, color: C.taupe, fontFamily: SANS }}>Shares {r.interests.filter((i) => ev.interests.includes(i)).join(', ')}</div>
                </div>
                <span style={{ fontSize: 14, color: C.taupeLight }}>›</span>
              </div>
            )}
          </div>
        </div>
        <div style={{ marginTop: 16 }}>
          <SectionLabel mb={10}>Conversation starters</SectionLabel>
          <div style={{ fontFamily: SERIF, fontStyle: 'italic', fontSize: 14.5, lineHeight: 1.85, color: C.taupe }}>
            "What brought you to {FC.building}?" · "Have you tried any of the building's other gatherings?"
          </div>
        </div>
      </div>
      <div style={{ padding: '24px 22px 0' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <span style={{ fontSize: 10.5, color: C.taupe, fontFamily: SANS }}>{ev.attending}/{ev.cap} attending</span>
          {full && <span style={{ fontSize: 9, letterSpacing: 2, color: C.taupeLight, textTransform: 'uppercase', fontFamily: SANS }}>At capacity</span>}
        </div>
        <BtnDark onClick={() => setRsvp(!rsvp)}>{rsvp ? refined ? "I'll be there ✓ · Tap to cancel" : 'Attending ✓ · Tap to cancel' : full ? 'Join the waitlist' : refined ? 'Save me a place' : 'RSVP'}</BtnDark>
      </div>
    </div>);

}

Object.assign(window, { ProfileScreen, CirclesScreen, CircleDetail, EventsScreen, EventDetail, ProposedCard });