import { useState, useEffect, useRef, useCallback } from "react";

// ── Web Bluetooth API types ────────────────────────────────
interface BluetoothRemoteGATTCharacteristic extends EventTarget {
  writeValueWithoutResponse(value: BufferSource): Promise<void>;
  startNotifications(): Promise<BluetoothRemoteGATTCharacteristic>;
  addEventListener(type: "characteristicvaluechanged", listener: (e: Event) => void): void;
  value: DataView | null;
}

interface BluetoothRemoteGATTService {
  getCharacteristic(uuid: string): Promise<BluetoothRemoteGATTCharacteristic>;
}

interface BluetoothRemoteGATTServer {
  connect(): Promise<BluetoothRemoteGATTServer>;
  getPrimaryService(uuid: string): Promise<BluetoothRemoteGATTService>;
  disconnect(): void;
}

interface BluetoothDevice extends EventTarget {
  gatt: BluetoothRemoteGATTServer | null;
  addEventListener(type: "gattserverdisconnected", listener: () => void): void;
}

interface BluetoothRequestDeviceOptions {
  filters?: Array<{ name?: string; namePrefix?: string; services?: string[] }>;
  optionalServices?: string[];
}

interface Bluetooth {
  requestDevice(options: BluetoothRequestDeviceOptions): Promise<BluetoothDevice>;
}

declare global {
  interface Navigator {
    bluetooth: Bluetooth;
  }
}

// ── Types ──────────────────────────────────────────────────
interface SensorData {
  d1: number;
  d2: number;
  d3: number;
  d4: number;
  d5: number;
}

interface BLENotificationEvent extends Event {
  target: BluetoothRemoteGATTCharacteristic & EventTarget;
}

interface ParsedBLEData {
  d1?: string | number;
  d2?: string | number;
  d3?: string | number;
  d4?: string | number;
  d5?: string | number;
  ia?: string;
  conf?: string | number;
  modo?: string;
}

interface LogEntry {
  t: string;
  msg: string;
}

type VelKey = "1" | "3" | "q";
type ModoType = "manual" | "auto";

// ── SVG Icons ──────────────────────────────────────────────
const Icon = {
  Up: () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="18 15 12 9 6 15" />
    </svg>
  ),
  Down: () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="6 9 12 15 18 9" />
    </svg>
  ),
  Left: () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="15 18 9 12 15 6" />
    </svg>
  ),
  Right: () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="9 18 15 12 9 6" />
    </svg>
  ),
  UpLeft: () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="17 7 7 7 7 17" />
      <line x1="17" y1="17" x2="7" y2="7" />
    </svg>
  ),
  UpRight: () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="7 7 17 7 17 17" />
      <line x1="7" y1="17" x2="17" y2="7" />
    </svg>
  ),
  DownLeft: () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="17 17 7 17 7 7" />
      <line x1="17" y1="7" x2="7" y2="17" />
    </svg>
  ),
  DownRight: () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="7 17 17 17 17 7" />
      <line x1="7" y1="7" x2="17" y2="17" />
    </svg>
  ),
  Stop: () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
      <rect x="4" y="4" width="16" height="16" rx="2" />
    </svg>
  ),
  Wifi: () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <path d="M5 12.55a11 11 0 0114.08 0" />
      <path d="M1.42 9a16 16 0 0121.16 0" />
      <path d="M8.53 16.11a6 6 0 016.95 0" />
      <circle cx="12" cy="20" r="1" fill="currentColor" />
    </svg>
  ),
  WifiOff: () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <line x1="1" y1="1" x2="23" y2="23" />
      <path d="M16.72 11.06A10.94 10.94 0 0119 12.55" />
      <path d="M5 12.55a11 11 0 015.17-2.39" />
      <path d="M10.71 5.05A16 16 0 0122.56 9" />
      <path d="M1.42 9a15.91 15.91 0 014.7-2.88" />
      <path d="M8.53 16.11a6 6 0 016.95 0" />
      <circle cx="12" cy="20" r="1" fill="currentColor" />
    </svg>
  ),
  Bot: () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="11" width="18" height="10" rx="2" />
      <circle cx="12" cy="5" r="2" />
      <line x1="12" y1="7" x2="12" y2="11" />
      <line x1="8" y1="16" x2="8" y2="16" strokeWidth="3" />
      <line x1="16" y1="16" x2="16" y2="16" strokeWidth="3" />
    </svg>
  ),
  Gamepad: () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="6" y1="12" x2="10" y2="12" />
      <line x1="8" y1="10" x2="8" y2="14" />
      <circle cx="15" cy="12" r="1" fill="currentColor" />
      <circle cx="17" cy="10" r="1" fill="currentColor" />
      <rect x="2" y="8" width="20" height="8" rx="4" />
    </svg>
  ),
  Zap: () => (
    <svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor">
      <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
    </svg>
  ),
  Refresh: () => (
    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
      <polyline points="23 4 23 10 17 10" />
      <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
    </svg>
  ),
  Plug: () => (
    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <path d="M18 6L6 18" />
      <path d="M7 6v4a5 5 0 0 0 10 0V6" />
      <line x1="9" y1="3" x2="9" y2="6" />
      <line x1="15" y1="3" x2="15" y2="6" />
    </svg>
  ),
  Check: () => (
    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  ),
  X: () => (
    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round">
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  ),
  Warn: () => (
    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
      <line x1="12" y1="9" x2="12" y2="13" />
      <line x1="12" y1="17" x2="12.01" y2="17" strokeWidth="3" />
    </svg>
  ),
};

// ── UUIDs BLE ──────────────────────────────────────────────
const SERVICE_UUID = "4fafc201-1fb5-459e-8fcc-c5c9c331914b";
const CHAR_UUID_RX = "beb5483e-36e1-4688-b7f5-ea07361b26a8";
const CHAR_UUID_TX = "beb5483e-36e1-4688-b7f5-ea07361b26a9";

const SENSOR_LABELS: string[] = ["F·IZQ", "F·CTR", "F·DER", "LAT·IZQ", "LAT·DER"];
const SENSOR_KEYS: (keyof SensorData)[] = ["d1", "d2", "d3", "d4", "d5"];

const clamp = (v: number, min: number, max: number): number => Math.min(max, Math.max(min, v));
const pct = (v: number): number => clamp(Math.round((1 - v / 400) * 100), 0, 100);
const distColor = (v: number): string => {
  const p = pct(v);
  if (p > 65) return "#FFD600";
  if (p > 35) return "#FF8C00";
  return "#FF1E1E";
};

// ── CSS global ─────────────────────────────────────────────
const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Share+Tech+Mono&family=Barlow+Condensed:wght@400;600;700&display=swap');

*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}

html,body{width:100%;height:100%;background:#0D0D0D;overflow:hidden}
#root{width:100vw;height:100vh;display:flex;flex-direction:column;overflow:hidden}

body{font-family:'Barlow Condensed',sans-serif;color:#F0E8D0}
button{font-family:'Barlow Condensed',sans-serif;cursor:pointer}

body::before{
  content:'';pointer-events:none;position:fixed;inset:0;
  background:repeating-linear-gradient(
    -55deg,
    transparent 0px,transparent 28px,
    rgba(255,214,0,0.018) 28px,rgba(255,214,0,0.018) 30px
  );
  z-index:0;
}

@keyframes pulse   {0%,100%{opacity:1}50%{opacity:.3}}
@keyframes fadeUp  {from{opacity:0;transform:translateY(5px)}to{opacity:1;transform:none}}
@keyframes flicker {0%,100%{opacity:1}92%{opacity:.85}94%{opacity:1}96%{opacity:.7}98%{opacity:1}}
@keyframes scanH   {0%{transform:translateX(-100%)}100%{transform:translateX(100vw)}}

body::after{
  content:'';pointer-events:none;position:fixed;
  top:0;left:0;width:60px;height:100%;
  background:linear-gradient(90deg,transparent,rgba(255,214,0,0.04),transparent);
  animation:scanH 6s linear infinite;
  z-index:0;
}

.ctrl-btn{
  position:relative;
  background:#1A1A1A;
  border:1px solid #333;
  color:#666;
  border-radius:6px;
  font-size:20px;
  display:flex;align-items:center;justify-content:center;
  transition:all .1s;
  touch-action:manipulation;
  -webkit-tap-highlight-color:transparent;
  user-select:none;
  width:100%;height:100%;
  overflow:hidden;
}
.ctrl-btn::after{
  content:'';position:absolute;inset:0;
  background:linear-gradient(135deg,rgba(255,255,255,0.03),transparent);
  pointer-events:none;
}
.ctrl-btn:active,.ctrl-btn.pressed{
  background:#FF1E1E;
  color:#fff;
  border-color:#FF1E1E;
  transform:scale(0.88);
  box-shadow:0 0 22px #FF1E1Eaa,0 0 6px #FF1E1E inset;
}
.ctrl-btn:disabled{opacity:.15;cursor:default;pointer-events:none}

.ctrl-btn.stop-btn{
  background:#111;
  color:#FFD600;
  border-color:#3a3000;
  font-size:16px;
}
.ctrl-btn.stop-btn:active,.ctrl-btn.stop-btn.pressed{
  background:#FFD600;
  color:#000;
  border-color:#FFD600;
  box-shadow:0 0 22px #FFD600aa,0 0 6px #FFD600 inset;
}

.vel-btn{
  flex:1;padding:10px 0;
  background:#1A1A1A;border:1px solid #2a2a2a;
  color:#444;border-radius:4px;
  font-size:14px;font-weight:700;letter-spacing:2px;
  transition:all .2s;touch-action:manipulation;
  text-transform:uppercase;
}
.vel-btn.active{
  background:#FFD600;
  border-color:#FFD600;
  color:#000;
  box-shadow:0 0 14px #FFD60066;
  font-weight:700;
}

.main-grid{
  display:grid;
  grid-template-columns:1fr 1fr;
  grid-template-rows:1fr 1fr;
  gap:8px;padding:8px;
  flex:1;min-height:0;
  position:relative;z-index:1;
}
@media(max-width:700px){.main-grid{grid-template-columns:1fr;grid-template-rows:none;overflow-y:auto}}

.panel{
  background:#111;
  border:1px solid #222;
  border-radius:8px;
  padding:14px;
  display:flex;flex-direction:column;
  min-width:0;min-height:0;overflow:hidden;
  position:relative;
}
.panel.map-panel{overflow:visible;}
.panel::before{
  content:'';position:absolute;top:0;left:0;right:0;
  height:2px;
  background:linear-gradient(90deg,#FF1E1E,#FFD600,#FF1E1E);
  border-radius:8px 8px 0 0;
}

.ptitle{
  font-family:'Bebas Neue',sans-serif;
  font-size:16px;letter-spacing:4px;color:#FFD600;
  border-bottom:1px solid #222;
  padding-bottom:8px;margin-bottom:12px;
  flex-shrink:0;
  text-shadow:0 0 12px #FFD60044;
}

.log-box{
  flex:1;overflow-y:auto;min-height:0;
  background:#0a0a0a;border:1px solid #1e1e1e;
  border-radius:6px;padding:8px;
  display:flex;flex-direction:column;gap:4px;
}
.log-row{display:flex;gap:10px;font-size:11px;font-family:'Share Tech Mono',monospace;animation:fadeUp .2s ease}
.log-time{color:#333;flex-shrink:0}
.log-msg {color:#888}

::-webkit-scrollbar{width:3px}
::-webkit-scrollbar-track{background:#111}
::-webkit-scrollbar-thumb{background:#FF1E1E44;border-radius:2px}
`;

// ── APP ────────────────────────────────────────────────────
export default function CarritoApp() {
  const [connected, setConnected] = useState<boolean>(false);
  const [modo, setModo] = useState<ModoType>("manual");
  const [sensores, setSensores] = useState<SensorData>({ d1: 400, d2: 400, d3: 400, d4: 400, d5: 400 });
  const [iaLabel, setIaLabel] = useState<string>("---");
  const [iaConf, setIaConf] = useState<number>(0);
  const [velKey, setVelKey] = useState<VelKey>("3");
  const [log, setLog] = useState<LogEntry[]>([]);
  const [btError, setBtError] = useState<string>("");
  const [activeBtn, setActiveBtn] = useState<string | null>(null);

  const charRX = useRef<BluetoothRemoteGATTCharacteristic | null>(null);
  const deviceRf = useRef<BluetoothDevice | null>(null);
  const heldKeys = useRef<Set<string>>(new Set());

  useEffect(() => {
    const el = document.createElement("style");
    el.textContent = CSS;
    document.head.appendChild(el);
    return () => { document.head.removeChild(el); };
  }, []);

  const addLog = useCallback((msg: string) =>
    setLog(p => [{ t: new Date().toLocaleTimeString("es", { hour12: false }), msg }, ...p].slice(0, 40))
    , []);

  const sendCmd = useCallback(async (cmd: string) => {
    if (!charRX.current) return;
    try {
      await charRX.current.writeValueWithoutResponse(new TextEncoder().encode(cmd));
    } catch (e) {
      addLog("[WARN] " + (e as Error).message);
    }
  }, [addLog]);

  const connect = async () => {
    if (!navigator.bluetooth) {
      setBtError("Requiere Chrome o Edge en escritorio/Android.");
      return;
    }
    setBtError("");
    try {
      const device = await navigator.bluetooth.requestDevice({
        filters: [{ name: "CarritoAutonomo" }],
        optionalServices: [SERVICE_UUID],
      });
      deviceRf.current = device;
      device.addEventListener("gattserverdisconnected", () => {
        setConnected(false);
        charRX.current = null;
        addLog("[PLUG] Desconectado");
      });
      const server = await device.gatt!.connect();
      const service = await server.getPrimaryService(SERVICE_UUID);
      charRX.current = await service.getCharacteristic(CHAR_UUID_RX);
      const charTX = await service.getCharacteristic(CHAR_UUID_TX);
      await charTX.startNotifications();
      charTX.addEventListener("characteristicvaluechanged", (e: Event) => {
        const event = e as BLENotificationEvent;
        try {
          const raw = event.target.value;
          if (!raw) return;
          const d: ParsedBLEData = JSON.parse(new TextDecoder().decode(raw));
          setSensores({
            d1: +(d.d1 ?? 400),
            d2: +(d.d2 ?? 400),
            d3: +(d.d3 ?? 400),
            d4: +(d.d4 ?? 400),
            d5: +(d.d5 ?? 400),
          });
          setIaLabel(d.ia ?? "---");
          setIaConf(+(d.conf ?? 0));
          setModo((d.modo as ModoType) ?? "manual");
        } catch (_) { }
      });
      setConnected(true);
      addLog("[OK] Conectado a CarritoAutonomo");
    } catch (e) {
      addLog("[ERR] " + (e as Error).message);
    }
  };

  const disconnect = async () => {
    await sendCmd("S");
    deviceRf.current?.gatt?.disconnect();
  };

  const changeVel = (v: VelKey) => {
    setVelKey(v);
    sendCmd(v);
    addLog(`[VEL] Velocidad → ${v === "q" ? "100%" : v === "3" ? "70%" : "40%"}`);
  };

  const toggleModo = () => {
    const next: ModoType = modo === "manual" ? "auto" : "manual";
    setModo(next);
    sendCmd(next === "auto" ? "A" : "M");
    addLog(`[MODE] → ${next === "auto" ? "AUTÓNOMO" : "MANUAL"}`);
  };

  const press = (cmd: string) => {
    if (modo === "manual" && connected) {
      sendCmd(cmd);
      setActiveBtn(cmd);
    }
  };
  const release = () => {
    if (modo === "manual" && connected) {
      sendCmd("S");
      setActiveBtn(null);
    }
  };

  useEffect(() => {
    if (!connected) return;
    const map: Record<string, string> = {
      ArrowUp: "F",
      ArrowDown: "B",
      ArrowLeft: "L",
      ArrowRight: "R",
      " ": "S",
    };
    const dn = (e: KeyboardEvent) => {
      const c = map[e.key];
      if (c && !heldKeys.current.has(e.key) && modo === "manual") {
        heldKeys.current.add(e.key);
        sendCmd(c);
        setActiveBtn(c);
        e.preventDefault();
      }
    };
    const up = (e: KeyboardEvent) => {
      const c = map[e.key];
      if (c) {
        heldKeys.current.delete(e.key);
        if (modo === "manual") {
          sendCmd("S");
          setActiveBtn(null);
        }
      }
    };
    window.addEventListener("keydown", dn);
    window.addEventListener("keyup", up);
    return () => {
      window.removeEventListener("keydown", dn);
      window.removeEventListener("keyup", up);
    };
  }, [connected, modo, sendCmd]);

  const isAuto = modo === "auto";
  const confPct = Math.round(iaConf * 100);

  const dpadButtons: [React.ReactNode, string][] = [
    [<Icon.UpLeft />, "I"],
    [<Icon.Up />, "F"],
    [<Icon.UpRight />, "G"],
    [<Icon.Left />, "L"],
    [<Icon.Stop />, "S"],
    [<Icon.Right />, "R"],
    [<Icon.DownLeft />, "J"],
    [<Icon.Down />, "B"],
    [<Icon.DownRight />, "H"],
  ];

  const velOptions: [VelKey, string][] = [
    ["1", "40%"],
    ["3", "70%"],
    ["q", "100%"],
  ];

  return (
    <div style={{
      width: "100vw", height: "100vh",
      display: "flex", flexDirection: "column",
      background: "#0D0D0D", overflow: "hidden",
      position: "relative", zIndex: 1,
    }}>

      {/* ── HEADER ── */}
      <header style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "0 18px", height: 52,
        background: "#0D0D0D",
        borderBottom: "1px solid #1e1e1e",
        flexShrink: 0, gap: 12,
        position: "relative", zIndex: 2,
      }}>
        <div style={{
          position: "absolute", bottom: 0, left: 0, right: 0, height: 1,
          background: "linear-gradient(90deg,#FF1E1E,#FFD600,#FF1E1E88,transparent)",
        }} />

        {/* LOGO */}
        <div style={{ display: "flex", alignItems: "center", gap: 10, flexShrink: 0 }}>
          <div style={{
            width: 32, height: 32,
            background: "linear-gradient(135deg,#FF1E1E,#FFD600)",
            clipPath: "polygon(50% 0%,100% 25%,100% 75%,50% 100%,0% 75%,0% 25%)",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 14, fontWeight: 900, color: "#000",
          }}>C</div>
          <span style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: 22, letterSpacing: 6, color: "#fff" }}>
            CARRO<span style={{ color: "#FFD600" }}>BLE</span>
          </span>
        </div>

        {/* STATUS BADGE */}
        <div style={{ flex: 1, display: "flex", justifyContent: "center" }}>
          <div style={{
            display: "flex", alignItems: "center", gap: 8,
            padding: "5px 14px", borderRadius: 3,
            background: connected ? "#FFD60010" : "#FF1E1E0e",
            border: `1px solid ${connected ? "#FFD60040" : "#FF1E1E40"}`,
          }}>
            <span style={{
              width: 7, height: 7, borderRadius: "50%",
              background: connected ? "#FFD600" : "#FF1E1E",
              boxShadow: connected ? "0 0 8px #FFD600" : "0 0 8px #FF1E1E",
              animation: connected ? "none" : "pulse 1.4s infinite",
            }} />
            <span style={{
              fontFamily: "'Share Tech Mono',monospace",
              fontSize: 10, letterSpacing: 3,
              color: connected ? "#FFD600" : "#FF6060",
            }}>
              {connected
                ? <><Icon.Wifi />&nbsp;CONECTADO</>
                : <><Icon.WifiOff />&nbsp;DESCONECTADO</>}
            </span>
          </div>
        </div>

        {/* CONNECT BTN */}
        <button
          onClick={connected ? disconnect : connect}
          style={{
            padding: "7px 18px", borderRadius: 4,
            fontWeight: 700, fontSize: 13, letterSpacing: 2,
            flexShrink: 0,
            ...(connected
              ? { background: "transparent", color: "#FF1E1E", border: "1px solid #FF1E1E55", boxShadow: "0 0 10px #FF1E1E22" }
              : { background: "linear-gradient(90deg,#FF1E1E,#FFD600)", color: "#000", border: "none", boxShadow: "0 0 18px #FF1E1E55" }
            ),
          }}
        >
          {connected ? "DESCONECTAR" : "CONECTAR BLE"}
        </button>
      </header>

      {btError && (
        <div style={{
          background: "#200", color: "#FF6060", padding: "7px 18px",
          fontSize: 12, borderBottom: "1px solid #FF1E1E22",
          flexShrink: 0, fontFamily: "'Share Tech Mono',monospace",
          zIndex: 2, position: "relative",
        }}>
          <Icon.Warn /> {btError}
        </div>
      )}

      {/* ── MAIN GRID ── */}
      <div className="main-grid">

        {/* PANEL 1 — SENSORES */}
        <div className="panel">
          <div className="ptitle">SENSORES ULTRASÓNICOS</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 14, flex: 1, justifyContent: "center" }}>
            {SENSOR_KEYS.map((k, i) => {
              const v = sensores[k];
              const p = pct(v);
              const c = distColor(v);
              return (
                <div key={k}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5 }}>
                    <span style={{
                      fontFamily: "'Share Tech Mono',monospace",
                      fontSize: 10, letterSpacing: 2, color: "#555",
                    }}>{SENSOR_LABELS[i]}</span>
                    <span style={{
                      fontFamily: "'Share Tech Mono',monospace",
                      fontSize: 12, color: c, fontVariantNumeric: "tabular-nums",
                    }}>
                      {v.toFixed(0)}<span style={{ fontSize: 9, color: "#333", marginLeft: 2 }}>cm</span>
                    </span>
                  </div>
                  <div style={{ height: 8, background: "#1a1a1a", borderRadius: 2, overflow: "hidden" }}>
                    <div style={{
                      width: `${p}%`, height: "100%",
                      background: `linear-gradient(90deg,${c}66,${c})`,
                      borderRadius: 2,
                      transition: "width .25s,background .25s",
                      boxShadow: `0 0 8px ${c}88`,
                    }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* PANEL 2 — MAPA DEL CARRITO */}
        <div className="panel map-panel">
          <div className="ptitle" style={{ width: "100%" }}>MAPA DE PROXIMIDAD</div>
          <div style={{
            flex: 1, width: "100%",
            display: "flex", alignItems: "center", justifyContent: "center",
            minHeight: 0, padding: "8px 0",
          }}>
            <CarDiagram sensores={sensores} />
          </div>
        </div>

        {/* PANEL CONTROL */}
        <div className="panel">
          <div className="ptitle">CONTROL</div>

          {/* MODO TOGGLE */}
          <button
            onClick={toggleModo}
            style={{
              width: "100%", padding: "13px 0", border: "none", borderRadius: 5,
              fontFamily: "'Bebas Neue',sans-serif",
              fontSize: 20, letterSpacing: 4,
              cursor: "pointer", transition: "all .25s", marginBottom: 10,
              ...(isAuto
                ? { background: "#FF1E1E", color: "#fff", boxShadow: "0 0 24px #FF1E1E66" }
                : { background: "#FFD600", color: "#000", boxShadow: "0 0 24px #FFD60044" }
              ),
            }}
          >
            <span style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 10 }}>
              {isAuto ? <><Icon.Bot /> AUTÓNOMO</> : <><Icon.Gamepad /> MANUAL</>}
            </span>
          </button>

          {/* VELOCIDAD */}
          <div style={{ display: "flex", gap: 6, marginBottom: 12 }}>
            {velOptions.map(([v, lbl]) => (
              <button
                key={v}
                className={`vel-btn${velKey === v ? " active" : ""}`}
                onClick={() => changeVel(v)}
                disabled={!connected}
              >
                {lbl}
              </button>
            ))}
          </div>

          {/* D-PAD 3×3 */}
          <div style={{
            display: "grid",
            gridTemplateColumns: "repeat(3,1fr)",
            gridTemplateRows: "repeat(3,1fr)",
            gap: 6,
            flex: 1,
            minHeight: 0,
            opacity: isAuto ? 0.2 : 1,
            pointerEvents: isAuto ? "none" : "auto",
            transition: "opacity .3s",
          }}>
            {dpadButtons.map(([icon, cmd]) => (
              <button
                key={cmd}
                className={`ctrl-btn${cmd === "S" ? " stop-btn" : ""}${activeBtn === cmd ? " pressed" : ""}`}
                onPointerDown={() => press(cmd)}
                onPointerUp={release}
                onPointerLeave={release}
                disabled={!connected}
              >
                {icon}
              </button>
            ))}
          </div>

          <p style={{
            marginTop: 8, textAlign: "center",
            fontFamily: "'Share Tech Mono',monospace",
            fontSize: 9, color: "#2a2a2a", letterSpacing: 1,
          }}>
            ↑↓←→ TECLADO
          </p>
        </div>

        {/* PANEL IA + LOG */}
        <div className="panel">
          <div className="ptitle">INTELIGENCIA ARTIFICIAL</div>

          {/* IA DISPLAY */}
          <div style={{
            background: "#0a0a0a", border: "1px solid #1e1e1e",
            borderRadius: 6, padding: "16px 14px",
            marginBottom: 12, flexShrink: 0,
            position: "relative", overflow: "hidden",
          }}>
            {/* Corner accents */}
            <div style={{ position: "absolute", top: 0, left: 0, width: 12, height: 12, borderTop: "2px solid #FF1E1E", borderLeft: "2px solid #FF1E1E" }} />
            <div style={{ position: "absolute", top: 0, right: 0, width: 12, height: 12, borderTop: "2px solid #FFD600", borderRight: "2px solid #FFD600" }} />
            <div style={{ position: "absolute", bottom: 0, left: 0, width: 12, height: 12, borderBottom: "2px solid #FF1E1E", borderLeft: "2px solid #FF1E1E" }} />
            <div style={{ position: "absolute", bottom: 0, right: 0, width: 12, height: 12, borderBottom: "2px solid #FFD600", borderRight: "2px solid #FFD600" }} />

            {/* Mode pill */}
            <div style={{ textAlign: "center", marginBottom: 10 }}>
              <span style={{
                display: "inline-block",
                padding: "2px 12px", borderRadius: 2,
                fontFamily: "'Share Tech Mono',monospace",
                fontSize: 9, letterSpacing: 3,
                background: isAuto ? "#FF1E1E22" : "#FFD60016",
                border: `1px solid ${isAuto ? "#FF1E1E" : "#FFD60066"}`,
                color: isAuto ? "#FF6060" : "#FFD600",
              }}>
                <span style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
                  {isAuto ? <><Icon.Bot /> AUTO</> : <><Icon.Gamepad /> MANUAL</>}
                </span>
              </span>
            </div>

            {/* Label */}
            <div style={{
              textAlign: "center",
              fontFamily: "'Bebas Neue',sans-serif",
              fontSize: 30, letterSpacing: 5,
              color: isAuto ? "#fff" : "#555",
              textShadow: isAuto ? "0 0 20px #FF1E1E66" : "none",
              minHeight: 38, lineHeight: 1,
              animation: isAuto && iaLabel !== "---" ? "flicker 4s infinite" : "none",
            }}>
              {iaLabel}
            </div>

            {/* Confidence bar */}
            <div style={{ marginTop: 12, display: "flex", alignItems: "center", gap: 8 }}>
              <div style={{ flex: 1, height: 3, background: "#1a1a1a", borderRadius: 2, overflow: "hidden" }}>
                <div style={{
                  width: `${confPct}%`, height: "100%", borderRadius: 2,
                  background: "linear-gradient(90deg,#FF1E1E,#FFD600)",
                  boxShadow: "0 0 6px #FF1E1E66",
                  transition: "width .35s",
                }} />
              </div>
              <span style={{
                fontFamily: "'Share Tech Mono',monospace",
                fontSize: 10, color: "#444", width: 30, textAlign: "right",
              }}>
                {confPct}%
              </span>
            </div>
          </div>

          <div className="ptitle" style={{ marginTop: 2 }}>LOG</div>
          <div className="log-box">
            {log.length === 0
              ? (
                <span style={{ fontFamily: "'Share Tech Mono',monospace", fontSize: 11, color: "#222" }}>
                  _ en espera de eventos…
                </span>
              )
              : log.map((entry, i) => (
                <div key={i} className="log-row">
                  <span className="log-time">{entry.t}</span>
                  <span className="log-msg">
                    {entry.msg.startsWith("[OK]")
                      ? <><span style={{ color: "#FFD600" }}><Icon.Check /></span> {entry.msg.slice(5)}</>
                      : entry.msg.startsWith("[ERR]")
                        ? <><span style={{ color: "#FF1E1E" }}><Icon.X /></span> {entry.msg.slice(6)}</>
                        : entry.msg.startsWith("[WARN]")
                          ? <><span style={{ color: "#FF8C00" }}><Icon.Warn /></span> {entry.msg.slice(7)}</>
                          : entry.msg.startsWith("[PLUG]")
                            ? <><span style={{ color: "#888" }}><Icon.Plug /></span> {entry.msg.slice(7)}</>
                            : entry.msg.startsWith("[VEL]")
                              ? <><span style={{ color: "#FFD600" }}><Icon.Zap /></span> {entry.msg.slice(6)}</>
                              : entry.msg.startsWith("[MODE]")
                                ? <><span style={{ color: "#FF1E1E" }}><Icon.Refresh /></span> {entry.msg.slice(7)}</>
                                : entry.msg}
                  </span>
                </div>
              ))}
          </div>
        </div>

      </div>
    </div>
  );
}

// ── CAR DIAGRAM ───────────────────────────────────────────
interface CarDiagramProps {
  sensores: SensorData;
}

function CarDiagram({ sensores }: CarDiagramProps) {
  const beam = (v: number, max: number): number => clamp(Math.round((1 - v / 400) * max), 5, max);
  const col = (k: keyof SensorData): string => distColor(sensores[k]);
  const alpha = (v: number): number => clamp(0.1 + (1 - v / 400) * 0.9, 0.1, 1);

  const CX = 150, CY = 180;
  const CW = 90, CH = 110;
  const L = CX - CW / 2, R = CX + CW / 2;
  const T = CY - CH / 2, B = CY + CH / 2;

  const s1x = L + 18, s1y = T;
  const s2x = CX, s2y = T;
  const s3x = R - 18, s3y = T;
  const s4x = L, s4y = CY;
  const s5x = R, s5y = CY;

  const b1 = beam(sensores.d1, 72); const c1 = col("d1"); const a1 = alpha(sensores.d1);
  const b2 = beam(sensores.d2, 88); const c2 = col("d2"); const a2 = alpha(sensores.d2);
  const b3 = beam(sensores.d3, 72); const c3 = col("d3"); const a3 = alpha(sensores.d3);
  const b4 = beam(sensores.d4, 65); const c4 = col("d4"); const a4 = alpha(sensores.d4);
  const b5 = beam(sensores.d5, 65); const c5 = col("d5"); const a5 = alpha(sensores.d5);

  const wheelPositions: [number, number][] = [
    [L - 9, T + 28],
    [R + 9, T + 28],
    [L - 9, B - 28],
    [R + 9, B - 28],
  ];

  const gridX = [70, 110, 150, 190, 230];
  const gridY = [80, 120, 160, 200, 240, 280];

  return (
    <svg
      viewBox="50 60 200 240"
      style={{ width: "100%", height: "100%", display: "block" }}
    >
      {/* Background grid */}
      {gridX.map(x => (
        <line key={`gx${x}`} x1={x} y1="65" x2={x} y2="295" stroke="#191919" strokeWidth="1" />
      ))}
      {gridY.map(y => (
        <line key={`gy${y}`} x1="55" y1={y} x2="245" y2={y} stroke="#191919" strokeWidth="1" />
      ))}

      {/* Sensor beams */}
      <line x1={s1x} y1={s1y} x2={s1x} y2={s1y - b1} stroke={c1} strokeWidth="2.5" strokeLinecap="round" opacity={a1} />
      <line x1={s2x} y1={s2y} x2={s2x} y2={s2y - b2} stroke={c2} strokeWidth="3" strokeLinecap="round" opacity={a2} />
      <line x1={s3x} y1={s3y} x2={s3x} y2={s3y - b3} stroke={c3} strokeWidth="2.5" strokeLinecap="round" opacity={a3} />
      <line x1={s4x} y1={s4y} x2={s4x - b4} y2={s4y} stroke={c4} strokeWidth="2.5" strokeLinecap="round" opacity={a4} />
      <line x1={s5x} y1={s5y} x2={s5x + b5} y2={s5y} stroke={c5} strokeWidth="2.5" strokeLinecap="round" opacity={a5} />

      {/* Endpoint dots */}
      <circle cx={s1x} cy={s1y - b1} r="4" fill={c1} opacity={a1} style={{ filter: `drop-shadow(0 0 5px ${c1})` }} />
      <circle cx={s2x} cy={s2y - b2} r="5" fill={c2} opacity={a2} style={{ filter: `drop-shadow(0 0 7px ${c2})` }} />
      <circle cx={s3x} cy={s3y - b3} r="4" fill={c3} opacity={a3} style={{ filter: `drop-shadow(0 0 5px ${c3})` }} />
      <circle cx={s4x - b4} cy={s4y} r="4" fill={c4} opacity={a4} style={{ filter: `drop-shadow(0 0 5px ${c4})` }} />
      <circle cx={s5x + b5} cy={s5y} r="4" fill={c5} opacity={a5} style={{ filter: `drop-shadow(0 0 5px ${c5})` }} />

      {/* Distance labels */}
      <text x={s1x} y={s1y - b1 - 8} textAnchor="middle" fill={c1} fontSize="7.5" fontFamily="'Share Tech Mono',monospace" opacity={a1}>{sensores.d1.toFixed(0)}</text>
      <text x={s2x} y={s2y - b2 - 10} textAnchor="middle" fill={c2} fontSize="7.5" fontFamily="'Share Tech Mono',monospace" opacity={a2}>{sensores.d2.toFixed(0)}</text>
      <text x={s3x} y={s3y - b3 - 8} textAnchor="middle" fill={c3} fontSize="7.5" fontFamily="'Share Tech Mono',monospace" opacity={a3}>{sensores.d3.toFixed(0)}</text>
      <text x={s4x - b4 - 12} y={s4y + 3} textAnchor="middle" fill={c4} fontSize="7.5" fontFamily="'Share Tech Mono',monospace" opacity={a4}>{sensores.d4.toFixed(0)}</text>
      <text x={s5x + b5 + 12} y={s5y + 3} textAnchor="middle" fill={c5} fontSize="7.5" fontFamily="'Share Tech Mono',monospace" opacity={a5}>{sensores.d5.toFixed(0)}</text>

      {/* Wheels */}
      <rect x={L - 18} y={T + 12} width="17" height="32" rx="4" fill="#141414" stroke="#2e2e2e" strokeWidth="1.5" />
      <rect x={R + 1} y={T + 12} width="17" height="32" rx="4" fill="#141414" stroke="#2e2e2e" strokeWidth="1.5" />
      <rect x={L - 18} y={B - 44} width="17" height="32" rx="4" fill="#141414" stroke="#2e2e2e" strokeWidth="1.5" />
      <rect x={R + 1} y={B - 44} width="17" height="32" rx="4" fill="#141414" stroke="#2e2e2e" strokeWidth="1.5" />
      {wheelPositions.map(([wx, wy], i) => (
        <circle key={i} cx={wx} cy={wy} r="4" fill="#0a0a0a" stroke="#3a3a3a" strokeWidth="1" />
      ))}

      {/* Car body */}
      <rect x={L} y={T} width={CW} height={CH} rx="10" fill="#161616" stroke="#FF1E1E" strokeWidth="2" />

      {/* Racing stripe */}
      <clipPath id="clip">
        <rect x={L} y={T} width={CW} height={CH} rx="10" />
      </clipPath>
      <g clipPath="url(#clip)">
        <line x1={L} y1={T + 25} x2={R} y2={B - 10} stroke="#FFD60015" strokeWidth="20" />
        <line x1={L + 20} y1={T} x2={R} y2={B - 40} stroke="#FFD60008" strokeWidth="14" />
      </g>

      {/* Windshield */}
      <rect x={L + 8} y={T + 10} width={CW - 16} height={CH * 0.38} rx="5" fill="#0c0c0c" stroke="#252525" strokeWidth="1" />
      <line x1={L + 13} y1={T + 14} x2={L + 18} y2={T + CH * 0.38 + 6} stroke="#ffffff09" strokeWidth="5" strokeLinecap="round" />

      {/* Headlights */}
      <rect x={L + 5} y={T + 3} width="20" height="9" rx="3" fill="#FFD60044" stroke="#FFD600" strokeWidth="1" style={{ filter: "drop-shadow(0 0 5px #FFD600)" }} />
      <rect x={R - 25} y={T + 3} width="20" height="9" rx="3" fill="#FFD60044" stroke="#FFD600" strokeWidth="1" style={{ filter: "drop-shadow(0 0 5px #FFD600)" }} />

      {/* Taillights */}
      <rect x={L + 5} y={B - 12} width="20" height="9" rx="3" fill="#FF1E1E44" stroke="#FF1E1E" strokeWidth="1" style={{ filter: "drop-shadow(0 0 5px #FF1E1E)" }} />
      <rect x={R - 25} y={B - 12} width="20" height="9" rx="3" fill="#FF1E1E44" stroke="#FF1E1E" strokeWidth="1" style={{ filter: "drop-shadow(0 0 5px #FF1E1E)" }} />

      {/* ESP32 chip */}
      <rect x={CX - 22} y={CY - 14} width="44" height="28" rx="4" fill="#0a0a0a" stroke="#2a2a2a" strokeWidth="1.5" />
      {([-12, -4, 4, 12] as number[]).map(dx => (
        <rect key={`pt${dx}`} x={CX + dx - 2} y={CY - 18} width="4" height="4" rx="1" fill="#333" />
      ))}
      {([-12, -4, 4, 12] as number[]).map(dx => (
        <rect key={`pb${dx}`} x={CX + dx - 2} y={CY + 14} width="4" height="4" rx="1" fill="#333" />
      ))}
      <text x={CX} y={CY + 5} textAnchor="middle" fill="#FFD600" fontSize="9" fontFamily="'Share Tech Mono',monospace" letterSpacing="2">
        ESP32
      </text>
    </svg>
  );
}