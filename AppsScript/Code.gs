// Job Tracker bridge — bound to the "Job Tracker" Google Sheet.
// Deploy as a Web App (Execute as: Me, Who has access: Anyone with the link).
//
// GET  ?token=SECRET                          -> returns all rows as JSON array
// POST body: {"token":"SECRET","rows":[...]}  -> upserts rows by `id`, returns updated JSON array

const SECRET = 'REPLACE_WITH_YOUR_OWN_SECRET';
const SHEET_NAME = 'Tracker';
const HEADERS = [
  'id', 'date_first_seen', 'last_updated', 'title', 'org', 'location',
  'salary', 'section', 'status', 'fit_score', 'take',
  'verification_status', 'deadline', 'url', 'notes'
];
const PRUNE_AFTER_DAYS = 60;

function getSheet_() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(SHEET_NAME);
  if (!sheet) {
    sheet = ss.insertSheet(SHEET_NAME);
  }
  if (sheet.getLastRow() === 0) {
    sheet.appendRow(HEADERS);
  }
  return sheet;
}

function readRows_() {
  const sheet = getSheet_();
  const values = sheet.getDataRange().getValues();
  const headers = values[0];
  const rows = [];
  for (let i = 1; i < values.length; i++) {
    const row = {};
    headers.forEach((h, idx) => { row[h] = values[i][idx]; });
    rows.push(row);
  }
  return rows;
}

function writeRows_(rows) {
  const sheet = getSheet_();
  sheet.clearContents();
  sheet.appendRow(HEADERS);
  if (rows.length > 0) {
    const data = rows.map(r => HEADERS.map(h => (r[h] !== undefined ? r[h] : '')));
    sheet.getRange(2, 1, data.length, HEADERS.length).setValues(data);
  }
}

function isStaleActive_(row, todayIso) {
  if (row.status !== 'active' || !row.date_first_seen) return false;
  const seen = new Date(row.date_first_seen);
  const today = new Date(todayIso);
  const days = (today - seen) / (1000 * 60 * 60 * 24);
  return days > PRUNE_AFTER_DAYS;
}

function jsonOut_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

function doGet(e) {
  const token = e.parameter.token;
  if (token !== SECRET) {
    return jsonOut_({ error: 'unauthorized' });
  }
  return jsonOut_({ rows: readRows_() });
}

function doPost(e) {
  let payload;
  try {
    payload = JSON.parse(e.postData.contents);
  } catch (err) {
    return jsonOut_({ error: 'invalid_json' });
  }
  if (payload.token !== SECRET) {
    return jsonOut_({ error: 'unauthorized' });
  }

  const existing = readRows_();
  const byId = {};
  existing.forEach(r => { byId[r.id] = r; });

  const today = new Date();
  const todayIso = Utilities.formatDate(today, Session.getScriptTimeZone(), 'yyyy-MM-dd');

  (payload.rows || []).forEach(incoming => {
    const current = byId[incoming.id] || {};
    const merged = Object.assign({}, current, incoming);
    if (!merged.date_first_seen) merged.date_first_seen = todayIso;
    merged.last_updated = todayIso;
    byId[incoming.id] = merged;
  });

  let allRows = Object.keys(byId).map(id => byId[id]);
  allRows = allRows.filter(r => !isStaleActive_(r, todayIso));

  writeRows_(allRows);
  return jsonOut_({ rows: allRows });
}
