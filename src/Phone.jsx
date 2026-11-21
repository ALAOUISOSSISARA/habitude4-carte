import { useEffect, useMemo, useState } from "react";
import { backend, useAppState } from "./backend.js";
import { QUESTIONS, SCORES, ZONES, zoneOf } from "./content.js";
import Matrix from "./Matrix.jsx";

const key = (round) => `cs_answer_r${round}`;
const loadAnswer = (round) => {
  try { return JSON.parse(localStorage.getItem(key(round))); } catch { return null; }
};

// Ordre des réponses mélangé, différent pour chaque téléphone mais stable pendant le questionnaire.
function shuffled(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function Header() {
  return (
    <div className="ph-head">
      <span>STEPHEN R. COVEY</span><span className="sep">/</span><span>HABITUDE 04</span>
    </div>
  );
}

function Shell({ children, center = true }) {
  return (
    <div className="phone">
      <Header />
      <main className={center ? "ph-main center" : "ph-main"}>{children}</main>
    </div>
  );
}

export default function Phone() {
  const { state, error } = useAppState(4000);
  const round = state?.round;
  const [answer, setAnswer] = useState(null);
  const [step, setStep] = useState(-1); // -1 = accueil, 0..5 = questions
  const [picks, setPicks] = useState([]);
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState(null);
  const order = useMemo(() => QUESTIONS.map((q) => shuffled(q.a)), []);

  useEffect(() => {
    if (round != null) setAnswer(loadAnswer(round));
  }, [round]);

  if (!state) {
    return <Shell><p className="ph-muted">{error ? "Connexion impossible. Vérifie ton réseau." : "Connexion…"}</p></Shell>;
  }

  // Déjà répondu
  if (answer) {
    if (state.phase === "profiles") return <Profile answer={answer} />;
    return (
      <Shell>
        <div className="ph-big">Merci</div>
        <div className="ph-rule" />
        <p className="ph-lead">
          {state.phase === "map" ? "Regarde le grand écran." : "Ton point est sur la carte."}
        </p>
        <p className="ph-muted">Ton profil s'affichera ici dans quelques instants. Garde cette page ouverte.</p>
      </Shell>
    );
  }

  if (state.phase === "closed") {
    return (
      <Shell>
        <div className="ph-big">Un instant</div>
        <div className="ph-rule" />
        <p className="ph-lead">Le questionnaire va s'ouvrir.</p>
      </Shell>
    );
  }
  if (state.phase !== "open") {
    return (
      <Shell>
        <div className="ph-big">C'est fermé</div>
        <div className="ph-rule" />
        <p className="ph-lead">Le questionnaire est terminé. Regarde le grand écran.</p>
      </Shell>
    );
  }

  // Accueil
  if (step === -1) {
    return (
      <Shell>
        <div className="ph-kicker">OÙ VOUS SITUEZ-VOUS ?</div>
        <div className="ph-big">6 situations</div>
        <div className="ph-rule" />
        <p className="ph-lead">Une minute. Anonyme. Pas de bonne réponse.</p>
        <p className="ph-muted">Réponds ce que tu ferais vraiment, pas ce que Covey voudrait.</p>
        <button className="ph-btn" onClick={() => setStep(0)}>Commencer</button>
      </Shell>
    );
  }

  const submit = async (all) => {
    const c = all.reduce((s, z) => s + SCORES[z].c, 0) / all.length;
    const p = all.reduce((s, z) => s + SCORES[z].p, 0) / all.length;
    setSending(true);
    setSendError(null);
    try {
      await backend.submit({ round, courage: c, prevenance: p });
      const a = { courage: c, prevenance: p };
      localStorage.setItem(key(round), JSON.stringify(a));
      setAnswer(a);
    } catch (e) {
      setSendError(e.message || "Envoi impossible");
    } finally {
      setSending(false);
    }
  };

  if (step >= QUESTIONS.length) {
    return (
      <Shell>
        <p className="ph-lead">{sending ? "Envoi…" : sendError ? "L'envoi a échoué." : "Envoi…"}</p>
        {sendError && (
          <>
            <p className="ph-muted">{sendError}</p>
            <button className="ph-btn" onClick={() => submit(picks)} disabled={sending}>Réessayer</button>
          </>
        )}
      </Shell>
    );
  }

  const q = QUESTIONS[step];
  const choose = (z) => {
    const next = [...picks.slice(0, step), z];
    setPicks(next);
    setStep(step + 1);
    if (next.length === QUESTIONS.length) submit(next);
  };

  return (
    <Shell center={false}>
      <div className="ph-progress">
        {QUESTIONS.map((_, i) => <span key={i} className={i === step ? "cur" : i < step ? "on" : ""} />)}
      </div>
      <div className="ph-kicker">SITUATION {step + 1} / {QUESTIONS.length}</div>
      <p className="ph-q">{q.q}</p>
      <div className="ph-answers">
        {order[step].map((a) => (
          <button key={a.z} className="ph-answer" onClick={() => choose(a.z)}>{a.t}</button>
        ))}
      </div>
      {step > 0 && (
        <button className="ph-back" onClick={() => setStep(step - 1)}>← Situation précédente</button>
      )}
    </Shell>
  );
}

function Profile({ answer }) {
  const z = zoneOf(answer.courage, answer.prevenance);
  const info = ZONES[z];
  return (
    <div className="phone">
      <Header />
      <main className="ph-main profile">
        <div className="ph-kicker">TON PROFIL</div>
        <div className="ph-zone">Plutôt<br /><strong>{info.label}</strong></div>
        <div className="ph-rule" />
        <div className="ph-matrix">
          <Matrix me={answer} focus={z} showStats={false} showAverage={false} compact animate={false} />
        </div>
        <p className="ph-lead">{info.desc}</p>
        <blockquote className="ph-quote">« {info.quote} »<cite>Stephen R. Covey</cite></blockquote>
        <div className="ph-defi">
          <div className="ph-kicker">TON DÉFI · {info.sugg.toUpperCase()}</div>
          <p>{info.defi}</p>
        </div>
      </main>
    </div>
  );
}
