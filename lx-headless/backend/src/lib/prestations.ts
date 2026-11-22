export const ICONS = ["wrench", "zap", "monitor", "hammer", "snowflake", "paintbrush", "key", "sparkles", "truck", "sprout", "tv", "wifi", "sofa", "droplets"]

export function cleanPrestation(b: any) {
  const o: Record<string, unknown> = {}
  const text = (k: string, max: number) => { if (b[k] !== undefined) o[k] = b[k] === null || b[k] === "" ? null : String(b[k]).trim().slice(0, max) }
  text("name", 120); text("group", 60); text("summary", 220); text("description", 2000); text("image_url", 500); text("price_note", 160); text("slug", 80)
  for (const k of ["name", "group", "summary"]) if (k in o && !o[k]) delete o[k]
  if (b.icon !== undefined) o.icon = ICONS.includes(b.icon) ? b.icon : "wrench"
  if (o.image_url && !/^(https?:\/\/|\/)/.test(String(o.image_url))) throw new Error("Adresse de l'image invalide (http, https ou /).")
  if (b.price_from !== undefined) o.price_from = b.price_from === null || b.price_from === "" ? null : Math.max(0, Math.round(Number(b.price_from) || 0))
  if (b.sort !== undefined) o.sort = Math.round(Number(b.sort) || 0)
  if (b.active !== undefined) o.active = !!b.active
  return o
}
