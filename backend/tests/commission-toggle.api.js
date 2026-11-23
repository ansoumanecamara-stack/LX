const B = (process.env.LX_API || 'http://localhost:9000'); let fails = 0; const ok = (c, m) => { console.log((c ? 'OK  ' : 'FAIL') + ' ' + m); if (!c) fails++ }
;(async () => {
  const pk = Object.values(await (await fetch(B + '/lx-config')).json()).find((v) => String(v).startsWith('pk_'))
  const j = async (p, o = {}) => { const r = await fetch(B + p, { ...o, headers: { 'content-type': 'application/json', 'x-publishable-api-key': pk, ...(o.headers || {}) } }); return { s: r.status, b: await r.json().catch(() => ({})) } }
  const AT = { authorization: 'Bearer ' + (await j('/auth/user/emailpass', { method: 'POST', body: JSON.stringify({ email: 'admin@lx.sn', password: 'ChangeMe!2026' }) })).b.token }
  const VT = { authorization: 'Bearer ' + (await j('/auth/shop/emailpass', { method: 'POST', body: JSON.stringify({ email: 'boutique@lx.sn', password: 'ChangeMe!2026' }) })).b.token }
  const A = (p, body) => j(p, { method: body ? 'POST' : 'GET', headers: AT, body: body ? JSON.stringify(body) : undefined })
  const V = (p, body) => j(p, { method: body ? 'POST' : 'GET', headers: VT, body: body ? JSON.stringify(body) : undefined })
  const posCom = async () => (await V('/vendor/balance')).b.balance.pos_commission
  const name = 'Toggle ' + Date.now(); await V('/vendor/products', { name, price: 10000, cost_price: 6000, stock: 20 })
  const it = (await V('/vendor/pos')).b.items.find((i) => i.title === name)
  const sell = (q) => V('/vendor/pos/sales', { items: [{ product_id: it.id, quantity: q }], payment_method: 'cash', amount_received: 100000 })
  let r = await A('/admin/lx/commission', { enabled: true, apply_pos: true, default_percent: 10, per_shop: {} }); ok(r.b.config.enabled && r.b.config.apply_pos, 'commission activée, caisse incluse (10 %)')
  const c0 = await posCom(); r = await sell(2); ok(r.s === 201 && r.b.sale.commission === 2000, 'vente caisse 20 000 → commission 2 000'); const sale1 = r.b.sale
  ok((await posCom()) - c0 === 2000, 'la commission caisse apparaît dans le solde boutique')
  r = await A('/admin/lx/commission', { enabled: false, apply_pos: true, default_percent: 10, per_shop: {} }); ok(r.b.config.enabled === false, 'commission désactivée')
  r = await sell(1); ok(r.s === 201 && r.b.sale.commission === 0, 'désactivée : aucune commission sur la nouvelle vente')
  ok((await posCom()) - c0 === 2000, 'désactivée : l\'historique reste inchangé')
  r = await A('/admin/lx/commission', { enabled: true, apply_pos: false, default_percent: 10, per_shop: {} })
  r = await sell(1); ok(r.s === 201 && r.b.sale.commission === 0, 'option caisse désactivée : pas de commission caisse')
  r = await A('/admin/lx/commission', { enabled: true, apply_pos: true, default_percent: 10, per_shop: {} })
  r = await V('/vendor/pos/sales/' + sale1.id, {}); ok(r.s === 200, 'vente annulée')
  ok((await posCom()) === c0, 'vente annulée : sa commission disparaît du solde')
  const l = (await A('/admin/lx/payouts')).b; ok(l.balances.every((b) => typeof b.pos_commission === 'number'), 'admin : commission caisse dans les soldes')
  console.log(fails ? `\n${fails} ÉCHEC(S)` : '\nTOUT OK'); process.exit(fails ? 1 : 0)
})().catch((e) => { console.error(e); process.exit(1) })
