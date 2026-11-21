import { useEffect, useState } from "react";
import { backend, useAppState, IS_DEMO } from "./backend.js";
import { ZONES, ZONE_ORDER } from "./content.js";

const PHASES = [
  { id: "closed", label: "1 · Attente", hint: "QR affiché, questionnaire pas encore ouvert" },
  { id: "open", label: "2 · Ouvrir le questionnaire", hint: "lance le compte à rebours" },
  { id: "map", label: "3 · Révéler la carte", hint: "ferme le questionnaire" },
  { id: "profiles", label: "4 · Révéler les profils", hint: "sur tous les téléphones" },
];

export default function Admin() {
  const { state } = useAppState(2000);
  const [pin, setPin] = useState(() => sessionStorage.getItem("cs_pin") || "");
  const [ok, setOk] = useState(false);
  const [msg, setMsg] = useState("");
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (!pin) return;
    backend.checkPin(pin).then((v) => setOk(!!v)).catch(() => setOk(false));
  }, []); // eslint-disable-line

  useEffect(() => {
    if (!state) return;
    const t = setInterval(() => backend.listResponses(state.round).then((r) => setCount(r.length)).catch(() => {}), 1500);
    backend.listResponses(state.round).then((r) => setCount(r.length)).catch(() => {});
    return () => clearInterval(t);
  }, [state?.round]);

  const run = async (fn, label) => {
    setMsg("…");
    try { await fn(); setMsg(label + " ✓"); } catch (e) { setMsg("Erreur : " + e.message); }
  };

  if (!ok) {
    return (
      <div className="admin">
        <h1>ADMIN</h1>
        <div className="ad-rule" />
        <p>Code PIN {IS_DEMO && <em>(mode démo : demo)</em>}</p>
        <form onSubmit={async (e) => {
          e.preventDefault();
          const v = await backend.checkPin(pin).catch(() => false);
          if (v) { sessionStorage.setItem("cs_pin", pin); setOk(true); } else setMsg("PIN incorrect");
        }}>
          <input value={pin} onChange={(e) => setPin(e.target.value)} type="password" inputMode="numeric" autoFocus />
          <button className="ad-btn primary">Entrer</button>
        </form>
        <p className="ad-msg">{msg}</p>
      </div>
    );
  }

  if (!state) return <div className="admin"><p>Connexion…</p></div>;

  return (
    <div className="admin">
      <h1>ADMIN</h1>
      <div className="ad-rule" />
      <div className="ad-status">
        <div><span className="big">{count}</span> réponses</div>
        <div>Phase : <strong>{state.phase}</strong> · Tour {state.round}</div>
      </div>

      <h2>Déroulé</h2>
      {PHASES.map((p) => (
        <button key={p.id} className={"ad-btn" + (state.phase === p.id ? " active" : "")}
          onClick={() => run(() => backend.setPhase(pin, p.id), p.label)}>
          {p.label}<small>{p.hint}</small>
        </button>
      ))}

      <h2>Commenter une zone</h2>
      <div className="ad-grid">
        {ZONE_ORDER.map((z) => (
          <button key={z} disabled={!["map", "profiles"].includes(state.phase)}
            className={"ad-btn" + (state.focus === z ? " active" : "")}
            onClick={() => run(() => backend.setFocus(pin, z), ZONES[z].label)}>
            {ZONES[z].label}
          </button>
        ))}
        <button className={"ad-btn" + (!state.focus ? " active" : "")} disabled={!["map", "profiles"].includes(state.phase)}
          onClick={() => run(() => backend.setFocus(pin, null), "Vue d'ensemble")}>
          Vue d'ensemble
        </button>
      </div>

      <h2>Répétition</h2>
      <button className="ad-btn" onClick={() => run(() => backend.seed(pin, 60), "60 réponses fictives ajoutées")}>
        Ajouter 60 réponses fictives<small>pour tester la carte</small>
      </button>
      <button className="ad-btn danger" onClick={() => {
        if (confirm("Tout remettre à zéro ? Les réponses actuelles ne seront plus affichées.")) run(() => backend.reset(pin), "Remis à zéro");
      }}>
        Remettre à zéro<small>nouveau tour, avant la vraie présentation</small>
      </button>
      <p className="ad-msg">{msg}</p>
    </div>
  );
}
