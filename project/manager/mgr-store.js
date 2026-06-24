/* Fifth Circle Manager — shared mutable store.
   Stabilization sprint: gives every manager action real persistence,
   derives metrics from live lists, and powers the Day-1 (empty) experience. */
(function () {
  var React = window.React;
  function clone(x) { return JSON.parse(JSON.stringify(x)); }

  function activeSeed() {
    return {
      mode: 'active',
      residents: clone(FCM.residents),
      events: clone(FCM.myEvents),
      proposals: clone(FCM.approvalsDetailed),   // resident-proposed gatherings
      suggestions: clone(FCM.suggestions),        // resident ideas
      vendors: clone(FCM.vendors),                // approved Chorus vendor list
      vendorRecs: clone(FCM.vendorRecs),          // resident recommendations awaiting approval
      intros: clone(FCM.introLog),
      audit: clone(FCM.audit),
      gatheringsHeld: 7,                            // cumulative, pilot-to-date
      introductionsMade: 61,                       // cumulative, pilot-to-date
      pendingConvert: null,                        // {seed, suggestionId} → opens editor
      toasts: []
    };
  }
  function emptySeed() {
    return {
      mode: 'empty',
      residents: [], events: [], proposals: [], suggestions: [], vendors: [], vendorRecs: [], intros: [], audit: [],
      gatheringsHeld: 0, introductionsMade: 0, pendingConvert: null, toasts: []
    };
  }

  var state = activeSeed();
  var listeners = new Set();
  var toastSeq = 1;

  function emit() { listeners.forEach(function (l) { l(); }); }
  function set(patch) {
    state = Object.assign({}, state, typeof patch === 'function' ? patch(state) : patch);
    emit();
  }

  // ── toasts (action confirmation) ──
  function toast(text, kind) {
    var id = toastSeq++;
    state = Object.assign({}, state, { toasts: state.toasts.concat([{ id: id, text: text, kind: kind || 'ok' }]) });
    emit();
    setTimeout(function () { dismiss(id); }, 3400);
  }
  function dismiss(id) { set(function (s) { return { toasts: s.toasts.filter(function (t) { return t.id !== id; }) }; }); }

  function logAudit(action, target, icon) {
    set(function (s) {
      return { audit: [{ who: FCM.manager.name, action: action, target: target, when: 'Just now', icon: icon || 'ti-bolt' }].concat(s.audit) };
    });
  }

  // ── derived metrics (single source of truth) ──
  function metrics() {
    var r = state.residents;
    var by = function (st) { return r.filter(function (x) { return x.status === st; }).length; };
    var active = by('active');
    var T = FCM.pilotTargets;
    return {
      enrolled: r.length,
      active: active,
      pending: by('pending'),
      newcomers: by('new'),
      risk: by('risk'),
      inactive: by('inactive'),
      suspended: r.filter(function (x) { return x.suspended; }).length,
      upcoming: state.events.filter(function (e) { return e.status === 'published'; }).length,
      drafts: state.events.filter(function (e) { return e.status === 'draft'; }).length,
      held: state.gatheringsHeld,
      introductions: state.introductionsMade,
      proposalsPending: state.proposals.filter(function (p) { return !p.decision || p.decision === 'hold' || p.decision === 'changes'; }).length,
      openSuggestions: state.suggestions.filter(function (s) { return s.status === 'open' || s.status === 'shortlisted'; }).length,
      activeTarget: T.activeTarget,
      enrollTarget: T.enrollTarget,
      buildingUnits: T.buildingUnits,
      penetrationPct: Math.round(r.length / T.buildingUnits * 100)
    };
  }

  // Community Health Score — a transparent weighted composite.
  function health() {
    if (state.mode === 'empty') return { score: null, inputs: [], note: 'Not enough activity yet to calculate.' };
    var m = metrics();
    var participation = Math.min(100, Math.round(m.active / m.activeTarget * 100));
    var inputs = FCM.healthWeights.map(function (w) {
      var val = w.key === 'participation' ? participation : w.fixed;
      return { label: w.label, val: val, weight: w.weight };
    });
    var score = Math.round(inputs.reduce(function (a, i) { return a + i.val * i.weight; }, 0) / 100);
    return { score: score, inputs: inputs, note: 'Weighted blend of the four inputs below.' };
  }

  function sentiment() {
    var h = health();
    if (h.score == null) return { state: 'Pilot just beginning', score: null };
    var label = h.score >= 80 ? 'Community Thriving' : h.score >= 60 ? 'Community Growing' : h.score >= 40 ? 'Finding Its Feet' : 'Just Getting Started';
    return { state: label, score: h.score };
  }

  // ── ACTIONS — event proposals (resident-proposed gatherings) ──
  function decideProposal(id, decision, note) {
    var p = state.proposals.find(function (x) { return x.id === id; });
    if (!p) return;
    if (decision === 'approve') {
      var ev = {
        id: 'ev_' + id, title: p.name, type: p.type, status: 'published',
        day: p.day, month: p.month, dow: '', time: p.time, loc: p.loc, host: p.by + ' · ' + p.unit,
        cap: p.rsvpEst, rsvp: 0, waitlist: 0, attended: null, desc: p.comments, fromProposal: true
      };
      set(function (s) {
        return {
          events: [ev].concat(s.events),
          proposals: s.proposals.map(function (x) { return x.id === id ? Object.assign({}, x, { decision: 'approve' }) : x; })
        };
      });
      logAudit('Approved proposal', p.name, 'ti-calendar-check');
      toast('Approved — “' + p.name + '” added to the calendar & residents notified');
    } else {
      set(function (s) {
        return { proposals: s.proposals.map(function (x) { return x.id === id ? Object.assign({}, x, { decision: decision, note: note || '' }) : x; }) };
      });
      var msg = decision === 'changes' ? 'Changes requested — note sent to ' + p.by
        : decision === 'hold' ? '“' + p.name + '” placed on hold'
          : '“' + p.name + '” declined — ' + p.by + ' notified';
      logAudit(decision === 'changes' ? 'Requested changes' : decision === 'hold' ? 'Held proposal' : 'Declined proposal', p.name, 'ti-clock');
      toast(msg);
    }
  }

  // ── ACTIONS — resident suggestions (ideas) ──
  function shortlistSuggestion(id) {
    var s0 = state.suggestions.find(function (x) { return x.id === id; });
    set(function (s) { return { suggestions: s.suggestions.map(function (x) { return x.id === id ? Object.assign({}, x, { status: 'shortlisted' }) : x; }) }; });
    if (s0) { logAudit('Shortlisted idea', s0.text, 'ti-star'); toast('Shortlisted — kept on your planning list'); }
  }
  function archiveSuggestion(id) {
    var s0 = state.suggestions.find(function (x) { return x.id === id; });
    set(function (s) { return { suggestions: s.suggestions.map(function (x) { return x.id === id ? Object.assign({}, x, { status: 'archived' }) : x; }) }; });
    if (s0) { logAudit('Archived idea', s0.text, 'ti-archive'); toast('Idea archived'); }
  }
  // Demand → Event: build a prefilled draft and signal the editor to open.
  function convertSuggestion(id) {
    var s0 = state.suggestions.find(function (x) { return x.id === id; });
    if (!s0) return;
    var typeGuess = s0.kind === 'Vendor' ? 'Culinary' : s0.kind === 'Venue' ? 'Social' : 'Cultural';
    var seed = {
      title: s0.text, desc: 'Proposed by residents — ' + s0.votes + ' have voted for this. ' + s0.text + '.',
      day: '', month: 'Jul', time: '', loc: FCM.locations[0], type: typeGuess, host: 'Concierge', cap: String(Math.max(12, s0.votes)), announce: true
    };
    set({ pendingConvert: { seed: seed, suggestionId: id } });
    toast('Opening event editor — details prefilled from “' + (s0.text.length > 28 ? s0.text.slice(0, 28) + '…' : s0.text) + '”');
  }
  function clearPendingConvert() { set({ pendingConvert: null }); }

  // ── ACTIONS — events ──
  function saveEvent(payload, opts) {
    opts = opts || {};
    var publish = opts.publish;
    var status = publish ? 'published' : 'draft';
    set(function (s) {
      var events;
      if (opts.existingId) {
        events = s.events.map(function (e) { return e.id === opts.existingId ? Object.assign({}, e, payload, { status: status }) : e; });
      } else {
        var ev = Object.assign({ id: 'ev_' + Date.now(), rsvp: 0, waitlist: 0, attended: null }, payload, { status: status });
        events = [ev].concat(s.events);
      }
      var suggestions = s.suggestions;
      if (opts.fromSuggestion) {
        suggestions = s.suggestions.map(function (x) { return x.id === opts.fromSuggestion ? Object.assign({}, x, { status: 'converted' }) : x; });
      }
      return { events: events, suggestions: suggestions, pendingConvert: null };
    });
    logAudit(publish ? 'Published event' : 'Saved draft', payload.title || 'Untitled event', 'ti-calendar-plus');
    toast(publish ? '“' + (payload.title || 'Event') + '” published & announced to residents' : 'Draft saved');
  }
  function closeEvent(id) {
    var e = state.events.find(function (x) { return x.id === id; });
    set(function (s) {
      return {
        events: s.events.map(function (x) { return x.id === id ? Object.assign({}, x, { status: 'closed', attended: x.attended != null ? x.attended : x.rsvp }) : x; }),
        gatheringsHeld: s.gatheringsHeld + 1
      };
    });
    if (e) { logAudit('Closed event', e.title, 'ti-calendar-check'); toast('“' + e.title + '” closed — attendance recorded'); }
  }
  function sendReminder(id) {
    var e = state.events.find(function (x) { return x.id === id; });
    set(function (s) { return { events: s.events.map(function (x) { return x.id === id ? Object.assign({}, x, { reminded: true }) : x; }) }; });
    if (e) { logAudit('Sent reminder', e.title, 'ti-send'); toast('Reminder sent to ' + (e.rsvp || 0) + ' confirmed guests'); }
  }

  // ── ACTIONS — residents ──
  function setSuspended(initials, on) {
    var r = state.residents.find(function (x) { return x.initials === initials; });
    set(function (s) { return { residents: s.residents.map(function (x) { return x.initials === initials ? Object.assign({}, x, { suspended: on }) : x; }) }; });
    if (r) { logAudit(on ? 'Suspended access' : 'Restored access', r.name + ' · ' + r.unit, 'ti-user-off'); toast(on ? r.name + '’s access suspended' : r.name + '’s access restored'); }
  }
  function resendInvite(initials) {
    var r = state.residents.find(function (x) { return x.initials === initials; });
    if (r) { logAudit('Resent invitation', r.name + ' · ' + r.unit, 'ti-mail-forward'); toast('Invitation resent to ' + r.name); }
  }
  function addResident(rec) {
    set(function (s) { return { residents: s.residents.concat([rec]) }; });
    logAudit('Invited resident', rec.name + ' · ' + rec.unit, 'ti-user-plus');
    toast(rec.name + ' invited — they’ll receive a welcome with their access code');
  }

  // ── ACTIONS — vendors (resident recommendations → Chorus list) ──
  function approveVendor(id) {
    var v = state.vendorRecs.find(function (x) { return x.id === id; });
    if (!v) return;
    var added = { id: 'vn_' + id, initials: v.initials, name: v.name, cat: v.cat, status: 'New', last: 'Added from ' + v.by + ' · ' + v.unit, typical: v.typical, fromResident: true };
    set(function (s) {
      return { vendors: [added].concat(s.vendors), vendorRecs: s.vendorRecs.filter(function (x) { return x.id !== id; }) };
    });
    logAudit('Approved vendor', v.name + ' (recommended by ' + v.by + ')', 'ti-building-store');
    toast('“' + v.name + '” added to your Chorus vendor list');
  }
  function declineVendor(id) {
    var v = state.vendorRecs.find(function (x) { return x.id === id; });
    set(function (s) { return { vendorRecs: s.vendorRecs.filter(function (x) { return x.id !== id; }) }; });
    if (v) { logAudit('Declined vendor recommendation', v.name, 'ti-x'); toast('Recommendation for “' + v.name + '” dismissed'); }
  }

  function setMode(mode) { state = mode === 'empty' ? emptySeed() : activeSeed(); emit(); }
  window.FCStore = {
    getState: function () { return state; },
    subscribe: function (l) { listeners.add(l); return function () { listeners.delete(l); }; },
    setMode: setMode, toast: toast, dismiss: dismiss,
    metrics: metrics, health: health, sentiment: sentiment,
    decideProposal: decideProposal,
    shortlistSuggestion: shortlistSuggestion, archiveSuggestion: archiveSuggestion,
    convertSuggestion: convertSuggestion, clearPendingConvert: clearPendingConvert,
    saveEvent: saveEvent, closeEvent: closeEvent, sendReminder: sendReminder,
    setSuspended: setSuspended, resendInvite: resendInvite, addResident: addResident,
    approveVendor: approveVendor, declineVendor: declineVendor
  };

  // Hook: re-render on any store change. Returns live state.
  window.useFC = function () {
    return React.useSyncExternalStore(window.FCStore.subscribe, window.FCStore.getState);
  };
})();
