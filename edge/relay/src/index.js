// رلهٔ وبهوک تجربه (ورکر tajrobeh-relay): تلگرام و واتس‌اپ به بات اپس‌اسکریپت.
// هیچ آپدیتی گم نمی‌شود: اول در دیوریبل آبجکت ذخیره، بعد «ok» به تلگرام، بعد تحویل با ctx.waitUntil و آلارم تا ۲۴ ساعت.
//
// رمزها و تنظیمات (هیچ‌کدام در کد نیست؛ با wrangler secret put از GitHub Secrets):
//   RELAY_TG_SECRET       همان TG_HOOK_SECRET بات. ورودی تلگرام (سرآیند X-Telegram-Bot-Api-Secret-Token یا ?t=) و ?t= به بات.
//   RELAY_TG_SECRET_PREV  اختیاری، فقط در روزِ عوض کردن رمز: رمز قبلی که هنوز برای ورودی پذیرفته می‌شود.
//   BOT_EXEC_URL          نشانی /exec اپس‌اسکریپت.
//   RELAY_WA_PATH         مسیر وبهوک واتس‌اپ (مثلاً /wa-xxxx). خالی یعنی مسیر واتس‌اپ خاموش.
//   RELAY_WA_VERIFY       توکن تأیید متا (hub.verify_token).
//   RELAY_WA_APP_SECRET   اختیاری: رمز اپ متا برای سنجش X-Hub-Signature-256.
//   RELAY_FWD_TIMEOUT_MS  اختیاری: مهلت هر تحویل (پیش‌فرض ۲۵ ثانیه).
import { Store, drain, forward, describeTelegram, describeWhatsApp, safeEq, sha256Hex, hmacHex } from './core.js';

const MAX_BODY = 1_000_000;
const TG_HDR = 'x-telegram-bot-api-secret-token';
const txt = (s, status = 200) => new Response(s, { status, headers: { 'content-type': 'text/plain; charset=utf-8' } });
const json = (o, status = 200) => new Response(JSON.stringify(o), { status, headers: { 'content-type': 'application/json' } });
const stub = (env) => env.RELAY.get(env.RELAY.idFromName('main'));
const call = (env, path, body) => stub(env).fetch('https://relay.internal' + path,
  body === undefined ? { method: 'POST' } : { method: 'POST', body: JSON.stringify(body) });

async function anyMatch(given, env) {
  const keys = [env.RELAY_TG_SECRET, env.RELAY_TG_SECRET_PREV].filter(Boolean);
  for (const g of given) for (const k of keys) if (g && await safeEq(g, k)) return true;
  return false;
}
function waPath(env) {
  const p = String(env.RELAY_WA_PATH || '').trim();
  return p ? (p.startsWith('/') ? p : '/' + p) : '';
}

async function telegram(req, env, ctx, url) {
  if (!env.RELAY_TG_SECRET) return txt('not configured', 503);   // تلگرام دوباره می‌فرستد؛ چیزی گم نمی‌شود
  if (!(await anyMatch([req.headers.get(TG_HDR), url.searchParams.get('t')], env))) return txt('forbidden', 403);
  const raw = await req.text();
  if (raw.length > MAX_BODY) return txt('too large', 413);
  let u;
  try { u = JSON.parse(raw); } catch (e) { return txt('bad json', 400); }
  if (!u || typeof u !== 'object') return txt('bad json', 400);
  /* پینگ سلامت tgRelayPing_ بات (update_id: -1): ذخیره نمی‌شود، مستقیم به بات می‌رود تا TG_RELAY_PONG ثبت شود */
  if (u.tj_ping) { ctx.waitUntil(call(env, '/ping', { body: raw })); return txt('ok'); }
  /* آزمون tgSwitchRelay و tgRelayCheck: { ping: 1 } فقط ۲۰۰ می‌خواهد */
  if (u.update_id === undefined) return u.ping ? txt('pong') : txt('no update_id', 400);
  if (!Number.isSafeInteger(u.update_id) || u.update_id < 0) return txt('bad update_id', 400);
  const r = await call(env, '/enqueue', describeTelegram(raw, u));
  if (!r.ok) return txt('store failed', 500);   // ۵۰۰ یعنی تلگرام همین آپدیت را دوباره می‌فرستد
  ctx.waitUntil(call(env, '/drain'));
  return txt('ok');
}

async function whatsapp(req, env, ctx, url) {
  if (req.method === 'GET') {
    const ok = url.searchParams.get('hub.mode') === 'subscribe' &&
      await safeEq(url.searchParams.get('hub.verify_token'), env.RELAY_WA_VERIFY);
    return ok ? txt(url.searchParams.get('hub.challenge') || '') : txt('forbidden', 403);
  }
  if (req.method !== 'POST') return txt('method', 405);
  const raw = await req.text();
  if (raw.length > MAX_BODY) return txt('too large', 413);
  if (env.RELAY_WA_APP_SECRET) {
    const sig = String(req.headers.get('x-hub-signature-256') || '').replace(/^sha256=/, '');
    if (!(await safeEq(sig, await hmacHex(env.RELAY_WA_APP_SECRET, raw)))) return txt('forbidden', 403);
  }
  let u;
  try { u = JSON.parse(raw); } catch (e) { return txt('bad json', 400); }
  if (!u || u.object !== 'whatsapp_business_account') return txt('bad object', 400);
  const r = await call(env, '/enqueue', describeWhatsApp(raw, u, Date.now(), await sha256Hex(raw)));
  if (!r.ok) return txt('store failed', 500);   // متا دوباره می‌فرستد
  ctx.waitUntil(call(env, '/drain'));
  return txt('EVENT_RECEIVED');
}

export default {
  async fetch(req, env, ctx) {
    const url = new URL(req.url);
    try {
      const wa = waPath(env);
      if (wa && url.pathname === wa) return await whatsapp(req, env, ctx, url);
      if (url.pathname === '/health' || url.pathname === '/pause' || url.pathname === '/resume') {
        /* فقط با سرآیند؛ رمز در نشانی و لاگ نمی‌آید */
        if (!env.RELAY_TG_SECRET || !(await anyMatch([req.headers.get(TG_HDR)], env))) return txt('forbidden', 403);
        if (url.pathname === '/health') return await stub(env).fetch('https://relay.internal/health');
        if (req.method !== 'POST') return txt('method', 405);
        return await call(env, url.pathname);
      }
      if (req.method !== 'POST') return txt('method', 405);
      return await telegram(req, env, ctx, url);
    } catch (e) {
      return txt('relay error', 500);
    }
  },
  /* تور ایمنی: اگر آلارمی جا ماند، هر ۱۰ دقیقه یک دور تحویل */
  async scheduled(ev, env, ctx) { ctx.waitUntil(call(env, '/drain')); },
};

/* یک نمونهٔ واحد (idFromName('main')): ذخیره و ترتیب و تحویل همه این‌جاست. SQLite دیوریبل آبجکت روی پلن رایگان هم هست. */
export class RelayQueue {
  constructor(ctx, env) {
    this.ctx = ctx; this.env = env;
    this.store = new Store(ctx.storage.sql);
    this.running = null; this.again = false;
  }
  fwd(item) {
    return forward(this.env.BOT_EXEC_URL, this.env.RELAY_TG_SECRET, item, fetch, Number(this.env.RELAY_FWD_TIMEOUT_MS) || 25000);
  }
  drain() {
    if (this.running) { this.again = true; return this.running; }
    this.running = (async () => {
      try {
        do { this.again = false; await drain(this.store, (h) => this.fwd(h)); } while (this.again);
      } finally {
        try { this.store.prune(Date.now()); await this.schedule(); } finally { this.running = null; }
      }
    })();
    return this.running;
  }
  async schedule() {
    const now = Date.now(), w = this.store.nextWake(now);
    if (w == null) await this.ctx.storage.deleteAlarm();
    else await this.ctx.storage.setAlarm(Math.max(w, now + 500));
  }
  async alarm() { await this.drain(); }
  async fetch(req) {
    const p = new URL(req.url).pathname;
    if (p === '/enqueue') {
      const it = await req.json();
      const stored = this.store.add(it, Date.now());
      await this.schedule();   // اگر waitUntil ورکر قطع شد، آلارم تحویل را می‌گیرد
      return json({ stored, dup: !stored });
    }
    if (p === '/drain') { await this.drain(); return json({ ok: true }); }
    if (p === '/health') return json(this.store.health(Date.now()));
    if (p === '/pause' || p === '/resume') {
      this.store.setPaused(p === '/pause');
      await this.schedule();
      if (p === '/resume') this.ctx.waitUntil(this.drain());
      return json(this.store.health(Date.now()));
    }
    if (p === '/ping') {
      if (this.store.paused()) return json({ ok: false, paused: true });
      const { body } = await req.json();
      const r = await this.fwd({ body, tries: 0, unc: 0 });
      return json({ ok: r.ok });
    }
    return txt('not found', 404);
  }
}
