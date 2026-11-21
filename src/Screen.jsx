import { useEffect, useState } from "react";
import QRCode from "qrcode";
import { backend, useAppState, IS_DEMO } from "./backend.js";
import { COUNTDOWN_S, ZONES, zoneOf } from "./content.js";
import Matrix from "./Matrix.jsx";

function useResponses(round) {
  const [list, setList] = useState([]);
  useEffect(() => {
    if (round == null) return;
    let alive = true;
    setList([]);
    const merge = (rows) =>
      setList((old) => {
        const seen = new Set(old.map((r) => r.id));
        const add = rows.filter((r) => r.round === undefined || r.round === round).filter((r) => !seen.has(r.id));
        return add.length ? [...old, ...add] : old;
      });
    const load = () =>
      backend.listResponses(round).then((rows) => {
        if (!alive) return;
        // remplace si la liste a été vidée (réinitialisation)
        setList((old) => (rows.length < old.length ? rows : old));
        merge(rows);
      }).catch(() => {});
    load();
    const unsub = backend.subscribeResponses((r) => alive && r.round === round && merge([r]));
    const t = setInterval(load, IS_DEMO ? 700 : 2500);
    return () => { alive = false; unsub(); clearInterval(t); };
  }, [round]);
  return list;
}

function useNow(active) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    if (!active) return;
    const t = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(t);
  }, [active]);
  return now;
}

function Logos() {
  const hide = (e) => (e.currentTarget.style.visibility = "hidden");
  return (
    <div className="sc-logos">
      <img src="/logo-ensa.png" alt="ENSA Marrakech" onError={hide} />
      <img src="/logo-gcdste.png" alt="GCDSTE" onError={hide} />
    </div>
  );
}

function Kicker({ children }) {
  return <div className="sc-kicker">{children}</div>;
}

export default function Screen() {
  const { state, error } = useAppState(2500);
  const responses = useResponses(state?.round);
  const [qr, setQr] = useState("");
  const url = `${window.location.origin}/`;
  const now = useNow(state?.phase === "open");

  useEffect(() => {
    QRCode.toString(url, { type: "svg", margin: 0, errorCorrectionLevel: "M", color: { dark: "#1F2A2D", light: "#0000" } }).then(setQr);
  }, [url]);

  if (!state) return <div className="screen"><div className="sc-body"><p className="sc-muted">{error ? "Connexion à la base impossible." : "Connexion…"}</p></div></div>;

  const n = responses.length;

  if (state.phase === "closed" || state.phase === "open") {
    const open = state.phase === "open";
    const elapsed = open && state.opened_at ? (now - new Date(state.opened_at).getTime()) / 1000 : 0;
    const left = Math.max(0, Math.ceil(COUNTDOWN_S - elapsed));
    return (
      <div className="screen">
        <Logos />
        <div className="sc-body split">
          <section className="sc-left">
            <Kicker>STEPHEN R. COVEY / 07 HABITUDES</Kicker>
            <h1 className="sc-title"><span className="num">04</span> OÙ VOUS<br /><span className="accent">SITUEZ-VOUS ?</span></h1>
            <div className="sc-rule" />
            <p className="sc-lead">6 situations · 1 minute · anonyme.<br />Répondez ce que vous feriez <em>vraiment</em>.</p>
            <div className="sc-stats">
              <div><span className="big">{n}</span><span className="lbl">réponse{n > 1 ? "s" : ""}</span></div>
              {open && (
                <div><span className="big timer">{Math.floor(left / 60)}:{String(left % 60).padStart(2, "0")}</span><span className="lbl">restant</span></div>
              )}
            </div>
            {!open && <p className="sc-muted">Le questionnaire s'ouvre dans un instant.</p>}
          </section>
          <section className="sc-right qr-side">
            <div className="qr" dangerouslySetInnerHTML={{ __html: qr }} />
            <div className="qr-url">{url.replace(/^https?:\/\//, "").replace(/\/$/, "")}</div>
          </section>
        </div>
        {IS_DEMO && <div className="demo-tag">MODE DÉMO</div>}
      </div>
    );
  }

  // map / profiles
  const focus = state.focus;
  const counts = { gg: 0, gp: 0, pg: 0, pp: 0 };
  responses.forEach((r) => counts[zoneOf(r.courage, r.prevenance)]++);
  return (
    <div className="screen">
      <Logos />
      <div className="sc-body split map">
        <section className="sc-matrix">
          <Matrix key={`m-${state.round}`} points={responses} focus={focus} />
        </section>
        <section className="sc-left side">
          <Kicker>LA MATURITÉ SELON COVEY</Kicker>
          {focus ? (
            <>
              <h2 className="sc-h2">{ZONES[focus].label.toUpperCase()}</h2>
              <div className="sc-rule" />
              <div className="sc-pct">{n ? Math.round((counts[focus] / n) * 100) : 0}<span>%</span></div>
              <p className="sc-lbl">de la salle</p>
              <blockquote className="sc-quote">« {ZONES[focus].quote} »</blockquote>
            </>
          ) : (
            <>
              <h2 className="sc-h2">LA CARTE<br /><span className="accent">DE LA SALLE</span></h2>
              <div className="sc-rule" />
              <p className="sc-lead">{n} réponse{n > 1 ? "s" : ""}.<br />Courage et prévenance : il faut <em>beaucoup des deux</em>, pas un juste milieu.</p>
            </>
          )}
          {state.phase === "profiles" && <div className="sc-banner">REGARDEZ VOTRE TÉLÉPHONE</div>}
        </section>
      </div>
      {IS_DEMO && <div className="demo-tag">MODE DÉMO</div>}
    </div>
  );
}
