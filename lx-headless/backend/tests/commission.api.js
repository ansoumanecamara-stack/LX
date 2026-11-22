const B = (process.env.LX_API || 'http://localhost:9000'); let fails = 0; const ok = (c, m) => { console.log((c ? 'OK  ' : 'FAIL') + ' ' + m); if (!c) fails++ }
;(async () => {
  const pk = Object.values(await (await fetch(B + '/lx-config')).json()).find((v) => String(v).startsWith('pk_'))
  const j = async (p, o = {}) => { const r = await fetch(B + p, { ...o, headers: { 'content-type': 'application/json', 'x-publishable-api-key': pk, ...(o.headers || {}) } }); return { s: r.status, b: await r.json().catch(() => ({})) } }
  const AT = { authorization: 'Bearer ' + (await j('/auth/user/emailpass', { method: 'POST', body: JSON.stringify({ email: 'admin@lx.sn', password: 'ChangeMe!2026' }) })).b.token }
  const A = (p, body, m) => j(p, { method: m || (body ? 'POST' : 'GET'), headers: AT, body: body ? JSON.stringify(body) : undefined })
  const VT = { authorization: 'Bearer ' + (await j('/auth/shop/emailpass', { method: 'POST', body: JSON.stringify({ email: 'boutique@lx.sn', password: 'ChangeMe!2026' }) })).b.token }
  // une commande en attente
  const so = (await A('/admin/lx/shop-orders')).b; const list = so.shop_orders || so.orders || []
  const one = list.find((x) => x.status === 'pending' && x.payment_status === 'unpaid' && x.customer_phone)
  if (!one) { console.log('SKIP : aucune commande en attente'); return }
  const shops = (await A('/admin/lx/commission')).b.shops; const sid = one.shop_id || one.shop?.id
  let r = await A('/admin/lx/commission', { default_percent: 10, per_shop: { [sid]: 8 } }); ok(r.b.config.default_percent === 10 && r.b.config.per_shop[sid] === 8, 'commission : 10 % par défaut, 8 % pour la boutique')
  r = await A('/admin/lx/commission', { default_percent: 999, per_shop: { faux: 5 } }); ok(r.b.config.default_percent === 50 && !r.b.config.per_shop.faux, 'taux plafonné à 50 %, boutique inconnue ignorée')
  await A('/admin/lx/commission', { default_percent: 10, per_shop: { [sid]: 8 } })
  const before = (await A('/admin/lx/payouts')).b.balances.find((b) => b.shop_id === sid)
  // paiement Lx de la commande (mode Lx encaisse)
  await A('/admin/lx/payment-settings', { products: { online_mode: 'lx' } })
  const pay = await A('/admin/lx/payments', { type: 'order', ref: String(one.order_display_id), amount: one.subtotal, method: 'wave' }); ok(pay.s === 201, 'paiement Lx enregistré pour la commande')
  for (const st of ['confirmed', 'picked_up']) await A('/admin/lx/shop-orders/' + one.id, { status: st })
  r = await A('/admin/lx/shop-orders/' + one.id, { status: 'delivered', code: one.delivery_code }); ok(r.s === 200, 'commande livrée')
  const after = (await A('/admin/lx/payouts')).b.balances.find((b) => b.shop_id === sid), com = Math.round(one.subtotal * 0.08)
  ok(after.commission - before.commission === com, `commission figée à 8 % : ${com} FCFA`)
  ok(after.lx_collected - before.lx_collected === one.subtotal, 'encaissé par Lx : +' + one.subtotal)
  ok(after.balance - before.balance === one.subtotal - com, `solde : +${one.subtotal - com} dû à la boutique`)
  await A('/admin/lx/commission', { default_percent: 30, per_shop: { [sid]: 30 } })
  const later = (await A('/admin/lx/payouts')).b.balances.find((b) => b.shop_id === sid); ok(later.commission === after.commission, 'changer le taux ne modifie pas les commandes déjà livrées')
  await A('/admin/lx/commission', { default_percent: 10, per_shop: { [sid]: 8 } })
  // reversement
  const bal = (await A('/admin/lx/payouts')).b.balances.find((b) => b.shop_id === sid).balance
  r = await A('/admin/lx/payouts', { shop_id: sid, direction: bal >= 0 ? 'to_shop' : 'from_shop', amount: Math.abs(bal), method: 'wave', reference: 'T1' }); ok(r.s === 201 && /^REV-/.test(r.b.payout.ref), 'reversement enregistré ' + r.b.payout?.ref)
  const z = (await A('/admin/lx/payouts')).b.balances.find((b) => b.shop_id === sid).balance; ok(z === 0, 'solde remis à zéro')
  r = await A('/admin/lx/payouts', { shop_id: sid, amount: -5 }); ok(r.s === 400, 'montant négatif refusé')
  const vb = (await j('/vendor/balance', { headers: VT })); ok(vb.s === 200 || vb.s === 404, 'route boutique /vendor/balance répond (' + vb.s + ')')
  if (vb.s === 200 && vb.b.balance.shop_id === sid) ok(vb.b.balance.balance === 0 && vb.b.payouts.length >= 1, 'la boutique voit son solde et ses reversements')
  const d = (await A('/admin/lx/dashboard?days=30')).b; ok(typeof d.commission === 'number' && d.commission >= com, 'tableau de bord : commissions ' + d.commission)
  await A('/admin/lx/payment-settings', { products: { online_mode: 'direct' } })
  console.log(fails ? `\n${fails} ÉCHEC(S)` : '\nTOUT OK'); process.exit(fails ? 1 : 0)
})().catch((e) => { console.error(e); process.exit(1) })
