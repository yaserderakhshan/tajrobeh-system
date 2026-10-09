---
# شنبه ۸ صبح تهران. vault_ids را بعد از apply گاوصندوق از claude-lock.json جایگزین کن (agents/README.md).
name: tj-security-watch-weekly
agent: ./agent.md
environment_id: ./environment.yaml
vault_ids: [VAULT_ID_FROM_LOCKFILE]
schedule:
  type: cron
  expression: "0 8 * * 6"
  timezone: Asia/Tehran
budget:
  type: limit
  max_list_cost: {amount: "50", currency: USD}
---

پایش هفتگی امنیت و زیرساخت را طبق دستور کارت اجرا کن و در پایان یک بار agent_report بفرست.
