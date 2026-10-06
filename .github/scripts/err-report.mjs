// صندوق یکتای خطا (v170.23.5): شکست یک گردش کار روی main ← اکشن درگاه بات «error_report» با منبع «CI».
// اثر انگشت = نام گردش کار › نام گام شکسته؛ هیچ متن لاگ، نام یا شماره‌ای فرستاده نمی‌شود.
// ورودی (env): RUN_ID، GITHUB_REPOSITORY، GITHUB_TOKEN، BOT_API_URL، BOT_API_KEY، WF_NAME، RUN_URL
const { RUN_ID, GITHUB_REPOSITORY: REPO, GITHUB_TOKEN: GH, BOT_API_URL: URL_, BOT_API_KEY: KEY, WF_NAME, RUN_URL } = process.env;

export async function failedSteps(runId, repo = REPO, token = GH) {
  const r = await fetch(`https://api.github.com/repos/${repo}/actions/runs/${runId}/jobs?per_page=50`, { headers: { Authorization: `Bearer ${token}`, Accept: 'application/vnd.github+json' } });
  const j = await r.json();
  const out = [];
  for (const job of j.jobs || []) {
    if (job.conclusion !== 'failure') continue;
    const st = (job.steps || []).filter((s) => s.conclusion === 'failure').map((s) => s.name);
    out.push(st.length ? st.map((s) => `${job.name} › ${s}`) : [job.name]);
  }
  return out.flat();
}
export function reportBody(wf, step, key) {
  return { api: 1, key, action: 'error_report', src: 'CI', where: `${wf} › ${step}`.replace(/\d+/g, '#').slice(0, 120), msg: 'workflow failed' };
}

if (process.argv[1] && process.argv[1].endsWith('err-report.mjs')) {
  if (!URL_ || !KEY) { console.log('درگاه بات تنظیم نشده؛ گزارش فقط در همین لاگ'); process.exit(0); }
  const steps = RUN_ID ? await failedSteps(RUN_ID).catch(() => []) : [];
  for (const s of (steps.length ? steps : ['نامعلوم']).slice(0, 3)) {
    try {
      const res = await fetch(URL_, { method: 'POST', headers: { 'Content-Type': 'text/plain' }, redirect: 'follow', body: JSON.stringify(reportBody(WF_NAME || '?', s, KEY)) });
      const j = JSON.parse(await res.text());
      console.log(j.ok ? `صندوق خطا: ${j.data && j.data.id} · ${WF_NAME} › ${s}` : `::warning::صندوق خطا نپذیرفت: ${j.error}`);
    } catch (e) { console.log(`::warning::صندوق خطا نرسید: ${e}`); }
  }
  if (RUN_URL) console.log(RUN_URL);
}
