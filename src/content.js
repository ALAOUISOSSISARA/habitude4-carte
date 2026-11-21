// Contenu : les 6 situations, le barème et les textes des 4 zones.
// Chaque réponse a un type de zone : gg, gp, pg, pp.
// Barème : courage (C) et prévenance (P), 0 = faible, 3 = élevé.

export const SCORES = {
  gg: { c: 3, p: 3 },
  gp: { c: 3, p: 0 },
  pg: { c: 0, p: 3 },
  pp: { c: 0, p: 0 },
};

export const QUESTIONS = [
  {
    q: "Ton binôme veut rendre un rapport que tu trouves faible, la veille de la date limite.",
    a: [
      { z: "gg", t: "Tu lui dis franchement ce qui ne va pas et tu lui demandes son avis pour corriger ensemble." },
      { z: "gp", t: "Tu le refais toi-même à ta manière." },
      { z: "pg", t: "Tu ne dis rien, il a l'air épuisé." },
      { z: "pp", t: "Tu le laisses rendre et tu en parles aux autres après." },
    ],
  },
  {
    q: "Ta coloc invite des amis tard tous les soirs, en pleine semaine d'examens.",
    a: [
      { z: "gg", t: "Tu lui expliques que tu as besoin de calme cette semaine et tu lui demandes ce qui lui irait." },
      { z: "gp", t: "Tu poses une règle : plus personne après 22 h." },
      { z: "pg", t: "Tu mets des bouchons d'oreilles, c'est aussi chez elle." },
      { z: "pp", t: "Tu ne dis rien, mais tu deviens froide avec elle." },
    ],
  },
  {
    q: "En projet de groupe, ton idée de sujet s'oppose à celle d'un autre membre.",
    a: [
      { z: "gg", t: "Tu défends ton idée et tu poses des questions sur la sienne pour construire un sujet qui combine les deux." },
      { z: "gp", t: "Tu argumentes jusqu'à ce que ton idée l'emporte." },
      { z: "pg", t: "Tu te ranges à son idée pour ne pas bloquer le groupe." },
      { z: "pp", t: "Tu laisses les autres trancher, tu feras ta partie." },
    ],
  },
  {
    q: "Un camarade qui n'est jamais venu en cours te demande tes notes la veille de l'examen.",
    a: [
      { z: "gg", t: "Tu les lui donnes, en lui disant franchement que ça t'agace." },
      { z: "gp", t: "Tu refuses : il n'avait qu'à venir." },
      { z: "pg", t: "Tu les lui donnes sans rien dire." },
      { z: "pp", t: "Tu dis que tu ne les as pas." },
    ],
  },
  {
    q: "Ton encadrant de stage te confie une tâche hors de ton sujet qui te prend tout ton temps.",
    a: [
      { z: "gg", t: "Tu lui expliques l'impact sur ton rapport et tu proposes un arrangement." },
      { z: "gp", t: "Tu refuses, ce n'est pas ton rôle." },
      { z: "pg", t: "Tu acceptes, il sait ce qui est utile pour l'équipe." },
      { z: "pp", t: "Tu acceptes, mais tu la fais au minimum." },
    ],
  },
  {
    q: "Pour un voyage entre amis, le groupe choisit un hôtel au-dessus de ton budget.",
    a: [
      { z: "gg", t: "Tu dis que c'est trop cher pour toi et tu proposes de chercher ensemble une option qui convienne à tous." },
      { z: "gp", t: "Tu imposes une option moins chère." },
      { z: "pg", t: "Tu acceptes et tu te débrouilleras." },
      { z: "pp", t: "Tu acceptes, puis tu te plains aux autres." },
    ],
  },
];

export const ZONES = {
  gg: {
    label: "Gagnant / gagnant",
    desc: "Dans ces situations, tu combines franchise et écoute.",
    conseil: "Garde ce réflexe : écouter avant de proposer.",
  },
  gp: {
    label: "Gagnant / perdant",
    desc: "Tu sais défendre ce que tu veux, parfois au détriment de l'écoute.",
    conseil: "Avant de défendre ta position, demande à l'autre ce qui serait une réussite pour lui.",
  },
  pg: {
    label: "Perdant / gagnant",
    desc: "Tu fais attention aux autres, parfois au détriment de ce que tu veux.",
    conseil: "Ose dire ce que tu veux, calmement : l'autre ne peut pas le deviner.",
  },
  pp: {
    label: "Perdant / perdant",
    desc: "Dans ces situations, tu as tendance à éviter à la fois le conflit et l'échange.",
    conseil: "Choisis une petite situation cette semaine et dis simplement ce que tu penses.",
  },
};

export const ZONE_ORDER = ["gg", "gp", "pg", "pp"];

// Frontière à 1,5 : une moyenne égale à 1,5 compte comme « élevée ».
export function zoneOf(c, p) {
  const hc = c >= 1.5;
  const hp = p >= 1.5;
  if (hc && hp) return "gg";
  if (hc) return "gp";
  if (hp) return "pg";
  return "pp";
}

// Durée du questionnaire (secondes) et temps ajouté par « + 1 min ».
export const DEFAULT_DURATION_S = 180;
export const EXTRA_TIME_S = 60;

// Les 5 étapes du récapitulatif, affichées après la révélation.
// focus : zones mises en avant sur la carte ; conclusion : flèches vers gagnant/gagnant.
export const RECAP = [
  {
    kicker: "LES SIX PARADIGMES",
    title: ["LA CARTE", "DE LA SALLE"],
    text: "Six façons d'interagir avec les autres, une question : qui gagnera le voyage aux Seychelles ? Voici où vous en êtes.",
    focus: null,
  },
  {
    kicker: "DES SCÉNARIOS APPRIS",
    title: ["CÉDER", "OU IMPOSER"],
    text: "Deux réflexes appris à la maison, à l'école, avec les notes qu'on compare. Ce qui s'apprend peut se désapprendre.",
    focus: ["pg", "gp"],
  },
  {
    kicker: "GAGNANT / GAGNANT OU RIEN",
    title: ["PERDRE", "ENSEMBLE ?"],
    text: "Quand aucun accord gagnant n'est possible, mieux vaut ne pas conclure que conclure en perdant tous les deux.",
    focus: ["pp"],
  },
  {
    kicker: "LE CARACTÈRE",
    title: ["LA", "MATURITÉ"],
    text: "Intégrité, maturité, mentalité d'abondance. Pas un juste milieu : beaucoup de courage et beaucoup de prévenance.",
    focus: ["gg"],
  },
  {
    kicker: "CONCLUSION",
    title: ["GAGNER", "ENSEMBLE"],
    text: "Un principe de vie, pas une technique.",
    focus: ["gg"],
    conclusion: true,
  },
];

export const DIMENSIONS = ["Caractère", "Relations", "Accords", "Systèmes", "Processus"];
