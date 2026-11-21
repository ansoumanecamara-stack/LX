// Mémorise dans la base que les données initiales ont été installées, pour ne pas les rejouer à chaque démarrage
// (important sur Render gratuit : le service se réveille après chaque mise en veille).
// Usage : node boot-state.js check <clé>  (code 0 si déjà fait)  |  node boot-state.js mark <clé>
const { Client } = require("pg")
const [, , action, key] = process.argv
;(async () => {
  const c = new Client({ connectionString: process.env.DATABASE_URL, ssl: process.env.DATABASE_SSL === "true" ? { rejectUnauthorized: false } : false })
  await c.connect()
  await c.query("CREATE TABLE IF NOT EXISTS lx_boot (k text PRIMARY KEY, at timestamptz DEFAULT now())")
  if (action === "mark") { await c.query("INSERT INTO lx_boot (k) VALUES ($1) ON CONFLICT DO NOTHING", [key]); await c.end(); return }
  const r = await c.query("SELECT 1 FROM lx_boot WHERE k = $1", [key]); await c.end(); process.exit(r.rowCount ? 0 : 1)
})().catch((e) => { console.error("[lx] boot-state :", e.message); process.exit(2) })
