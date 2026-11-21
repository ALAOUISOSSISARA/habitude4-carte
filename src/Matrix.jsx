import { ZONES, zoneOf } from "./content.js";

// Matrice de Covey : courage en abscisse, prévenance en ordonnée (0 à 3).
const S = 500, X0 = 96, Y0 = 16;
// Bande réservée en haut des zones du haut et en bas des zones du bas pour les titres et pourcentages.
const BAND = 86;
const px = (c) => X0 + (c / 3) * S;
const py = (p) => Y0 + BAND + (1 - p / 3) * (S - 2 * BAND);

const QUADS = {
  pg: { x: X0, y: Y0, top: true, fill: "#DCE9E4" },
  gg: { x: X0 + S / 2, y: Y0, top: true, fill: "#C3DBD3" },
  pp: { x: X0, y: Y0 + S / 2, fill: "#E9F0ED" },
  gp: { x: X0 + S / 2, y: Y0 + S / 2, fill: "#E0EAE6" },
};

// Décalage stable (calculé à partir de l'id) pour que les points identiques ne s'empilent pas.
function hash(str, salt) {
  let h = 2166136261 ^ salt;
  for (let i = 0; i < str.length; i++) h = Math.imul(h ^ str.charCodeAt(i), 16777619);
  return ((h >>> 0) % 10000) / 10000;
}
// Les moyennes valent 0 ; 0,5 ; … ; 3. Chaque valeur reste du bon côté de la frontière 1,5.
function jitter(v, r) {
  const c = v === 1.5 ? 1.72 : Math.min(2.78, Math.max(0.22, v));
  return c + (r - 0.5) * 0.4;
}

export function zoneCounts(points) {
  const counts = { gg: 0, gp: 0, pg: 0, pp: 0 };
  for (const pt of points) counts[zoneOf(+pt.courage, +pt.prevenance)]++;
  return counts;
}

export default function Matrix({ points = [], focus = null, conclusion = false, showStats = true, showAverage = true, me = null, compact = false }) {
  const n = points.length;
  const counts = zoneCounts(points);
  let sc = 0, sp = 0;
  for (const pt of points) { sc += +pt.courage; sp += +pt.prevenance; }
  const avg = n ? { c: sc / n, p: sp / n } : null;
  const dim = (z) => (focus && !focus.includes(z) ? (conclusion ? 0.45 : 0.16) : 1);

  // Flèches de la conclusion : des trois autres zones vers gagnant/gagnant
  const target = { x: X0 + S * 0.75, y: Y0 + S * 0.3 };
  const arrows = [
    { from: { x: X0 + S * 0.25, y: Y0 + S * 0.3 } },
    { from: { x: X0 + S * 0.25, y: Y0 + S * 0.72 } },
    { from: { x: X0 + S * 0.75, y: Y0 + S * 0.72 } },
  ];

  return (
    <svg viewBox={`0 0 ${X0 + S + 16} ${Y0 + S + 70}`} className={"matrix" + (compact ? " compact" : "")} role="img" aria-label="Matrice courage / prévenance">
      <defs>
        <marker id="arr" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
          <path d="M0 0 L10 5 L0 10 z" fill="#1E5F64" />
        </marker>
        <marker id="arr-acc" viewBox="0 0 10 10" refX="7" refY="5" markerWidth="5" markerHeight="5" orient="auto">
          <path d="M0 0 L10 5 L0 10 z" fill="#D9734E" />
        </marker>
      </defs>

      {Object.entries(QUADS).map(([z, q]) => (
        <g key={z} className="quad" style={{ opacity: dim(z) }}>
          <rect x={q.x} y={q.y} width={S / 2} height={S / 2} fill={q.fill} />
          <text x={q.x + 18} y={q.top ? q.y + 32 : q.y + S / 2 - (showStats && n ? 18 : 22)} className="q-label">
            {ZONES[z].label.toUpperCase()}
          </text>
          {showStats && n > 0 && (
            <text x={q.x + 18} y={q.top ? q.y + 74 : q.y + S / 2 - 40} className="q-pct">
              {Math.round((counts[z] / n) * 100)}%
            </text>
          )}
        </g>
      ))}
      <line x1={X0 + S / 2} y1={Y0} x2={X0 + S / 2} y2={Y0 + S} stroke="#F1F4F2" strokeWidth="5" />
      <line x1={X0} y1={Y0 + S / 2} x2={X0 + S} y2={Y0 + S / 2} stroke="#F1F4F2" strokeWidth="5" />

      {/* axes */}
      <line x1={X0} y1={Y0 + S + 22} x2={X0 + S} y2={Y0 + S + 22} stroke="#1E5F64" strokeWidth="2" markerEnd="url(#arr)" />
      <line x1={X0 - 22} y1={Y0 + S} x2={X0 - 22} y2={Y0} stroke="#1E5F64" strokeWidth="2" markerEnd="url(#arr)" />
      <text x={X0 + S / 2} y={Y0 + S + 56} textAnchor="middle" className="axis">COURAGE</text>
      <text x={X0} y={Y0 + S + 56} className="axis-sm">peu</text>
      <text x={X0 + S} y={Y0 + S + 56} textAnchor="end" className="axis-sm">beaucoup</text>
      <text transform={`translate(${X0 - 44} ${Y0 + S / 2}) rotate(-90)`} textAnchor="middle" className="axis">PRÉVENANCE</text>
      <text transform={`translate(${X0 - 44} ${Y0 + S}) rotate(-90)`} className="axis-sm">peu</text>
      <text transform={`translate(${X0 - 44} ${Y0}) rotate(-90)`} textAnchor="end" className="axis-sm">beaucoup</text>

      {/* points de la salle */}
      {points.map((pt, i) => {
        const z = zoneOf(+pt.courage, +pt.prevenance);
        const o = conclusion ? 0.28 : dim(z);
        return (
          <g key={pt.id} className="quad" style={{ opacity: o }}>
            <circle
              cx={px(jitter(+pt.courage, hash(pt.id, 1)))}
              cy={py(jitter(+pt.prevenance, hash(pt.id, 2)))}
              r={7.5}
              className="dot"
              style={{ animationDelay: `${Math.min(i * 40, 3200)}ms` }}
            />
          </g>
        );
      })}

      {/* moyenne de la salle */}
      {showAverage && avg && !focus && (
        <g className="avg" style={{ animationDelay: `${Math.min(n * 40, 3200) + 400}ms` }}>
          <circle cx={px(avg.c)} cy={py(avg.p)} r="22" className="avg-halo" />
          <circle cx={px(avg.c)} cy={py(avg.p)} r="21" fill="rgba(217,115,78,.16)" stroke="#D9734E" strokeWidth="4" />
          <circle cx={px(avg.c)} cy={py(avg.p)} r="7" fill="#D9734E" />
          <text x={px(avg.c) + 30} y={py(avg.p) + 6} className="avg-label">LA SALLE</text>
        </g>
      )}

      {/* conclusion : chemin vers gagnant/gagnant */}
      {conclusion && (
        <g className="concl">
          {arrows.map((a, i) => (
            <path key={i} className="concl-path" style={{ animationDelay: `${i * 220}ms` }}
              d={`M${a.from.x} ${a.from.y} Q ${(a.from.x + target.x) / 2 + (i === 1 ? 30 : 0)} ${(a.from.y + target.y) / 2 - (i === 2 ? 0 : 40)} ${target.x - (i === 2 ? 0 : 26)} ${target.y + (i === 0 ? 0 : 30)}`}
              markerEnd="url(#arr-acc)" />
          ))}
          <circle cx={target.x} cy={target.y} r="34" className="concl-target" />
        </g>
      )}

      {/* point personnel (profil sur téléphone) */}
      {me && (
        <g className="me">
          <circle cx={px(jitter(me.courage, 0.5))} cy={py(jitter(me.prevenance, 0.5))} r="24" className="me-pulse" />
          <circle cx={px(jitter(me.courage, 0.5))} cy={py(jitter(me.prevenance, 0.5))} r="22" fill="rgba(217,115,78,.16)" stroke="#D9734E" strokeWidth="4" />
          <circle cx={px(jitter(me.courage, 0.5))} cy={py(jitter(me.prevenance, 0.5))} r="10" fill="#D9734E" />
        </g>
      )}
    </svg>
  );
}
