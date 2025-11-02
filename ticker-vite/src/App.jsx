import React, { useEffect, useMemo, useRef, useState } from "react";

function normPDF(x) {
  const xx = Number(x) || 0;
  return Math.exp((-xx * xx) / 2) / Math.sqrt(2 * Math.PI);
}
function normCDF(x) {
  const xx = Number(x);
  if (!isFinite(xx)) return 0.5;
  const sign = xx < 0 ? -1 : 1;
  const absX = Math.abs(xx);
  if (absX > 8) return xx > 0 ? 1 : 0;
  const k = 1 / (1 + 0.2316419 * absX);
  const a1 = 0.31938153,
    a2 = -0.356563782,
    a3 = 1.781477937,
    a4 = -1.821255978,
    a5 = 1.330274429;
  const poly = 1 - normPDF(absX) * (a1 * k + a2 * Math.pow(k, 2) + a3 * Math.pow(k, 3) + a4 * Math.pow(k, 4) + a5 * Math.pow(k, 5));
  return sign >= 0 ? poly : 1 - poly;
}
function bsPrice({ S, K, r, q, sigma, T, type }) {
  const sNum = Number(S) || 0;
  const kNum = Number(K) || 0;
  const rNum = Number(r) || 0;
  const qNum = Number(q) || 0;
  const sigmaNum = Number(sigma) || 0;
  const Tnum = Number(T) || 0;
  if (Tnum <= 0 || sigmaNum <= 0) return type === "call" ? Math.max(0, sNum - kNum) : Math.max(0, kNum - sNum);
  const sqrtT = Math.sqrt(Tnum);
  const d1 = (Math.log(sNum / kNum) + (rNum - qNum + 0.5 * sigmaNum * sigmaNum) * Tnum) / (sigmaNum * sqrtT);
  const d2 = d1 - sigmaNum * sqrtT;
  return type === "call"
    ? sNum * Math.exp(-qNum * Tnum) * normCDF(d1) - kNum * Math.exp(-rNum * Tnum) * normCDF(d2)
    : kNum * Math.exp(-rNum * Tnum) * normCDF(-d2) - sNum * Math.exp(-qNum * Tnum) * normCDF(-d1);
}
function parseNumberOr(value, fallback = 0) {
  const v = (value ?? "").toString().trim();
  if (v === "") return fallback;
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}
function clamp(n, a, b) {
  return Math.max(a, Math.min(b, n));
}
function tinyChartSVG({ data = [], width = 600, height = 160 }) {
  if (!Array.isArray(data) || data.length === 0) return "";
  const values = data.map((d) => d.profit);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const pad = 8;
  const points = data
    .map((d, i) => {
      const x = pad + ((i / (data.length - 1)) * (width - pad * 2));
      const y = height - pad - ((d.profit - min) / (max - min || 1)) * (height - pad * 2);
      return `${x},${y}`;
    })
    .join(" ");
  return `<svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg"><polyline fill="none" stroke="#6366f1" stroke-width="2" points="${points}" /></svg>`;
}
const STORAGE_KEY = "option_pricer_presets_v1_js_light";
const SAMPLE_CHAIN = {
  symbol: "BANKNIFTY",
  underlying: 58123.45,
  expiryDates: [new Date(Date.now() + 7 * 24 * 3600 * 1000).toISOString().slice(0, 10)],
  optionData: [],
};
export default function App() {
  const systemPresets = [
    { name: "Nifty50", symbol: "NIFTY", lotSize: 75, step: 50 },
    { name: "BankNifty", symbol: "BANKNIFTY", lotSize: 35, step: 100 },
    { name: "Sensex", symbol: "SENSEX", lotSize: 20, step: 100 },
  ];
  const [symbol, setSymbol] = useState("BANKNIFTY");
  const [apiUrl, setApiUrl] = useState("");
  const [Sstr, setSstr] = useState("58123.45");
  const [Kstr, setKstr] = useState("58200");
  const [expiryStr, setExpiryStr] = useState(() => new Date(Date.now() + 7 * 24 * 3600 * 1000).toISOString().slice(0, 10));
  const [expiryDates, setExpiryDates] = useState([]);
  const [rStr, setRStr] = useState("0.06");
  const [qStr, setQStr] = useState("0");
  const [sigmaStr, setSigmaStr] = useState("0.25");
  const [selectedType, setSelectedType] = useState("call");
  const [marketPremiumStr, setMarketPremiumStr] = useState("120");
  const [lotSizeStr, setLotSizeStr] = useState("25");
  const [strikes, setStrikes] = useState([]);
  const [showAllStrikes, setShowAllStrikes] = useState(false);
  const [tpStr, setTpStr] = useState("1000");
  const [slStr, setSlStr] = useState("500");
  const [presets, setPresets] = useState(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch (e) {
      return [];
    }
  });
  const presetsRef = useRef(presets);
  useEffect(() => {
    presetsRef.current = presets;
  }, [presets]);
  const [presetName, setPresetName] = useState("");
  const [tpStep, setTpStep] = useState(100);
  const [slStep, setSlStep] = useState(100);
  const [premiumStep, setPremiumStep] = useState(5);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isFullScreen, setIsFullScreen] = useState(false);
  const [isKiosk, setIsKiosk] = useState(false);
  const [autoSaveEnabled, setAutoSaveEnabled] = useState(() => {
    try {
      const v = localStorage.getItem("autoSaveEnabled");
      return v !== null ? JSON.parse(v) : true;
    } catch (e) {
      return true;
    }
  });
  const fileInputRef = useRef(null);
  const lastSessionInputRef = useRef(null);
  const [editingPresetId, setEditingPresetId] = useState(null);
  const [editingPresetData, setEditingPresetData] = useState(null);
  const [showRfHelp, setShowRfHelp] = useState(false);
  const [importPreview, setImportPreview] = useState(null);
  const [showImportPreviewModal, setShowImportPreviewModal] = useState(false);
  const adjustInterval = useRef(null);
  const adjustTimeout = useRef(null);
  const [isFetching, setIsFetching] = useState(false);
  const [optionData, setOptionData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [useProxyFallback, setUseProxyFallback] = useState(true);
  const [lastFetchInfo, setLastFetchInfo] = useState(null);
  const mounted = useRef(true);
  useEffect(() => () => {
    mounted.current = false;
  }, []);
  async function tryFetch(url) {
    const resp = await fetch(url, { cache: "no-store" });
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
    return resp.json();
  }
  async function fetchOptionChain() {
    setIsFetching(true);
    setError(null);
    setLastFetchInfo(null);
    const target = apiUrl && apiUrl.trim() ? apiUrl.trim() : "https://api.quicknse.example/option-chain";
    try {
      const full = `${target}${target.includes("?") ? "&" : "?"}symbol=${encodeURIComponent(symbol)}`;
      const j = await tryFetch(full);
      if (!mounted.current) return;
      setOptionData(j);
      setLastFetchInfo({ method: "direct", url: full });
      setIsFetching(false);
      return;
    } catch (errDirect) {
      if (useProxyFallback) {
        const proxies = [
          "https://api.allorigins.win/raw?url=",
          "https://thingproxy.freeboard.io/fetch/",
          "https://cors.bridged.cc/",
        ];
        for (let i = 0; i < proxies.length; i++) {
          const p = proxies[i];
          try {
            const full = p + encodeURIComponent(`${target}${target.includes("?") ? "&" : "?"}symbol=${encodeURIComponent(symbol)}`);
            const j = await tryFetch(full);
            if (!mounted.current) return;
            setOptionData(j);
            setLastFetchInfo({ method: `proxy:${p}`, url: full });
            setIsFetching(false);
            return;
          } catch (errProxy) {
            continue;
          }
        }
      }
      setOptionData(SAMPLE_CHAIN);
      setError(String(errDirect && errDirect.message ? errDirect.message : errDirect || "Fetch failed"));
      setLastFetchInfo({ method: "fallback-sample" });
      setIsFetching(false);
    }
  }
  useEffect(() => {
    fetchOptionChain();
  }, []);
  const S = parseNumberOr(Sstr, 58123.45);
  const K = parseNumberOr(Kstr, 58200);
  const r = parseNumberOr(rStr, 0.06);
  const q = parseNumberOr(qStr, 0);
  const sigma = parseNumberOr(sigmaStr, 0.25);
  const marketPremium = parseNumberOr(marketPremiumStr, 120);
  const lotSize = Math.max(1, Math.round(parseNumberOr(lotSizeStr, 25)));
  const tpRupees = Math.max(0, Math.round(parseNumberOr(tpStr, 1000)));
  const slRupees = Math.max(0, Math.round(parseNumberOr(slStr, 500)));
  const Tdays = Math.max(Math.round((new Date(expiryStr).getTime() - Date.now()) / (1000 * 60 * 60 * 24)), 0);
  const T = Math.max(Tdays / 365, 0);
  const theoretical = useMemo(() => bsPrice({ S, K, r, q, sigma, T, type: selectedType }), [S, K, r, q, sigma, T, selectedType]);
  const sqrtT = Math.sqrt(Math.max(T, 1e-8));
  const d1 = (Math.log(S / K) + (r - q + 0.5 * sigma * sigma) * T) / (sigma * sqrtT);
  const delta = selectedType === "call" ? normCDF(d1) : -normCDF(-d1);
  const tpPremiumPerOption = tpRupees / lotSize;
  const slPremiumPerOption = -slRupees / lotSize;
  const safeDelta = Math.abs(delta) < 1e-6 ? Math.sign(delta || 1) * 1e-6 : delta;
  const tpSpotMove = tpPremiumPerOption / safeDelta;
  const slSpotMove = slPremiumPerOption / safeDelta;
  const expectedTpSpot = S + tpSpotMove;
  const expectedSlSpot = S + slSpotMove;
  const payoffData = useMemo(() => {
    const range = Math.max(400, Math.round(S * 0.05));
    const lower = Math.floor(S - range);
    const upper = Math.ceil(S + range);
    const steps = 60;
    const stepSize = (upper - lower) / steps;
    return Array.from({ length: steps + 1 }).map((_, i) => {
      const spot = Math.round(lower + i * stepSize);
      const intrinsic = selectedType === "call" ? Math.max(0, spot - K) : Math.max(0, K - spot);
      const profit = intrinsic - marketPremium;
      return { spot, profit };
    });
  }, [S, K, selectedType, marketPremium]);
  function getSessionObject() {
    return {
      id: Date.now(),
      name: "Last Session",
      symbol,
      S: parseNumberOr(Sstr, S),
      K: parseNumberOr(Kstr, K),
      expiry: new Date(expiryStr).toISOString(),
      r,
      q,
      sigma,
      selectedType,
      marketPremium,
      lotSize,
      tpRupees,
      slRupees,
      tpStep,
      slStep,
      premiumStep,
      showAllStrikes,
    };
  }
  function savePreset() {
    const name = presetName.trim() || `Preset ${new Date().toLocaleString()}`;
    const p = {
      id: Date.now(),
      name,
      symbol,
      S: parseNumberOr(Sstr, S),
      K: parseNumberOr(Kstr, K),
      expiry: new Date(expiryStr).toISOString(),
      r,
      q,
      sigma,
      selectedType,
      marketPremium,
      lotSize,
      tpRupees,
      slRupees,
      tpStep,
      slStep,
      premiumStep,
    };
    setPresets((s) => [p, ...s].slice(0, 200));
    setPresetName("");
  }
  function applyPresetObject(p) {
    if (!p) return;
    setSymbol(p.symbol ?? symbol);
    setSstr(String(p.S ?? S));
    setKstr(String(p.K ?? K));
    setExpiryStr((p.expiry || new Date().toISOString()).slice(0, 10));
    setRStr(String(p.r ?? r));
    setQStr(String(p.q ?? q));
    setSigmaStr(String(p.sigma ?? sigma));
    setSelectedType(p.selectedType ?? selectedType);
    setMarketPremiumStr(String(p.marketPremium ?? marketPremium));
    setLotSizeStr(String(p.lotSize ?? lotSize));
    setTpStr(String(p.tpRupees ?? tpRupees));
    setSlStr(String(p.slRupees ?? slRupees));
    if (p.tpStep !== undefined) setTpStep(p.tpStep);
    if (p.slStep !== undefined) setSlStep(p.slStep);
    if (p.premiumStep !== undefined) setPremiumStep(p.premiumStep);
    if (p.showAllStrikes !== undefined) setShowAllStrikes(Boolean(p.showAllStrikes));
  }
  function loadPreset(idOrObj) {
    if (!idOrObj) return;
    if (typeof idOrObj === "object") {
      applyPresetObject(idOrObj);
      return;
    }
    const p = presetsRef.current.find((x) => x.id === idOrObj);
    if (!p) return;
    applyPresetObject(p);
  }
  function deletePreset(id) {
    setPresets((s) => s.filter((x) => x.id !== id));
  }
  function downloadBlob(obj, filename) {
    try {
      const blob = new Blob([JSON.stringify(obj, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (e) {
      console.error(e);
      alert("Download failed");
    }
  }
  function exportPresets() {
    const data = presetsRef.current || [];
    const ts = new Date().toISOString().replace(/[:.]/g, "-");
    downloadBlob(data, `option_pricer_presets_${ts}.json`);
  }
  function exportLastSession() {
    const session = getSessionObject();
    const ts = new Date().toISOString().replace(/[:.]/g, "-");
    downloadBlob(session, `last_session_${ts}.json`);
  }
  function importPresetsFile(file) {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const json = JSON.parse(String(ev.target.result));
        if (!Array.isArray(json)) throw new Error("Invalid format: expected array of presets");
        const normalized = json.map((p) => ({ ...p, id: p.id || Date.now() + Math.random() }));
        const existing = presetsRef.current.filter((x) => !normalized.some((n) => n.name === x.name));
        const merged = [...normalized, ...existing].slice(0, 200);
        setPresets(merged);
        alert(`Imported ${normalized.length} presets`);
        if (fileInputRef.current) fileInputRef.current.value = "";
      } catch (err) {
        console.error(err);
        alert("Failed to import presets: " + (err && err.message ? err.message : String(err)));
      }
    };
    reader.readAsText(file);
  }
  function handleImportClick() {
    if (fileInputRef.current) fileInputRef.current.click();
  }
  function importLastSessionFile(file) {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const json = JSON.parse(String(ev.target.result));
        const preview = typeof json === "object" ? json : null;
        setImportPreview(preview);
        setShowImportPreviewModal(true);
        if (lastSessionInputRef.current) lastSessionInputRef.current.value = "";
      } catch (err) {
        console.error(err);
        alert("Invalid session file");
      }
    };
    reader.readAsText(file);
  }
  function confirmImportLastSession() {
    if (!importPreview) return;
    applyPresetObject(importPreview);
    try {
      localStorage.setItem("LastSessionData", JSON.stringify(importPreview));
    } catch (e) {}
    setShowImportPreviewModal(false);
    setImportPreview(null);
  }
  function applyAdjustString(field, delta) {
    if (field === "tp") {
      const v = clamp(Math.round((parseNumberOr(tpStr, 0) + delta) / 10) * 10, 0, 1_000_000);
      setTpStr(String(v));
    }
    if (field === "sl") {
      const v = clamp(Math.round((parseNumberOr(slStr, 0) + delta) / 10) * 10, 0, 1_000_000);
      setSlStr(String(v));
    }
    if (field === "premium") {
      const v = Math.round((parseNumberOr(marketPremiumStr, 0) + delta) * 100) / 100;
      setMarketPremiumStr(String(v));
    }
  }
  function startAdjust(field, dir, stepOverride) {
    const step = stepOverride ?? (field === "premium" ? premiumStep : field === "tp" ? tpStep : slStep);
    applyAdjustString(field, dir * step);
    adjustTimeout.current = window.setTimeout(() => {
      let speed = step;
      adjustInterval.current = window.setInterval(() => {
        speed = Math.min(step * 10, speed + step);
        applyAdjustString(field, dir * speed);
      }, 120);
    }, 600);
  }
  function stopAdjust() {
    if (adjustTimeout.current) {
      window.clearTimeout(adjustTimeout.current);
      adjustTimeout.current = null;
    }
    if (adjustInterval.current) {
      window.clearInterval(adjustInterval.current);
      adjustInterval.current = null;
    }
  }
  useEffect(() => {
    const spot = parseNumberOr(Sstr, 0) || S;
    const step = symbol.toUpperCase().includes("NIFTY") ? 50 : 100;
    if (showAllStrikes) return;
    const base = Math.round(spot / step) * step;
    const strikesGen = Array.from({ length: 50 }).map((_, i) => base + (i - 25) * step).sort((a, b) => a - b);
    setStrikes(strikesGen);
    const kNum = parseNumberOr(Kstr, base);
    const nearest = strikesGen.reduce((prev, cur) => (Math.abs(cur - kNum) < Math.abs(prev - kNum) ? cur : prev), strikesGen[Math.floor(strikesGen.length / 2)]);
    setKstr(String(nearest));
  }, [Sstr, symbol, showAllStrikes]);
  function saveLastSessionPresetToStorage() {
    try {
      const p = getSessionObject();
      const existing = presetsRef.current.filter((x) => x.name !== "Last Session");
      const newPresets = [p, ...existing].slice(0, 200);
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(newPresets));
      } catch (e) {}
      try {
        localStorage.setItem("LastSessionData", JSON.stringify(p));
      } catch (e) {}
      try {
        setPresets(newPresets);
      } catch (e) {}
    } catch (e) {}
  }
  useEffect(() => {
    function handleBeforeUnload() {
      if (autoSaveEnabled) saveLastSessionPresetToStorage();
    }
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
      if (autoSaveEnabled) saveLastSessionPresetToStorage();
    };
  }, [autoSaveEnabled]);
  useEffect(() => {
    try {
      const storedAuto = localStorage.getItem("autoSaveEnabled");
      const enabled = storedAuto !== null ? JSON.parse(storedAuto) : autoSaveEnabled;
      if (!enabled) return;
      const rawPresets = localStorage.getItem(STORAGE_KEY);
      if (rawPresets) {
        const parsed = JSON.parse(rawPresets);
        const last = parsed.find((p) => p.name === "Last Session");
        if (last) {
          applyPresetObject(last);
          return;
        }
      }
      const lastRaw = localStorage.getItem("LastSessionData");
      if (lastRaw) {
        const last = JSON.parse(lastRaw);
        applyPresetObject(last);
      }
    } catch (e) {}
  }, []);
  function applySystemPreset(sys) {
    const copyName = `${sys.name} (editable)`;
    const p = {
      id: Date.now(),
      name: copyName,
      symbol: sys.symbol,
      S: parseNumberOr(Sstr, S),
      K: parseNumberOr(Kstr, K),
      expiry: new Date(expiryStr).toISOString(),
      r: r,
      q: q,
      sigma: sigma,
      selectedType: selectedType,
      marketPremium: marketPremium,
      lotSize: sys.lotSize,
      tpRupees: parseNumberOr(tpStr, tpRupees),
      slRupees: parseNumberOr(slStr, slRupees),
      tpStep: sys.step || 100,
      slStep: sys.step || 100,
      premiumStep: 5,
    };
    setPresets((s) => [p, ...s]);
    applyPresetObject(p);
    setEditingPresetId(p.id);
    setEditingPresetData({ ...p });
  }
  function openEditPreset(id) {
    const p = presetsRef.current.find((x) => x.id === id);
    if (!p) return;
    setEditingPresetId(id);
    setEditingPresetData({ ...p });
  }
  function saveEditPreset() {
    if (!editingPresetId || !editingPresetData) return;
    setPresets((s) => s.map((p) => (p.id === editingPresetId ? { ...editingPresetData } : p)));
    setEditingPresetId(null);
    setEditingPresetData(null);
  }
  function cancelEditPreset() {
    setEditingPresetId(null);
    setEditingPresetData(null);
  }
  function toggleFullScreen() {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
    } else {
      document.exitFullscreen().catch(() => {});
    }
  }
  useEffect(() => {
    const onFsChange = () => setIsFullScreen(Boolean(document.fullscreenElement));
    document.addEventListener("fullscreenchange", onFsChange);
    return () => document.removeEventListener("fullscreenchange", onFsChange);
  }, []);
  function toggleKiosk() {
    setIsKiosk((v) => !v);
  }
  function runMathTests() {
    const cases = [
      { d: 0, expect: 0.5 },
      { d: 1, expect: 0.8413 },
      { d: -1, expect: 0.1587 },
      { d: 10, expect: 1 },
      { d: NaN, expect: 0.5 },
    ];
    const results = cases.map((c) => ({ input: c.d, got: Number(normCDF(c.d).toFixed(4)), expect: c.expect }));
    const bsCases = [
      { S: 100, K: 90, r: 0.05, q: 0, sigma: 0.2, T: 0.5, type: "call" },
      { S: 100, K: 110, r: 0.05, q: 0, sigma: 0.2, T: 0.5, type: "put" },
      { S: 100, K: 100, r: 0.05, q: 0, sigma: 0, T: 0.5, type: "call" },
    ];
    const bsResults = bsCases.map((c) => ({ case: c, price: bsPrice(c) }));
    return { norm: results, bs: bsResults };
  }
  const tests = useMemo(runMathTests, []);
  return (
    <div className={`min-h-screen bg-white p-4 md:p-8 ${isKiosk ? "overflow-hidden" : ""}`}>
      <div className="max-w-6xl mx-auto grid gap-6 md:grid-cols-3">
        <div className="col-span-3 flex items-center justify-between mb-2">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-semibold">Option Pricer — React (JS)</h1>
            <div className="text-sm text-slate-500">{symbol}</div>
            <select className="ml-4 p-2 rounded-xl border" onChange={(e) => { const v = e.target.value; if (!v) return; const sys = systemPresets.find(s => s.name === v); if (sys) applySystemPreset(sys); }}>
              <option value="">Select Market</option>
              {systemPresets.map(sp => <option key={sp.name} value={sp.name}>{sp.name}</option>)}
            </select>
          </div>
          <div className="flex items-center gap-2">
            <label className="flex items-center gap-2"><input type="checkbox" checked={showAllStrikes} onChange={(e) => setShowAllStrikes(e.target.checked)} /> Show all strikes</label>
            <button className="p-2 rounded-xl bg-slate-100" onClick={() => setIsSettingsOpen(true)} aria-label="Open settings">⚙️</button>
            <button className="p-2 rounded-xl bg-slate-100" onClick={toggleKiosk} aria-label="Toggle kiosk">{isKiosk ? "🟢 Kiosk" : "◻️ Kiosk"}</button>
            <button className={`p-2 rounded-xl ${isFullScreen ? "bg-blue-100" : "bg-slate-100"}`} onClick={toggleFullScreen} aria-label="Toggle full screen">{isFullScreen ? "⤫" : "⛶"}</button>
          </div>
        </div>
        <div className="col-span-2 bg-white p-6 rounded-2xl shadow-sm touch-manipulation">
          <div className="grid grid-cols-2 gap-3 mb-4">
            <div>
              <label className="block text-sm mb-2">Type</label>
              <select className="p-3 text-lg rounded-xl border" value={selectedType} onChange={(e) => setSelectedType(e.target.value)}>
                <option value="call">Call</option>
                <option value="put">Put</option>
              </select>
            </div>
            <div>
              <label className="block text-sm mb-2">Expiry</label>
              <input className="p-3 text-lg rounded-xl border" type="date" value={expiryStr} onChange={(e) => setExpiryStr(e.target.value)} min={new Date().toISOString().slice(0, 10)} />
            </div>
            <div>
              <label className="block text-sm mb-2">API (CORS enabled)</label>
              <div className="flex gap-2">
                <input className="p-3 text-lg rounded-xl border flex-1" placeholder="https://my-proxy.example.com/option-chain" value={apiUrl} onChange={(e) => setApiUrl(e.target.value)} />
                <button className="px-3 rounded-xl bg-indigo-600 text-white" onClick={fetchOptionChain}>Fetch</button>
              </div>
            </div>
            <div>
              <label className="block text-sm mb-2">Underlying (S)</label>
              <input inputMode="decimal" pattern="[0-9]*" className="p-3 text-lg rounded-xl border" type="text" value={Sstr} onChange={(e) => setSstr(e.target.value)} />
            </div>
            <div>
              <label className="block text-sm mb-2">Strike (K)</label>
              <select className="p-3 text-lg rounded-xl border" value={Kstr} onChange={(e) => setKstr(e.target.value)}>
                {strikes.map((strike) => <option key={strike} value={String(strike)}>{strike}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm mb-2">Volatility (σ)</label>
              <input inputMode="decimal" pattern="[0-9]*" className="p-3 text-lg rounded-xl border" type="text" value={sigmaStr} onChange={(e) => setSigmaStr(e.target.value)} />
            </div>
            <div>
              <label className="block text-sm mb-2">Market Premium</label>
              <div className="flex gap-2">
                <input inputMode="decimal" pattern="[0-9]*" className="p-3 text-lg rounded-xl border flex-1" type="text" value={marketPremiumStr} onChange={(e) => setMarketPremiumStr(e.target.value)} />
                <div className="flex flex-col gap-2">
                  <button className="p-2 rounded-full bg-slate-100" onPointerDown={() => startAdjust('premium', 1)} onPointerUp={stopAdjust} onPointerLeave={stopAdjust} onTouchEnd={stopAdjust}>+</button>
                  <button className="p-2 rounded-full bg-slate-100" onPointerDown={() => startAdjust('premium', -1)} onPointerUp={stopAdjust} onPointerLeave={stopAdjust} onTouchEnd={stopAdjust}>-</button>
                </div>
              </div>
            </div>
            <div>
              <label className="block text-sm mb-2">Lot Size</label>
              <input inputMode="numeric" pattern="[0-9]*" className="p-3 text-lg rounded-xl border" type="text" value={lotSizeStr} onChange={(e) => setLotSizeStr(e.target.value)} />
            </div>
            <div>
              <label className="block text-sm mb-2">R-F Rate (r) <button className="ml-2 text-xs text-slate-400" onClick={() => setShowRfHelp((s) => !s)}>?</button></label>
              {showRfHelp && <div className="text-xs text-slate-500 mb-2">Risk-free rate (annual) used in Black–Scholes. Example: 0.07 for 7%.</div>}
              <select className="p-3 text-lg rounded-xl border" value={rStr} onChange={(e) => setRStr(e.target.value)}>
                <option value={"0.04"}>4%</option>
                <option value={"0.06"}>6%</option>
                <option value={"0.08"}>8%</option>
              </select>
            </div>
          </div>
          <div className="mb-4 grid grid-cols-1 gap-3">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm text-slate-600">Take Profit (₹ total)</div>
                <div className="text-lg font-semibold">₹ {parseNumberOr(tpStr, 0)}</div>
              </div>
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-2 bg-white rounded-xl p-2">
                  <input inputMode="decimal" pattern="[0-9]*" className="w-40 p-3 text-lg rounded-xl border" type="text" value={tpStr} onChange={(e) => setTpStr(e.target.value)} />
                  <button className="p-3 rounded-xl bg-green-50 text-green-700" onPointerDown={() => startAdjust('tp', 1)} onPointerUp={stopAdjust} onPointerLeave={stopAdjust} onTouchEnd={stopAdjust}>+</button>
                  <button className="p-3 rounded-xl bg-red-50 text-red-700" onPointerDown={() => startAdjust('tp', -1)} onPointerUp={stopAdjust} onPointerLeave={stopAdjust} onTouchEnd={stopAdjust}>-</button>
                </div>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm text-slate-600">Stop Loss (₹ total)</div>
                <div className="text-lg font-semibold">₹ {parseNumberOr(slStr, 0)}</div>
              </div>
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-2 bg-white rounded-xl p-2">
                  <input inputMode="decimal" pattern="[0-9]*" className="w-40 p-3 text-lg rounded-xl border" type="text" value={slStr} onChange={(e) => setSlStr(e.target.value)} />
                  <button className="p-3 rounded-xl bg-green-50 text-green-700" onPointerDown={() => startAdjust('sl', 1)} onPointerUp={stopAdjust} onPointerLeave={stopAdjust} onTouchEnd={stopAdjust}>+</button>
                  <button className="p-3 rounded-xl bg-red-50 text-red-700" onPointerDown={() => startAdjust('sl', -1)} onPointerUp={stopAdjust} onPointerLeave={stopAdjust} onTouchEnd={stopAdjust}>-</button>
                </div>
              </div>
            </div>
          </div>
          <div className="bg-slate-100 p-4 rounded-xl mb-4 grid grid-cols-3 gap-4">
            <div>
              <div className="text-xs text-slate-500">Theoretical</div>
              <div className="text-xl font-semibold">{theoretical.toFixed(2)}</div>
            </div>
            <div>
              <div className="text-xs text-slate-500">Delta (approx.)</div>
              <div className="text-xl font-semibold">{delta.toFixed(4)}</div>
            </div>
            <div>
              <div className="text-xs text-slate-500">Days to expiry</div>
              <div className="text-xl font-semibold">{Tdays}</div>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3 items-end mb-6">
            <input className="col-span-2 p-3 rounded-xl border text-lg" placeholder="Preset name (optional)" value={presetName} onChange={(e) => setPresetName(e.target.value)} />
            <button className={`w-full py-3 rounded-xl text-lg font-semibold bg-indigo-600 text-white`} onClick={savePreset}>Save Preset</button>
            <div className="col-span-3">
              <div className="text-sm text-slate-500 mb-2">Presets</div>
              <div className="grid gap-2 max-h-48 overflow-auto">
                {presets.length === 0 ? (
                  <div className="text-sm text-slate-400">No presets saved yet.</div>
                ) : (
                  presets.map((p) => (
                    <div key={p.id} className="flex items-center justify-between bg-white p-2 rounded-xl border">
                      <div className="text-sm">{p.name}</div>
                      <div className="flex gap-2">
                        <button onClick={() => loadPreset(p)} className="px-2 py-1 bg-indigo-600 text-white rounded">Load</button>
                        <button onClick={() => deletePreset(p.id)} className="px-2 py-1 bg-red-100 text-red-700 rounded">Del</button>
                      </div>
                    </div>
                  ))
                )}
              </div>
              <div className="mt-3 flex gap-2">
                <button onClick={exportPresets} className="px-3 py-2 bg-slate-800 text-white rounded">Export presets</button>
                <button onClick={exportLastSession} className="px-3 py-2 bg-slate-600 text-white rounded">Export last session</button>
                <button onClick={handleImportClick} className="px-3 py-2 bg-green-600 text-white rounded">Import</button>
                <input ref={fileInputRef} type="file" accept="application/json" onChange={(e) => importPresetsFile(e.target.files && e.target.files[0])} style={{ display: "none" }} />
              </div>
            </div>
          </div>
        </div>
        <div className="bg-white p-6 rounded-2xl shadow-sm">
          <div className="text-sm text-slate-500 mb-2">Quick actions</div>
          <div className="flex flex-col gap-2">
            <button
              onClick={() => {
                try {
                  const txt = JSON.stringify(getSessionObject(), null, 2);
                  if (navigator.clipboard && navigator.clipboard.writeText) {
                    navigator.clipboard.writeText(txt).then(() => alert("Session copied to clipboard"));
                  } else {
                    prompt("Copy session JSON", txt);
                  }
                } catch (e) {
                  alert("Failed to copy");
                }
              }}
              className="px-3 py-2 bg-indigo-600 text-white rounded"
            >
              Copy session JSON
            </button>
            <button
              onClick={() => {
                if (!confirm("Clear all saved presets?")) return;
                setPresets([]);
                try {
                  localStorage.removeItem(STORAGE_KEY);
                } catch (e) {}
              }}
              className="px-3 py-2 bg-red-100 text-red-700 rounded"
            >
              Clear presets
            </button>
            <div className="text-xs text-slate-500 mt-4">Math tests (sanity)</div>
            <pre className="text-xs bg-slate-50 p-2 rounded overflow-auto">{JSON.stringify(tests, null, 2)}</pre>
          </div>
        </div>
      </div>
    </div>
  );
}
