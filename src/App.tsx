import { useState, useEffect, useRef, useCallback } from "react";
import { initializeApp } from "firebase/app";
import { getDatabase, ref, onValue } from "firebase/database";

// ── Firebase ───────────────────────────────────────────────
const firebaseConfig = {
  apiKey: "AIzaSyD4vGnJJKi1RRqsE3T9UGTy6FHIf_L4V9E",
  authDomain: "carritobt-431cb.firebaseapp.com",
  databaseURL: "https://carritobt-431cb-default-rtdb.firebaseio.com",
  projectId: "carritobt-431cb",
  storageBucket: "carritobt-431cb.firebasestorage.app",
  messagingSenderId: "464992986119",
  appId: "1:464992986119:web:563aa09fdd1ffab56ef6a2",
};
const fbApp = initializeApp(firebaseConfig);
const db = getDatabase(fbApp);

// ── Types ──────────────────────────────────────────────────
interface SensorData {
  d1: number; d2: number; d3: number; d4: number; d5: number;
}
interface FirebaseData {
  d1?: string; d2?: string; d3?: string; d4?: string; d5?: string;
  ia?: string; conf?: string; modo?: string;
  direccion?: string; velocidad?: string;
}
interface LogEntry { t: string; msg: string; }
type ModoType = "manual" | "auto";

// ── Helpers ────────────────────────────────────────────────
const clamp = (v: number, mn: number, mx: number) => Math.min(mx, Math.max(mn, v));
const pct = (v: number) => clamp(Math.round((1 - v / 400) * 100), 0, 100);
const distColor = (v: number) => {
  const p = pct(v);
  if (p > 65) return "#FFD600";
  if (p > 35) return "#FF8C00";
  return "#FF1E1E";
};

// ── SVG Icons ──────────────────────────────────────────────
const Icon = {
  Bot: () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="11" width="18" height="10" rx="2" /><circle cx="12" cy="5" r="2" />
      <line x1="12" y1="7" x2="12" y2="11" /><line x1="8" y1="16" x2="8" y2="16" strokeWidth="3" />
      <line x1="16" y1="16" x2="16" y2="16" strokeWidth="3" />
    </svg>
  ),
  Gamepad: () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="6" y1="12" x2="10" y2="12" /><line x1="8" y1="10" x2="8" y2="14" />
      <circle cx="15" cy="12" r="1" fill="currentColor" /><circle cx="17" cy="10" r="1" fill="currentColor" />
      <rect x="2" y="8" width="20" height="8" rx="4" />
    </svg>
  ),
  Wifi: () => (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <path d="M5 12.55a11 11 0 0114.08 0" /><path d="M1.42 9a16 16 0 0121.16 0" />
      <path d="M8.53 16.11a6 6 0 016.95 0" /><circle cx="12" cy="20" r="1" fill="currentColor" />
    </svg>
  ),
  WifiOff: () => (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <line x1="1" y1="1" x2="23" y2="23" />
      <path d="M16.72 11.06A10.94 10.94 0 0119 12.55" /><path d="M5 12.55a11 11 0 015.17-2.39" />
      <path d="M10.71 5.05A16 16 0 0122.56 9" /><path d="M1.42 9a15.91 15.91 0 014.7-2.88" />
      <path d="M8.53 16.11a6 6 0 016.95 0" /><circle cx="12" cy="20" r="1" fill="currentColor" />
    </svg>
  ),
  Zap: () => (<svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" /></svg>),
  Check: () => (<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round"><polyline points="20 6 9 17 4 12" /></svg>),
  Cloud: () => (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <path d="M18 10h-1.26A8 8 0 1 0 9 20h9a5 5 0 0 0 0-10z" />
    </svg>
  ),
};

// ── Dirección → símbolo ────────────────────────────────────
const DIR_MAP: Record<string, string> = {
  F: "↑", B: "↓", L: "←", R: "→", I: "↗", G: "↖", J: "↘", H: "↙", S: "■"
};

const SENSOR_LABELS = ["FRONT·IZQ", "FRONT·CTR", "FRONT·DER", "LAT·IZQ", "LAT·DER"];
const SENSOR_KEYS: (keyof SensorData)[] = ["d1", "d2", "d3", "d4", "d5"];

// ── CSS ────────────────────────────────────────────────────
const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Share+Tech+Mono&family=Barlow+Condensed:wght@400;600;700&display=swap');
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
html,body{width:100%;height:100%;background:#080808;overflow:hidden}
#root{width:100vw;height:100vh;display:flex;flex-direction:column;overflow:hidden}
body{font-family:'Barlow Condensed',sans-serif;color:#F0E8D0}

/* diagonal stripe bg */
body::before{
  content:'';pointer-events:none;position:fixed;inset:0;
  background:repeating-linear-gradient(-55deg,transparent 0px,transparent 28px,rgba(255,214,0,0.014) 28px,rgba(255,214,0,0.014) 30px);
  z-index:0;
}

/* horizontal scan line */
@keyframes scanH{0%{transform:translateX(-100%)}100%{transform:translateX(100vw)}}
body::after{
  content:'';pointer-events:none;position:fixed;top:0;left:0;width:80px;height:100%;
  background:linear-gradient(90deg,transparent,rgba(255,214,0,0.035),transparent);
  animation:scanH 7s linear infinite;z-index:0;
}

/* scanlines overlay */
.scanlines{
  pointer-events:none;position:fixed;inset:0;z-index:0;
  background:repeating-linear-gradient(0deg,transparent,transparent 3px,rgba(0,0,0,0.12) 3px,rgba(0,0,0,0.12) 4px);
}

@keyframes pulse    {0%,100%{opacity:1}50%{opacity:.25}}
@keyframes fadeUp   {from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:none}}
@keyframes flicker  {0%,100%{opacity:1}92%{opacity:.82}94%{opacity:1}96%{opacity:.65}98%{opacity:1}}
@keyframes glow     {0%,100%{box-shadow:0 0 12px #FF1E1E55}50%{box-shadow:0 0 28px #FF1E1Eaa}}
@keyframes slideIn  {from{opacity:0;transform:translateX(-8px)}to{opacity:1;transform:none}}
@keyframes blink    {0%,49%{opacity:1}50%,100%{opacity:0}}

.main-grid{
  display:grid;
  grid-template-columns:1fr 1fr;
  grid-template-rows:1fr 1fr;
  gap:8px;padding:8px;
  flex:1;min-height:0;
  position:relative;z-index:1;
}
@media(max-width:700px){
  .main-grid{grid-template-columns:1fr;grid-template-rows:none;overflow-y:auto}
}

.panel{
  background:linear-gradient(145deg,#0f0f0f,#0a0a0a);
  border:1px solid #1e1e1e;
  border-radius:10px;
  padding:14px 16px;
  display:flex;flex-direction:column;
  min-width:0;min-height:0;overflow:hidden;
  position:relative;
}
.panel::before{
  content:'';position:absolute;top:0;left:16px;right:16px;height:1px;
  background:linear-gradient(90deg,transparent,#FF1E1E,#FFD600,#FF1E1E,transparent);
}
.panel::after{
  content:'';position:absolute;inset:0;border-radius:10px;
  box-shadow:inset 0 0 40px rgba(0,0,0,0.5);
  pointer-events:none;
}

.ptitle{
  font-family:'Bebas Neue',sans-serif;
  font-size:13px;letter-spacing:5px;
  color:#FFD600;
  border-bottom:1px solid #1a1a1a;
  padding-bottom:8px;margin-bottom:12px;
  flex-shrink:0;
  text-shadow:0 0 14px #FFD60044;
  display:flex;align-items:center;gap:8px;
}
.ptitle-dot{
  width:5px;height:5px;border-radius:50%;
  background:#FF1E1E;
  box-shadow:0 0 6px #FF1E1E;
  animation:pulse 2s infinite;
  flex-shrink:0;
}

.log-box{
  flex:1;overflow-y:auto;min-height:0;
  background:#060606;border:1px solid #141414;
  border-radius:6px;padding:8px 10px;
  display:flex;flex-direction:column;gap:3px;
}
.log-row{
  display:flex;gap:10px;font-size:10.5px;
  font-family:'Share Tech Mono',monospace;
  animation:slideIn .2s ease;
  padding:2px 0;
  border-bottom:1px solid #0e0e0e;
}
.log-row:last-child{border-bottom:none}
.log-time{color:#2a2a2a;flex-shrink:0;width:56px}
.log-msg{color:#666}

/* sensor bars */
.sbar-wrap{margin-bottom:13px}
.sbar-wrap:last-child{margin-bottom:0}
.sbar-header{display:flex;justify-content:space-between;margin-bottom:5px;align-items:center}
.sbar-label{font-family:'Share Tech Mono',monospace;font-size:9px;letter-spacing:2px;color:#333}
.sbar-value{font-family:'Share Tech Mono',monospace;font-size:12px;font-variant-numeric:tabular-nums}
.sbar-track{height:7px;background:#111;border-radius:2px;overflow:hidden;position:relative}
.sbar-track::before{content:'';position:absolute;inset:0;background:repeating-linear-gradient(90deg,rgba(255,255,255,0.015) 0px,rgba(255,255,255,0.015) 1px,transparent 1px,transparent 20px)}
.sbar-fill{height:100%;border-radius:2px;transition:width .3s,background .3s}

::-webkit-scrollbar{width:3px}
::-webkit-scrollbar-track{background:#0a0a0a}
::-webkit-scrollbar-thumb{background:#FF1E1E33;border-radius:2px}

.badge{
  display:inline-flex;align-items:center;gap:6px;
  padding:4px 12px;border-radius:3px;
  font-family:'Share Tech Mono',monospace;
  font-size:9px;letter-spacing:3px;
}

/* direction pad display */
.dpad-grid{
  display:grid;grid-template-columns:repeat(3,1fr);grid-template-rows:repeat(3,1fr);
  gap:5px;
}
.dpad-cell{
  aspect-ratio:1;border-radius:5px;
  display:flex;align-items:center;justify-content:center;
  font-size:18px;transition:all .15s;
  border:1px solid #1a1a1a;background:#0c0c0c;
  color:#222;
}
.dpad-cell.active-dir{
  background:#FFD600;color:#000;border-color:#FFD600;
  box-shadow:0 0 18px #FFD60077;
  font-size:22px;
}
.dpad-cell.stop-dir{background:#111;color:#FFD600;border-color:#2a2000}
.dpad-cell.stop-dir.active-dir{background:#FFD600;color:#000;box-shadow:0 0 18px #FFD60077}

/* online indicator blink */
.online-blink{animation:blink 1s step-start infinite}
`;

// ── CarDiagram ─────────────────────────────────────────────
function CarDiagram({ sensores }: { sensores: SensorData }) {
  const beam = (v: number, max: number) => clamp(Math.round((1 - v / 400) * max), 4, max);
  const col = (k: keyof SensorData) => distColor(sensores[k]);
  const alp = (v: number) => clamp(0.08 + (1 - v / 400) * 0.92, 0.08, 1);

  const CX = 150, CY = 180, CW = 86, CH = 108;
  const L = CX - CW / 2, R = CX + CW / 2, T = CY - CH / 2, B = CY + CH / 2;

  const beams = [
    { x1: L + 16, y1: T, x2: L + 16, y2: T - beam(sensores.d1, 72), c: col("d1"), a: alp(sensores.d1), v: sensores.d1, dx: 0, dy: -10 },
    { x1: CX, y1: T, x2: CX, y2: T - beam(sensores.d2, 90), c: col("d2"), a: alp(sensores.d2), v: sensores.d2, dx: 0, dy: -10 },
    { x1: R - 16, y1: T, x2: R - 16, y2: T - beam(sensores.d3, 72), c: col("d3"), a: alp(sensores.d3), v: sensores.d3, dx: 0, dy: -10 },
    { x1: L, y1: CY, x2: L - beam(sensores.d4, 62), y2: CY, c: col("d4"), a: alp(sensores.d4), v: sensores.d4, dx: -14, dy: 3 },
    { x1: R, y1: CY, x2: R + beam(sensores.d5, 62), y2: CY, c: col("d5"), a: alp(sensores.d5), v: sensores.d5, dx: 14, dy: 3 },
  ];

  return (
    <svg viewBox="50 55 200 245" style={{ width: "100%", height: "100%", display: "block" }}>
      {/* Grid */}
      {[80, 110, 150, 190, 220].map(x => <line key={`gx${x}`} x1={x} y1="60" x2={x} y2="295" stroke="#131313" strokeWidth="1" />)}
      {[80, 110, 140, 170, 200, 240, 275].map(y => <line key={`gy${y}`} x1="55" y1={y} x2="245" y2={y} stroke="#131313" strokeWidth="1" />)}

      {/* Sensor beams + dots + labels */}
      {beams.map((b, i) => (
        <g key={i}>
          {/* Glow line */}
          <line x1={b.x1} y1={b.y1} x2={b.x2} y2={b.y2}
            stroke={b.c} strokeWidth="4" opacity={b.a * 0.2} strokeLinecap="round" />
          {/* Main line */}
          <line x1={b.x1} y1={b.y1} x2={b.x2} y2={b.y2}
            stroke={b.c} strokeWidth="2" opacity={b.a} strokeLinecap="round" />
          {/* Endpoint dot */}
          <circle cx={b.x2} cy={b.y2} r={i === 1 ? 5 : 4} fill={b.c} opacity={b.a}
            style={{ filter: `drop-shadow(0 0 6px ${b.c})` }} />
          {/* Tick marks */}
          {[0.33, 0.66].map((s, j) => (
            <circle key={j} cx={b.x1 + (b.x2 - b.x1) * s} cy={b.y1 + (b.y2 - b.y1) * s}
              r="1.5" fill={b.c} opacity={b.a * 0.4} />
          ))}
          {/* Value label */}
          <text x={b.x2 + b.dx} y={b.y2 + b.dy} textAnchor="middle"
            fill={b.c} fontSize="8" fontFamily="'Share Tech Mono',monospace" opacity={b.a}>
            {b.v.toFixed(0)}
          </text>
        </g>
      ))}

      {/* Wheels */}
      {([[L - 18, T + 10], [R + 1, T + 10], [L - 18, B - 42], [R + 1, B - 42]] as [number, number][]).map(([wx, wy], i) => (
        <g key={`w${i}`}>
          <rect x={wx} y={wy} width="17" height="32" rx="4"
            fill="#101010" stroke="#252525" strokeWidth="1.5" />
          <rect x={wx + 3} y={wy + 3} width="11" height="26" rx="3"
            fill="none" stroke="#1e1e1e" strokeWidth="1" />
          <circle cx={wx + 8.5} cy={wy + 16} r="4" fill="#0a0a0a" stroke="#333" strokeWidth="1" />
        </g>
      ))}

      {/* Car body shadow */}
      <rect x={L + 2} y={T + 2} width={CW} height={CH} rx="10" fill="#FF1E1E" opacity="0.06" />

      {/* Car body */}
      <rect x={L} y={T} width={CW} height={CH} rx="10"
        fill="url(#carGrad)" stroke="#FF1E1E" strokeWidth="1.5" />

      <defs>
        <linearGradient id="carGrad" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#1c1c1c" />
          <stop offset="100%" stopColor="#0e0e0e" />
        </linearGradient>
        <clipPath id="carClip">
          <rect x={L} y={T} width={CW} height={CH} rx="10" />
        </clipPath>
      </defs>

      {/* Racing stripes */}
      <g clipPath="url(#carClip)">
        <line x1={L} y1={T + 22} x2={R} y2={B - 8} stroke="#FFD600" strokeWidth="18" opacity="0.04" />
        <line x1={L + 18} y1={T} x2={R} y2={B - 35} stroke="#FFD600" strokeWidth="10" opacity="0.03" />
        <line x1={L} y1={T} x2={R} y2={B} stroke="#FF1E1E" strokeWidth="1" opacity="0.07" />
      </g>

      {/* Windshield */}
      <rect x={L + 7} y={T + 9} width={CW - 14} height={CH * 0.38} rx="5"
        fill="#0b0b0b" stroke="#1e1e1e" strokeWidth="1" />
      <line x1={L + 12} y1={T + 13} x2={L + 17} y2={T + CH * 0.38 + 5}
        stroke="#ffffff07" strokeWidth="5" strokeLinecap="round" />

      {/* Headlights */}
      {[[L + 4, T + 2], [R - 24, T + 2]].map(([hx, hy], i) => (
        <g key={`hl${i}`}>
          <rect x={hx} y={hy} width="20" height="8" rx="3"
            fill="#FFD60033" stroke="#FFD600" strokeWidth="0.8"
            style={{ filter: "drop-shadow(0 0 6px #FFD600)" }} />
          <rect x={hx + 3} y={hy + 1.5} width="14" height="5" rx="2" fill="#FFD60066" />
        </g>
      ))}

      {/* Taillights */}
      {[[L + 4, B - 10], [R - 24, B - 10]].map(([tx, ty], i) => (
        <rect key={`tl${i}`} x={tx} y={ty} width="20" height="7" rx="3"
          fill="#FF1E1E33" stroke="#FF1E1E" strokeWidth="0.8"
          style={{ filter: "drop-shadow(0 0 5px #FF1E1E)" }} />
      ))}

      {/* ESP32 chip */}
      <rect x={CX - 20} y={CY - 12} width="40" height="24" rx="4"
        fill="#080808" stroke="#2a2a2a" strokeWidth="1.5" />
      {([-10, -3, 3, 10] as number[]).map(dx => (
        <g key={`p${dx}`}>
          <rect x={CX + dx - 2} y={CY - 16} width="4" height="4" rx="1" fill="#2a2a2a" />
          <rect x={CX + dx - 2} y={CY + 12} width="4" height="4" rx="1" fill="#2a2a2a" />
        </g>
      ))}
      <text x={CX} y={CY + 4} textAnchor="middle"
        fill="#FFD600" fontSize="8" fontFamily="'Share Tech Mono',monospace" letterSpacing="2">
        ESP32
      </text>
      {/* chip blink LED */}
      <circle cx={CX + 16} cy={CY - 8} r="2.5" fill="#00FF88"
        style={{ filter: "drop-shadow(0 0 4px #00FF88)", animation: "pulse 1.5s infinite" }} />
    </svg>
  );
}

// ── IAPanel ────────────────────────────────────────────────
function IAPanel({ modo, iaLabel, iaConf }: { modo: ModoType; iaLabel: string; iaConf: number }) {
  const isAuto = modo === "auto";
  const confPct = Math.round(iaConf * 100);
  const actions = ["avanzar", "seguir_recto", "girar_derecha", "girar_izquierda"];

  return (
    <div style={{
      background: "#060606", border: "1px solid #1a1a1a",
      borderRadius: 8, padding: "14px",
      flex: 1, display: "flex", flexDirection: "column", gap: 10,
      position: "relative", overflow: "hidden",
    }}>
      {/* Corner accents */}
      {([[0, 0, "top", "left"], [0, 0, "top", "right"], [0, 0, "bottom", "left"], [0, 0, "bottom", "right"]] as const).map((_, i) => (
        <div key={i} style={{
          position: "absolute",
          [["top", "top", "bottom", "bottom"][i]]: 0,
          [["left", "right", "left", "right"][i]]: 0,
          width: 10, height: 10,
          borderTop: i < 2 ? `1.5px solid ${i === 0 ? "#FF1E1E" : "#FFD600"}` : "none",
          borderBottom: i >= 2 ? `1.5px solid ${i === 2 ? "#FF1E1E" : "#FFD600"}` : "none",
          borderLeft: [0, 2].includes(i) ? `1.5px solid ${i === 0 ? "#FF1E1E" : "#FF1E1E"}` : "none",
          borderRight: [1, 3].includes(i) ? `1.5px solid ${i === 1 ? "#FFD600" : "#FFD600"}` : "none",
        }} />
      ))}

      {/* Mode badge */}
      <div style={{ textAlign: "center" }}>
        <span className="badge" style={{
          background: isAuto ? "#FF1E1E18" : "#FFD60012",
          border: `1px solid ${isAuto ? "#FF1E1E55" : "#FFD60044"}`,
          color: isAuto ? "#FF6060" : "#FFD600",
        }}>
          {isAuto ? <><Icon.Bot /> AUTO-IA</> : <><Icon.Gamepad /> MANUAL</>}
        </span>
      </div>

      {/* Label */}
      <div style={{
        textAlign: "center",
        fontFamily: "'Bebas Neue',sans-serif",
        fontSize: 28, letterSpacing: 6,
        color: isAuto ? "#fff" : "#2a2a2a",
        textShadow: isAuto ? "0 0 24px #FF1E1E55" : "none",
        minHeight: 34, lineHeight: 1,
        animation: isAuto && iaLabel !== "---" ? "flicker 5s infinite" : "none",
        transition: "color .3s",
      }}>
        {isAuto ? iaLabel.replace("_", " ").toUpperCase() : "— ESPERA —"}
      </div>

      {/* Confidence */}
      <div>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5 }}>
          <span style={{ fontFamily: "'Share Tech Mono',monospace", fontSize: 9, letterSpacing: 2, color: "#333" }}>
            CONFIANZA
          </span>
          <span style={{ fontFamily: "'Share Tech Mono',monospace", fontSize: 11, color: "#FFD600" }}>
            {isAuto ? `${confPct}%` : "--"}
          </span>
        </div>
        <div style={{ height: 5, background: "#111", borderRadius: 2, overflow: "hidden" }}>
          <div style={{
            width: isAuto ? `${confPct}%` : "0%", height: "100%",
            background: "linear-gradient(90deg,#FF1E1E,#FFD600)",
            boxShadow: "0 0 8px #FF1E1E66", borderRadius: 2,
            transition: "width .4s ease",
          }} />
        </div>
      </div>

      {/* Actions */}
      <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
        {actions.map(a => {
          const active = isAuto && iaLabel === a;
          return (
            <div key={a} style={{
              padding: "6px 10px", borderRadius: 4,
              background: active ? "#FFD60010" : "#0a0a0a",
              border: `1px solid ${active ? "#FFD60044" : "#111"}`,
              display: "flex", alignItems: "center", gap: 8,
              transition: "all .25s",
            }}>
              <div style={{
                width: 5, height: 5, borderRadius: "50%",
                background: active ? "#FFD600" : "#1e1e1e",
                boxShadow: active ? "0 0 8px #FFD600" : "none",
                transition: "all .25s", flexShrink: 0,
              }} />
              <span style={{
                fontFamily: "'Share Tech Mono',monospace",
                fontSize: 10, letterSpacing: 1,
                color: active ? "#FFD600" : "#2a2a2a",
                transition: "color .25s",
              }}>
                {a.replace("_", " ").toUpperCase()}
              </span>
              {active && (
                <span style={{ marginLeft: "auto", fontSize: 9, color: "#FFD60088", fontFamily: "'Share Tech Mono',monospace" }}>
                  ▶ ACTIVO
                </span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── APP ────────────────────────────────────────────────────
export default function CarritoApp() {
  const [online, setOnline] = useState(false);
  const [modo, setModo] = useState<ModoType>("manual");
  const [sensores, setSensores] = useState<SensorData>({ d1: 400, d2: 400, d3: 400, d4: 400, d5: 400 });
  const [iaLabel, setIaLabel] = useState("---");
  const [iaConf, setIaConf] = useState(0);
  const [dir, setDir] = useState("S");
  const [vel, setVel] = useState("--");
  const [lastSeen, setLastSeen] = useState<Date | null>(null);
  const [log, setLog] = useState<LogEntry[]>([]);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const addLog = useCallback((msg: string) =>
    setLog(p => [{ t: new Date().toLocaleTimeString("es", { hour12: false }), msg }, ...p].slice(0, 50))
    , []);

  useEffect(() => {
    const el = document.createElement("style");
    el.textContent = CSS;
    document.head.appendChild(el);
    return () => { document.head.removeChild(el); };
  }, []);

  // ── Firebase listener ──────────────────────────────────
  useEffect(() => {
    const carRef = ref(db, "carrito");
    const unsub = onValue(carRef, snap => {
      if (!snap.exists()) return;
      const d: FirebaseData = snap.val();

      const newSensores: SensorData = {
        d1: parseFloat(d.d1 ?? "400"),
        d2: parseFloat(d.d2 ?? "400"),
        d3: parseFloat(d.d3 ?? "400"),
        d4: parseFloat(d.d4 ?? "400"),
        d5: parseFloat(d.d5 ?? "400"),
      };
      setSensores(newSensores);
      setIaLabel(d.ia ?? "---");
      setIaConf(parseFloat(d.conf ?? "0"));
      setModo((d.modo ?? "manual") as ModoType);
      setDir(d.direccion ?? "S");
      setVel(d.velocidad ?? "--");
      setLastSeen(new Date());

      // Log cambios de modo
      if (d.modo && d.modo !== modo) {
        addLog(`[MODE] → ${d.modo === "auto" ? "AUTÓNOMO" : "MANUAL"}`);
      }
      // Log peligro
      const dists = Object.values(newSensores);
      if (dists.some(v => v < 20)) addLog("[WARN] ¡Obstáculo muy cercano!");

      // Online status: si recibimos datos → online; timeout 5s → offline
      setOnline(true);
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      timeoutRef.current = setTimeout(() => setOnline(false), 5000);
    });
    return () => { unsub(); if (timeoutRef.current) clearTimeout(timeoutRef.current); };
  }, [modo, addLog]);

  const isAuto = modo === "auto";
  const dpadMap = [
    ["G", "↖"], ["F", "↑"], ["I", "↗"],
    ["L", "←"], ["S", "■"], ["R", "→"],
    ["H", "↙"], ["B", "↓"], ["J", "↘"],
  ];

  return (
    <div style={{ width: "100vw", height: "100vh", display: "flex", flexDirection: "column", background: "#080808", overflow: "hidden", position: "relative", zIndex: 1 }}>
      <div className="scanlines" />

      {/* ── HEADER ── */}
      <header style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "0 20px", height: 50,
        background: "#0a0a0a",
        borderBottom: "1px solid #151515",
        flexShrink: 0, gap: 12, position: "relative", zIndex: 2,
      }}>
        {/* Bottom line gradient */}
        <div style={{
          position: "absolute", bottom: 0, left: 0, right: 0, height: 1,
          background: "linear-gradient(90deg,transparent,#FF1E1E,#FFD600,#FF1E1E44,transparent)",
        }} />

        {/* LOGO */}
        <div style={{ display: "flex", alignItems: "center", gap: 10, flexShrink: 0 }}>
          <svg width="28" height="28" viewBox="0 0 28 28">
            <polygon points="14,2 26,8 26,20 14,26 2,20 2,8"
              fill="none" stroke="url(#logoGrad)" strokeWidth="1.5" />
            <polygon points="14,6 22,10 22,18 14,22 6,18 6,10"
              fill="url(#logoFill)" />
            <text x="14" y="18" textAnchor="middle"
              fill="#000" fontSize="11" fontWeight="900"
              fontFamily="'Bebas Neue',sans-serif">C</text>
            <defs>
              <linearGradient id="logoGrad" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor="#FF1E1E" />
                <stop offset="100%" stopColor="#FFD600" />
              </linearGradient>
              <linearGradient id="logoFill" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor="#FF1E1E" />
                <stop offset="100%" stopColor="#FFD600" />
              </linearGradient>
            </defs>
          </svg>
          <div>
            <div style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: 20, letterSpacing: 5, color: "#fff", lineHeight: 1 }}>
              CARRITO<span style={{ color: "#FFD600" }}>BT</span>
            </div>
            <div style={{ fontFamily: "'Share Tech Mono',monospace", fontSize: 8, letterSpacing: 3, color: "#333" }}>
              LIVE DASHBOARD
            </div>
          </div>
        </div>

        {/* CENTER STATUS */}
        <div style={{ flex: 1, display: "flex", justifyContent: "center", gap: 16, alignItems: "center" }}>
          {/* Online badge */}
          <div className="badge" style={{
            background: online ? "#FFD60010" : "#FF1E1E0a",
            border: `1px solid ${online ? "#FFD60035" : "#FF1E1E35"}`,
          }}>
            <span style={{
              width: 6, height: 6, borderRadius: "50%",
              background: online ? "#FFD600" : "#FF1E1E",
              boxShadow: online ? "0 0 8px #FFD600" : "0 0 8px #FF1E1E",
              animation: online ? "none" : "pulse 1.2s infinite",
            }} />
            <span style={{ color: online ? "#FFD600" : "#FF6060" }}>
              {online ? <><Icon.Cloud />&nbsp;ONLINE</> : <><Icon.WifiOff />&nbsp;OFFLINE</>}
            </span>
          </div>

          {/* Modo badge */}
          <div className="badge" style={{
            background: isAuto ? "#FF1E1E15" : "#1a1a1a",
            border: `1px solid ${isAuto ? "#FF1E1E44" : "#2a2a2a"}`,
            color: isAuto ? "#FF8080" : "#555",
          }}>
            {isAuto ? <><Icon.Bot />&nbsp;AUTÓNOMO</> : <><Icon.Gamepad />&nbsp;MANUAL</>}
          </div>
        </div>

        {/* Last seen */}
        <div style={{ fontFamily: "'Share Tech Mono',monospace", fontSize: 9, color: "#222", textAlign: "right", flexShrink: 0 }}>
          <div style={{ color: "#2e2e2e", marginBottom: 2 }}>ÚLTIMO DATO</div>
          <div style={{ color: online ? "#FFD60066" : "#333" }}>
            {lastSeen ? lastSeen.toLocaleTimeString("es", { hour12: false }) : "—"}
          </div>
        </div>
      </header>

      {/* ── MAIN GRID ── */}
      <div className="main-grid">

        {/* PANEL 1 — SENSORES */}
        <div className="panel">
          <div className="ptitle">
            <span className="ptitle-dot" />
            SENSORES ULTRASÓNICOS
          </div>
          <div style={{ display: "flex", flexDirection: "column", flex: 1, justifyContent: "center" }}>
            {SENSOR_KEYS.map((k, i) => {
              const v = sensores[k];
              const p = pct(v);
              const c = distColor(v);
              return (
                <div key={k} className="sbar-wrap">
                  <div className="sbar-header">
                    <span className="sbar-label">{SENSOR_LABELS[i]}</span>
                    <span className="sbar-value" style={{ color: c }}>
                      {v.toFixed(0)}<span style={{ fontSize: 9, color: "#333", marginLeft: 2 }}>cm</span>
                    </span>
                  </div>
                  <div className="sbar-track">
                    <div className="sbar-fill" style={{
                      width: `${p}%`,
                      background: `linear-gradient(90deg,${c}55,${c})`,
                      boxShadow: `0 0 8px ${c}77`,
                    }} />
                  </div>
                </div>
              );
            })}
          </div>

          {/* Velocity + Direction mini-row */}
          <div style={{
            marginTop: 12, paddingTop: 10, borderTop: "1px solid #151515",
            display: "flex", gap: 12, alignItems: "center",
          }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontFamily: "'Share Tech Mono',monospace", fontSize: 8, letterSpacing: 2, color: "#333", marginBottom: 4 }}>
                VEL PWM
              </div>
              <div style={{ display: "flex", alignItems: "flex-end", gap: 6 }}>
                <span style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: 28, color: "#FFD600", lineHeight: 1, textShadow: "0 0 12px #FFD60055" }}>
                  {vel}
                </span>
                <span style={{ color: "#2a2a2a", fontSize: 10, marginBottom: 4 }}>/1023</span>
              </div>
            </div>
            <div style={{ width: 1, height: 36, background: "#1a1a1a" }} />
            <div style={{ flex: 1 }}>
              <div style={{ fontFamily: "'Share Tech Mono',monospace", fontSize: 8, letterSpacing: 2, color: "#333", marginBottom: 4 }}>
                DIRECCIÓN
              </div>
              <div style={{
                fontFamily: "'Bebas Neue',sans-serif",
                fontSize: 32, lineHeight: 1,
                color: dir === "S" ? "#333" : "#FFD600",
                textShadow: dir !== "S" ? "0 0 16px #FFD60088" : "none",
              }}>
                {DIR_MAP[dir] || "■"}
              </div>
            </div>
          </div>
        </div>

        {/* PANEL 2 — MAPA */}
        <div className="panel" style={{ overflow: "visible" }}>
          <div className="ptitle">
            <span className="ptitle-dot" style={{ background: "#FFD600", boxShadow: "0 0 6px #FFD600" }} />
            MAPA DE PROXIMIDAD
          </div>
          <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", minHeight: 0, padding: "4px 0" }}>
            <CarDiagram sensores={sensores} />
          </div>
        </div>

        {/* PANEL 3 — CONTROL + DPAD DISPLAY */}
        <div className="panel">
          <div className="ptitle">
            <span className="ptitle-dot" style={{ background: isAuto ? "#FF1E1E" : "#FFD600", boxShadow: `0 0 6px ${isAuto ? "#FF1E1E" : "#FFD600"}` }} />
            MODO &amp; CONTROL
          </div>

          {/* Modo indicator */}
          <div style={{
            padding: "14px 0 12px",
            display: "flex", alignItems: "center", justifyContent: "center",
            background: `linear-gradient(90deg,transparent,${isAuto ? "#FF1E1E08" : "#FFD60008"},transparent)`,
            borderRadius: 6, marginBottom: 12,
            border: `1px solid ${isAuto ? "#FF1E1E22" : "#FFD60018"}`,
          }}>
            <div style={{
              fontFamily: "'Bebas Neue',sans-serif",
              fontSize: 34, letterSpacing: 8,
              color: isAuto ? "#FF1E1E" : "#FFD600",
              textShadow: `0 0 30px ${isAuto ? "#FF1E1E77" : "#FFD60055"}`,
              animation: isAuto ? "glow 2s infinite" : "none",
              display: "flex", alignItems: "center", gap: 12,
            }}>
              {isAuto ? <Icon.Bot /> : <Icon.Gamepad />}
              {isAuto ? "AUTÓNOMO" : "MANUAL"}
            </div>
          </div>

          {/* D-Pad display — muestra dirección en tiempo real */}
          <div style={{ marginBottom: 12 }}>
            <div style={{ fontFamily: "'Share Tech Mono',monospace", fontSize: 8, letterSpacing: 2, color: "#252525", marginBottom: 8, textAlign: "center" }}>
              DIRECCIÓN ACTUAL
            </div>
            <div className="dpad-grid" style={{ maxWidth: 160, margin: "0 auto" }}>
              {dpadMap.map(([cmd, symbol]) => {
                const isActive = dir === cmd;
                const isStop = cmd === "S";
                return (
                  <div key={cmd} className={`dpad-cell${isStop ? " stop-dir" : ""}${isActive ? " active-dir" : ""}`}>
                    {symbol}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Nota de uso */}
          <div style={{
            marginTop: "auto", padding: "10px 12px",
            background: "#0a0a0a", borderRadius: 6, border: "1px solid #141414",
          }}>
            <div style={{ fontFamily: "'Share Tech Mono',monospace", fontSize: 9, color: "#2a2a2a", lineHeight: 1.7 }}>
              <div style={{ color: "#FF1E1E44", marginBottom: 4 }}>// CONTROLES</div>
              <div>→ App Android  <span style={{ color: "#FFD60044" }}>⟶</span>  Firebase</div>
              <div>→ Dashboard    <span style={{ color: "#FFD60044" }}>⟶</span>  Tiempo real</div>
              <div style={{ marginTop: 4, color: online ? "#FFD60055" : "#FF1E1E33" }}>
                {online
                  ? <><Icon.Check /> <span style={{ color: "#00FF8844" }}>stream activo</span></>
                  : "⚠ esperando datos…"}
              </div>
            </div>
          </div>
        </div>

        {/* PANEL 4 — IA + LOG */}
        <div className="panel">
          <div className="ptitle">
            <span className="ptitle-dot" style={{ background: "#FF1E1E", animation: "none" }} />
            INTELIGENCIA ARTIFICIAL
          </div>

          <IAPanel modo={modo} iaLabel={iaLabel} iaConf={iaConf} />

          <div className="ptitle" style={{ marginTop: 12, marginBottom: 8 }}>
            <span className="ptitle-dot" style={{ width: 4, height: 4, animation: `blink 1s step-start infinite` }} />
            LOG DEL SISTEMA
          </div>
          <div className="log-box">
            {log.length === 0
              ? <span style={{ fontFamily: "'Share Tech Mono',monospace", fontSize: 10, color: "#1a1a1a" }}>
                _ en espera de eventos…<span style={{ animation: "blink 1s step-start infinite", display: "inline-block" }}>█</span>
              </span>
              : log.map((e, i) => (
                <div key={i} className="log-row">
                  <span className="log-time">{e.t}</span>
                  <span className="log-msg" style={{
                    color: e.msg.startsWith("[WARN]") ? "#FF8C00"
                      : e.msg.startsWith("[MODE]") ? "#FFD600"
                        : e.msg.startsWith("[ERR]") ? "#FF1E1E"
                          : "#444",
                  }}>
                    {e.msg}
                  </span>
                </div>
              ))}
          </div>
        </div>

      </div>
    </div>
  );
}