import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getDatabase, ref, onValue }
  from "https://www.gstatic.com/firebasejs/10.12.0/firebase-database.js";

const ARENA_ID = 'miami';

const FIREBASE_CONFIG = {
  apiKey: "AIzaSyBb5WYG3SdLLyv4AJya1TZWkLgpWYN4cwg",
  authDomain: "miami-ice-seal-chat.firebaseapp.com",
  databaseURL: "https://miami-ice-seal-chat-default-rtdb.firebaseio.com",
  projectId: "miami-ice-seal-chat",
  storageBucket: "miami-ice-seal-chat.firebasestorage.app",
  messagingSenderId: "487351336770",
  appId: "1:487351336770:web:a95facd25180dd7c8312db"
};

const MIAMI_SEALS = [
  '1','2','3','4','5','6','7','8','9','10',
  '11','12','13','14','15','16','17','18','19','20',
  '21','22','23','24','25','26','27','28','29','30',
  '31','32','33','34','35','36',
  '37','38','39','40','41','42','43','44','45','46','47','48','49','50','51','52','53','54','55','56',
  '57','58','59','60',
  'A','B','C','D','E','I','J','K','L','M','N','O','P','Q','S','T','U','V','X','Y','Z',
  'Star','Octagon','Triangle','$','Sun'
];

const SEAL_LOOKUP = {};
MIAMI_SEALS.forEach(s => { SEAL_LOOKUP[String(s).toLowerCase()] = s; });

function canonicalSealId(input) {
  if (!input) return null;
  const key = String(input).trim().toLowerCase();
  return SEAL_LOOKUP[key] || null;
}

let db = null;
let currentSealId = null;
let currentUnsub = null;
let refreshInterval = null;

document.addEventListener('DOMContentLoaded', () => {
  const app = initializeApp(FIREBASE_CONFIG);
  db = getDatabase(app);

  document.getElementById('lookupBtn').addEventListener('click', doLookup);
  document.getElementById('sealInput').addEventListener('keydown', e => {
    if (e.key === 'Enter') doLookup();
  });
  document.getElementById('refreshBtn').addEventListener('click', () => {
    if (currentSealId) subscribeToSeal(currentSealId);
  });
  document.getElementById('changeSealBtn').addEventListener('click', e => {
    e.preventDefault();
    resetToLookup();
  });

  const params = new URLSearchParams(window.location.search);
  const auto = params.get('seal');
  if (auto) {
    document.getElementById('sealInput').value = auto;
    doLookup();
  }
});

function doLookup() {
  const raw = document.getElementById('sealInput').value.trim();
  const errEl = document.getElementById('lookupError');
  errEl.textContent = '';

  if (!raw) {
    errEl.textContent = 'Enter your seal number';
    return;
  }
  const canon = canonicalSealId(raw);
  if (!canon) {
    errEl.textContent = `We couldn't find seal "${raw}" — check with the front counter.`;
    return;
  }

  currentSealId = canon;
  subscribeToSeal(canon);
}

function subscribeToSeal(sealId) {
  if (currentUnsub) currentUnsub();

  document.getElementById('lookupCard').style.display = 'none';
  document.getElementById('statusCard').style.display = 'block';
  document.getElementById('statusSealId').textContent = sealId;

  const key = String(sealId).replace(/[.#$\[\]\/]/g, '_');
  const sealRef = ref(db, `${ARENA_ID}/seals/${key}`);
  currentUnsub = onValue(sealRef, snap => {
    const seal = snap.val();
    renderSealStatus(seal);
  });

  if (refreshInterval) clearInterval(refreshInterval);
  refreshInterval = setInterval(() => {
    const el = document.getElementById('lookupCard');
    if (el.style.display === 'none') {
      const snap = window.__lastSnapshot;
      if (snap !== undefined) renderSealStatus(snap);
    }
  }, 15000);
}

function renderSealStatus(seal) {
  window.__lastSnapshot = seal;

  const tagWrap = document.getElementById('statusTagWrap');
  const activeBlock = document.getElementById('statusActive');
  const inactiveBlock = document.getElementById('statusInactive');

  if (!seal || seal.status !== 'Active') {
    tagWrap.innerHTML = '<div class="seal-status-tag inactive">NOT IN USE</div>';
    activeBlock.style.display = 'none';
    inactiveBlock.style.display = 'block';
    return;
  }

  let minsRemaining = 0;
  if (seal.expirationTimestamp) {
    minsRemaining = Math.round((new Date(seal.expirationTimestamp).getTime() - Date.now()) / 60000);
  } else if (seal.timeRemaining !== undefined) {
    minsRemaining = Math.round(parseFloat(seal.timeRemaining) || 0);
  }

  const dueBackDisplay = seal.expiration
    || (seal.expirationTimestamp
        ? new Date(seal.expirationTimestamp).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
        : '—');

  activeBlock.style.display = 'block';
  inactiveBlock.style.display = 'none';

  const bigTime = document.getElementById('statusBigTime');
  const caption = document.getElementById('statusTimeCaption');

  if (minsRemaining > 0) {
    tagWrap.innerHTML = '<div class="seal-status-tag active">IN USE</div>';
    bigTime.className = 'big-time green';
    if (minsRemaining >= 60) {
      const h = Math.floor(minsRemaining / 60);
      const m = minsRemaining % 60;
      bigTime.textContent = `${h}h ${m}m`;
    } else {
      bigTime.textContent = `${minsRemaining} min`;
    }
    caption.textContent = 'REMAINING';
  } else {
    tagWrap.innerHTML = '<div class="seal-status-tag expired">TIME&#39;S UP</div>';
    bigTime.className = 'big-time gold';
    bigTime.textContent = `${Math.abs(minsRemaining)} min`;
    caption.textContent = 'PAST DUE';
  }

  document.getElementById('statusDueBack').textContent = dueBackDisplay;
}

function resetToLookup() {
  if (currentUnsub) { currentUnsub(); currentUnsub = null; }
  if (refreshInterval) { clearInterval(refreshInterval); refreshInterval = null; }
  currentSealId = null;
  document.getElementById('lookupCard').style.display = 'block';
  document.getElementById('statusCard').style.display = 'none';
  document.getElementById('sealInput').value = '';
  document.getElementById('lookupError').textContent = '';
  document.getElementById('sealInput').focus();
}
