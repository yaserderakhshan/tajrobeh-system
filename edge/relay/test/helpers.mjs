// ابزار آزمون: رابط ctx.storage.sql دیوریبل آبجکت روی node:sqlite، و یک env ساختگی برای ورکر. همهٔ داده‌ها ساختگی‌اند.
import { DatabaseSync } from 'node:sqlite';
import { RelayQueue } from '../src/index.js';

export function memSql() {
  const db = new DatabaseSync(':memory:');
  const cursor = (rows, written) => ({
    rowsWritten: written, toArray: () => rows, one: () => rows[0], [Symbol.iterator]: () => rows[Symbol.iterator](),
  });
  return {
    exec(q, ...b) {
      const st = db.prepare(q);
      if (/^\s*(select|with)\b/i.test(q)) return cursor(st.all(...b).map((r) => ({ ...r })), 0);
      return cursor([], Number(st.run(...b).changes));
    },
  };
}

export const SECRET = 'test-secret-0000000000000000';
export const BOT = 'https://bot.example.com/exec';

/* env با یک دیوریبل آبجکت درون‌حافظه؛ waits همهٔ کارهای ctx.waitUntil را نگه می‌دارد */
export function makeEnv(extra = {}) {
  const ctxDo = {
    storage: { sql: memSql(), alarm: null, setAlarm(t) { this.alarm = t; }, deleteAlarm() { this.alarm = null; }, getAlarm() { return this.alarm; } },
    waits: [], waitUntil(p) { this.waits.push(p); },
  };
  const env = { RELAY_TG_SECRET: SECRET, BOT_EXEC_URL: BOT, RELAY_WA_PATH: '/wa-test', RELAY_WA_VERIFY: 'verify-test', RELAY_FWD_TIMEOUT_MS: '200', ...extra };
  const obj = new RelayQueue(ctxDo, env);
  env.RELAY = { idFromName: (n) => n, get: () => ({ fetch: (u, init) => obj.fetch(new Request(u, init)) }) };
  const ctx = { waits: [], waitUntil(p) { this.waits.push(p); } };
  const settle = async () => { while (ctx.waits.length || ctxDo.waits.length) await Promise.all([...ctx.waits.splice(0), ...ctxDo.waits.splice(0)]); };
  return { env, ctx, obj, ctxDo, settle };
}

/* fetch ساختگی بات: پاسخ‌ها به ترتیب از فهرست؛ هر تحویل در calls ثبت می‌شود */
export function fakeBot(plan) {
  const calls = [];
  const f = async (url, init) => {
    const step = typeof plan === 'function' ? plan(calls.length, url, init) : plan[Math.min(calls.length, plan.length - 1)];
    calls.push({ url: new URL(url), body: init.body });
    if (step === 'hang') return new Promise((_, rej) => init.signal.addEventListener('abort', () => rej(new Error('aborted'))));
    if (step === 'net') throw new Error('net');
    return new Response('x', { status: step });
  };
  return { f, calls };
}

export const upd = (id, chat, text = 'متن ساختگی') => ({ update_id: id, message: { message_id: id, chat: { id: chat, type: 'private' }, from: { id: chat, first_name: 'آزمون' }, text } });

export function tgReq(body, { secret = SECRET, path = '/', query = '' } = {}) {
  const h = { 'content-type': 'application/json' };
  if (secret) h['x-telegram-bot-api-secret-token'] = secret;
  return new Request('https://relay.example.com' + path + query, { method: 'POST', headers: h, body: typeof body === 'string' ? body : JSON.stringify(body) });
}
