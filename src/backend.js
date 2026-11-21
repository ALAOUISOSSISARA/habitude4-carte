// Deux back-ends avec la même interface :
//  - Supabase (production) si VITE_SUPABASE_URL et VITE_SUPABASE_ANON_KEY sont définis ;
//  - « démo » locale (localStorage, même navigateur, PIN : demo) sinon, pour répéter sans base.
import { createClient } from "@supabase/supabase-js";
import { useEffect, useState } from "react";
import { DEFAULT_DURATION_S, RECAP } from "./content.js";

const URL = import.meta.env.VITE_SUPABASE_URL;
const KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;
export const IS_DEMO = !URL || !KEY;

const DEFAULT_STATE = { phase: "closed", step: 0, round: 1, opened_at: null, duration_s: DEFAULT_DURATION_S };
const STATE_COLS = "phase,step,round,opened_at,duration_s";

// ---------- Supabase ----------
function supabaseBackend() {
  const sb = createClient(URL, KEY, { realtime: { params: { eventsPerSecond: 20 } } });
  const rpc = async (fn, args) => {
    const { data, error } = await sb.rpc(fn, args);
    if (error) throw new Error(error.message);
    return data;
  };
  return {
    async getState() {
      const { data, error } = await sb.from("app_state").select(STATE_COLS).eq("id", 1).single();
      if (error) throw error;
      return data;
    },
    subscribeState(cb) {
      const ch = sb
        .channel("state")
        .on("postgres_changes", { event: "*", schema: "public", table: "app_state" }, (pl) => pl.new && cb(pl.new))
        .subscribe();
      return () => sb.removeChannel(ch);
    },
    async join(round, id) {
      const { error } = await sb.from("participants").insert({ id, round });
      if (error && error.code !== "23505") throw new Error(error.message); // 23505 = déjà inscrit
    },
    async submit({ round, courage, prevenance }) {
      const { error } = await sb.from("responses").insert({ round, courage, prevenance });
      if (error) throw new Error(error.message);
    },
    async listResponses(round) {
      const { data, error } = await sb.from("responses").select("id,courage,prevenance").eq("round", round).limit(1000);
      if (error) throw error;
      return data;
    },
    async countParticipants(round) {
      const { count, error } = await sb.from("participants").select("id", { count: "exact", head: true }).eq("round", round);
      if (error) throw error;
      return count ?? 0;
    },
    subscribeResponses(cb) {
      const ch = sb
        .channel("responses")
        .on("postgres_changes", { event: "INSERT", schema: "public", table: "responses" }, (pl) => cb(pl.new))
        .subscribe();
      return () => sb.removeChannel(ch);
    },
    checkPin: (pin) => rpc("admin_check", { p_pin: pin }),
    start: (pin) => rpc("admin_start", { p_pin: pin }),
    addTime: (pin, s) => rpc("admin_add_time", { p_pin: pin, p_seconds: s }),
    reveal: (pin) => rpc("admin_reveal", { p_pin: pin }),
    setStep: (pin, step) => rpc("admin_step", { p_pin: pin, p_step: step }),
    reset: (pin) => rpc("admin_reset", { p_pin: pin }),
    seed: (pin, n) => rpc("admin_seed", { p_pin: pin, p_n: n }),
  };
}

// ---------- Démo locale ----------
function demoBackend() {
  const ls = window.localStorage;
  const read = (k, d) => {
    try { return JSON.parse(ls.getItem(k)) ?? d; } catch { return d; }
  };
  const write = (k, v) => ls.setItem(k, JSON.stringify(v));
  const st = () => ({ ...DEFAULT_STATE, ...read("cs_demo_state", {}) });
  const rs = () => read("cs_demo_responses", []);
  const ps = () => read("cs_demo_participants", []);
  const setSt = (patch) => write("cs_demo_state", { ...st(), ...patch });
  const pinOk = (pin) => { if (pin !== "demo") throw new Error("PIN incorrect (en démo : demo)"); };
  const listen = (key, fn) => {
    const h = (e) => e.key === key && fn();
    window.addEventListener("storage", h);
    return () => window.removeEventListener("storage", h);
  };
  return {
    async getState() { return st(); },
    subscribeState(cb) { return listen("cs_demo_state", () => cb(st())); },
    async join(round, id) {
      if (st().phase !== "open") throw new Error("Le questionnaire est fermé.");
      if (!ps().some((p) => p.id === id)) write("cs_demo_participants", [...ps(), { id, round }]);
    },
    async submit({ round, courage, prevenance }) {
      const s = st();
      if (s.phase !== "open" || s.round !== round) throw new Error("Le questionnaire est fermé.");
      write("cs_demo_responses", [...rs(), { id: crypto.randomUUID(), round, courage, prevenance }]);
    },
    async listResponses(round) { return rs().filter((r) => r.round === round); },
    async countParticipants(round) { return ps().filter((p) => p.round === round).length; },
    subscribeResponses(cb) {
      const known = new Set(rs().map((r) => r.id));
      return listen("cs_demo_responses", () => {
        for (const r of rs()) if (!known.has(r.id)) { known.add(r.id); cb(r); }
      });
    },
    async checkPin(pin) { return pin === "demo"; },
    async start(pin) { pinOk(pin); setSt({ phase: "open", step: 0, opened_at: new Date().toISOString(), duration_s: DEFAULT_DURATION_S }); },
    async addTime(pin, s) {
      pinOk(pin);
      const cur = st();
      // si le temps est déjà écoulé, on repart de maintenant
      const end = new Date(cur.opened_at).getTime() + cur.duration_s * 1000;
      const base = Math.max(end, Date.now());
      setSt({ duration_s: Math.round((base + s * 1000 - new Date(cur.opened_at).getTime()) / 1000) });
    },
    async reveal(pin) { pinOk(pin); setSt({ phase: "results", step: 0 }); },
    async setStep(pin, step) { pinOk(pin); setSt({ step: Math.max(0, Math.min(RECAP.length - 1, step)) }); },
    async reset(pin) { pinOk(pin); setSt({ ...DEFAULT_STATE, round: st().round + 1 }); },
    async seed(pin, n) {
      pinOk(pin);
      const s = st();
      const fake = Array.from({ length: n }, () => fakeResponse(s.round));
      write("cs_demo_responses", [...rs(), ...fake]);
      write("cs_demo_participants", [...ps(), ...fake.map((f) => ({ id: f.id, round: s.round })),
        ...Array.from({ length: Math.round(n / 8) }, () => ({ id: crypto.randomUUID(), round: s.round }))]);
    },
  };
}

// Réponse fictive plausible : 6 réponses tirées avec un penchant vers gg et pg.
function fakeResponse(round) {
  const w = [["gg", 0.38], ["pg", 0.3], ["gp", 0.2], ["pp", 0.12]];
  let c = 0, p = 0;
  for (let i = 0; i < 6; i++) {
    let x = Math.random(), z = "pp";
    for (const [k, v] of w) { if (x < v) { z = k; break; } x -= v; }
    c += z === "gg" || z === "gp" ? 3 : 0;
    p += z === "gg" || z === "pg" ? 3 : 0;
  }
  return { id: crypto.randomUUID(), round, courage: c / 6, prevenance: p / 6 };
}

export const backend = IS_DEMO ? demoBackend() : supabaseBackend();

// État partagé : temps réel + interrogation régulière en secours (si le temps réel décroche).
export function useAppState(pollMs = 3000) {
  const [state, setState] = useState(null);
  const [error, setError] = useState(null);
  useEffect(() => {
    let alive = true;
    const load = () =>
      backend.getState().then((s) => { if (alive) { setState(s); setError(null); } }).catch((e) => alive && setError(e));
    load();
    const unsub = backend.subscribeState((s) => alive && setState((old) => ({ ...old, ...s })));
    const t = setInterval(load, IS_DEMO ? 600 : pollMs);
    return () => { alive = false; unsub(); clearInterval(t); };
  }, [pollMs]);
  return { state, error, refresh: () => backend.getState().then(setState).catch(() => {}) };
}
