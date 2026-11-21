# Habitude 4 · « Où vous situez-vous ? »

Application interactive pour la partie de P7 : le public répond à 6 situations sur son téléphone,
chacun apparaît sur la matrice courage / prévenance de Covey, puis reçoit son profil et son défi.

## Les 3 pages

| Adresse | Pour qui | Rôle |
|---|---|---|
| `/` | Le public (téléphone) | Questionnaire, attente, profil personnel |
| `/screen` | Le grand écran | QR code + compteur, puis la carte de la salle |
| `/admin` | Un membre du groupe (téléphone) | Boutons du déroulé, protégés par un PIN |

## Tester tout de suite sans base (mode démo)

```bash
npm install
npm run dev
```

Ouvrez dans **le même navigateur**, dans trois onglets : `/admin` (PIN : `demo`), `/screen` et `/`.
Le mode démo garde les données dans le navigateur : il sert à répéter, pas à la vraie présentation.

## Mise en ligne (environ 15 minutes)

### 1. Supabase
1. Créez un projet sur supabase.com (offre gratuite).
2. **SQL Editor → New query** : collez `supabase/schema.sql`.
   **Changez le PIN** à la dernière ligne (`'2468'`), puis **Run**.
3. **Project Settings → API** : copiez l'**URL du projet** et la **clé anon** (ou *publishable*).

### 2. Vercel
1. Mettez ce dossier sur GitHub, puis **Vercel → Add New → Project** et importez le dépôt
   (framework détecté : Vite).
2. Dans **Environment Variables**, ajoutez :
   - `VITE_SUPABASE_URL` = l'URL du projet
   - `VITE_SUPABASE_ANON_KEY` = la clé anon
3. **Deploy**. Si vous ajoutez les variables après coup, relancez un déploiement.

Le QR code affiche automatiquement l'adresse du site. Un nom de domaine court
(par ex. `habitude4.vercel.app`, à choisir dans Settings → Domains) est plus lisible à l'écran.

## Le jour J

1. **Avant la présentation** : `/admin` → *Remettre à zéro* (efface l'affichage des répétitions).
   Ouvrez `/screen` en plein écran (F11) dans un onglet à côté de Canva.
2. **Début de la partie P7** : basculez sur l'onglet `/screen` → admin *2 · Ouvrir le questionnaire*.
3. Après ~90 s : *3 · Révéler la carte* (les points apparaissent un par un).
4. *Commenter une zone* : cliquez une zone après l'autre, puis *Vue d'ensemble*.
5. *4 · Révéler les profils* : chaque téléphone affiche le profil et le défi.
6. Retour à Canva pour la slide de conclusion.

## Répétition générale (indispensable)

- Faites le test **dans la salle**, avec 10 à 15 vrais téléphones, sur le réseau de la salle.
- *Ajouter 60 réponses fictives* permet de voir une carte pleine sans 80 personnes.
- **Plan B** si le réseau tombe : une capture de la carte prise pendant la répétition,
  et un vote à main levée.
- Vérifiez dans Supabase les limites de l'offre gratuite (connexions temps réel simultanées) :
  80 à 100 personnes doivent passer, mais testez. Si le temps réel décroche, l'application
  continue toute seule en interrogeant la base toutes les 2 à 4 secondes.

## Modifier le contenu

Tout le texte (questions, barème, citations, défis) est dans `src/content.js`.
Les logos sont dans `public/` (`logo-ensa.png`, `logo-gcdste.png`) : remplacez-les par
les fichiers d'origine en haute définition si vous les avez.

## Fonctionnement

- Chaque réponse vaut un couple (courage, prévenance) : gagnant/gagnant (3, 3), gagnant/perdant (3, 0),
  perdant/gagnant (0, 3), perdant/perdant (0, 0). On fait la moyenne des 6 réponses.
- La frontière entre les zones est à 1,5 (une moyenne de 1,5 compte comme « élevée »).
- Les réponses sont anonymes : seules les deux moyennes sont enregistrées.
- La base n'accepte de nouvelles réponses que pendant la phase « questionnaire ouvert ».
