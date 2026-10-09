// پایش بالا بودن سایت (برد فرآیندها، کار ۴؛ بی هوش مصنوعی). cron هر ۵ دقیقه روی همین ورکر (بیرون از ایران).
//   سه صفحه: صفحهٔ اصلی، /get-therapy/ و یک مطلب مجله. هر کدام: کد ۲۰۰، یک عبارت ثابت صفحه، زمان پاسخ.
//   دو خطای پشت سر هم ← هشدار به یاسر و تیم فنی از راه بات (اکشن up_alert). برگشت ← یک پیام «برگشت» با مدت قطعی.
//   اگر از اینجا جواب نمی‌دهد ولی ضربان سرور سایت از داخل ایران (POST /uptime/beat با امضای LEAD_SECRET، اسنیپت 506148)
//   در ۱۵ دقیقهٔ اخیر رسیده، هشدار صریح می‌گوید «از خارج ایران در دسترس نیست، از داخل بالاست».
//   لاگ: هر ۳۰ دقیقه یک سطر نمونه برای هر صفحه، و هر خطا همان لحظه، با اکشن up_log به تب «پایش سایت» (بات ۳۰ روز نگه می‌دارد).
//   KV فقط وقتی وضعیت عوض شود نوشته می‌شود (سقف نوشتن رایگان کلادفلر).
export const UP_PAGES = [
  { key: 'home', url: 'https://tajrobeh.life/', must: 'id="therapists"' },
  { key: 'get-therapy', url: 'https://tajrobeh.life/get-therapy/', must: 'شروع تراپی' },
  { key: 'mag', url: 'https://tajrobeh.life/mag/symptom/', must: 'tjm' }
];
export const UP_TIMEOUT_MS = 15000, UP_FAILS = 2, UP_BEAT_FRESH_MS = 15 * 60000, UP_BEAT_WRITE_MS = 10 * 60000;

export async function upCheckOne(page, fetcher = fetch) {
  const t0 = Date.now();
  try {
    const ac = new AbortController(), to = setTimeout(() => ac.abort(), UP_TIMEOUT_MS);
    const r = await fetcher(page.url + (page.url.includes('?') ? '&' : '?') + 'tjup=' + t0, { signal: ac.signal, headers: { 'user-agent': 'tajrobeh-uptime/1', 'cache-control': 'no-cache' }, redirect: 'follow' });
    const body = await r.text(); clearTimeout(to);
    const ms = Date.now() - t0, has = body.includes(page.must);
    return { key: page.key, code: r.status, ms, has, ok: r.status === 200 && has };
  } catch (e) {
    return { key: page.key, code: 0, ms: Date.now() - t0, has: false, ok: false, err: e && e.name === 'AbortError' ? 'timeout' : 'net' };
  }
}

/** یک دور: نتیجه‌ها و وضعیت تازه؛ state = { fails, downAt, alerted } ، beat = زمان آخرین ضربان داخل ایران */
export function upDecide(results, state, beat, now) {
  const s = Object.assign({ fails: 0, downAt: 0, alerted: false }, state || {});
  const bad = results.filter((r) => !r.ok), out = { state: s, alert: null, changed: false };
  if (bad.length) {
    if (!s.fails) { s.downAt = now; out.changed = true; }
    s.fails += 1;
    if (s.fails >= UP_FAILS && !s.alerted) {
      s.alerted = true; out.changed = true;
      const inside = beat && now - beat <= UP_BEAT_FRESH_MS;
      out.alert = { kind: inside ? 'outside' : 'down', bad: bad.map((r) => ({ key: r.key, code: r.code, err: r.err || (r.has ? '' : 'عبارت ثابت نبود') })) };
    } else if (s.fails < UP_FAILS) out.changed = true;
  } else if (s.fails) {
    const was = s.alerted, mins = Math.round((now - (s.downAt || now)) / 60000);
    out.state = { fails: 0, downAt: 0, alerted: false }; out.changed = true;
    if (was) out.alert = { kind: 'up', mins };
  }
  return out;
}

async function botPost(env, action, payload) {
  if (!env.BOT_URL || !env.BOT_KEY) return false;
  for (let i = 0; i < 2; i++) {
    try {
      const r = await fetch(env.BOT_URL, { method: 'POST', headers: { 'content-type': 'text/plain' }, redirect: 'follow', body: JSON.stringify(Object.assign({ api: 1, key: env.BOT_KEY, action }, payload)) });
      if (r.ok) return true;
    } catch (e) {}
  }
  return false;
}

export async function upTick(env, now = Date.now()) {
  const results = await Promise.all(UP_PAGES.map((p) => upCheckOne(p)));
  const [state, beat] = await Promise.all([env.KV.get('up:state', 'json'), env.KV.get('up:beat').then((v) => Number(v) || 0)]);
  const d = upDecide(results, state, beat, now);
  if (d.changed) await env.KV.put('up:state', JSON.stringify(d.state));
  if (d.alert) await botPost(env, 'up_alert', { alert: d.alert });
  /* لاگ: هر ۳۰ دقیقه (دقیقهٔ ۰ تا ۴ و ۳۰ تا ۳۴) یک نمونه، و هر خطا همان لحظه */
  const m = new Date(now).getUTCMinutes(), sample = m % 30 < 5, bad = results.some((r) => !r.ok);
  if (sample || bad) await botPost(env, 'up_log', { entries: results.map((r) => ({ t: now, key: r.key, code: r.code, ms: r.ms, ok: r.ok, err: r.err || (r.ok || r.has ? '' : 'عبارت ثابت نبود'), beat: beat ? Math.round((now - beat) / 60000) : -1 })) });
  return { results, decision: d };
}

/** ضربان سرور سایت از داخل ایران؛ فقط اگر آخرین ثبت بیش از ۱۰ دقیقه پیش بوده نوشته می‌شود */
export async function upBeat(env, now = Date.now()) {
  const last = Number(await env.KV.get('up:beat')) || 0;
  if (now - last >= UP_BEAT_WRITE_MS) await env.KV.put('up:beat', String(now));
  return true;
}
