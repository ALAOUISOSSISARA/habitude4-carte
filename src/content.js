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
    quote: "Courage et respect d'autrui sont deux qualités requises pour pouvoir gagner ensemble.",
    desc: "Tu combines franchise et écoute : c'est ce que Covey appelle la maturité.",
    defi: "Repère autour de toi une personne qui gagne avec les autres, même dans les situations difficiles, et observe comment elle fait. Puis deviens ce modèle pour quelqu'un.",
    sugg: "Suggestion 6",
  },
  gp: {
    label: "Gagnant / perdant",
    quote: "Si j'ai beaucoup de courage, mais peu de respect pour vous, j'aurai tendance à vouloir gagner en vous laissant vaincu.",
    desc: "Tu sais défendre ce que tu veux. Le risque : que l'autre ait l'impression de perdre, et que la relation en paie le prix.",
    defi: "Lors de ta prochaine négociation, avant de défendre ta position, mets-toi à la place de l'autre et écris ce qui serait une victoire pour lui.",
    sugg: "Suggestions 1 et 3",
  },
  pg: {
    label: "Perdant / gagnant",
    quote: "Je vous laisserai gagner, quitte à perdre moi-même. Je n'oserai pas vivre mes convictions et mes désirs.",
    desc: "Tu fais attention aux autres, mais tu renonces souvent à ce que toi tu veux. Covey prévient : les sentiments refoulés finissent par ressortir.",
    defi: "Pense à une situation où tu devras bientôt trouver un accord, et engage-toi à dire clairement ce que tu veux, sans cesser d'écouter l'autre.",
    sugg: "Suggestion 1",
  },
  pp: {
    label: "Perdant / perdant",
    quote: "Lorsque personne ne gagne, être perdant fait moins mal.",
    desc: "Dans ces situations, tu évites à la fois le conflit et l'échange : personne n'y gagne vraiment.",
    defi: "Analyse ton propre scénario : d'où vient ta façon de réagir (famille, école, groupe) ? Est-elle adaptée à ta réalité d'aujourd'hui ?",
    sugg: "Suggestion 5",
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

export const COUNTDOWN_S = 90;
