// Tests de bout en bout de l'API (serveur démarré, base de démo remplie).
//   LX_API=http://localhost:9000 npm run test:api
// Le test des paiements a besoin que le serveur ait été lancé avec :
//   LX_WAVE_API_KEY=testkey LX_WAVE_API_BASE=http://localhost:9911 LX_WAVE_WEBHOOK_SECRET=whsec LX_WAVE_SIGNING_SECRET=signsecret LX_STOREFRONT_URL=http://localhost:3000
// et que `node tests/fake-wave.js` tourne (faux serveur Wave, port 9911).
const { spawnSync } = require("node:child_process")
let bad = 0
for (const f of ["services", "paiements", "commission"]) {
  console.log(`\n=== ${f} ===`)
  const r = spawnSync("node", [`${__dirname}/${f}.api.js`], { stdio: "inherit" })
  if (r.status) bad++
}
console.log(bad ? `\n${bad} suite(s) en échec` : "\nToutes les suites passent")
process.exit(bad ? 1 : 0)
