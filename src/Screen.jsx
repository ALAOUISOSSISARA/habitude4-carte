import { useCallback, useEffect, useRef, useState } from "react";
import QRCode from "qrcode";
import { backend, useAppState, IS_DEMO } from "./backend.js";
import { EXTRA_TIME_S, RECAP, ZONES, DIMENSIONS } from "./content.js";
import Matrix, { zoneCounts } from "./Matrix.jsx";

// ---------- données ----------
function useResponses(round) {
  const [list, setList] = useState([]);
  useEffect(() => {
    if (round == null) return;
    let alive = true;
    setList([]);
    const merge = (rows) =>
      setList((old) => {
        const seen = new Set(old.map((r) => r.id));
        const add = rows.filter((r) => (r.round === undefined || r.round === round) && !seen.has(r.id));
        return add.length ? [...old, ...add] : old;
      });
    const load = () => backend.listResponses(round).then((rows) => alive && merge(rows)).catch(() => {});
    load();
    const unsub = backend.subscribeResponses((r) => alive && r.round === round && merge([r]));
    const t = setInterval(load, IS_DEMO ? 600 : 2500);
    return () => { alive = false; unsub(); clearInterval(t); };
  }, [round]);
  return list;
}

function useParticipants(round, active) {
  const [n, setN] = useState(0);
  useEffect(() => {
    if (round == null) return;
    let alive = true;
    setN(0);
    const load = () => backend.countParticipants(round).then((c) => alive && setN(c)).catch(() => {});
    load();
    const t = active ? setInterval(load, IS_DEMO ? 600 : 2500) : null;
    return () => { alive = false; t && clearInterval(t); };
  }, [round, active]);
  return n;
}

function useNow(active) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    if (!active) return;
    const t = setInterval(() => setNow(Date.now()), 200);
    return () => clearInterval(t);
  }, [active]);
  return now;
}

// Nombre animé (glisse doucement vers la nouvelle valeur)
function useTween(value, ms = 600) {
  const [v, setV] = useState(value);
  const from = useRef(value);
  useEffect(() => {
    const start = performance.now(), a = from.current, b = value;
    let raf;
    const tick = (t) => {
      const k = Math.min(1, (t - start) / ms);
      const e = 1 - Math.pow(1 - k, 3);
      const cur = a + (b - a) * e;
      setV(cur);
      from.current = cur;
      if (k < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [value, ms]);
  return Math.round(v);
}

// ---------- petits éléments ----------
function Logos() {
  const hide = (e) => (e.currentTarget.style.visibility = "hidden");
  return (
    <div className="sc-logos">
      <img src="/logo-ensa.png" alt="ENSA Marrakech" onError={hide} />
      <img src="/logo-gcdste.png" alt="GCDSTE" onError={hide} />
    </div>
  );
}

const fmt = (s) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;

function toggleFullscreen() {
  if (document.fullscreenElement) document.exitFullscreen?.();
  else document.documentElement.requestFullscreen?.().catch(() => {});
}

// ---------- page ----------
export default function Screen() {
  const { state, error, refresh } = useAppState(2500);
  const round = state?.round;
  const phase = state?.phase;
  const responses = useResponses(round);
  const started = useParticipants(round, phase !== "results");
  const now = useNow(phase === "open");
  const [qr, setQr] = useState("");
  const url = `${window.location.origin}/`;

  // PIN : saisi une fois, gardé pour la session
  const [pin, setPin] = useState(() => sessionStorage.getItem("cs_pin") || "");
  const [unlocked, setUnlocked] = useState(false);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const [menu, setMenu] = useState(false);
  const [confirmReset, setConfirmReset] = useState(false);
  const [idle, setIdle] = useState(false);
  const [isFs, setIsFs] = useState(false);

  useEffect(() => {
    QRCode.toString(url, { type: "svg", margin: 0, errorCorrectionLevel: "M", color: { dark: "#1F2A2D", light: "#0000" } }).then(setQr);
  }, [url]);

  useEffect(() => {
    if (pin) backend.checkPin(pin).then((ok) => setUnlocked(!!ok)).catch(() => {});
  }, []); // eslint-disable-line

  useEffect(() => {
    const h = () => setIsFs(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", h);
    return () => document.removeEventListener("fullscreenchange", h);
  }, []);

  // la barre de contrôle se cache quand la souris ne bouge plus
  useEffect(() => {
    let t;
    const wake = () => { setIdle(false); clearTimeout(t); t = setTimeout(() => setIdle(true), 2600); };
    wake();
    window.addEventListener("mousemove", wake);
    return () => { window.removeEventListener("mousemove", wake); clearTimeout(t); };
  }, []);

  const endAt = state?.opened_at ? new Date(state.opened_at).getTime() + (state.duration_s || 180) * 1000 : 0;
  const left = phase === "open" ? Math.max(0, Math.ceil((endAt - now) / 1000)) : state?.duration_s || 180;
  const timeUp = phase === "open" && left === 0;

  const run = useCallback(async (fn) => {
    if (!unlocked || busy) return;
    setBusy(true); setMsg("");
    try { await fn(); await refresh(); } catch (e) { setMsg(e.message); } finally { setBusy(false); }
  }, [unlocked, busy, refresh]);

  const start = () => run(() => backend.start(pin));
  const addTime = () => run(() => backend.addTime(pin, EXTRA_TIME_S));
  const reveal = () => run(() => backend.reveal(pin));
  const step = state?.step ?? 0;
  const goStep = (s) => run(() => backend.setStep(pin, Math.max(0, Math.min(RECAP.length - 1, s))));

  // clavier / télécommande de présentation
  useEffect(() => {
    const h = (e) => {
      if (e.target.tagName === "INPUT") return;
      const next = ["ArrowRight", "PageDown", " "].includes(e.key);
      const prev = ["ArrowLeft", "PageUp"].includes(e.key);
      if (e.key === "f" || e.key === "F") { toggleFullscreen(); return; }
      if (!unlocked) return;
      if (next) {
        e.preventDefault();
        if (phase === "closed") start();
        else if (phase === "open" && timeUp) reveal();
        else if (phase === "results") goStep(step + 1);
      } else if (prev && phase === "results") { e.preventDefault(); goStep(step - 1); }
      else if (e.key === "+" && phase === "open") addTime();
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  });

  if (!state) {
    return <div className="screen"><div className="sc-center"><p className="sc-muted">{error ? "Connexion à la base impossible." : "Connexion…"}</p></div></div>;
  }

  return (
    <div className={"screen" + (idle ? " idle" : "")}>
      <div className="blob b1" /><div className="blob b2" />
      {phase === "open" && (
        <div className="time-bar"><span style={{ width: `${(left / (state.duration_s || 180)) * 100}%` }} /></div>
      )}
      <Logos />
      {phase === "results"
        ? <Results key={"r" + round} responses={responses} step={step} />
        : <Lobby open={phase === "open"} n={responses.length} started={started} left={left} timeUp={timeUp} qr={qr} url={url} />}

      {/* ---------- barre de contrôle ---------- */}
      <div className={"controls" + (menu || !unlocked ? " pinned" : "")}>
        {!unlocked ? (
          <form className="pin" onSubmit={async (e) => {
            e.preventDefault();
            const ok = await backend.checkPin(pin).catch(() => false);
            if (ok) { sessionStorage.setItem("cs_pin", pin); setUnlocked(true); setMsg(""); } else setMsg("PIN incorrect");
          }}>
            <input type="password" inputMode="numeric" placeholder={IS_DEMO ? "PIN (démo : demo)" : "PIN"} value={pin} onChange={(e) => setPin(e.target.value)} />
            <button className="c-btn primary">Déverrouiller</button>
          </form>
        ) : (
          <>
            {phase === "closed" && <button className="c-btn primary" onClick={start} disabled={busy}>Lancer le questionnaire · 3 min</button>}
            {phase === "open" && (
              <>
                <button className={"c-btn" + (timeUp ? " glow" : "")} onClick={addTime} disabled={busy}>+ 1 min</button>
                <button className={"c-btn primary" + (timeUp ? " glow" : "")} onClick={reveal} disabled={busy}>Afficher les résultats</button>
              </>
            )}
            {phase === "results" && (
              <>
                <button className="c-btn icon" onClick={() => goStep(step - 1)} disabled={busy || step === 0} aria-label="Étape précédente">←</button>
                <span className="c-steps">{RECAP.map((_, i) => <i key={i} className={i === step ? "on" : ""} onClick={() => goStep(i)} />)}</span>
                <button className="c-btn icon" onClick={() => goStep(step + 1)} disabled={busy || step === RECAP.length - 1} aria-label="Étape suivante">→</button>
              </>
            )}
          </>
        )}
        <span className="c-sep" />
        <button className="c-btn icon" onClick={toggleFullscreen} aria-label="Plein écran" title="Plein écran (F)">{isFs ? "⤡" : "⤢"}</button>
        {unlocked && (
          <div className="c-menu">
            <button className="c-btn icon" onClick={() => { setMenu(!menu); setConfirmReset(false); }} aria-label="Plus">⋯</button>
            {menu && (
              <div className="c-pop">
                <button onClick={() => { run(() => backend.seed(pin, 60)); setMenu(false); }}>Ajouter 60 réponses fictives</button>
                {!confirmReset
                  ? <button onClick={() => setConfirmReset(true)}>Remettre à zéro…</button>
                  : <button className="danger" onClick={() => { run(() => backend.reset(pin)); setMenu(false); setConfirmReset(false); }}>Confirmer : tout remettre à zéro</button>}
              </div>
            )}
          </div>
        )}
        {msg && <span className="c-msg">{msg}</span>}
      </div>
      {IS_DEMO && <div className="demo-tag">MODE DÉMO</div>}
    </div>
  );
}

function Lobby({ open, n, started, left, timeUp, qr, url }) {
  const shown = useTween(n);
  const total = Math.max(started, n);
  return (
    <div className="sc-body split enter">
      <section className="sc-left">
        <div className="sc-kicker">STEPHEN R. COVEY / 07 HABITUDES</div>
        <h1 className="sc-title"><span className="num">04</span> OÙ VOUS<br /><span className="accent">SITUEZ-VOUS ?</span></h1>
        <div className="sc-rule" />
        <p className="sc-lead">6 situations · anonyme.<br />Répondez ce que vous feriez <em>vraiment</em>.</p>
        <div className="sc-stats">
          <div>
            <span className="big">{shown}</span>
            <span className="lbl">réponse{n > 1 ? "s" : ""}</span>
          </div>
          <div>
            <span className={"big timer" + (timeUp ? " up" : "") + (!open ? " off" : "")}>{timeUp ? "0:00" : fmt(left)}</span>
            <span className="lbl">{timeUp ? "temps écoulé" : open ? "restant" : "durée"}</span>
          </div>
        </div>
        <div className={"sc-progress" + (open && total ? "" : " hidden")}>
          <div className="bar"><span style={{ width: `${total ? (n / total) * 100 : 0}%` }} /></div>
          <div className="lbl">{n} terminé{n > 1 ? "s" : ""} sur {total} en cours</div>
        </div>
      </section>
      <section className="sc-right qr-side">
        <div className="qr" dangerouslySetInnerHTML={{ __html: qr }} />
        <div className="qr-url">{url.replace(/^https?:\/\//, "").replace(/\/$/, "")}</div>
        <div className="qr-hint">{open ? "Scannez pour répondre" : "Scannez, le questionnaire s'ouvre dans un instant"}</div>
      </section>
    </div>
  );
}

function Results({ responses, step }) {
  const r = RECAP[step] || RECAP[0];
  const n = responses.length;
  const counts = zoneCounts(responses);
  const pct = (z) => (n ? Math.round((counts[z] / n) * 100) : 0);
  return (
    <div className="sc-body split map">
      <section className="sc-matrix">
        <Matrix points={responses} focus={r.focus} conclusion={!!r.conclusion} showStats />
      </section>
      <section key={"s" + step} className="sc-left side enter">
        <div className="sc-kicker">{r.kicker}</div>
        <h2 className="sc-h2">{r.title[0]}<br /><span className="accent">{r.title[1]}</span></h2>
        <div className="sc-rule" />
        {r.focus && !r.conclusion && (
          <div className="sc-pcts">
            {r.focus.map((z) => (
              <div key={z}><span className="pct">{pct(z)}<small>%</small></span><span className="lbl">{ZONES[z].label}</span></div>
            ))}
          </div>
        )}
        {r.conclusion && (
          <ol className="sc-dims">
            {DIMENSIONS.map((d, i) => <li key={d} style={{ animationDelay: `${300 + i * 140}ms` }}><span>{String(i + 1).padStart(2, "0")}</span>{d}</li>)}
          </ol>
        )}
        <p className="sc-lead">{r.text}</p>
        {step === 0 && <p className="sc-phone">Votre profil est sur votre téléphone. On en parle à la fin.</p>}
      </section>
    </div>
  );
}
