// ============================================================
//  SEAL TRACKER — app.js
//  Miami Ice Arena
//  Replace APPS_SCRIPT_URL below with your deployed Apps Script URL
// ============================================================

const APPS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbxBlTqQ-8-Qp2Kf_ZPngiHvDKqKUhWpxLydtRaADFdMsmJUZbym71uGZB80V8m_u5z_/exec';

// ============================================================
//  PASSWORD CONFIG
//  Change STAFF_PASSWORD to whatever word/phrase you want.
//  Skateguards only see the Skateguard tab — they never see
//  this file unless they open DevTools, so this is fine for
//  an internal ops tool. For bank-level security you'd need
//  a real server, but this is solid for an ice arena. 🧊
// ============================================================
const STAFF_PASSWORD = 'icearena'; // ← CHANGE THIS

// All known seal IDs — edit to match your full seal list exactly
const ALL_SEALS = [
  '1','2','3','4','5','6','7','8','9','10',
  '11','12','13','14','15','16','17','18','19','20',
  '21','22','23','24','25','26','27','28','29','30',
  '31','32','33','34','35','36','37','38','39','40',
  '41','42','43','44','45','46','47','48','49','50',
  '51','52','53','54','55','56','57','58','59','60',
  'A','B','C','D','E','F','G','H','M','N','X',
  'Star','Octagon','Triangle','$','Sun'
];

// ============================================================
//  STATE
// ============================================================
let sealData  = {};
let partyData = {};
let isAuthenticated = false;
let highlightedSeal = null;

// ============================================================
//  INIT
// ============================================================
document.addEventListener('DOMContentLoaded', () => {
  setupTabs();
  setupClock();
  setupAuth();
  buildGrid();
  loadData();
  setInterval(loadData, 30000);
  setInterval(tickCountdowns, 10000);
});

// ============================================================
//  AUTH — password gate for all staff actions
// ============================================================
function setupAuth() {
  // Lock staff UI on load
  renderAuthState();

  document.getElementById('authSubmitBtn').addEventListener('click', tryLogin);
  document.getElementById('authPasswordInput').addEventListener('keydown', e => {
    if (e.key === 'Enter') tryLogin();
  });
  document.getElementById('lockBtn').addEventListener('click', () => {
    isAuthenticated = false;
    document.getElementById('authPasswordInput').value = '';
    renderAuthState();
    toast('Locked 🔒', 'info');
  });
}

function tryLogin() {
  const val = document.getElementById('authPasswordInput').value;
  if (val === STAFF_PASSWORD) {
    isAuthenticated = true;
    document.getElementById('authPasswordInput').value = '';
    renderAuthState();
    toast('Access granted ✓', 'success');
  } else {
    document.getElementById('authError').textContent = 'Incorrect password.';
    document.getElementById('authPasswordInput').value = '';
    document.getElementById('authPasswordInput').focus();
    setTimeout(() => { document.getElementById('authError').textContent = ''; }, 2000);
  }
}

function renderAuthState() {
  const lockScreen  = document.getElementById('staffLockScreen');
  const staffUI     = document.getElementById('staffUI');
  const lockBtn     = document.getElementById('lockBtn');
  const partyLock   = document.getElementById('partyLockScreen');
  const partyUI     = document.getElementById('partyUI');

  if (isAuthenticated) {
    lockScreen.style.display  = 'none';
    staffUI.style.display     = 'block';
    lockBtn.style.display     = 'flex';
    partyLock.style.display   = 'none';
    partyUI.style.display     = 'block';
  } else {
    lockScreen.style.display  = 'flex';
    staffUI.style.display     = 'none';
    lockBtn.style.display     = 'none';
    partyLock.style.display   = 'flex';
    partyUI.style.display     = 'none';
  }

  // Skateguard: always show data, but hide action buttons
  updateSkateguardActions();
}

function requireAuth(fn) {
  // Wrapper: runs fn only if authenticated, otherwise flashes lock
  return function(...args) {
    if (!isAuthenticated) {
      toast('🔒 Staff login required', 'error');
      return;
    }
    return fn(...args);
  };
}

// ============================================================
//  TABS
// ============================================================
function setupTabs() {
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
      document.querySelectorAll('.tab-content').forEach(s => s.classList.remove('active'));
      btn.classList.add('active');
      document.getElementById('tab-' + btn.dataset.tab).classList.add('active');
    });
  });
  document.getElementById('staffRefresh').addEventListener('click', () => loadData(true));
  document.getElementById('skateguardRefresh').addEventListener('click', () => loadData(true));
  document.getElementById('partyRefresh').addEventListener('click', () => loadData(true));
}

// ============================================================
//  CLOCK
// ============================================================
function setupClock() {
  const tick = () => {
    document.getElementById('clock').textContent =
      new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  };
  tick();
  setInterval(tick, 1000);
}

// ============================================================
//  SEARCH + ACTIVATE (staff only)
// ============================================================
document.addEventListener('DOMContentLoaded', () => {
  const input = document.getElementById('sealSearch');
  const btn   = document.getElementById('activateBtn');
  if (input) {
    input.addEventListener('input', () => { highlightGridSeal(input.value.trim()); clearFeedback('searchFeedback'); });
    input.addEventListener('keydown', e => { if (e.key === 'Enter') activateSeal(); });
  }
  if (btn) btn.addEventListener('click', activateSeal);
});

function highlightGridSeal(id) {
  document.querySelectorAll('.seal-tile').forEach(t => t.classList.remove('highlighted'));
  if (!id) return;
  const tile = document.querySelector(`.seal-tile[data-id="${CSS.escape(id)}"]`);
  if (tile) { tile.classList.add('highlighted'); tile.scrollIntoView({ behavior: 'smooth', block: 'nearest' }); }
}

async function activateSeal() {
  if (!isAuthenticated) { toast('🔒 Staff login required', 'error'); return; }
  const idRaw = document.getElementById('sealSearch').value.trim();
  if (!idRaw) { setFeedback('searchFeedback', 'Enter a seal ID first.', 'error'); return; }
  if (sealData[idRaw]?.status === 'Active') {
    setFeedback('searchFeedback', `Seal ${idRaw} is already active. Tap the tile to return or extend.`, 'error');
    return;
  }
  const addTime = document.getElementById('additionalTime').value.trim();
  const notes   = document.getElementById('sealNotes').value.trim();
  setFeedback('searchFeedback', `Activating seal ${idRaw}...`, 'info');
  document.getElementById('activateBtn').disabled = true;
  try {
    await apiCall({ action: 'activate', sealId: idRaw, additionalTime: addTime, notes, sheet: 'DATA' });
    setFeedback('searchFeedback', `✓ Seal ${idRaw} activated!`, 'success');
    document.getElementById('sealSearch').value = '';
    document.getElementById('additionalTime').value = '';
    document.getElementById('sealNotes').value = '';
    toast(`Seal ${idRaw} activated`, 'success');
    await loadData();
  } catch (err) {
    setFeedback('searchFeedback', `Error: ${err.message}`, 'error');
    toast('Activation failed', 'error');
  } finally {
    document.getElementById('activateBtn').disabled = false;
  }
}

// ============================================================
//  SEAL GRID (Staff tab)
// ============================================================
function buildGrid() {
  const grid = document.getElementById('sealGrid');
  if (!grid) return;
  grid.innerHTML = '';
  ALL_SEALS.forEach(id => {
    const tile = document.createElement('div');
    tile.className = 'seal-tile state-available';
    tile.dataset.id = id;
    tile.innerHTML = `<div class="tile-id">${id}</div><div class="tile-time">—</div>`;
    tile.addEventListener('click', () => onTileClick(id));
    grid.appendChild(tile);
  });
}

function updateGrid() {
  ALL_SEALS.forEach(id => {
    const tile  = document.querySelector(`.seal-tile[data-id="${CSS.escape(id)}"]`);
    if (!tile) return;
    const d      = sealData[id];
    const timeEl = tile.querySelector('.tile-time');
    tile.classList.remove('state-available','state-active','state-expired','state-warning');
    if (d?.status === 'Active') {
      const mins = parseInt(d.timeRemaining) || 0;
      if (mins <= 0)       { tile.classList.add('state-expired'); timeEl.textContent = `${Math.abs(mins)}m OVR`; }
      else if (mins <= 10) { tile.classList.add('state-warning'); timeEl.textContent = `${mins}m`; }
      else                 { tile.classList.add('state-active');  timeEl.textContent = `${mins}m`; }
    } else {
      tile.classList.add('state-available');
      timeEl.textContent = '—';
    }
  });
  const active = Object.values(sealData).filter(d => d.status === 'Active').length;
  document.getElementById('activeCount').textContent = active;
}

function onTileClick(id) {
  if (!isAuthenticated) { toast('🔒 Staff login required', 'error'); return; }
  document.getElementById('sealSearch').value = id;
  highlightGridSeal(id);
  if (sealData[id]?.status === 'Active') {
    showSealModal(id, sealData[id]);
  } else {
    document.getElementById('sealSearch').focus();
    setFeedback('searchFeedback', `Seal ${id} selected — hit ACTIVATE when ready.`, 'info');
  }
}

// ============================================================
//  SKATEGUARD VIEW
// ============================================================
function updateSkateguardView() {
  const list = document.getElementById('skateguardList');
  const active = Object.entries(sealData)
    .filter(([, d]) => d.status === 'Active')
    .sort(([, a], [, b]) => (parseInt(a.timeRemaining)||0) - (parseInt(b.timeRemaining)||0));

  if (active.length === 0) {
    list.innerHTML = `<div class="sg-empty"><span>🦭</span>No active seals right now.</div>`;
    return;
  }

  list.innerHTML = '';
  active.forEach(([id, d]) => {
    const mins = parseInt(d.timeRemaining) || 0;
    let cls = 'sg-ok';
    let timeLabel = `${mins}m`;
    if (mins <= 0)       { cls = 'sg-expired'; timeLabel = `${Math.abs(mins)}m OVER`; }
    else if (mins <= 10) { cls = 'sg-warn'; }

    const row = document.createElement('div');
    row.className = `sg-row ${cls}`;
    // Action buttons render but are hidden/disabled based on auth — updateSkateguardActions() handles this
    row.innerHTML = `
      <div class="sg-id">${id}</div>
      <div>
        <div class="sg-label">STARTED</div>
        <div class="sg-value">${d.startTime || '—'}</div>
      </div>
      <div>
        <div class="sg-label">EXPIRES</div>
        <div class="sg-value">${d.expiration || '—'}</div>
      </div>
      <div>
        <div class="sg-label">NOTES</div>
        <div class="sg-value" style="font-size:12px;color:var(--text-dim)">${d.notes || '—'}</div>
      </div>
      <div class="sg-time-remaining">${timeLabel}</div>
      <div class="sg-actions staff-only">
        <button class="btn-return" onclick="returnSeal('${id}','DATA')">RETURN</button>
        <button class="btn-extend" onclick="openExtendModal('${id}')">+TIME</button>
      </div>
    `;
    list.appendChild(row);
  });

  document.getElementById('skateguardUpdated').textContent =
    `Last updated: ${new Date().toLocaleTimeString('en-US', { hour:'2-digit', minute:'2-digit', second:'2-digit' })}`;

  updateSkateguardActions();
}

function updateSkateguardActions() {
  // Show/hide action buttons in skateguard view based on auth
  document.querySelectorAll('#skateguardList .staff-only').forEach(el => {
    el.style.display = isAuthenticated ? 'flex' : 'none';
  });
}

// ============================================================
//  PARTY TAB
// ============================================================
document.addEventListener('DOMContentLoaded', () => {
  const btn = document.getElementById('partyActivateBtn');
  if (btn) btn.addEventListener('click', activatePartySeal);
  const inp = document.getElementById('partySealId');
  if (inp) inp.addEventListener('keydown', e => { if (e.key === 'Enter') activatePartySeal(); });
});

async function activatePartySeal() {
  if (!isAuthenticated) { toast('🔒 Staff login required', 'error'); return; }
  const id   = document.getElementById('partySealId').value.trim();
  const room = document.getElementById('partyRoom').value.trim();
  if (!id) { setFeedback('partyFeedback', 'Enter a seal ID.', 'error'); return; }
  setFeedback('partyFeedback', `Activating party seal ${id}...`, 'info');
  try {
    await apiCall({ action: 'activateParty', sealId: id, room, sheet: 'Party Seals' });
    setFeedback('partyFeedback', `✓ Party seal ${id} activated (Room ${room || '?'})`, 'success');
    document.getElementById('partySealId').value = '';
    document.getElementById('partyRoom').value = '';
    toast(`Party seal ${id} activated`, 'success');
    await loadData();
  } catch (err) {
    setFeedback('partyFeedback', `Error: ${err.message}`, 'error');
  }
}

function updatePartyView() {
  const list   = document.getElementById('partyList');
  const active = Object.entries(partyData).filter(([, d]) => d.status === 'Rented');
  if (active.length === 0) {
    list.innerHTML = `<div class="party-empty">No active party seals.</div>`;
    return;
  }
  list.innerHTML = '';
  active.forEach(([id, d]) => {
    const mins = parseInt(d.timeRemaining) || 0;
    const row  = document.createElement('div');
    row.className = 'party-row';
    row.innerHTML = `
      <div class="party-id">${id}</div>
      <div class="party-room-badge">Room ${d.room || '?'}</div>
      <div><div class="sg-label">STARTED</div><div class="sg-value">${d.startTime || '—'}</div></div>
      <div><div class="sg-label">EXPIRES</div><div class="sg-value">${d.expiration || '5:00 PM'}</div></div>
      <div><div class="sg-label">REMAINING</div><div class="sg-value" style="color:var(--yellow)">${mins <= 0 ? Math.abs(mins)+'m OVER' : mins+'m'}</div></div>
      <div class="sg-actions">
        <button class="btn-return" onclick="returnSeal('${id}','Party Seals')">RETURN</button>
      </div>
    `;
    list.appendChild(row);
  });
  document.getElementById('partyUpdated').textContent =
    `Last updated: ${new Date().toLocaleTimeString('en-US', { hour:'2-digit', minute:'2-digit', second:'2-digit' })}`;
}

// ============================================================
//  MODAL — Seal Actions (clicking an active tile)
// ============================================================
function showSealModal(id, d) {
  if (!isAuthenticated) { toast('🔒 Staff login required', 'error'); return; }
  const mins       = parseInt(d.timeRemaining) || 0;
  const timeLabel  = mins <= 0 ? `${Math.abs(mins)}m OVERDUE` : `${mins}m remaining`;
  const timeColor  = mins <= 0 ? 'var(--red)' : mins <= 10 ? 'var(--yellow)' : 'var(--green)';

  document.getElementById('modalTitle').textContent = 'SEAL — ' + id;
  document.getElementById('modalBody').innerHTML = `
    <div class="modal-seal-id">${id}</div>
    <div class="modal-meta">
      <strong>Status:</strong> Active<br>
      <strong>Started:</strong> ${d.startTime || '—'}<br>
      <strong>Expires:</strong> ${d.expiration || '—'}<br>
      <strong>Time:</strong> <span style="color:${timeColor};font-weight:bold">${timeLabel}</span><br>
      ${d.notes ? `<strong>Notes:</strong> ${d.notes}` : ''}
    </div>
    <input type="number" id="modalExtendMins" class="modal-extend-input" placeholder="Add/remove minutes (e.g. 30 or -15)" />
  `;
  document.getElementById('modalActions').innerHTML = `
    <button class="btn-return" style="flex:1" onclick="returnSeal('${id}','DATA');closeModal()">↵ RETURN SEAL</button>
    <button class="btn-extend" style="flex:1" onclick="extendFromModal('${id}')">+ ADD TIME</button>
    <button class="btn-modal-cancel" style="flex:0 0 auto" onclick="closeModal()">Cancel</button>
  `;
  document.getElementById('modalOverlay').classList.add('open');
}

function openExtendModal(id) {
  if (!isAuthenticated) { toast('🔒 Staff login required', 'error'); return; }
  const d = sealData[id] || partyData[id];
  showSealModal(id, d || {});
}

function closeModal() { document.getElementById('modalOverlay').classList.remove('open'); }

async function extendFromModal(id) {
  const mins = document.getElementById('modalExtendMins').value.trim();
  if (!mins) { toast('Enter minutes to add/subtract', 'error'); return; }
  closeModal();
  await extendSeal(id, mins);
}

document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('modalOverlay').addEventListener('click', e => {
    if (e.target === document.getElementById('modalOverlay')) closeModal();
  });
});

// ============================================================
//  RETURN + EXTEND
// ============================================================
async function returnSeal(id, sheet) {
  if (!isAuthenticated) { toast('🔒 Staff login required', 'error'); return; }
  const isParty  = sheet === 'Party Seals';
  const action   = isParty ? 'returnParty' : 'return';
  try {
    await apiCall({ action, sealId: id, sheet });
    toast(`Seal ${id} returned ✓`, 'success');
    await loadData();
  } catch (err) {
    toast(`Error returning ${id}: ${err.message}`, 'error');
  }
}

async function extendSeal(id, mins) {
  if (!isAuthenticated) { toast('🔒 Staff login required', 'error'); return; }
  try {
    await apiCall({ action: 'extend', sealId: id, additionalTime: mins, sheet: 'DATA' });
    toast(`Seal ${id}: ${mins > 0 ? '+' : ''}${mins} min ✓`, 'success');
    await loadData();
  } catch (err) {
    toast(`Error extending ${id}: ${err.message}`, 'error');
  }
}

// ============================================================
//  DATA LOADING
// ============================================================
async function loadData(showSpinner = false) {
  if (showSpinner) document.querySelectorAll('.btn-refresh').forEach(b => b.classList.add('spinning'));
  try {
    const res  = await apiCall({ action: 'getData' });
    sealData   = res.seals      || {};
    partyData  = res.partySeals || {};
    updateGrid();
    updateSkateguardView();
    updatePartyView();
    document.getElementById('lastUpdated').textContent =
      `Last synced: ${new Date().toLocaleTimeString('en-US', { hour:'2-digit', minute:'2-digit', second:'2-digit' })}`;
  } catch (err) {
    console.error('Load error:', err);
    toast('Sync failed — check connection', 'error');
  } finally {
    document.querySelectorAll('.btn-refresh').forEach(b => b.classList.remove('spinning'));
  }
}

function tickCountdowns() {
  Object.values(sealData).forEach(d => {
    if (d.status === 'Active' && d.timeRemaining !== undefined)
      d.timeRemaining = (parseFloat(d.timeRemaining) || 0) - (10 / 60);
  });
  Object.values(partyData).forEach(d => {
    if (d.status === 'Rented' && d.timeRemaining !== undefined)
      d.timeRemaining = (parseFloat(d.timeRemaining) || 0) - (10 / 60);
  });
  updateGrid();
  updateSkateguardView();
  updatePartyView();
}

// ============================================================
//  API CALLS
// ============================================================
async function apiCall(params) {
  if (APPS_SCRIPT_URL === 'YOUR_APPS_SCRIPT_URL_HERE') return mockData(params);
  const url = new URL(APPS_SCRIPT_URL);
  Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
  const res  = await fetch(url.toString(), { method: 'GET', redirect: 'follow' });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const json = await res.json();
  if (json.error) throw new Error(json.error);
  return json;
}

// ============================================================
//  DEMO / MOCK DATA
// ============================================================
function mockData(params) {
  if (params.action === 'getData') {
    return {
      seals: {
        'B':  { status:'Active', startTime:'2:49 PM', expiration:'4:04 PM', additionalTime:'',    notes:'', timeRemaining:-6  },
        'M':  { status:'Active', startTime:'1:54 PM', expiration:'4:09 PM', additionalTime:'60',  notes:'', timeRemaining:-1  },
        '11': { status:'Active', startTime:'3:02 PM', expiration:'4:17 PM', additionalTime:'',    notes:'', timeRemaining:8   },
        '30': { status:'Active', startTime:'3:04 PM', expiration:'4:19 PM', additionalTime:'',    notes:'', timeRemaining:10  },
        '🛑': { status:'Active', startTime:'3:04 PM', expiration:'4:19 PM', additionalTime:'',    notes:'', timeRemaining:10  },
        '10': { status:'Active', startTime:'2:10 PM', expiration:'4:25 PM', additionalTime:'60',  notes:'', timeRemaining:16  },
        'X':  { status:'Active', startTime:'3:38 PM', expiration:'4:26 PM', additionalTime:'-27', notes:'', timeRemaining:17  },
        '★':  { status:'Active', startTime:'3:22 PM', expiration:'4:37 PM', additionalTime:'',    notes:'', timeRemaining:27  },
        '57': { status:'Active', startTime:'3:22 PM', expiration:'4:37 PM', additionalTime:'',    notes:'', timeRemaining:28  },
        '17': { status:'Active', startTime:'3:56 PM', expiration:'4:45 PM', additionalTime:'-26', notes:'', timeRemaining:36  },
        '16': { status:'Active', startTime:'3:19 PM', expiration:'5:34 PM', additionalTime:'60',  notes:'', timeRemaining:84  },
      },
      partySeals: {}
    };
  }
  if (params.action === 'activate') {
    sealData[params.sealId] = { status:'Active', startTime:new Date().toLocaleTimeString('en-US',{hour:'2-digit',minute:'2-digit'}), expiration:'', additionalTime:params.additionalTime||'', notes:params.notes||'', timeRemaining:75+(parseInt(params.additionalTime)||0) };
    return { ok:true };
  }
  if (params.action === 'return') {
    delete sealData[params.sealId];
    delete partyData[params.sealId];
    return { ok:true };
  }
  if (params.action === 'extend') {
    if (sealData[params.sealId]) {
      sealData[params.sealId].timeRemaining = (parseFloat(sealData[params.sealId].timeRemaining)||0) + (parseInt(params.additionalTime)||0);
      sealData[params.sealId].additionalTime = params.additionalTime;
    }
    return { ok:true };
  }
  if (params.action === 'activateParty') {
    partyData[params.sealId] = { status:'Rented', room:params.room, startTime:new Date().toLocaleTimeString('en-US',{hour:'2-digit',minute:'2-digit'}), expiration:'5:00 PM', timeRemaining:60 };
    return { ok:true };
  }
  if (params.action === 'returnParty') {
    delete partyData[params.sealId];
    return { ok:true };
  }
  return { ok:true };
}

// ============================================================
//  HELPERS
// ============================================================
function setFeedback(id, msg, type) {
  const el = document.getElementById(id);
  if (!el) return;
  el.textContent = msg;
  el.className = `search-feedback ${type}`;
}
function clearFeedback(id) {
  const el = document.getElementById(id);
  if (!el) return;
  el.textContent = '';
  el.className = 'search-feedback';
}
function toast(msg, type = 'info') {
  const t = document.createElement('div');
  t.className = `toast ${type}`;
  t.textContent = msg;
  document.getElementById('toastContainer').appendChild(t);
  setTimeout(() => { t.classList.add('fadeOut'); setTimeout(() => t.remove(), 350); }, 3000);
}
