const crypto = require('crypto'), B = (process.env.LX_API || 'http://localhost:9000')
const REFX = 'MP' + Date.now() + '.A1'
let fails = 0; const ok = (c, m) => { console.log((c ? 'OK  ' : 'FAIL') + ' ' + m); if (!c) fails++ }
;(async () => {
  const pk = Object.values(await (await fetch(B + '/lx-config')).json()).find((v) => String(v).startsWith('pk_'))
  const j = async (p, o = {}) => { const r = await fetch(B + p, { ...o, headers: { 'content-type': 'application/json', 'x-publishable-api-key': pk, ...(o.headers || {}) } }); return { s: r.status, b: await r.json().catch(() => ({})) } }
  const AT = { authorization: 'Bearer ' + (await j('/auth/user/emailpass', { method: 'POST', body: JSON.stringify({ email: 'admin@lx.sn', password: 'ChangeMe!2026' }) })).b.token }
  const A = (p, body, m) => j(p, { method: m || (body ? 'POST' : 'GET'), headers: AT, body: body ? JSON.stringify(body) : undefined })
  const cfg0 = (await A('/admin/lx/payment-settings')).b
  ok(cfg0.env.api_key && cfg0.env.webhook_secret, 'env Wave détectée (clé + secret)')
  // validation
  let r = await A('/admin/lx/payment-settings', { methods: { orange_money: { enabled: true, mode: 'manual', merchant_number: '' } } }); ok(r.s === 400, 'OM manuel sans numéro refusé')
  r = await A('/admin/lx/payment-settings', { methods: { wave: { enabled: true, mode: 'api', label: 'Wave', apply_products: true, apply_services: true, min_amount: 1000, fee_percent: 0 }, orange_money: { enabled: true, mode: 'manual', label: 'Orange Money', merchant_number: '77 000 00 01', merchant_name: 'Lx', fee_percent: 1, fee_fixed: 0, fee_payer: 'customer', apply_products: true, apply_services: true, require_reference: true, expire_hours: 24, instructions: 'Envoyez au numéro marchand.' } }, products: { online_mode: 'lx' }, services: { timing: 'deposit', deposit_percent: 30, block_start_until_paid: true } })
  ok(r.s === 200 && r.b.config.methods.orange_money.merchant_number === '770000001', 'réglages enregistrés (numéro normalisé)')
  const pub = await j('/store/lx/payments/config'); ok(pub.s === 200 && !JSON.stringify(pub.b).includes('770000001'), 'config publique sans numéro marchand')
  ok(pub.b.service_methods.length === 2 && pub.b.services.timing === 'deposit', 'config publique : 2 moyens, acompte')
  // parcours service
  const phone = '78' + String(Math.floor(1e6 + Math.random() * 8e6)).padStart(7, '0')
  const bk = (await j('/store/lx/service-bookings', { method: 'POST', body: JSON.stringify({ service_slug: 'plomberie', name: 'Test Pay', phone, address: 'Rue 1', date: new Date(Date.now() + 864e5).toISOString().slice(0, 10), slot: 'any', details: 'fuite' }) })).b.booking; const ref = bk.ref
  const id = (await A('/admin/lx/service-bookings')).b.bookings.find((b) => b.ref === ref).id
  const w = (await A('/admin/lx/workers')).b.workers.find((x) => x.active) || (await A('/admin/lx/workers', { name: 'Ouv Test', phone: '770009999', trades: ['plomberie'] })).b.worker
  await A('/admin/lx/service-bookings/' + id, { quote_amount: 20000, worker_id: w.id })
  r = await j(`/store/lx/service-bookings/${ref}/action`, { method: 'POST', body: JSON.stringify({ phone, action: 'accept' }) })
  const pay = r.b.booking.payment; ok(pay.due === 6000 && pay.total === 20000, 'acompte 30 % = 6 000 FCFA')
  ok(pay.methods.map((m) => m.id).sort().join() === 'orange_money,wave', 'moyens proposés : Wave + OM')
  ok(pay.methods.find((m) => m.id === 'orange_money').charged === 6060, 'frais OM 1 % à la charge du client (6 060)')
  r = await A('/admin/lx/service-bookings/' + id, { status: 'in_progress' }); ok(r.s === 409 && /Acompte/.test(r.b.message), 'démarrage bloqué sans acompte')
  r = await j('/store/lx/payments', { method: 'POST', body: JSON.stringify({ type: 'service', ref, phone: '000000000', method: 'wave' }) }); ok(r.s === 404, 'mauvais téléphone refusé')
  r = await j('/store/lx/payments', { method: 'POST', body: JSON.stringify({ type: 'service', ref, phone, method: 'wave' }) }); const p1 = r.b.payment
  ok(r.s === 201 && /^PAY-/.test(p1.ref) && p1.checkout_url.includes('cos-') && p1.charged === 6000, 'paiement Wave API créé (lien Wave)')
  r = await j('/store/lx/payments', { method: 'POST', body: JSON.stringify({ type: 'service', ref, phone, method: 'wave' }) }); ok(r.b.payment.ref === p1.ref, 'même paiement repris (pas de doublon)')
  // webhooks
  const ev = (amount, extra = {}) => JSON.stringify({ id: 'evt1', type: 'checkout.session.completed', data: { id: 'cos-1', amount: String(amount), currency: 'XOF', client_reference: p1.ref, payment_status: 'succeeded', checkout_status: 'complete', transaction_id: 'TX123456', ...extra } })
  r = await fetch(B + '/hooks/lx/wave', { method: 'POST', headers: { 'content-type': 'application/json' }, body: ev(6000) }); ok(r.status === 401, 'webhook sans authentification refusé')
  r = await fetch(B + '/hooks/lx/wave', { method: 'POST', headers: { 'content-type': 'application/json', authorization: 'Bearer faux' }, body: ev(6000) }); ok(r.status === 401, 'webhook avec mauvais secret refusé')
  r = await fetch(B + '/hooks/lx/wave', { method: 'POST', headers: { 'content-type': 'application/json', authorization: 'Bearer whsec' }, body: ev(100) }); ok(r.status === 422, 'webhook avec montant inattendu refusé')
  let t = (await j(`/store/lx/service-bookings/track?ref=${ref}&phone=${phone}`)).b.booking; ok(t.payment.paid === 0, 'toujours impayé après webhook suspect')
  const body = ev(6000), ts = Math.floor(Date.now() / 1000), sig = `t=${ts},v1=` + crypto.createHmac('sha256', 'signsecret').update(ts + body).digest('hex')
  r = await fetch(B + '/hooks/lx/wave', { method: 'POST', headers: { 'content-type': 'application/json', 'wave-signature': sig }, body }); ok(r.status === 200, 'webhook signé HMAC accepté')
  r = await fetch(B + '/hooks/lx/wave', { method: 'POST', headers: { 'content-type': 'application/json', 'wave-signature': `t=${ts - 4000},v1=` + crypto.createHmac('sha256', 'signsecret').update((ts - 4000) + body).digest('hex') }, body }); ok(r.status === 401, 'signature trop ancienne (rejeu) refusée')
  r = await fetch(B + '/hooks/lx/wave', { method: 'POST', headers: { 'content-type': 'application/json', authorization: 'Bearer whsec' }, body }); ok(r.status === 200, 'webhook rejoué : sans effet double')
  t = (await j(`/store/lx/service-bookings/track?ref=${ref}&phone=${phone}`)).b.booking; ok(t.payment.paid === 6000 && t.payment.due === 0, 'acompte enregistré, rien à payer')
  r = await A('/admin/lx/service-bookings/' + id, { status: 'in_progress' }); ok(r.s === 200, 'démarrage autorisé après acompte')
  await A('/admin/lx/service-bookings/' + id, { status: 'done' })
  t = (await j(`/store/lx/service-bookings/track?ref=${ref}&phone=${phone}`)).b.booking; ok(t.payment.due === 14000 && t.payment.kind === 'balance', 'solde 14 000 FCFA après intervention')
  // OM manuel
  r = await j('/store/lx/payments', { method: 'POST', body: JSON.stringify({ type: 'service', ref, phone, method: 'orange_money' }) }); const p2 = r.b.payment
  ok(p2.merchant_number === '770000001' && p2.charged === 14140 && p2.checkout_url === null, 'OM manuel : numéro marchand + frais 1 % (14 140)')
  r = await j(`/store/lx/payments/${p2.ref}/reference`, { method: 'POST', body: JSON.stringify({ phone, reference: 'ab' }) }); ok(r.s === 400, 'référence trop courte refusée')
  r = await j(`/store/lx/payments/${p2.ref}/reference`, { method: 'POST', body: JSON.stringify({ phone, reference: 'TX123456' }) }); ok(r.s === 409, 'référence déjà utilisée refusée')
  r = await j(`/store/lx/payments/${p2.ref}/reference`, { method: 'POST', body: JSON.stringify({ phone, reference: REFX }) }); ok(r.s === 200 && r.b.payment.reference === REFX, 'référence enregistrée')
  let ls = (await A('/admin/lx/payments')).b; ok(ls.summary.to_verify >= 1, 'admin : paiement « à vérifier »')
  const row = ls.payments.find((x) => x.ref === p2.ref); r = await A('/admin/lx/payments/' + row.id, { action: 'confirm' }); ok(r.s === 200 && r.b.payment.status === 'paid', 'admin confirme le paiement manuel')
  t = (await j(`/store/lx/service-bookings/track?ref=${ref}&phone=${phone}`)).b.booking; ok(t.payment.paid === 20000 && t.payment.due === 0 && t.payment.history.length === 2, 'prestation entièrement payée (20 000)')
  r = await A('/admin/lx/payments/' + row.id, { action: 'refund' }); ok(r.b.payment.status === 'refunded', 'remboursement enregistré')
  r = await A('/admin/lx/payments', { type: 'service', ref, amount: 14000, method: 'cash' }); ok(r.s === 201 && r.b.payment.status === 'paid', 'encaissement espèces saisi par l\'équipe')
  // bornes : montant sous le minimum Wave (1000)
  // commandes
  const so = (await A('/admin/lx/shop-orders')).b; const list = so.shop_orders || so.orders || []
  const one = list.find((x) => !['cancelled', 'rejected'].includes(x.status) && x.payment_status === 'unpaid' && x.customer_phone)
  if (one) {
    const op = await j(`/store/lx/payments/options?type=order&ref=${one.order_display_id}&phone=${one.customer_phone}`)
    ok(op.s === 200 && op.b.due > 0 && op.b.methods.length === 2, `commande #${one.order_display_id} : montant à payer ${op.b.due}`)
    r = await j('/store/lx/payments', { method: 'POST', body: JSON.stringify({ type: 'order', ref: String(one.order_display_id), phone: one.customer_phone, method: 'orange_money' }) }); const po = r.b.payment
    await j(`/store/lx/payments/${po.ref}/reference`, { method: 'POST', body: JSON.stringify({ phone: one.customer_phone, reference: 'ORD' + Date.now() }) })
    const rowo = (await A('/admin/lx/payments')).b.payments.find((x) => x.ref === po.ref); await A('/admin/lx/payments/' + rowo.id, { action: 'confirm' })
    const tr = (await j(`/store/lx/track?ref=${one.order_display_id}&phone=${one.customer_phone}`)).b
    ok(tr.shop_orders.every((x) => x.payment_status === 'paid' || ['cancelled', 'rejected'].includes(x.status)), 'commande marquée payée dans le suivi')
  } else console.log('SKIP commande : aucune commande impayée')
  // mode direct : plus de moyen en ligne pour les commandes
  await A('/admin/lx/payment-settings', { products: { online_mode: 'direct' } })
  if (one) { const op = await j(`/store/lx/payments/options?type=order&ref=${one.order_display_id}&phone=${one.customer_phone}`); ok(op.b.methods.length === 0, 'mode « boutique directe » : aucun moyen en ligne Lx') }
  console.log(fails ? `\n${fails} ÉCHEC(S)` : '\nTOUT OK'); process.exit(fails ? 1 : 0)
})().catch((e) => { console.error(e); process.exit(1) })
