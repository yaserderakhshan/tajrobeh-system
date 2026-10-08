// ورکر دستیار تجربه (tj-assist). موتور پاسخ زنده، بی هیچ فراخوان زنده به اپس‌اسکریپت در مسیر کاربر.
//   POST /assist          قرارداد assist.ask (پل نسخه ۲): مرورگر سایت (فقط مبدأ tajrobeh.life) یا سرور با امضای ts/sig.
//   GET  /assist/boot     جملهٔ شروع، پرسش‌های پرتکرار، موضوع‌ها و جملهٔ حریم خصوصی برای ویجت.
//   POST /assist/refresh  بات بعد از تأیید دانش و تعویض نمایه صدا می‌زند؛ دقیقه‌ای یک بار داده را از بات می‌گیرد.
//   GET  /assist/health   نسخهٔ داده و سن آن (بی هیچ محتوا).
// داده: خروجی اکشن as_dump بات در KV (کلید dump)، هر ۳۰ دقیقه با cron و با پینگ تازه می‌شود. گزارش‌ها با ctx.waitUntil (اکشن as_log).
// رمزها فقط secret ورکر: BOT_URL، BOT_KEY (کلید دوم درگاه)، LEAD_SECRET (امضای سرور، همان رمز لید سایت)، GEMINI_API_KEY (اختیاری).
import { prepare, ask, tap, boot, composePrompt, applyCompose, COMPOSE_SCHEMA, nearTopics } from './engine.js';

const ORIGINS = ['https://tajrobeh.life', 'https://www.tajrobeh.life', 'https://new.tajrobeh.life'];
const GEM_MODEL = 'gemini-flash-lite-latest';
const GEM_BUDGET_MS = 2500;      /* جمنای فقط تا این مهلت؛ بعد همان متن منبع می‌رود (هدف کل زیر ۵ ثانیه) */
const RATE_IP = 30, RATE_SID = 20;   /* در ساعت */
let MEM = null;                  /* {at, P} داده در حافظهٔ همین نمونه، ۶۰ ثانیه */
const HITS = new Map();

export default {
  async fetch(req, env, ctx) {
    const url = new URL(req.url), origin = req.headers.get('Origin') || '';
    const cors = { 'Access-Control-Allow-Origin': ORIGINS.includes(origin) ? origin : ORIGINS[0], 'Vary': 'Origin', 'Access-Control-Allow-Headers': 'Content-Type, X-Tj-Ts, X-Tj-Sig', 'Access-Control-Allow-Methods': 'GET, POST, OPTIONS', 'Access-Control-Max-Age': '86400' };
    const json = (o, st, extra) => new Response(JSON.stringify(o), { status: st || 200, headers: Object.assign({ 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' }, cors, extra || {}) });
    const path = url.pathname.replace(/\/+$/, '');
    if (req.method === 'OPTIONS') return new Response(null, { headers: cors });
    try {
      if (path === '/assist/health') { const d = await data(env, ctx); return json({ ok: !!d, v: d ? d.raw.v : '', at: d ? d.raw.at : '', kb: d ? d.kb.length : 0, idx: d ? d.siteIx.items.length + d.magIx.items.length : 0, gemini: !!env.GEMINI_API_KEY, rewrite: d ? d.rewrite : false }); }   /* فقط بله و نه؛ هیچ مقدار رمز */
      if (path === '/assist/refresh' && req.method === 'POST') { ctx.waitUntil(refresh(env, true)); return json({ ok: true }); }
      if (path === '/assist/boot' && req.method === 'GET') {
        const P = await data(env, ctx);
        return json(P ? boot(P) : { ok: false, error: 'nodata' }, P ? 200 : 503, P ? { 'cache-control': 'public, max-age=300' } : {});
      }
      if ((path === '/assist' || path === '/assist/ask') && req.method === 'POST') {
        const t0 = Date.now(), raw = await req.text();
        if (raw.length > 4000) return json({ ok: false, error: 'size' }, 413);
        let body = {}; try { body = JSON.parse(raw); } catch (e) { return json({ ok: false, error: 'json' }, 400); }
        const signed = await verify(req, url, raw, env);
        if (!signed && !ORIGINS.includes(origin)) return json({ ok: false, error: 'sig' }, 403);
        const sid = String(body.session_id || '').replace(/[^\w-]/g, '').slice(0, 64);
        if (!sid) return json({ ok: false, error: 'session' }, 400);
        const ip = req.headers.get('CF-Connecting-IP') || '';
        if (!signed && !hit('ip:' + ip, RATE_IP)) return json({ ok: false, error: 'rate' }, 429);
        if (!hit('s:' + sid, RATE_SID)) return json({ ok: false, error: 'rate' }, 429);
        const P = await data(env, ctx);
        if (!P) return json({ ok: false, error: 'nodata' }, 503);
        const c = { channel: String(body.channel || 'site').replace(/[^\w-]/g, '').slice(0, 20) || 'site', audience: String(body.audience || '').slice(0, 30), session: sid };
        const r = body.tap ? tap(P, String(body.tap), String(body.text || ''), c) : ask(P, String(body.text || ''), c);
        let res = r.res, model = '';
        if (r.compose && P.rewrite && env.GEMINI_API_KEY && await gemLeft(env, P)) {
          const g = await gemini(env, composePrompt(r.compose), COMPOSE_SCHEMA, GEM_BUDGET_MS);
          if (g && g.out) { res = applyCompose(res, r.compose, g.out); model = GEM_MODEL; ctx.waitUntil(gemCount(env)); }
          if (g && g.usage) (r.extra = r.extra || []).push({ k: 'gem', job: 'پاسخ از منبع سایت', model: GEM_MODEL, tin: g.usage.promptTokenCount || 0, tout: g.usage.candidatesTokenCount || 0 });
        }
        const ms = Date.now() - t0;
        const logs = [].concat(r.log ? [Object.assign({ ms }, r.log)] : [], r.un ? [r.un] : [], r.extra || []);
        if (logs.length) ctx.waitUntil(sendLogs(env, logs));
        return json(res, 200, { 'server-timing': 'assist;dur=' + ms + (model ? ', gemini' : '') });
      }
      /* نزدیک‌ترین موضوع‌ها بی گزارش، برای بازگشت سبک ویجت */
      if (path === '/assist/near' && req.method === 'GET') {
        const P = await data(env, ctx); if (!P) return json({ ok: false }, 503);
        return json({ ok: true, topics: nearTopics(P, String(url.searchParams.get('q') || '').slice(0, 200)) });
      }
      return json({ ok: false, error: 'not found' }, 404);
    } catch (e) {
      return json({ ok: false, error: 'internal' }, 500);
    }
  },
  async scheduled(ev, env, ctx) { ctx.waitUntil(refresh(env, false)); }
};

/* ───── داده ───── */
async function data(env, ctx) {
  if (MEM && Date.now() - MEM.at < 60000) return MEM.P;
  const hitKv = await env.KV.get('dump', 'json');
  if (hitKv && hitKv.data) {
    MEM = { at: Date.now(), P: prepare(hitKv.data) };
    if (Date.now() - (hitKv.at || 0) > 45 * 60000) ctx.waitUntil(refresh(env, false));
    return MEM.P;
  }
  const d = await refresh(env, true);
  return d ? (MEM = { at: Date.now(), P: prepare(d) }).P : null;
}
async function refresh(env, ping) {
  if (ping) {
    const last = await env.KV.get('pull_at');
    if (last && Date.now() - Number(last) < 60000) return null;
  }
  try {
    const r = await fetch(env.BOT_URL, { method: 'POST', headers: { 'content-type': 'text/plain' }, redirect: 'follow', body: JSON.stringify({ api: 1, key: env.BOT_KEY, action: 'as_dump' }) });
    const j = await r.json();
    if (!j || !j.ok || !j.data || !Array.isArray(j.data.kb)) return null;
    await env.KV.put('dump', JSON.stringify({ at: Date.now(), data: j.data }));
    await env.KV.put('pull_at', String(Date.now()));
    MEM = null;
    return j.data;
  } catch (e) { return null; }
}

/* ───── گزارش به بات، بی اینکه کاربر منتظر بماند ───── */
async function sendLogs(env, entries) {
  for (let i = 0; i < 2; i++) {
    try {
      const r = await fetch(env.BOT_URL, { method: 'POST', headers: { 'content-type': 'text/plain' }, redirect: 'follow', body: JSON.stringify({ api: 1, key: env.BOT_KEY, action: 'as_log', entries }) });
      if (r.ok) return;
    } catch (e) {}
  }
}

/* ───── امضای سرور (همان روش سایت و بات: HMAC-SHA256 روی ts + "." + بدنهٔ خام، پنجرهٔ ۵ دقیقه) ───── */
async function verify(req, url, raw, env) {
  if (!env.LEAD_SECRET) return false;
  const ts = req.headers.get('X-Tj-Ts') || url.searchParams.get('ts') || '', sig = (req.headers.get('X-Tj-Sig') || url.searchParams.get('sig') || '').toLowerCase();
  if (!/^\d{10}$/.test(ts) || !/^[0-9a-f]{64}$/.test(sig) || Math.abs(Date.now() / 1000 - Number(ts)) > 300) return false;
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(env.LEAD_SECRET), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const mac = new Uint8Array(await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(ts + '.' + raw)));
  const hex = [...mac].map((b) => b.toString(16).padStart(2, '0')).join('');
  let d = 0; for (let i = 0; i < 64; i++) d |= hex.charCodeAt(i) ^ sig.charCodeAt(i);
  return d === 0;
}

/* ───── نرخ (حافظهٔ همین نمونه؛ سقف نرم) ───── */
function hit(k, max) {
  const now = Date.now(), L = (HITS.get(k) || []).filter((t) => now - t < 3600000);
  if (L.length >= max) { HITS.set(k, L); return false; }
  L.push(now); HITS.set(k, L);
  if (HITS.size > 5000) HITS.clear();
  return true;
}

/* ───── جمنای، فقط با پرسش پاک‌شده و متن منتشرشده، با مهلت ───── */
function day() { return new Date(Date.now() + 3.5 * 3600000).toISOString().slice(0, 10); }
async function gemLeft(env, P) { const n = Number(await env.KV.get('gem:' + day()) || 0); return n < P.gemDaily; }
async function gemCount(env) { const k = 'gem:' + day(), n = Number(await env.KV.get(k) || 0); await env.KV.put(k, String(n + 1), { expirationTtl: 172800 }); }
async function gemini(env, prompt, schema, ms) {
  const ac = new AbortController(), tm = setTimeout(() => ac.abort(), ms);
  try {
    const r = await fetch('https://generativelanguage.googleapis.com/v1beta/models/' + GEM_MODEL + ':generateContent', {
      method: 'POST', signal: ac.signal, headers: { 'content-type': 'application/json', 'x-goog-api-key': env.GEMINI_API_KEY },
      body: JSON.stringify({ contents: [{ role: 'user', parts: [{ text: prompt }] }], generationConfig: { temperature: 0.2, responseMimeType: 'application/json', responseSchema: schema, thinkingConfig: { thinkingBudget: 0 } } })
    });
    if (!r.ok) return null;
    const j = await r.json(), t = ((((j.candidates || [])[0] || {}).content || {}).parts || []).map((p) => p.text || '').join('');
    let out = null; try { out = JSON.parse(t); } catch (e) {}
    return { out, usage: j.usageMetadata || {} };
  } catch (e) { return null; } finally { clearTimeout(tm); }
}
