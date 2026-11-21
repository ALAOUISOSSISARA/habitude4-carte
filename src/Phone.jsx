import { useEffect, useMemo, useState } from "react";
import { backend, useAppState } from "./backend.js";
import { QUESTIONS, SCORES, ZONES, zoneOf } from "./content.js";
import Matrix from "./Matrix.jsx";

const ansKey = (round) => `cs_answer_r${round}`;
const pidKey = (round) => `cs_pid_r${round}`;
const loadJSON = (k) => {
  try { return JSON.parse(localStorage.getItem(k)); } catch { return null; }
};

// Ordre des réponses mélangé, différent pour chaque téléphone.
function shuffled(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function Shell({ children, viewKey, center = true }) {
  return (
    <div className="phone">
      <div className="blob b1" /><div className="blob b2" />
      <header className="ph-head">
        <span>STEPHEN R. COVEY</span><span className="sep">/</span><span>HABITUDE 04</span>
      </header>
      <main key={viewKey} className={"ph-main enter" + (center ? " center" : "")}>{children}</main>
    </div>
  );
}

function Message({ big, lead, muted, k }) {
  return (
    <Shell viewKey={k}>
      <h1 className="ph-big">{big}</h1>
      <div className="ph-rule" />
      {lead && <p className="ph-lead">{lead}</p>}
      {muted && <p className="ph-muted">{muted}</p>}
    </Shell>
  );
}

export default function Phone() {
  const { state, error } = useAppState(3000);
  const round = state?.round;
  const [answer, setAnswer] = useState(null);
  const [step, setStep] = useState(-1); // -1 = accueil, 0..5 = questions, 6 = envoi
  const [picks, setPicks] = useState([]);
  const [selected, setSelected] = useState(null);
  const [sendError, setSendError] = useState(null);
  const order = useMemo(() => QUESTIONS.map((q) => shuffled(q.a)), []);

  useEffect(() => {
    if (round == null) return;
    setAnswer(loadJSON(ansKey(round)));
    setStep(-1); setPicks([]); setSelected(null); setSendError(null);
  }, [round]);

  if (!state) return <Message k="load" big={error ? "Hors ligne" : "…"} lead={error ? "Connexion impossible. Vérifie ton réseau puis recharge la page." : null} />;

  if (answer) {
    if (state.phase === "results") return <Profile answer={answer} />;
    return <Message k="merci" big="Merci" lead="Ton point est sur la carte." muted="Les résultats s'afficheront ici en même temps que sur le grand écran. Garde cette page ouverte." />;
  }
  if (state.phase === "closed") return <Message k="wait" big="Un instant" lead="Le questionnaire va s'ouvrir." muted={<span className="wait-dots"><i /><i /><i /></span>} />;
  if (state.phase === "results") return <Message k="closed" big="C'est fini" lead="Le questionnaire est terminé. Regarde le grand écran." />;

  const begin = async () => {
    let pid = localStorage.getItem(pidKey(round));
    if (!pid) { pid = crypto.randomUUID(); localStorage.setItem(pidKey(round), pid); }
    backend.join(round, pid).catch(() => {});
    setStep(0);
  };

  const submit = async (all) => {
    const c = all.reduce((s, z) => s + SCORES[z].c, 0) / all.length;
    const p = all.reduce((s, z) => s + SCORES[z].p, 0) / all.length;
    setSendError(null);
    try {
      await backend.submit({ round, courage: c, prevenance: p });
      const a = { courage: c, prevenance: p };
      localStorage.setItem(ansKey(round), JSON.stringify(a));
      setAnswer(a);
    } catch (e) {
      setSendError(e.message || "Envoi impossible");
    }
  };

  if (step === -1) {
    return (
      <Shell viewKey="intro">
        <div className="ph-kicker">OÙ VOUS SITUEZ-VOUS ?</div>
        <h1 className="ph-big">6 situations</h1>
        <div className="ph-rule" />
        <p className="ph-lead">Trois minutes. Anonyme. Pas de bonne réponse.</p>
        <p className="ph-muted">Réponds ce que tu ferais vraiment, pas ce que Covey voudrait.</p>
        <button className="ph-btn" onClick={begin}>Commencer <span aria-hidden>→</span></button>
      </Shell>
    );
  }

  if (step >= QUESTIONS.length) {
    return (
      <Shell viewKey="send">
        {sendError ? (
          <>
            <h1 className="ph-big">Oups</h1>
            <div className="ph-rule" />
            <p className="ph-lead">L'envoi a échoué.</p>
            <p className="ph-muted">{sendError}</p>
            <button className="ph-btn" onClick={() => submit(picks)}>Réessayer</button>
          </>
        ) : (
          <p className="ph-lead"><span className="wait-dots"><i /><i /><i /></span></p>
        )}
      </Shell>
    );
  }

  const q = QUESTIONS[step];
  const choose = (z) => {
    if (selected) return;
    setSelected(z);
    setTimeout(() => {
      const next = [...picks.slice(0, step), z];
      setPicks(next);
      setSelected(null);
      setStep(step + 1);
      if (next.length === QUESTIONS.length) submit(next);
    }, 280);
  };

  return (
    <Shell viewKey={"q" + step} center={false}>
      <div className="ph-progress"><span style={{ width: `${((step + 1) / QUESTIONS.length) * 100}%` }} /></div>
      <div className="ph-kicker">SITUATION {step + 1} / {QUESTIONS.length}</div>
      <p className="ph-q">{q.q}</p>
      <div className="ph-answers">
        {order[step].map((a, i) => (
          <button key={a.z} className={"ph-answer" + (selected === a.z ? " picked" : "")} style={{ animationDelay: `${80 + i * 60}ms` }} onClick={() => choose(a.z)}>
            {a.t}
          </button>
        ))}
      </div>
      {step > 0 && <button className="ph-back" onClick={() => setStep(step - 1)}>← Situation précédente</button>}
    </Shell>
  );
}

function Profile({ answer }) {
  const z = zoneOf(answer.courage, answer.prevenance);
  const info = ZONES[z];
  return (
    <div className="phone">
      <div className="blob b1" /><div className="blob b2" />
      <header className="ph-head">
        <span>STEPHEN R. COVEY</span><span className="sep">/</span><span>HABITUDE 04</span>
      </header>
      <main className="ph-main profile enter">
        <p className="ph-note">Garde-le pour la fin : on en parle à l'écran.</p>
        <div className="ph-kicker">TON PROFIL</div>
        <h1 className="ph-zone">Plutôt<strong>{info.label}</strong></h1>
        <div className="ph-matrix">
          <Matrix me={answer} focus={[z]} showStats={false} showAverage={false} compact />
        </div>
        <p className="ph-lead">{info.desc}</p>
        <div className="ph-conseil">
          <div className="ph-kicker">UN CONSEIL</div>
          <p>{info.conseil}</p>
        </div>
      </main>
    </div>
  );
}
