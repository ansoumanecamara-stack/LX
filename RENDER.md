# Déployer Lx sur Render

Render déploie depuis un dépôt Git. Deux fichiers à la racine décrivent tout (base PostgreSQL, API avec administration `lxsn-api`, vitrine `lxsn-boutique`) :

| Fichier | Usage |
|---|---|
| `render.yaml` | **100 % gratuit**, pour essayer ou faire une démonstration (utilisé par défaut par Blueprint) |
| `render.payant.yaml` | Mise en ligne réelle : plans payants, disque pour les photos, sauvegardes. Pour l'utiliser, renommez-le en `render.yaml` |

### Version gratuite : ce qu'il faut savoir
- Les deux services se mettent en **veille après 15 minutes sans visite**. Le premier visiteur attend 1 à 3 minutes, le temps de réveiller la vitrine puis l'API.
- Les **photos de produits et visuels publicitaires envoyés disparaissent à chaque déploiement ou réveil** (pas de disque). Utile pour tester, pas pour vendre.
- La **base gratuite expire après 30 jours** (14 jours de grâce avant suppression des données).
- 750 heures gratuites par mois pour l'ensemble de l'espace de travail : n'ajoutez pas de service qui « ping » le site en continu, vous épuiseriez les heures et tout serait suspendu jusqu'au mois suivant.
- 512 Mo de mémoire pour l'API : c'est juste pour Medusa. Si les logs montrent « Out of memory », passez à `render.payant.yaml`.

## 1. Mettre le projet dans un dépôt Git
À la racine du dossier :
```bash
git init && git add . && git commit -m "Lx"
git branch -M main
git remote add origin https://github.com/VOTRE-COMPTE/lx.git
git push -u origin main
```
Le dépôt doit contenir `backend/`, `storefront/` et `render.yaml` à sa racine. Le fichier `.env` n'est jamais envoyé (exclu par `.gitignore`). Un dépôt privé fonctionne.

## 2. Créer les services
1. Sur render.com : **New +** puis **Blueprint**, connectez GitHub et choisissez le dépôt.
2. Render lit `render.yaml` et affiche 3 ressources : `lxsn-db`, `lxsn-api`, `lxsn-boutique`.
3. Il vous demande une seule valeur : **`ADMIN_PASSWORD`**, le mot de passe de l'administrateur (choisissez-en un fort).
4. Cliquez sur **Apply**. Le premier déploiement dure 10 à 15 minutes (construction, migrations, données de démonstration).

## 3. Vérifier les adresses
Dans le tableau de bord, lisez l'adresse de `lxsn-api` et celle de `lxsn-boutique`. Le fichier suppose `https://lxsn-api.onrender.com` et `https://lxsn-boutique.onrender.com`. Si Render a ajouté un suffixe (nom déjà pris), corrigez :
- `lxsn-api` > **Environment** > **`LX_STOREFRONT_URL`** = adresse réelle de la vitrine (liens WhatsApp) ;
- `lxsn-boutique` > **Environment** > **`MEDUSA_INTERNAL_URL`** (version gratuite) = adresse réelle de l'API ;
puis **Manual Deploy** sur chaque service modifié.

## 4. Adresses
| Quoi | Adresse |
|---|---|
| Vitrine | adresse de `lxsn-boutique` (le tout premier chargement peut prendre quelques minutes) |
| Administration (menu Lx et Publicités) | adresse de `lxsn-api` + `/app` : `admin@lx.sn` et votre `ADMIN_PASSWORD` |
| Espace boutique | vitrine + `/vendor` : `boutique@lx.sn` / `ChangeMe!2026` (compte de démonstration, à changer) |

## 5. Réglages à faire ensuite
- **Numéro WhatsApp, frais de livraison** : `lxsn-api` > Environment (`LX_WA_NUMBER`, `LX_DELIVERY_FEE`, et `LX_WA_TOKEN` / `LX_WA_PHONE_ID` pour l'envoi automatique via WhatsApp Business). Téléphone et e-mail affichés sur le site : variables `NEXT_PUBLIC_LX_PHONE` et `NEXT_PUBLIC_LX_EMAIL` de `lxsn-boutique`.
- **Nom de domaine** : dans chaque service, **Settings** > **Custom Domains**. Si vous changez l'adresse de la vitrine, mettez à jour `LX_STOREFRONT_URL` et redéployez le backend. Si vous changez celle du backend, redéployez les deux.
- **Compte boutique de démonstration** : changez son mot de passe ou supprimez-le depuis l'administration.

## Coûts et plans (version payante)
`render.payant.yaml` choisit des plans adaptés à une vraie mise en ligne. Les tarifs se consultent sur render.com/pricing.
- **Base `0.1c-256mb`** : payante, avec sauvegardes.
- **`lxsn-api` `1c-2g`** : Medusa a besoin d'environ 1 Go de mémoire. Un disque persistant (5 Go) conserve les photos et les visuels publicitaires ; il impose un plan payant.
- **`lxsn-boutique` `0.5c-512mb`** : toujours en ligne, sans veille.

Passer du gratuit au payant : renommez `render.payant.yaml` en `render.yaml` (supprimez l'ancien), poussez sur Git, et recréez le Blueprint. Pour ne pas perdre les données, passez plutôt la base en payant dans le tableau de bord avant l'expiration des 30 jours.

## Mises à jour
Chaque `git push` sur `main` redéploie automatiquement. Les migrations de base de données s'exécutent au démarrage du backend.

## Dépannage
- **Vitrine : « Backend Lx indisponible »** : l'API démarre encore (premier déploiement ou réveil après veille, 1 à 2 minutes). Regardez les **Logs** de `lxsn-api`.
- **Administration : connexion impossible** : ouvrez bien l'adresse de `lxsn-api` (https) + `/app`.
- **Images cassées après un changement d'adresse** : `BACKEND_PUBLIC_URL` suit l'adresse du backend ; redéployez le backend. Les photos de démonstration enregistrées avec une ancienne adresse sont à renvoyer.
- **Le déploiement du backend échoue sur la base** : vérifiez que `lxsn-db` et les deux services sont dans la même région (Francfort par défaut).
- **Données de démonstration** : elles ne sont installées qu'une fois par version (marqueur `lx_boot` dans la base), pour que chaque réveil soit rapide. Pour les réinstaller, ajoutez la variable `LX_FORCE_SEED=1` à `lxsn-api`, déployez, puis supprimez-la.
