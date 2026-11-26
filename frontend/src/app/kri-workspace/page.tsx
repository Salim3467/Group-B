"use client";

import { useEffect, useMemo, useState } from "react";

type Kri = {
  id: string; department: string; name: string; unit: string;
  appetite: number; tolerance: number; direction: "HIGHER" | "LOWER";
  actual: string; note: string;
};

const starter: Kri[] = [
  { id: "ICT-01", department: "Information Technology", name: "Critical system downtime", unit: "Hours", appetite: 2, tolerance: 5, direction: "HIGHER", actual: "", note: "" },
  { id: "OPS-01", department: "Operations", name: "Unreconciled transactions", unit: "Count", appetite: 10, tolerance: 25, direction: "HIGHER", actual: "", note: "" },
  { id: "OPS-02", department: "Operations", name: "Pending customer complaints", unit: "Count", appetite: 50, tolerance: 100, direction: "HIGHER", actual: "", note: "" },
  { id: "FIN-01", department: "Finance", name: "Daily reconciliation completion", unit: "%", appetite: 98, tolerance: 95, direction: "LOWER", actual: "", note: "" },
  { id: "HR-01", department: "Human Resources", name: "Critical position vacancy rate", unit: "%", appetite: 5, tolerance: 10, direction: "HIGHER", actual: "", note: "" },
  { id: "COM-01", department: "Compliance", name: "Overdue regulatory action items", unit: "Count", appetite: 2, tolerance: 5, direction: "HIGHER", actual: "", note: "" },
];

const api = "";
const statusFor = (k: Kri, value: number) => {
  if (k.direction === "HIGHER") return value <= k.appetite ? "GREEN" : value < k.tolerance ? "AMBER" : "RED";
  return value >= k.appetite ? "GREEN" : value > k.tolerance ? "AMBER" : "RED";
};

export default function KriWorkspace() {
  const [items, setItems] = useState<Kri[]>(starter);
  const [period, setPeriod] = useState("2026-11");
  const [department, setDepartment] = useState("All departments");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState(false);

  useEffect(() => {
    try {
      const saved = localStorage.getItem("kri-workspace-v1");
      if (saved) setItems(JSON.parse(saved));
    } catch { /* use sample workspace */ }
  }, []);

  useEffect(() => {
    try { localStorage.setItem("kri-workspace-v1", JSON.stringify(items)); } catch { /* storage may be unavailable */ }
  }, [items]);

  const visible = items.filter(x => department === "All departments" || x.department === department);
  const assessed = items.filter(x => x.actual.trim() !== "" && Number.isFinite(Number(x.actual)));
  const counts = useMemo(() => assessed.reduce((a, x) => {
    a[statusFor(x, Number(x.actual))]++; return a;
  }, { GREEN: 0, AMBER: 0, RED: 0 }), [assessed]);
  const departments = Array.from(new Set(items.map(x => x.department)));

  function update(id: string, field: keyof Kri, value: string | number) {
    setItems(old => old.map(x => x.id === id ? { ...x, [field]: value } : x));
  }

  async function makeReport() {
    if (!assessed.length) { setError(true); setMessage("Enter at least one KRI actual value before generating the report."); return; }
    setBusy(true); setError(false); setMessage("");
    try {
      const header = ["KRI", "Department", "Period", "Actual", "Green_Limit", "Red_From", "Direction"];
      const quote = (v: unknown) => '"' + String(v ?? "").replaceAll('"', '""') + '"';
      const rows = assessed.map(k => [k.name, k.department, period, k.actual, k.direction === "HIGHER" ? k.appetite : k.appetite, k.tolerance, k.direction]);
      const csv = [header, ...rows].map(row => row.map(quote).join(",")).join("\n");
      const form = new FormData();
      form.append("file", new Blob([csv], { type: "text/csv" }), "kri-submissions.csv");
      const response = await fetch(`${api}/api/kri/report`, { method: "POST", body: form });
      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.detail || "Could not generate the PDF report. Please check the uploaded data and try again.");
      }
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a"); a.href = url; a.download = `KRI_Analytical_Report_${period}.pdf`;
      document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url);
      setMessage("PDF report generated. Review the thresholds and commentary before management circulation.");
    } catch (e) {
      setError(true); setMessage(e instanceof Error ? e.message : "Report generation failed.");
    } finally { setBusy(false); }
  }

  return (
    <main className="shell reportShell">
      <header className="topbar">
        <a className="brand brandLink" href="/"><div className="brandMark">K</div><div><strong>KRI Management</strong><span>Operational Risk Portal</span></div></a>
        <a className="backLink" href="/">← Dashboard</a>
      </header>
      <section className="reportIntro">
        <p className="eyebrow">HEAD OFFICE · KRI COLLECTION</p>
        <h1>Monthly KRI workspace</h1>
        <p>Capture departmental KRI results, compare them with appetite and tolerance limits, and prepare a consolidated PDF.</p>
      </section>
      <section className="uploadCard">
        <div className="uploadHeading"><div><span className="stepTag">REPORTING CYCLE</span><h2>Collection period</h2></div></div>
        <div className="workspaceFilters">
          <label>Reporting month<input type="month" value={period} onChange={e => setPeriod(e.target.value)} /></label>
          <label>Department<select value={department} onChange={e => setDepartment(e.target.value)}><option>All departments</option>{departments.map(d => <option key={d}>{d}</option>)}</select></label>
        </div>
        <div className="kriSummary">
          <div><small>Reported</small><strong>{assessed.length}/{items.length}</strong></div>
          <div><small>Green</small><strong className="greenText">{counts.GREEN}</strong></div>
          <div><small>Amber</small><strong className="amberText">{counts.AMBER}</strong></div>
          <div><small>Red</small><strong className="redText">{counts.RED}</strong></div>
        </div>
        <div className="kriList">
          {visible.map(k => {
            const value = k.actual.trim() === "" ? null : Number(k.actual);
            const status = value === null || !Number.isFinite(value) ? "NOT REPORTED" : statusFor(k, value);
            return <article className="kriEntry" key={k.id}>
              <div className="kriEntryHead"><div><span className="kriCode">{k.id} · {k.department}</span><h3>{k.name}</h3></div><span className={`ragPill ${status.toLowerCase().replace(" ", "-")}`}>{status}</span></div>
              <div className="kriEntryFields">
                <label>Actual value ({k.unit})<input type="number" step="any" value={k.actual} onChange={e => update(k.id, "actual", e.target.value)} placeholder="Enter reported value" /></label>
                <label>Risk appetite limit<input type="number" step="any" value={k.appetite} onChange={e => update(k.id, "appetite", Number(e.target.value))} /></label>
                <label>Risk tolerance limit<input type="number" step="any" value={k.tolerance} onChange={e => update(k.id, "tolerance", Number(e.target.value))} /></label>
                <label>Direction<select value={k.direction} onChange={e => update(k.id, "direction", e.target.value)}><option value="HIGHER">Higher = more risk</option><option value="LOWER">Lower = more risk</option></select></label>
              </div>
              <label className="noteField">Department explanation / action<textarea value={k.note} onChange={e => update(k.id, "note", e.target.value)} placeholder="Explain the movement, root cause or action being taken…" rows={2} /></label>
              <p className="thresholdHint">{k.direction === "HIGHER" ? `Green ≤ ${k.appetite} · Amber > ${k.appetite} and < ${k.tolerance} · Red ≥ ${k.tolerance}` : `Green ≥ ${k.appetite} · Amber < ${k.appetite} and > ${k.tolerance} · Red ≤ ${k.tolerance}`}</p>
            </article>;
          })}
        </div>
        <button className="generateButton" onClick={makeReport} disabled={busy || !assessed.length}>{busy ? "Preparing PDF…" : "Generate consolidated KRI PDF"}</button>
        {message && <p className={error ? "feedback errorText" : "feedback successText"} role="status">{message}</p>}
      </section>
      <section className="noteCard">
        <strong>Prototype and threshold governance</strong>
        <p>Sample KRI definitions and limits are illustrative only. Replace them with the bank-approved KRI inventory and formally approved appetite/tolerance thresholds. In this prototype, entries are saved in this browser only; authentication, central database storage, departmental access controls, submission approvals and automated reminders are not yet enabled. Do not enter confidential or live bank information.</p>
      </section>
      <footer>Group-B · KRI Management System <span>Development prototype — synthetic data only</span></footer>
    </main>
  );
}
