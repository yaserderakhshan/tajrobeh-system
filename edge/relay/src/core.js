// هستهٔ صف پایدار رله: بی وابستگی به کلادفلر تا با node --test آزموده شود.
// ذخیره روی SQLite دیوریبل آبجکت (ctx.storage.sql)؛ در آزمون همان رابط روی node:sqlite.
// قاعده‌ها: اول ذخیره، بعد تحویل؛ ترتیب در هر چت با update_id؛ هر آپدیت یک بار (کلید یکتا)؛ تلاش تا ۲۴ ساعت.

export const DAY_MS = 24 * 3600 * 1000;
export const MAX_AGE_MS = DAY_MS;                 // بیشتر از این صبر نمی‌کنیم؛ «ناموفق» شمرده می‌شود
export const KEEP_MS = DAY_MS + 2 * 3600 * 1000;  // ردیف تحویل‌شده این‌قدر می‌ماند تا آپدیت تکراری دوباره نرود
export const BACKOFF_BASE_MS = 2000;
export const BACKOFF_CAP_MS = 10 * 60 * 1000;
export const PAUSED_WAKE_MS = 10 * 60 * 1000;

/* فاصلهٔ تلاش بعدی بعد از n شکست پشت سر هم: ۲، ۴، ۸ ثانیه ... تا سقف ۱۰ دقیقه */
export function backoff(n) {
  return Math.min(BACKOFF_CAP_MS, BACKOFF_BASE_MS * 2 ** Math.max(0, n - 1));
}

/* چت هر آپدیت تلگرام؛ ترتیب فقط درون همین کلید نگه داشته می‌شود */
export function tgChat(u) {
  const m = u.message || u.edited_message || u.channel_post || u.edited_channel_post ||
    u.business_message || u.edited_business_message;
  if (m && m.chat && m.chat.id != null) return String(m.chat.id);
  const cq = u.callback_query;
  if (cq) {
    if (cq.message && cq.message.chat && cq.message.chat.id != null) return String(cq.message.chat.id);
    if (cq.from && cq.from.id != null) return 'u' + cq.from.id;
  }
  const cm = u.my_chat_member || u.chat_member || u.chat_join_request;
  if (cm && cm.chat && cm.chat.id != null) return String(cm.chat.id);
  for (const k of Object.keys(u)) {
    const v = u[k];
    if (v && typeof v === 'object' && v.from && v.from.id != null) return 'u' + v.from.id;
  }
  return '_';
}

export function describeTelegram(raw, u) {
  return { k: 'tg:' + u.update_id, chat: 'tg:' + tgChat(u), ord: Number(u.update_id), body: raw };
}

/* واتس‌اپ: کلید از هش بدنه (متا همان رویداد را دوباره می‌فرستد)، ترتیب با زمان رسیدن، چت با شمارهٔ فرستنده */
export function describeWhatsApp(raw, u, now, hash) {
  let from = '';
  try {
    const v = u.entry[0].changes[0].value;
    from = String((v.messages && v.messages[0] && v.messages[0].from) || (v.statuses && v.statuses[0] && v.statuses[0].recipient_id) || '');
  } catch (e) { from = ''; }
  return { k: 'wa:' + hash, chat: 'wa:' + (from || '_'), ord: now, body: raw };
}

const SCHEMA = [
  `CREATE TABLE IF NOT EXISTS q (
     k TEXT PRIMARY KEY, chat TEXT NOT NULL, ord INTEGER NOT NULL, body TEXT NOT NULL,
     recv INTEGER NOT NULL, tries INTEGER NOT NULL DEFAULT 0, next_at INTEGER NOT NULL,
     unc INTEGER NOT NULL DEFAULT 0, held INTEGER NOT NULL DEFAULT 0, last_err TEXT, done INTEGER NOT NULL DEFAULT 0, fin INTEGER)`,
  'CREATE INDEX IF NOT EXISTS q_chat ON q (done, chat, ord)',
  'CREATE INDEX IF NOT EXISTS q_recv ON q (done, recv)',
  'CREATE TABLE IF NOT EXISTS ev (ts INTEGER NOT NULL, kind TEXT NOT NULL, n INTEGER NOT NULL)',
  'CREATE TABLE IF NOT EXISTS meta (k TEXT PRIMARY KEY, v TEXT)',
];

/* done: ۰ در انتظار · ۱ تحویل شد · ۲ بعد از ۲۴ ساعت ناموفق
   held: این آپدیت به خاطر شکست تحویل (خودش یا جلوتری‌ها) معطل ماند؛ تحویلش «برگشته» (recovered) شمرده می‌شود */
export class Store {
  constructor(sql) {
    this.sql = sql;
    for (const s of SCHEMA) sql.exec(s).toArray();
  }
  rows(q, ...b) { return this.sql.exec(q, ...b).toArray(); }
  run(q, ...b) { const c = this.sql.exec(q, ...b); c.toArray(); return c.rowsWritten || 0; }

  meta(k, d = '') { const r = this.rows('SELECT v FROM meta WHERE k = ?', k); return r.length ? r[0].v : d; }
  setMeta(k, v) { this.run('INSERT OR REPLACE INTO meta (k, v) VALUES (?, ?)', k, String(v)); }
  paused() { return this.meta('paused') === '1'; }
  setPaused(on) { this.setMeta('paused', on ? '1' : '0'); }
  breaker() { return { fails: Number(this.meta('fails', '0')), until: Number(this.meta('until', '0')) }; }
  setBreaker(fails, until) { this.setMeta('fails', fails); this.setMeta('until', until); }

  /* true یعنی تازه ذخیره شد؛ false یعنی همین کلید قبلاً بوده (تکراری) */
  add(item, now) {
    return this.run('INSERT OR IGNORE INTO q (k, chat, ord, body, recv, next_at, held) VALUES (?, ?, ?, ?, ?, ?, ?)',
      item.k, item.chat, item.ord, item.body, now, now, this.breaker().fails > 0 ? 1 : 0) > 0;
  }
  chats() { return this.rows('SELECT DISTINCT chat FROM q WHERE done = 0 ORDER BY chat').map((r) => r.chat); }
  head(chat) {
    const r = this.rows('SELECT k, chat, ord, body, recv, tries, next_at, unc, held FROM q WHERE done = 0 AND chat = ? ORDER BY ord, recv, k LIMIT 1', chat);
    return r.length ? r[0] : null;
  }
  ev(kind, n, now) { if (n > 0) this.run('INSERT INTO ev (ts, kind, n) VALUES (?, ?, ?)', now, kind, n); }
  delivered(h, now) {
    this.run('UPDATE q SET done = 1, fin = ?, body = \'\' WHERE k = ?', now, h.k);
    if (h.tries > 0 || h.held) this.ev('rec', 1, now);
  }
  failed(h, now, r) {
    const tries = h.tries + 1;
    this.run('UPDATE q SET tries = ?, next_at = ?, last_err = ?, unc = MAX(unc, ?) WHERE k = ?',
      tries, now + backoff(tries), String(r.err || '').slice(0, 80), r.unc ? 1 : 0, h.k);
    this.run('UPDATE q SET held = 1 WHERE done = 0 AND held = 0');
    this.setMeta('last_err', String(r.err || ''));
  }
  /* بعد از برگشتن بات، همه تلاش بعدی را همین حالا می‌گیرند (نه تا ۱۰ دقیقه بعد) */
  wakeAll(now) { this.run('UPDATE q SET next_at = ? WHERE done = 0 AND next_at > ?', now, now); }
  expire(now) {
    const lim = now - MAX_AGE_MS;
    const n = this.rows('SELECT COUNT(*) AS n FROM q WHERE done = 0 AND recv <= ?', lim)[0].n;
    if (n > 0) {
      this.run('UPDATE q SET done = 2, fin = ?, body = \'\' WHERE done = 0 AND recv <= ?', now, lim);
      this.ev('fail', n, now);
    }
    return n;
  }
  prune(now) {
    this.run('DELETE FROM q WHERE done > 0 AND recv < ?', now - KEEP_MS);
    this.run('DELETE FROM ev WHERE ts < ?', now - DAY_MS - 3600 * 1000);
  }
  /* زمان بیدار شدن بعدی؛ null یعنی کاری نمانده */
  nextWake(now) {
    const pending = this.rows('SELECT COUNT(*) AS n FROM q WHERE done = 0')[0].n;
    if (!pending) return null;
    if (this.paused()) return now + PAUSED_WAKE_MS;
    let w = Infinity;
    for (const c of this.chats()) { const h = this.head(c); if (h && h.next_at < w) w = h.next_at; }
    const b = this.breaker();
    if (b.until > w) w = b.until;
    const oldest = this.rows('SELECT MIN(recv) AS r FROM q WHERE done = 0')[0].r;
    return Math.min(w, oldest + MAX_AGE_MS);
  }
  health(now) {
    const p = this.rows('SELECT COUNT(*) AS n, MIN(recv) AS r FROM q WHERE done = 0')[0];
    const since = now - DAY_MS;
    const sum = (kind) => Number(this.rows('SELECT COALESCE(SUM(n), 0) AS s FROM ev WHERE kind = ? AND ts > ?', kind, since)[0].s);
    return {
      pending: Number(p.n),
      oldest_age_s: p.n ? Math.max(0, Math.floor((now - p.r) / 1000)) : 0,
      recovered_24h: sum('rec'),
      failed_24h: sum('fail'),
      paused: this.paused(),
    };
  }
}

/* یک دور تحویل. هر چت پشت سر هم (سر صف اول)، چند چت هم‌زمان. اولین شکست دور را می‌بندد و قطع‌کن سراسری را می‌زند
   تا در قطعی طولانی اپس‌اسکریپت هر بار فقط یک تلاش برود؛ اولین تحویل موفق بعد از آن همه را بیدار می‌کند. */
export async function drain(store, forward, now = Date.now, conc = 4) {
  const res = { sent: 0, failed: 0, expired: store.expire(now()) };
  if (store.paused()) return res;
  if (store.breaker().until > now()) return res;
  const chats = store.chats();
  let broken = false, i = 0;
  const lane = async () => {
    while (!broken && i < chats.length) {
      const chat = chats[i++];
      while (!broken) {
        const h = store.head(chat);
        if (!h || h.next_at > now()) break;
        const r = await forward(h);
        const t = now();
        if (r.ok) {
          store.delivered(h, t); res.sent++;
          if (store.breaker().fails) { store.setBreaker(0, 0); store.wakeAll(t); }
        } else {
          store.failed(h, t, r); res.failed++;
          const f = store.breaker().fails + 1;
          store.setBreaker(f, t + backoff(f));
          broken = true;
        }
      }
    }
  };
  await Promise.all(Array.from({ length: Math.max(1, Math.min(conc, chats.length)) }, lane));
  return res;
}

/* فرستادن یک آپدیت به اپس‌اسکریپت با رمز ?t= (همان TG_HOOK_SECRET بات). ۲xx و ۳xx (ریدایرکت echo اپس‌اسکریپت) یعنی رسید.
   rt: شمار تلاش‌های قبلی · unc=1: تلاش قبلی با مهلت یا خطای شبکه تمام شد و شاید بات آن را پردازش کرده باشد. */
export async function forward(url, secret, item, fetchFn = fetch, timeoutMs = 25000) {
  if (!url || !secret) return { ok: false, code: 0, err: 'no-config', unc: false };
  const u = new URL(url);
  u.searchParams.set('t', secret);
  if (item.tries) u.searchParams.set('rt', String(item.tries));
  if (item.unc) u.searchParams.set('unc', '1');
  const ac = new AbortController();
  const tm = setTimeout(() => ac.abort(), timeoutMs);
  try {
    const r = await fetchFn(u.toString(), {
      method: 'POST', headers: { 'content-type': 'application/json' }, body: item.body, redirect: 'manual', signal: ac.signal,
    });
    try { if (r.body && r.body.cancel) await r.body.cancel(); } catch (e) { /* بدنه لازم نیست */ }
    const ok = r.status >= 200 && r.status < 400;
    return { ok, code: r.status, err: ok ? '' : 'http ' + r.status, unc: false };
  } catch (e) {
    return { ok: false, code: 0, err: ac.signal.aborted ? 'timeout' : 'net', unc: true };
  } finally { clearTimeout(tm); }
}

/* مقایسهٔ زمان‌ثابت روی هش SHA-256 هر دو (مثل tgSafeEq_ بات) */
export async function safeEq(a, b) {
  a = String(a == null ? '' : a); b = String(b == null ? '' : b);
  if (!a || !b) return false;
  const enc = new TextEncoder();
  const [x, y] = await Promise.all([a, b].map((s) => crypto.subtle.digest('SHA-256', enc.encode(s))));
  const X = new Uint8Array(x), Y = new Uint8Array(y);
  let d = 0;
  for (let i = 0; i < X.length; i++) d |= X[i] ^ Y[i];
  return d === 0;
}

export async function sha256Hex(s) {
  const h = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s));
  return [...new Uint8Array(h)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

export async function hmacHex(key, s) {
  const k = await crypto.subtle.importKey('raw', new TextEncoder().encode(key), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const sig = await crypto.subtle.sign('HMAC', k, new TextEncoder().encode(s));
  return [...new Uint8Array(sig)].map((b) => b.toString(16).padStart(2, '0')).join('');
}
