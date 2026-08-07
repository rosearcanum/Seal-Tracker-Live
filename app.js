import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getDatabase, ref, onValue }
  from "https://www.gstatic.com/firebasejs/10.12.0/firebase-database.js";

const ARENA_ID = 'pines';

const FIREBASE_CONFIG = {
  apiKey: "AIzaSyBb5WYG3SdLLyv4AJya1TZWkLgpWYN4cwg",
  authDomain: "miami-ice-seal-chat.firebaseapp.com",
  databaseURL: "https://miami-ice-seal-chat-default-rtdb.firebaseio.com",
  projectId: "miami-ice-seal-chat",
  storageBucket: "miami-ice-seal-chat.firebasestorage.app",
  messagingSenderId: "487351336770",
  appId: "1:487351336770:web:a95facd25180dd7c8312db"
};

const PINES_SEALS = [];
for (let i = 1; i <= 84; i++) PINES_SEALS.push(String(i));

const SEAL_LOOKUP = {};
PINES_SEALS.forEach(s => { SEAL_LOOKUP[String(s).toLowerCase()] = s; });

function canonicalSealId(input) {
  if (!input) return null;
  const key = String(input).trim().toLowerCase();
  return SEAL_LOOKUP[key] || null;
}

const I18N = {
  en: {
    tracker: 'SEAL TRACKER',
    checkMySeal: 'CHECK MY SEAL',
    prompt: "Enter your seal number to see when it's due back.",
    sealPlaceholder: 'Seal #',
    check: 'CHECK',
    yourSeal: 'YOUR SEAL',
    remaining: 'REMAINING',
    dueBack: 'DUE BACK',
    returnMsg: 'Please return your seal to the <strong>front counter</strong> before your time is up.',
    notRented: 'NOT CURRENTLY RENTED',
    notRentedMsg: "This seal isn't checked out right now. Please double-check your seal number, or visit the front counter for help.",
    refresh: '↻ REFRESH',
    differentSeal: 'Different seal',
    back: 'Back',
    inUse: 'IN USE',
    timesUp: "TIME'S UP",
    notInUse: 'NOT IN USE',
    pastDue: 'PAST DUE',
    min: 'min',
    enterSealNum: 'Enter your seal number',
    sealNotFound: id => `We couldn't find seal "${id}" — check with the front counter.`
  },
  es: {
    tracker: 'RASTREADOR DE FOCAS',
    checkMySeal: 'MI FOCA',
    prompt: 'Ingrese el número de su foca para ver cuándo debe devolverla.',
    sealPlaceholder: 'Foca #',
    check: 'BUSCAR',
    yourSeal: 'SU FOCA',
    remaining: 'RESTANTE',
    dueBack: 'DEVOLVER A LAS',
    returnMsg: 'Por favor devuelva su foca al <strong>mostrador principal</strong> antes de que se acabe el tiempo.',
    notRented: 'NO ESTÁ EN USO',
    notRentedMsg: 'Esta foca no está alquilada ahora. Verifique el número de su foca o visite el mostrador principal para obtener ayuda.',
    refresh: '↻ ACTUALIZAR',
    differentSeal: 'Otra foca',
    back: 'Atrás',
    inUse: 'EN USO',
    timesUp: 'TIEMPO AGOTADO',
    notInUse: 'NO ESTÁ EN USO',
    pastDue: 'ATRASADA',
    min: 'min',
    enterSealNum: 'Ingrese el número de su foca',
    sealNotFound: id => `No encontramos la foca "${id}" — pregunte en el mostrador principal.`
  }
};

let currentLang = 'en';

function applyLanguage(lang) {
  currentLang = lang;
  const dict = I18N[lang];

  document.querySelectorAll('[data-i18n]').forEach(el => {
    const key = el.getAttribute('data-i18n');
    if (dict[key]) el.textContent = dict[key];
  });
  document.querySelectorAll('[data-i18n-html]').forEach(el => {
    const key = el.getAttribute('data-i18n-html');
    if (dict[key]) el.innerHTML = dict[key];
  });
  document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
    const key = el.getAttribute('data-i18n-placeholder');
    if (dict[key]) el.placeholder = dict[key];
  });

  document.querySelectorAll('.lang-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.lang === lang);
  });

  document.documentElement.lang = lang;

  try { localStorage.setItem('customerLang', lang); } catch (e) {}

  const snap = window.__lastSnapshot;
  if (snap !== undefined) renderSealStatus(snap);
}

let db = null;
let currentSealId = null;
let currentUnsub = null;
let refreshInterval = null;

document.addEventListener('DOMContentLoaded', () => {
  let saved = 'en';
  try { saved = localStorage.getItem('customerLang') || 'en'; } catch (e) {}
  if (!I18N[saved]) saved = 'en';
  applyLanguage(saved);

  document.querySelectorAll('.lang-btn').forEach(btn => {
    btn.addEventListener('click', () => applyLanguage(btn.dataset.lang));
  });

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
  const dict = I18N[currentLang];
  const raw = document.getElementById('sealInput').value.trim();
  const errEl = document.getElementById('lookupError');
  errEl.textContent = '';

  if (!raw) {
    errEl.textContent = dict.enterSealNum;
    return;
  }
  const canon = canonicalSealId(raw);
  if (!canon) {
    errEl.textContent = dict.sealNotFound(raw);
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
  const dict = I18N[currentLang];

  const tagWrap = document.getElementById('statusTagWrap');
  const activeBlock = document.getElementById('statusActive');
  const inactiveBlock = document.getElementById('statusInactive');

  if (!seal || seal.status !== 'Active') {
    tagWrap.innerHTML = `<div class="seal-status-tag inactive">${dict.notInUse}</div>`;
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
        ? new Date(seal.expirationTimestamp).toLocaleTimeString(currentLang === 'es' ? 'es-MX' : 'en-US', { hour: 'numeric', minute: '2-digit' })
        : '—');

  activeBlock.style.display = 'block';
  inactiveBlock.style.display = 'none';

  const bigTime = document.getElementById('statusBigTime');
  const caption = document.getElementById('statusTimeCaption');

  if (minsRemaining > 0) {
    tagWrap.innerHTML = `<div class="seal-status-tag active">${dict.inUse}</div>`;
    bigTime.className = 'big-time green';
    if (minsRemaining >= 60) {
      const h = Math.floor(minsRemaining / 60);
      const m = minsRemaining % 60;
      bigTime.textContent = `${h}h ${m}m`;
    } else {
      bigTime.textContent = `${minsRemaining} ${dict.min}`;
    }
    caption.textContent = dict.remaining;
  } else {
    tagWrap.innerHTML = `<div class="seal-status-tag expired">${dict.timesUp}</div>`;
    bigTime.className = 'big-time gold';
    bigTime.textContent = `${Math.abs(minsRemaining)} ${dict.min}`;
    caption.textContent = dict.pastDue;
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
