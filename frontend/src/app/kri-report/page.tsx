"use client";

import { ChangeEvent, useState } from "react";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export default function KriReportPage() {
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState(false);

  function onFileChange(event: ChangeEvent<HTMLInputElement>) {
    setFile(event.target.files?.[0] ?? null);
    setMessage("");
    setError(false);
  }

  async function generateReport() {
    if (!file) {
      setError(true);
      setMessage("Please select a CSV or Excel dataset first.");
      return;
    }
    setBusy(true);
    setMessage("");
    setError(false);
    try {
      const body = new FormData();
      body.append("file", file);
      const response = await fetch(`${API_URL}/kri/report`, { method: "POST", body });
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
        <p className="eyebrow">REPORTING TOOL · FIRST RELEASE</p>
        <h1>KRI Report Generator</h1>
        <p>Upload your KRI dataset and generate a PDF report with automatic Green, Amber and Red assessment.</p>
      </section>
      <section className="uploadCard">
        <div className="uploadHeading">
          <div><span className="stepTag">STEP 1</span><h2>Upload your dataset</h2></div>
          <a className="templateLink" href={`${API_URL}/kri/template`}>Download sample CSV template ↓</a>
        </div>
        <label className="dropZone" htmlFor="dataset">
          <span className="uploadIcon">↑</span>
          <strong>{file ? file.name : "Choose a CSV or Excel file"}</strong>
          <span>{file ? `${(file.size / 1024).toFixed(1)} KB · Ready to process` : "Click to browse · .csv, .xlsx or .xls · Maximum 10 MB"}</span>
          <input id="dataset" type="file" accept=".csv,.xlsx,.xls" onChange={onFileChange} />
        </label>
        <div className="formatBox">
          <strong>Required dataset columns</strong>
          <p><code>KRI</code> <code>Department</code> <code>Period</code> <code>Actual</code> <code>Green_Limit</code> <code>Red_From</code> <code>Direction</code></p>
          <small>Direction is optional and defaults to HIGHER. Use HIGHER when larger values mean more risk, or LOWER when smaller values mean more risk.</small>
        </div>
        <div className="thresholdInfo">
          <div><span className="ragDot greenDot" /><strong>Green</strong><p>Within the green limit.</p></div>
          <div><span className="ragDot amberDot" /><strong>Amber</strong><p>Between the green and red limits.</p></div>
          <div><span className="ragDot redDot" /><strong>Red</strong><p>At or beyond the red limit.</p></div>
        </div>
        <button className="generateButton" onClick={generateReport} disabled={busy || !file}>
          {busy ? "Generating PDF…" : "Generate KRI PDF Report"}
        </button>
        {message && <p className={error ? "feedback errorText" : "feedback successText"} role="status">{message}</p>}
      </section>
      <section className="noteCard">
        <strong>Important note</strong>
        <p>The system applies the thresholds contained in your uploaded file. Please verify that thresholds and direction settings match your bank-approved KRI process note. This first release does not save uploaded datasets or provide user authentication; use synthetic or approved test data only.</p>
      </section>
      <footer>Group-B · KRI Management System <span>Development build — not for production data</span></footer>
    </main>
  );
}
