// اجرای محلی کد بات (Apps Script) در Node، بی‌اتصال به گوگل و تلگرام.
// همهٔ فایل‌های bot/*.gs به ترتیب filePushOrder در یک اسکوپ مشترک اجرا می‌شوند (همان رفتار Apps Script)
// و سرویس‌های گوگل با نسخهٔ حافظه‌ای جایگزین می‌شوند: شیت خالی در حافظه، کش و تنظیمات در حافظه،
// و هر درخواست شبکه (UrlFetchApp) بی‌آنکه جایی برود پاسخ «ناموفق» می‌گیرد.
// کاربردها: بررسی سراسری پیش از دیپلوی (bot-precheck.mjs) و اجرای مجموعه‌های تست.
import { FAKE_CFG } from './bot-cfg-fixture.mjs';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import vm from 'node:vm';
import crypto from 'node:crypto';

const TZ_DEFAULT = 'Asia/Tehran';

// ---------- تاریخ: الگوهای SimpleDateFormat که کد بات به کار می‌برد ----------
function parts(date, tz) {
  const f = new Intl.DateTimeFormat('en-US', {
    timeZone: tz || TZ_DEFAULT, hourCycle: 'h23', year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit', weekday: 'short',
  });
  const o = {};
  for (const p of f.formatToParts(date)) o[p.type] = p.value;
  return o;
}
const DOW = { Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6, Sun: 7 };
function isoWeek(y, m, d) {
  const t = new Date(Date.UTC(y, m - 1, d));
  const day = t.getUTCDay() || 7;
  t.setUTCDate(t.getUTCDate() + 4 - day);
  const y0 = new Date(Date.UTC(t.getUTCFullYear(), 0, 1));
  return Math.ceil(((t - y0) / 86400000 + 1) / 7);
}
export function formatDate(date, tz, pat) {
  const d = date instanceof Date ? date : new Date(date);
  if (isNaN(d)) throw new Error('Invalid argument: date');
  const p = parts(d, tz);
  const map = {
    yyyy: p.year, yy: p.year.slice(-2), MM: p.month, M: String(Number(p.month)), dd: p.day, d: String(Number(p.day)),
    HH: p.hour, H: String(Number(p.hour)), mm: p.minute, m: String(Number(p.minute)), ss: p.second, s: String(Number(p.second)),
    EEE: p.weekday, EEEE: p.weekday, u: String(DOW[p.weekday]),
    ww: String(isoWeek(Number(p.year), Number(p.month), Number(p.day))).padStart(2, '0'),
  };
  let out = '';
  for (let i = 0; i < pat.length;) {
    if (pat[i] === "'") { const j = pat.indexOf("'", i + 1); out += pat.slice(i + 1, j < 0 ? undefined : j); i = j < 0 ? pat.length : j + 1; continue; }
    const c = pat[i]; let j = i; while (j < pat.length && pat[j] === c) j++;
    const tok = pat.slice(i, j);
    if (/[a-zA-Z]/.test(c)) {
      if (map[tok] !== undefined) out += map[tok];
      else if (c === 'E') out += p.weekday;
      else throw new Error('الگوی تاریخ پشتیبانی نمی‌شود: ' + tok);
    } else out += tok;
    i = j;
  }
  return out;
}

// ---------- هر چیزی که شبیه‌سازی نشده: شیئی که هر متدش خودش را برمی‌گرداند ----------
function chain(name) {
  const fn = function () { return proxy; };
  const proxy = new Proxy(fn, {
    get(t, k) {
      if (k === Symbol.toPrimitive) return () => '';
      if (k === 'toString' || k === 'valueOf') return () => '';
      if (k === 'then') return undefined;
      return proxy;
    },
    apply() { return proxy; },
  });
  return proxy;
}

// ---------- شیت حافظه‌ای ----------
// شمار خواندن هر تب (برای سنجش سرعت: هر getValues/getValue یک تماس با سرویس شیت است)
export const READS = {};
const countRead = (sh) => { READS[sh.name] = (READS[sh.name] || 0) + 1; };
class Range {
  constructor(sh, r, c, nr, nc) { this.sh = sh; this.r = r; this.c = c; this.nr = nr || 1; this.nc = nc || 1; }
  getValues() { countRead(this.sh); const o = []; for (let i = 0; i < this.nr; i++) { const row = []; for (let j = 0; j < this.nc; j++) row.push(this.sh.cell(this.r + i, this.c + j)); o.push(row); } return o; }
  getDisplayValues() { return this.getValues().map((r) => r.map((v) => (v instanceof Date ? formatDate(v, TZ_DEFAULT, 'yyyy-MM-dd') : String(v)))); }
  getValue() { countRead(this.sh); return this.sh.cell(this.r, this.c); }
  getDisplayValue() { return String(this.getValue()); }
  setValues(v) { for (let i = 0; i < v.length; i++) for (let j = 0; j < v[i].length; j++) this.sh.put(this.r + i, this.c + j, v[i][j]); return this; }
  setValue(v) { for (let i = 0; i < this.nr; i++) for (let j = 0; j < this.nc; j++) this.sh.put(this.r + i, this.c + j, v); return this; }
  clearContent() { return this.setValue(''); }
  clear() { return this.setValue(''); }
  getRow() { return this.r; }
  getColumn() { return this.c; }
  getNumRows() { return this.nr; }
  getNumColumns() { return this.nc; }
  getA1Notation() { return 'R' + this.r + 'C' + this.c; }
  getSheet() { return this.sh; }
  getFormulas() { return this.getValues().map((r) => r.map(() => '')); }
  getNotes() { return this.getValues().map((r) => r.map(() => '')); }
  getBackgrounds() { return this.getValues().map((r) => r.map(() => '#ffffff')); }
}
const passThroughRange = new Proxy(Range.prototype, {});
for (const k of ['setFontWeight', 'setBackground', 'setNumberFormat', 'setDataValidation', 'clearDataValidations', 'setWrap', 'setFontColor',
  'setHorizontalAlignment', 'setVerticalAlignment', 'setNote', 'setFontSize', 'setWrapStrategy', 'setBorder', 'merge', 'breakApart',
  'setFontFamily', 'setBackgrounds', 'setFontWeights', 'setNotes', 'setRichTextValue', 'setFormula', 'protect', 'activate', 'sort',
  'setTextDirection', 'insertCheckboxes', 'removeCheckboxes', 'setFontLine', 'setFontStyle', 'setShowHyperlink', 'clearFormat',
  'setFormulas', 'createFilter', 'setDataValidations', 'setFontColors', 'setNumberFormats', 'setHorizontalAlignments', 'trimWhitespace', 'removeDuplicates']) {
  if (!Range.prototype[k]) Range.prototype[k] = function () { return this; };
}
void passThroughRange;

// مثل Google Sheets: متنی که با ' شروع شود متن می‌ماند (بی ')، و «yyyy-MM-dd» یا «yyyy-MM-dd HH:mm» تاریخ می‌شود
// (همان رفتاری که باگ مرخصی و «Fri Oct 02 …» را ساخت). عدد متنی دست نمی‌خورد تا صفر اول شماره‌ها مثل شیت واقعی نیفتد؟
// نه: شیت واقعی «0912…» را عدد می‌کند و صفر را می‌اندازد؛ کد بات برای همین «'» می‌گذارد. این‌جا فقط تاریخ شبیه‌سازی می‌شود.
function sheetsValue(v, D) {
  if (typeof v !== 'string') return v;
  if (v.charAt(0) === "'") return v.slice(1);
  const m = v.match(/^(\d{4})-(\d{2})-(\d{2})(?:[ T](\d{1,2}):(\d{2}))?$/);
  if (m) return new (D || Date)(Number(m[1]), Number(m[2]) - 1, Number(m[3]), Number(m[4] || 0), Number(m[5] || 0));
  return v;
}

class Sheet {
  constructor(ss, name) { this.ss = ss; this.name = name; this.rows = []; this.hidden = false; this.maxCols = 26; }
  cell(r, c) { const row = this.rows[r - 1]; const v = row ? row[c - 1] : undefined; return v === undefined || v === null ? '' : v; }
  put(r, c, v) { while (this.rows.length < r) this.rows.push([]); this.rows[r - 1][c - 1] = sheetsValue(v, this.ss.realm && this.ss.realm.Date); if (c > this.maxCols) this.maxCols = c; }
  getName() { return this.name; }
  setName(n) { this.name = n; return this; }
  getSheetName() { return this.name; }
  getParent() { return this.ss; }
  getSheetId() { return this.ss.sheets.indexOf(this) + 1; }
  getLastRow() { for (let i = this.rows.length; i > 0; i--) { const r = this.rows[i - 1]; if (r && r.some((v) => v !== '' && v !== undefined && v !== null)) return i; } return 0; }
  getLastColumn() { let m = 0; for (const r of this.rows) if (r) for (let j = r.length; j > m; j--) if (r[j - 1] !== '' && r[j - 1] !== undefined && r[j - 1] !== null) { m = j; break; } return m; }
  getMaxRows() { return Math.max(1000, this.rows.length); }
  getMaxColumns() { return Math.max(this.maxCols, this.getLastColumn()); }
  getRange(a, b, c, d) {
    if (typeof a === 'string') {
      const m = a.match(/^([A-Z]+)(\d+)(?::([A-Z]+)(\d+))?$/);
      const col = (s) => s.split('').reduce((x, ch) => x * 26 + ch.charCodeAt(0) - 64, 0);
      if (!m) return new Range(this, 1, 1, 1, 1);
      const r1 = Number(m[2]), c1 = col(m[1]);
      return new Range(this, r1, c1, m[4] ? Number(m[4]) - r1 + 1 : 1, m[3] ? col(m[3]) - c1 + 1 : 1);
    }
    if (!(a >= 1) || !(b >= 1) || (c !== undefined && !(c >= 1)) || (d !== undefined && !(d >= 1))) throw new Error('The coordinates of the range are outside the dimensions of the sheet.');
    return new Range(this, a, b, c, d);
  }
  getDataRange() { return new Range(this, 1, 1, Math.max(1, this.getLastRow()), Math.max(1, this.getLastColumn())); }
  appendRow(v) { const r = this.getLastRow() + 1; v.forEach((x, j) => this.put(r, j + 1, x)); return this; }
  deleteRow(r) { this.rows.splice(r - 1, 1); return this; }
  deleteRows(r, n) { this.rows.splice(r - 1, n); return this; }
  insertRowBefore(r) { this.rows.splice(r - 1, 0, []); return this; }
  insertRowsAfter(r, n) { this.rows.splice(r, 0, ...Array.from({ length: n }, () => [])); return this; }
  insertColumnsAfter(c, n) { this.maxCols += n; return this; }
  clear() { this.rows = []; return this; }
  clearContents() { return this.clear(); }
  isSheetHidden() { return this.hidden; }
  hideSheet() { this.hidden = true; return this; }
  showSheet() { this.hidden = false; return this; }
  getFrozenRows() { return 1; }
  getProtections() { return []; }
  getFilter() { return null; }
  getConditionalFormatRules() { return []; }
  getCharts() { return []; }
  getIndex() { return this.ss.sheets.indexOf(this) + 1; }
}
for (const k of ['setRightToLeft', 'setFrozenRows', 'setFrozenColumns', 'setColumnWidth', 'setColumnWidths', 'setTabColor', 'autoResizeColumns',
  'autoResizeColumn', 'setConditionalFormatRules', 'hideColumns', 'showColumns', 'setRowHeight', 'setRowHeights', 'activate', 'protect',
  'setHiddenGridlines', 'hideRows', 'showRows', 'sort', 'insertChart', 'removeChart']) {
  Sheet.prototype[k] = function () { return this; };
}

class Spreadsheet {
  constructor(id, realm) { this.id = id; this.sheets = []; this.realm = realm; }
  getId() { return this.id; }
  getName() { return 'ss-' + this.id; }
  getUrl() { return 'https://docs.google.com/spreadsheets/d/' + this.id; }
  getSheetByName(n) { return this.sheets.find((s) => s.name === n) || null; }
  getSheets() { return this.sheets.slice(); }
  insertSheet(n) { const s = new Sheet(this, typeof n === 'string' ? n : 'Sheet' + (this.sheets.length + 1)); this.sheets.push(s); return s; }
  deleteSheet(s) { this.sheets = this.sheets.filter((x) => x !== s); }
  getSpreadsheetTimeZone() { return TZ_DEFAULT; }
  setActiveSheet(s) { return s; }
  moveActiveSheet() {}
  getSheetById(id) { return this.sheets[id - 1] || null; }
  toast() {}
  rename() {}
}

// ---------- کش و تنظیمات ----------
function makeCache() {
  const m = new Map();
  return {
    get: (k) => (m.has(k) ? m.get(k) : null),
    getAll: (ks) => { const o = {}; for (const k of ks) if (m.has(k)) o[k] = m.get(k); return o; },
    put: (k, v) => { if (String(v).length > 100 * 1024) throw new Error('Argument too large: value'); m.set(k, String(v)); },
    putAll: (o) => { for (const k in o) m.set(k, String(o[k])); },
    remove: (k) => { m.delete(k); },
    removeAll: (ks) => { for (const k of ks) m.delete(k); },
  };
}
function makeProps(init) {
  const m = new Map(Object.entries(init || {}));
  return {
    getProperty: (k) => (m.has(k) ? m.get(k) : null),
    setProperty(k, v) { m.set(k, String(v)); return this; },
    deleteProperty(k) { m.delete(k); return this; },
    getProperties: () => Object.fromEntries(m),
    setProperties(o) { for (const k in o) m.set(k, String(o[k])); return this; },
    getKeys: () => [...m.keys()],
    deleteAllProperties() { m.clear(); return this; },
  };
}

function httpFail() {
  return { getResponseCode: () => 599, getContentText: () => '{"ok":false,"description":"local: no network"}', getBlob: () => chain(), getHeaders: () => ({}), getAllHeaders: () => ({}) };
}

export function makeGlobals(opts = {}) {
  const logs = [];
  const books = new Map();
  const realm = { Date };   // loadBot سازندهٔ Date داخل کانتکست را می‌گذارد (instanceof Date در کد بات)
  const book = (id) => { if (!books.has(id)) books.set(id, new Spreadsheet(id, realm)); return books.get(id); };
  const cache = makeCache();
  /* v170.9: تنظیمات خصوصی در کد نیست؛ اجرای محلی TG_CFG ساختگی می‌گیرد (bot-cfg-fixture.mjs) */
  const props = makeProps(opts.props || { TG_CFG: JSON.stringify(FAKE_CFG) });
  // قفل مثل Apps Script: یک قفل برای کل اجرا؛ هر شیء Lock تازه همان قفل است (hasLock فقط روی شیئی که گرفته true است)
  const lockState = { held: false };
  const newLock = () => {
    let mine = false;
    return {
      tryLock: () => { if (lockState.held && !mine) return false; lockState.held = true; mine = true; return true; },
      waitLock: () => { if (lockState.held && !mine) throw new Error('Lock timeout'); lockState.held = true; mine = true; },
      releaseLock: () => { if (mine) { lockState.held = false; mine = false; } },
      hasLock: () => mine,
    };
  };
  const fetches = [];
  const triggers = [];
  const digest = (algo, s) => {
    const name = { SHA_256: 'sha256', SHA_1: 'sha1', MD5: 'md5', SHA_512: 'sha512' }[algo] || 'sha256';
    const buf = crypto.createHash(name).update(typeof s === 'string' ? Buffer.from(s, 'utf8') : Buffer.from(s)).digest();
    return [...buf].map((b) => (b > 127 ? b - 256 : b));
  };
  const hmac = (algo, v, k) => {
    const name = { HMAC_SHA_256: 'sha256', HMAC_SHA_1: 'sha1', HMAC_SHA_512: 'sha512', HMAC_MD5: 'md5' }[algo] || 'sha256';
    const kb = typeof k === 'string' ? Buffer.from(k, 'utf8') : Buffer.from(k.map((b) => b & 255));
    const vb = typeof v === 'string' ? Buffer.from(v, 'utf8') : Buffer.from(v.map((b) => b & 255));
    return [...crypto.createHmac(name, kb).update(vb).digest()].map((b) => (b > 127 ? b - 256 : b));
  };
  const toBuf = (x) => (typeof x === 'string' ? Buffer.from(x, 'utf8') : Buffer.from(x.map((b) => b & 255)));
  const blob = (data, type, name) => {
    const o = { _d: data || '', _t: type || '', _n: name || '' };
    o.getBytes = () => [...toBuf(o._d)]; o.getDataAsString = () => toBuf(o._d).toString('utf8');
    o.getContentType = () => o._t; o.getName = () => o._n;
    o.setName = (n) => { o._n = String(n); return o; }; o.setContentType = (t) => { o._t = String(t); return o; };
    o.copyBlob = () => blob(o._d, o._t, o._n); o.setDataFromString = (s) => { o._d = String(s); return o; };
    return o;
  };

  const g = {
    console: { log: (...a) => logs.push(a.join(' ')), error: (...a) => logs.push('ERR ' + a.join(' ')), warn: (...a) => logs.push(a.join(' ')), info: (...a) => logs.push(a.join(' ')) },
    Logger: { log: (...a) => { logs.push(a.map(String).join(' ')); }, getLog: () => logs.join('\n'), clear: () => { logs.length = 0; } },
    SpreadsheetApp: new Proxy({
      openById: (id) => book(id), openByUrl: (u) => book(String(u).replace(/.*\/d\/([^/]+).*/, '$1')), create: (n) => { const x = book('new-' + (books.size + 1)); x.insertSheet('Sheet1'); return x; },
      getActiveSpreadsheet: () => book('active'), flush: () => {}, getActive: () => book('active'),
      newDataValidation: () => chain(), newConditionalFormatRule: () => chain(), newRichTextValue: () => chain(), newTextStyle: () => chain(),
      WrapStrategy: {}, ProtectionType: {}, BorderStyle: {}, DataValidationCriteria: {}, BooleanCriteria: {},
    }, { get: (t, k) => (k in t ? t[k] : chain()) }),
    CacheService: { getScriptCache: () => cache, getUserCache: () => cache, getDocumentCache: () => cache },
    PropertiesService: { getScriptProperties: () => props, getUserProperties: () => props, getDocumentProperties: () => props },
    LockService: { getScriptLock: () => newLock(), getUserLock: () => newLock(), getDocumentLock: () => newLock() },
    UrlFetchApp: { fetch: (u, o) => { fetches.push(String(u)); return httpFail(); }, fetchAll: (rs) => rs.map((r) => { fetches.push(String(r.url || r)); return httpFail(); }) },
    Utilities: {
      formatDate, sleep: () => {}, getUuid: () => crypto.randomUUID(),
      DigestAlgorithm: { SHA_256: 'SHA_256', SHA_1: 'SHA_1', MD5: 'MD5', SHA_512: 'SHA_512' },
      MacAlgorithm: { HMAC_SHA_256: 'HMAC_SHA_256', HMAC_SHA_1: 'HMAC_SHA_1', HMAC_SHA_512: 'HMAC_SHA_512', HMAC_MD5: 'HMAC_MD5' },
      Charset: { UTF_8: 'UTF_8', US_ASCII: 'US_ASCII' },
      computeDigest: (a, s) => digest(a, s),
      computeHmacSha256Signature: (v, k) => hmac('HMAC_SHA_256', v, k),
      computeHmacSignature: (a, v, k) => hmac(a, v, k),
      base64Encode: (x) => toBuf(x).toString('base64'), base64EncodeWebSafe: (x) => toBuf(x).toString('base64url').replace(/[^=]$/, (c) => c) + '='.repeat((4 - (toBuf(x).toString('base64url').length % 4)) % 4),
      base64Decode: (s) => [...Buffer.from(String(s), 'base64')].map((b) => (b > 127 ? b - 256 : b)),
      base64DecodeWebSafe: (s) => [...Buffer.from(String(s), 'base64url')].map((b) => (b > 127 ? b - 256 : b)),
      newBlob: (d, t, n) => blob(d, t, n),
      parseDate: (s) => new Date(s),
      jsonStringify: JSON.stringify, jsonParse: JSON.parse,
      parseCsv: (s) => String(s).split('\n').map((l) => l.split(',')),
    },
    ScriptApp: new Proxy({
      getProjectTriggers: () => triggers.slice(), deleteTrigger: (t) => { const i = triggers.indexOf(t); if (i > -1) triggers.splice(i, 1); },
      newTrigger: (fn) => {
        const t = { fn, uid: 'T' + (triggers.length + 1) + '-' + Date.now(), getUniqueId() { return this.uid; }, getHandlerFunction() { return this.fn; }, getEventType() { return 'CLOCK'; } };
        const b = new Proxy({}, { get: (o, k) => (k === 'create' ? () => { triggers.push(t); return t; } : () => b) });
        return b;
      }, getOAuthToken: () => 'local',
      getScriptId: () => 'local', getService: () => ({ getUrl: () => 'https://script.google.com/macros/s/local/exec' }),
      EventType: { CLOCK: 'CLOCK', ON_EDIT: 'ON_EDIT' }, WeekDay: new Proxy({}, { get: (t, k) => k }), AuthMode: {},
    }, { get: (t, k) => (k in t ? t[k] : chain()) }),
    Session: { getScriptTimeZone: () => TZ_DEFAULT, getActiveUser: () => ({ getEmail: () => '' }), getEffectiveUser: () => ({ getEmail: () => '' }), getTemporaryActiveUserKey: () => 'local' },
    ContentService: { createTextOutput: (s) => ({ _s: String(s || ''), setMimeType() { return this; }, getContent() { return this._s; }, append(x) { this._s += x; return this; } }), MimeType: { JSON: 'JSON', TEXT: 'TEXT', JAVASCRIPT: 'JAVASCRIPT' } },
    HtmlService: new Proxy({ XFrameOptionsMode: { ALLOWALL: 'ALLOWALL', DEFAULT: 'DEFAULT' } }, { get: (t, k) => (k in t ? t[k] : chain()) }),
    DriveApp: new Proxy({ Access: new Proxy({}, { get: (t, k) => k }), Permission: new Proxy({}, { get: (t, k) => k }) }, { get: (t, k) => (k in t ? t[k] : chain()) }),
    DocumentApp: new Proxy({ ParagraphHeading: new Proxy({}, { get: (t, k) => k }), Attribute: new Proxy({}, { get: (t, k) => k }) }, { get: (t, k) => (k in t ? t[k] : chain()) }),
    CalendarApp: new Proxy({}, { get: () => chain() }),
    Charts: new Proxy({ ChartType: new Proxy({}, { get: (t, k) => k }) }, { get: (t, k) => (k in t ? t[k] : chain()) }),
    MailApp: new Proxy({}, { get: () => chain() }),
    GmailApp: new Proxy({}, { get: () => chain() }),
    XmlService: new Proxy({}, { get: () => chain() }),
  };
  return { g, logs, books, book, cache, props, fetches, triggers, lockState, realm };
}

export function pushOrder(botDir) {
  const cfg = JSON.parse(readFileSync(join(botDir, '.clasp.json'), 'utf8'));
  return cfg.filePushOrder;
}

// همهٔ فایل‌ها را به ترتیب در یک کانتکست اجرا می‌کند؛ مثل Apps Script خطای سطح بالای یک فایل بقیه را متوقف نمی‌کند.
export function loadBot(botDir, opts = {}) {
  const env = makeGlobals(opts);
  const ctx = vm.createContext(env.g);
  env.realm.Date = vm.runInContext('Date', ctx);
  const loadErrors = [];
  const files = opts.files || pushOrder(botDir);
  for (const f of files) {
    const src = readFileSync(join(botDir, f), 'utf8');
    try { vm.runInContext(src, ctx, { filename: f }); } catch (e) { loadErrors.push(f + ': ' + (e && e.message)); }
  }
  if (opts.extra) vm.runInContext(opts.extra, ctx, { filename: 'extra.js' });
  const run = (code) => vm.runInContext(code, ctx);
  return { ...env, ctx, run, loadErrors };
}
