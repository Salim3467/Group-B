"use client";

import { ChangeEvent, useState } from "react";

const API_URL = "";

type Inspection = {
  file_name: string;
  header_row: number;
  data_rows: number;
  detected_columns: { field: string; source_column: string }[];
  missing_fields: string[];
  optional_direction: string;
  ambiguous_fields: Record<string, string[]>;
  ready: boolean;
};

export default function KriReportPage() {
  const [file, setFile] = useState<File | null>(null);
  const [inspection, setInspection] = useState<Inspection | null>(null);
  const [busy, setBusy] = useState(false);
  const [inspecting, setInspecting] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState(false);

  async function onFileChange(event: ChangeEvent<HTMLInputElement>) {
    const selected = event.target.files?.[0] ?? null;
    setFile(selected);
    setInspection(null);
    setMessage("");
    setError(false);
    if (!selected) return;
    setInspecting(true);
    try {
      const body = new FormData();
      body.append("file", selected);
      const response = await fetch(`${API_URL}/api/kri/inspect`, { method: "POST", body });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.detail || "Could not inspect this dataset.");
      setInspection(payload as Inspection);
    } catch (err) {
      setError(true);
      setMessage(err instanceof Error ? err.message : "Could not inspect this dataset.");
    } finally {
      setInspecting(false);
    }
  }

  async function generateReport() {
    if (!file || !inspection?.ready) return;
    setBusy(true);
    setMessage("");
    setError(false);
    try {
      const body = new FormData();
      body.append("file", file);
      const response = await fetch(`${API_URL}/api/kri/report`, { method: "POST", body });
      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        throw new Error(payload.detail || "Unable to generate the report.");
      }
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = "KRI_Report.pdf";
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(url);
      setMessage("Your KRI PDF report has been generated and downloaded.");
    } catch (err) {
      setError(true);
      setMessage(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="shell reportShell">
      <header className="topbar">
        <a className="brand brandLink" href="/">
          <div className="brandMark">K</div>
          <div><strong>KRI Management</strong><span>Operational Risk Portal</span></div>
        </a>
        <a className="backLink" href="/">← Dashboard</a>
      </header>
      <section className="reportIntro">
        <p className="eyebrow">REPORTING TOOL · SMART COLUMN DETECTION</p>
        <h1>KRI Report Generator</h1>
        <p>Upload a departmental CSV or Excel file. The system identifies common column-name variations, checks the dataset and prepares a PDF risk report.</p>
      </section>
      <section className="uploadCard">
        <div className="uploadHeading">
          <div><span className="stepTag">STEP 1</span><h2>Upload your dataset</h2></div>
          <a className="templateLink" href={`${API_URL}/api/kri/template`}>Download sample CSV template ↓</a>
        </div>
        <label className="dropZone" htmlFor="dataset">
          <span className="uploadIcon">↑</span>
          <strong>{file ? file.name : "Choose a CSV or Excel file"}</strong>
          <span>{file ? `${(file.size / 1024).toFixed(1)} KB · Selected` : "Click to browse · .csv, .xlsx or .xls · Maximum 10 MB"}</span>
          <input id="dataset" type="file" accept=".csv,.xlsx,.xls" onChange={onFileChange} />
        </label>

        {inspecting && <p className="feedback">Reading file and detecting column headings…</p>}
        {inspection && (
          <div className="inspectionPanel">
            <div className="inspectionHeader">
              <strong>Dataset inspection</strong>
              <span className={inspection.ready ? "readyTag" : "warningTag"}>{inspection.ready ? "Ready for report" : "Action required"}</span>
            </div>
            <div className="inspectionStats">
              <div><strong>{inspection.data_rows.toLocaleString()}</strong><span>Data rows</span></div>
              <div><strong>{inspection.header_row}</strong><span>Header row detected</span></div>
              <div><strong>{inspection.detected_columns.length}</strong><span>Fields identified</span></div>
            </div>
            <p className="mappingTitle">Automatically detected column mapping</p>
            <div className="mappingGrid">
              {inspection.detected_columns.map((item) => (
                <div className="mappingItem" key={item.field}><span>{item.field}</span><strong>{item.source_column}</strong></div>
              ))}
            </div>
            {inspection.missing_fields.length > 0 && (
              <p className="mappingWarning">Could not identify: {inspection.missing_fields.join(", ")}. Rename these headings using the sample template or a recognised alternative.</p>
            )}
            {Object.keys(inspection.ambiguous_fields).length > 0 && (
              <p className="mappingWarning">More than one column matches: {Object.keys(inspection.ambiguous_fields).join(", ")}. Keep only one matching column for each field.</p>
            )}
            <p className="mappingHint">Direction: {inspection.optional_direction}. Blank or missing direction defaults to HIGHER.</p>
          </div>
        )}

        <div className="formatBox">
          <strong>Common column names recognised automatically</strong>
          <p><code>KRI / Indicator / Risk Metric</code><code>Department / Unit / Division</code><code>Period / Month / Reporting Date</code><code>Actual / Actual Value / Result</code><code>Green Limit / Green Threshold</code><code>Red From / Red Threshold</code></p>
          <small>The system also checks the first 10 rows to locate the heading row. It does not infer missing thresholds or guess whether higher or lower values are riskier.</small>
        </div>
        <div className="thresholdInfo">
          <div><span className="ragDot greenDot" /><strong>Green</strong><p>Within the green limit.</p></div>
          <div><span className="ragDot amberDot" /><strong>Amber</strong><p>Between the green and red limits.</p></div>
          <div><span className="ragDot redDot" /><strong>Red</strong><p>At or beyond the red limit.</p></div>
        </div>
        <button className="generateButton" onClick={generateReport} disabled={busy || inspecting || !file || !inspection?.ready}>
          {busy ? "Generating PDF…" : "Generate KRI PDF Report"}
        </button>
        {message && <p className={error ? "feedback errorText" : "feedback successText"} role="status">{message}</p>}
      </section>
      <section className="noteCard">
        <strong>Important note</strong>
        <p>Automatic mapping recognises common heading variations only. Review the detected mapping and confirm that threshold values and risk direction match your bank-approved KRI methodology. This development release processes uploads in memory and does not save them. Use synthetic or approved test data only.</p>
      </section>
      <footer>Group-B · KRI Management System <span>Development build — not for production data</span></footer>
    </main>
  );
}
