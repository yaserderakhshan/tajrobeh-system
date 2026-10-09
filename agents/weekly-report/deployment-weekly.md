---
# شنبه ۹ صبح تهران (یک ساعت بعد از پایش امنیت تا نتیجه‌اش در گزارش بیاید).
name: tj-weekly-report-weekly
agent: ./agent.md
environment_id: ./environment.yaml
vault_ids: [VAULT_ID_FROM_LOCKFILE]
schedule:
  type: cron
  expression: "0 9 * * 6"
  timezone: Asia/Tehran
budget:
  type: limit
  max_list_cost: {amount: "30", currency: USD}
---

گزارش عددی هفتگی را طبق دستور کارت بساز و یک بار agent_report بفرست.
