// ============================================================
//  SEAL TRACKER — Google Apps Script (Full Merged Version)
//  Miami Ice Arena
//
//  SETUP INSTRUCTIONS:
//  1. In your Google Sheet → Extensions → Apps Script
//  2. SELECT ALL and DELETE everything in the editor
//  3. Paste this entire file
//  4. Click Save (💾)
//  5. Click Deploy → New deployment
//     - Type: Web app
//     - Execute as: Me
//     - Who has access: Anyone
//  6. Click Deploy → copy the Web App URL
//  7. Paste that URL into app.js as APPS_SCRIPT_URL
//
//  YOUR EXISTING TRIGGERS (keep all three — do NOT delete them):
//    - updateCurrentTime    → Time-based, every minute
//    - updatePartySealsTime → Time-based, every minute
//    - clearHistoryDaily    → Time-based, midnight to 1am
//
//  NOTE: onEdit still works exactly as before for manual Sheet edits.
//  The web app (doGet) is an additional layer for the GitHub Pages app.
// ============================================================

// ============================================================
//  COLUMN MAPS
// ============================================================

// DATA sheet columns (1-based)
const DATA_COL = {
  SEAL_ID:   1,  // A
  STATUS:    2,  // B  — "Active" / "Returned"
  START:     3,  // C
  EXPIRY:    4,  // D
  ADD_TIME:  5,  // E
  NOTES:     6,  // F
  REMAINING: 7,  // G
};

// Party Seals columns (1-based)
const PARTY_COL = {
  SEAL_ID:   1,  // A
  STATUS:    2,  // B  — "Rented" (set by onEdit when room typed)
  START:     3,  // C
  EXPIRY:    4,  // D
  ADD_TIME:  5,  // E
  ROOM:      6,  // F  ← triggers activation when typed
};

const BASE_MINUTES = 75; // 60 min + 15 min grace

// ============================================================
//  YOUR ORIGINAL onEdit — UNTOUCHED
// ============================================================
function onEdit(e) {
  const sheet = e.range.getSheet();
  const sheetName = sheet.getName();
  const row = e.range.getRow();
  const col = e.range.getColumn();
  const value = e.value || "";

  // ============================
  // DATA SHEET LOGIC
  // ============================
  if (sheetName === "DATA") {
    const statusCol = 2;
    const startCol = 3;
    const expirationCol = 4;
    const extraCol = 5;
    const baseMinutes = 75;

    const statusCell = sheet.getRange(row, statusCol);
    const startCell = sheet.getRange(row, startCol);
    const expirationCell = sheet.getRange(row, expirationCol);
    const extraCell = sheet.getRange(row, extraCol);

    const status = statusCell.getValue();
    const extraMinutes = Number(extraCell.getValue()) || 0;

    // --- Active ---
    if (col === statusCol && value === "Active") {
      const startTime = new Date();
      startCell.setValue(startTime);

      const expirationTime = new Date(
        startTime.getTime() + (baseMinutes + extraMinutes) * 60000
      );
      expirationCell.setValue(expirationTime);

      const ss = SpreadsheetApp.getActiveSpreadsheet();
      const historySheet = ss.getSheetByName("HISTORY");
      if (historySheet) {
        const sealID = sheet.getRange(row, 1).getValue();
        historySheet.appendRow([sealID, startTime, expirationTime, extraMinutes, new Date()]);
        const lastRow = historySheet.getLastRow();
        historySheet.getRange(lastRow, 2).setNumberFormat("h:mm AM/PM");
        historySheet.getRange(lastRow, 3).setNumberFormat("h:mm AM/PM");
        historySheet.getRange(lastRow, 5).setNumberFormat("h:mm AM/PM");
      }
    }

    // --- Additional Time edited ---
    if (col === extraCol && status === "Active") {
      const startTime = startCell.getValue();
      if (!startTime) return;

      const expirationTime = new Date(startTime.getTime() + (baseMinutes + extraMinutes) * 60000);
      expirationCell.setValue(expirationTime);

      const ss = SpreadsheetApp.getActiveSpreadsheet();
      const historySheet = ss.getSheetByName("HISTORY");
      if (historySheet) {
        const sealID = sheet.getRange(row, 1).getValue();
        historySheet.appendRow([sealID, startTime, expirationTime, extraMinutes, new Date()]);
        const lastRow = historySheet.getLastRow();
        historySheet.getRange(lastRow, 2).setNumberFormat("h:mm AM/PM");
        historySheet.getRange(lastRow, 3).setNumberFormat("h:mm AM/PM");
        historySheet.getRange(lastRow, 5).setNumberFormat("h:mm AM/PM");
      }
    }

    // --- Returned ---
    if (col === statusCol && value === "Returned") {
      startCell.clearContent();
      expirationCell.clearContent();
      extraCell.clearContent();
    }
  }

  // ============================
  // PARTY SEALS LOGIC
  // ============================
  if (sheetName === "Party Seals") {
    const statusCol = 2;
    const startCol = 3;
    const expirationCol = 4;
    const extraCol = 5;
    const partyRmCol = 6;

    const statusCell = sheet.getRange(row, statusCol);
    const startCell = sheet.getRange(row, startCol);
    const expirationCell = sheet.getRange(row, expirationCol);
    const extraCell = sheet.getRange(row, extraCol);

    const extraMinutes = Number(extraCell.getValue()) || 0;

    // Party windows: morning ends at 12pm, afternoon ends at 5pm, evening ends at 11:30pm
    function partyWindowEnd() {
      const now = new Date();
      const windows = [
        { h: 12, m: 0 },
        { h: 17, m: 0 },
        { h: 23, m: 30 }
      ];
      for (const w of windows) {
        const candidate = new Date(now);
        candidate.setHours(w.h, w.m, 0, 0);
        if (candidate.getTime() > now.getTime()) return candidate;
      }
      // No window left today — fall back to 11:30 PM today (it's overdue immediately)
      const fallback = new Date(now);
      fallback.setHours(23, 30, 0, 0);
      return fallback;
    }

    // --- Party Room entered ---
    if (col === partyRmCol && value !== "") {
      const startTime = new Date();
      startCell.setValue(startTime);
      statusCell.setValue("Rented");

      const expirationTime = new Date(partyWindowEnd().getTime() + extraMinutes * 60000);
      expirationCell.setValue(expirationTime);

      startCell.setNumberFormat("h:mm AM/PM");
      expirationCell.setNumberFormat("h:mm AM/PM");
    }

    // --- Additional Time edited ---
    if (col === extraCol && statusCell.getValue() === "Rented") {
      const expirationTime = new Date(partyWindowEnd().getTime() + extraMinutes * 60000);
      expirationCell.setValue(expirationTime);
    }

    // --- Party Room cleared ---
    if (col === partyRmCol && value === "") {
      statusCell.clearContent();
      startCell.clearContent();
      expirationCell.clearContent();
      extraCell.clearContent();
    }
  }
}

// ============================================================
//  YOUR ORIGINAL TRIGGERS — UNTOUCHED
// ============================================================
function updatePartySealsTime() {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    if (!ss) return;
    const sheet = ss.getSheetByName("Party Seals");
    if (!sheet) return;
    sheet.getRange("Z1").setValue(new Date());
  } catch (err) {}
}

function updateCurrentTime() {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    if (!ss) return;
    const sheet = ss.getSheetByName("DATA");
    if (!sheet) return;
    sheet.getRange("Z1").setValue(new Date());
  } catch (err) {}
}

function clearHistoryDaily() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();

  // 1) Clear the HISTORY tab (existing behavior)
  const historySheet = ss.getSheetByName("HISTORY");
  if (historySheet) {
    historySheet.getRange("A2:E").clearContent();
  }

  // 2) Clear active seals on the DATA tab — keep seal IDs, wipe everything else
  const dataSheet = ss.getSheetByName("DATA");
  if (dataSheet) {
    const lastRow = dataSheet.getLastRow();
    if (lastRow > 1) {
      // Clear status (B), start (C), expiration (D), additional time (E), notes (F)
      dataSheet.getRange(2, 2, lastRow - 1, 5).clearContent();
    }
  }

  // 3) Clear Party Seals tab — keep seal IDs, wipe everything else
  const partySheet = ss.getSheetByName("Party Seals");
  if (partySheet) {
    const lastRow = partySheet.getLastRow();
    if (lastRow > 1) {
      // Clear status (B), start (C), expiration (D), additional time (E), room (F)
      partySheet.getRange(2, 2, lastRow - 1, 5).clearContent();
    }
  }
}

// ============================================================
//  WEB APP ENTRY POINT (NEW — for GitHub Pages app)
//  This runs when the GitHub Pages app calls the Script URL.
//  It does NOT interfere with onEdit or any triggers.
// ============================================================
function doGet(e) {
  const action = (e && e.parameter && e.parameter.action) || 'getData';
  let result;

  try {
    if      (action === 'getData')       result = getData();
    else if (action === 'activate')      result = webActivateSeal(e.parameter);
    else if (action === 'return')        result = webReturnSeal(e.parameter);
    else if (action === 'extend')        result = webExtendSeal(e.parameter);
    else if (action === 'activateParty') result = webActivatePartySeal(e.parameter);
    else if (action === 'returnParty')   result = webReturnPartySeal(e.parameter);
    else result = { error: 'Unknown action: ' + action };
  } catch (err) {
    result = { error: err.message };
  }

  return ContentService
    .createTextOutput(JSON.stringify(result))
    .setMimeType(ContentService.MimeType.JSON);
}

// ============================================================
//  GET DATA — reads both tabs for the web app
// ============================================================
function getData() {
  const ss    = SpreadsheetApp.getActiveSpreadsheet();
  const seals = {};
  const partySeals = {};

  // --- DATA tab ---
  const dataSheet = ss.getSheetByName("DATA");
  if (dataSheet) {
    const rows = dataSheet.getDataRange().getValues();
    for (let i = 1; i < rows.length; i++) {
      const row    = rows[i];
      const sealId = String(row[DATA_COL.SEAL_ID - 1]).trim();
      const status = String(row[DATA_COL.STATUS - 1]).trim();
      if (!sealId) continue;

      const startRaw  = row[DATA_COL.START - 1];
      const expiryRaw = row[DATA_COL.EXPIRY - 1];
      const addTime   = row[DATA_COL.ADD_TIME - 1];
      const notes     = row[DATA_COL.NOTES - 1];

      let timeRemaining = null;
      if (status === 'Active' && expiryRaw) {
        const expiry = expiryRaw instanceof Date ? expiryRaw : new Date(expiryRaw);
        timeRemaining = (expiry - new Date()) / 60000; // fractional minutes
      }

      seals[sealId] = {
        status,
        startTime:      _fmt(startRaw),
        expiration:     _fmt(expiryRaw),
        additionalTime: addTime !== '' ? String(addTime) : '',
        notes:          notes ? String(notes) : '',
        timeRemaining
      };
    }
  }

  // --- Party Seals tab ---
  const partySheet = ss.getSheetByName("Party Seals");
  if (partySheet) {
    const pRows = partySheet.getDataRange().getValues();
    for (let i = 1; i < pRows.length; i++) {
      const row    = pRows[i];
      const sealId = String(row[PARTY_COL.SEAL_ID - 1]).trim();
      const status = String(row[PARTY_COL.STATUS - 1]).trim();
      if (!sealId || status !== 'Rented') continue;

      const startRaw  = row[PARTY_COL.START - 1];
      const expiryRaw = row[PARTY_COL.EXPIRY - 1];
      const room      = row[PARTY_COL.ROOM - 1];

      let timeRemaining = null;
      if (expiryRaw) {
        const expiry = expiryRaw instanceof Date ? expiryRaw : new Date(expiryRaw);
        timeRemaining = (expiry - new Date()) / 60000;
      }

      partySeals[sealId] = {
        status,
        room:       room ? String(room) : '',
        startTime:  _fmt(startRaw),
        expiration: _fmt(expiryRaw),
        timeRemaining
      };
    }
  }

  return { seals, partySeals, timestamp: new Date().toISOString() };
}

// ============================================================
//  ACTIVATE SEAL (DATA tab)
//  Mirrors what onEdit does when status set to "Active"
// ============================================================
function webActivateSeal(params) {
  const sealId  = params.sealId;
  const addMins = parseInt(params.additionalTime) || 0;
  const notes   = params.notes || '';

  const ss    = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName("DATA");
  const row   = _findRow(sheet, sealId, DATA_COL.SEAL_ID);
  if (!row) throw new Error('Seal not found: ' + sealId);

  const now    = new Date();
  const expiry = new Date(now.getTime() + (BASE_MINUTES + addMins) * 60000);

  sheet.getRange(row, DATA_COL.STATUS).setValue('Active');
  sheet.getRange(row, DATA_COL.START).setValue(now);
  sheet.getRange(row, DATA_COL.EXPIRY).setValue(expiry);
  sheet.getRange(row, DATA_COL.ADD_TIME).setValue(addMins !== 0 ? addMins : '');
  sheet.getRange(row, DATA_COL.NOTES).setValue(notes);

  // Log to history (matches onEdit format exactly)
  const historySheet = ss.getSheetByName("HISTORY");
  if (historySheet) {
    historySheet.appendRow([sealId, now, expiry, addMins, new Date()]);
    const lastRow = historySheet.getLastRow();
    historySheet.getRange(lastRow, 2).setNumberFormat("h:mm AM/PM");
    historySheet.getRange(lastRow, 3).setNumberFormat("h:mm AM/PM");
    historySheet.getRange(lastRow, 5).setNumberFormat("h:mm AM/PM");
  }

  return { ok: true, sealId, activatedAt: now.toISOString(), expiresAt: expiry.toISOString() };
}

// ============================================================
//  RETURN SEAL (DATA tab)
//  Mirrors what onEdit does when status set to "Returned"
// ============================================================
function webReturnSeal(params) {
  const sealId = params.sealId;

  const ss    = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName("DATA");
  const row   = _findRow(sheet, sealId, DATA_COL.SEAL_ID);
  if (!row) throw new Error('Seal not found: ' + sealId);

  sheet.getRange(row, DATA_COL.STATUS).setValue('Returned');
  sheet.getRange(row, DATA_COL.START).clearContent();
  sheet.getRange(row, DATA_COL.EXPIRY).clearContent();
  sheet.getRange(row, DATA_COL.ADD_TIME).clearContent();
  // Notes intentionally NOT cleared (matches onEdit behavior)

  return { ok: true, sealId, returnedAt: new Date().toISOString() };
}

// ============================================================
//  EXTEND SEAL (DATA tab)
//  Accumulates additional time and recalculates expiry from start
// ============================================================
function webExtendSeal(params) {
  const sealId  = params.sealId;
  const addMins = parseInt(params.additionalTime) || 0;

  const ss    = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName("DATA");
  const row   = _findRow(sheet, sealId, DATA_COL.SEAL_ID);
  if (!row) throw new Error('Seal not found: ' + sealId);

  const currentExtra = parseInt(sheet.getRange(row, DATA_COL.ADD_TIME).getValue()) || 0;
  const newTotal     = currentExtra + addMins;
  const startVal     = sheet.getRange(row, DATA_COL.START).getValue();

  sheet.getRange(row, DATA_COL.ADD_TIME).setValue(newTotal !== 0 ? newTotal : '');

  if (startVal) {
    const startDate = startVal instanceof Date ? startVal : new Date(startVal);
    const newExpiry = new Date(startDate.getTime() + (BASE_MINUTES + newTotal) * 60000);
    sheet.getRange(row, DATA_COL.EXPIRY).setValue(newExpiry);

    // Log the time adjustment to history
    const historySheet = ss.getSheetByName("HISTORY");
    if (historySheet) {
      historySheet.appendRow([sealId, startDate, newExpiry, newTotal, new Date()]);
      const lastRow = historySheet.getLastRow();
      historySheet.getRange(lastRow, 2).setNumberFormat("h:mm AM/PM");
      historySheet.getRange(lastRow, 3).setNumberFormat("h:mm AM/PM");
      historySheet.getRange(lastRow, 5).setNumberFormat("h:mm AM/PM");
    }
  }

  return { ok: true, sealId, newAdditionalTime: newTotal };
}

// ============================================================
//  ACTIVATE PARTY SEAL
//  Writes room to column F — same trigger point as manual entry.
//  Then explicitly sets start, status, expiry to match onEdit behavior.
//  Expiry is calculated based on which party window we're in:
//    - before 12 PM → expires 12 PM
//    - 12 PM to 5 PM → expires 5 PM
//    - 5 PM to 11:30 PM → expires 11:30 PM
// ============================================================
function _partyWindowEnd() {
  const now = new Date();
  const windows = [
    { h: 12, m: 0 },
    { h: 17, m: 0 },
    { h: 23, m: 30 }
  ];
  for (const w of windows) {
    const candidate = new Date(now);
    candidate.setHours(w.h, w.m, 0, 0);
    if (candidate.getTime() > now.getTime()) return candidate;
  }
  const fallback = new Date(now);
  fallback.setHours(23, 30, 0, 0);
  return fallback;
}

function webActivatePartySeal(params) {
  const sealId    = params.sealId;
  const room      = params.room || '';
  // If the caller asks for the DATA sheet, treat party seals like regular seals
  // (party seal lives in DATA tab — no separate Party Seals tab needed)
  const sheetName = params.sheet === 'DATA' ? 'DATA' : 'Party Seals';
  const usingDataTab = sheetName === 'DATA';

  const ss    = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(sheetName);
  if (!sheet) throw new Error('Sheet not found: ' + sheetName);

  const cols = usingDataTab ? DATA_COL : PARTY_COL;
  let row = _findRow(sheet, sealId, cols.SEAL_ID);

  // If seal not found, append a new row for it
  if (!row) {
    if (usingDataTab) {
      sheet.appendRow([sealId, '', '', '', '', '', '']);
    } else {
      sheet.appendRow([sealId, '', '', '', '', '']);
    }
    row = sheet.getLastRow();
  }

  const now    = new Date();
  const expiry = _partyWindowEnd();

  if (usingDataTab) {
    // Party seal lives in DATA tab — write status as Active, room goes in notes
    sheet.getRange(row, cols.STATUS).setValue('Active');
    sheet.getRange(row, cols.START).setValue(now);
    sheet.getRange(row, cols.START).setNumberFormat("h:mm AM/PM");
    sheet.getRange(row, cols.EXPIRY).setValue(expiry);
    sheet.getRange(row, cols.EXPIRY).setNumberFormat("h:mm AM/PM");
    sheet.getRange(row, cols.NOTES).setValue(room ? ('Party Room: ' + room) : 'Party Seal');
  } else {
    // Original behavior: separate Party Seals tab
    sheet.getRange(row, cols.STATUS).setValue('Rented');
    sheet.getRange(row, cols.START).setValue(now);
    sheet.getRange(row, cols.START).setNumberFormat("h:mm AM/PM");
    sheet.getRange(row, cols.EXPIRY).setValue(expiry);
    sheet.getRange(row, cols.EXPIRY).setNumberFormat("h:mm AM/PM");
    sheet.getRange(row, cols.ROOM).setValue(room);
  }

  return { ok: true, sealId, room, expiresAt: expiry.toISOString() };
}

// ============================================================
//  RETURN PARTY SEAL
//  If sheet=DATA, treat it like a regular seal return.
//  Otherwise use the Party Seals tab.
// ============================================================
function webReturnPartySeal(params) {
  const sealId    = params.sealId;
  const sheetName = params.sheet === 'DATA' ? 'DATA' : 'Party Seals';
  const usingDataTab = sheetName === 'DATA';

  const ss    = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(sheetName);
  if (!sheet) throw new Error('Sheet not found: ' + sheetName);

  const cols = usingDataTab ? DATA_COL : PARTY_COL;
  const row  = _findRow(sheet, sealId, cols.SEAL_ID);
  if (!row) throw new Error('Party seal not found: ' + sealId);

  if (usingDataTab) {
    sheet.getRange(row, cols.STATUS).setValue('Returned');
    sheet.getRange(row, cols.START).clearContent();
    sheet.getRange(row, cols.EXPIRY).clearContent();
    sheet.getRange(row, cols.ADD_TIME).clearContent();
    sheet.getRange(row, cols.NOTES).clearContent();
  } else {
    sheet.getRange(row, cols.STATUS).clearContent();
    sheet.getRange(row, cols.START).clearContent();
    sheet.getRange(row, cols.EXPIRY).clearContent();
    sheet.getRange(row, cols.ADD_TIME).clearContent();
    sheet.getRange(row, cols.ROOM).clearContent();
  }

  return { ok: true, sealId, returnedAt: new Date().toISOString() };
}

// ============================================================
//  UTILITIES
// ============================================================
function _findRow(sheet, sealId, colIndex) {
  const data = sheet.getDataRange().getValues();
  for (let i = 1; i < data.length; i++) {
    if (String(data[i][colIndex - 1]).trim() === String(sealId).trim()) {
      return i + 1; // 1-based
    }
  }
  return null;
}

function _fmt(val) {
  if (!val) return '';
  try {
    const d = val instanceof Date ? val : new Date(val);
    if (isNaN(d.getTime())) return String(val);
    return d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
  } catch (e) {
    return String(val);
  }
}
