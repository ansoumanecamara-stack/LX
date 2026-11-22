import { ExecArgs } from "@medusajs/framework/types"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { lx } from "../lib/lx"

// Catalogue de départ des services à domicile. Idempotent : ne recrée que les services absents (par slug),
// ne modifie jamais ceux que l'admin a déjà changés.
const BASE = "Un ouvrier agréé Lx intervient chez vous, sur rendez-vous."
const SERVICES = [
  { slug: "plomberie", name: "Plomberie", group: "Maison", icon: "droplets", image_url: "/img/services/plomberie.jpg", sort: 1, price_from: 5000,
    summary: "Fuite, robinet, évier, chasse d'eau : on répare vite et proprement.", description: `${BASE} Réparation de fuites, remplacement de robinets et de siphons, débouchage, installation de chauffe-eau et de sanitaires. Le devis est donné avant le début du travail.` },
  { slug: "electricite", name: "Électricité", group: "Maison", icon: "zap", image_url: "/img/services/electricite.jpg", sort: 2, price_from: 5000,
    summary: "Prises, interrupteurs, tableau, luminaires : en toute sécurité.", description: `${BASE} Remplacement de prises et d'interrupteurs, pose de luminaires et de ventilateurs, recherche de panne, mise en sécurité du tableau électrique.` },
  { slug: "informatique", name: "Informatique et réseau", group: "Informatique", icon: "monitor", image_url: "/img/services/informatique.jpg", sort: 3, price_from: 5000,
    summary: "Ordinateur lent, panne, virus, wifi : dépannage à domicile.", description: `${BASE} Diagnostic et réparation d'ordinateurs, remplacement de pièces, installation de logiciels, sauvegarde de vos données, configuration du wifi et des imprimantes.` },
  { slug: "maconnerie-bricolage", name: "Maçonnerie et bricolage", group: "Maison", icon: "hammer", image_url: "/img/services/maconnerie.jpg", sort: 4, price_from: 5000,
    summary: "Étagères, fixations, petits travaux de maçonnerie et de finition.", description: `${BASE} Pose d'étagères, de miroirs et de meubles, perçage et fixations, rebouchage, petits travaux de maçonnerie et de carrelage.` },
  { slug: "climatisation", name: "Climatisation et froid", group: "Maison", icon: "snowflake", sort: 5, price_from: 10000,
    summary: "Installation, entretien et dépannage de climatiseurs et réfrigérateurs.", description: `${BASE} Nettoyage et recharge de climatiseurs, installation, dépannage de réfrigérateurs et de congélateurs.` },
  { slug: "peinture", name: "Peinture", group: "Maison", icon: "paintbrush", sort: 6, price_from: null,
    summary: "Murs, plafonds, portes : une peinture nette, devis gratuit.", description: `${BASE} Peinture intérieure et extérieure, préparation des murs, enduits. Le prix dépend de la surface : devis gratuit.` },
  { slug: "menuiserie", name: "Menuiserie", group: "Maison", icon: "sofa", sort: 7, price_from: null,
    summary: "Portes, placards, meubles sur mesure et réparations en bois.", description: `${BASE} Réparation de portes et de fenêtres, fabrication de placards et de meubles, pose de serrures.` },
  { slug: "serrurerie", name: "Serrurerie", group: "Maison", icon: "key", sort: 8, price_from: 5000,
    summary: "Clés perdues, serrure bloquée, changement de cylindre.", description: `${BASE} Ouverture de porte, remplacement de serrures et de cylindres, double de clés.` },
  { slug: "nettoyage", name: "Ménage et nettoyage", group: "Entretien", icon: "sparkles", sort: 9, price_from: 10000,
    summary: "Nettoyage de logement, de bureau ou après travaux.", description: `${BASE} Ménage régulier ou ponctuel, grand nettoyage, nettoyage après travaux, entretien des vitres.` },
  { slug: "demenagement", name: "Déménagement et transport", group: "Entretien", icon: "truck", sort: 10, price_from: null,
    summary: "Chargement, transport et installation de vos meubles.", description: `${BASE} Déménagement d'appartement ou de bureau, transport de meubles et d'électroménager, avec manutentionnaires.` },
  { slug: "jardinage", name: "Jardinage", group: "Entretien", icon: "sprout", sort: 11, price_from: 5000,
    summary: "Tonte, taille, plantations et entretien de jardin.", description: `${BASE} Entretien de jardin, taille de haies et d'arbustes, plantations, arrosage automatique.` },
  { slug: "tv-antenne-wifi", name: "TV, antenne et caméras", group: "Informatique", icon: "tv", sort: 12, price_from: 5000,
    summary: "Fixation de TV, antennes, décodeurs, caméras de surveillance.", description: `${BASE} Fixation murale de télévisions, installation d'antennes et de décodeurs, pose de caméras de surveillance et d'interphones.` },
]

export default async function seedServices({ container }: ExecArgs) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER), svc = lx(container)
  const have = new Set((await svc.listPrestations({}, { select: ["id", "slug"] })).map((s: any) => s.slug))
  const missing = SERVICES.filter((s) => !have.has(s.slug)).map((s) => ({ ...s, price_note: s.price_from ? "Devis confirmé avant l'intervention" : "Devis gratuit après échange" }))
  if (missing.length) await svc.createPrestations(missing as any)
  logger.info(`Services à domicile : ${missing.length} ajouté(s), ${have.size} déjà présent(s).`)
}
