"use client";

import { useMemo, useRef, useState } from "react";

type UploadInspection = { file_name: string; data_rows: number; ready: boolean; missing_fields: string[]; detected_columns: { field: string; source_column: string }[] };

const records = [
  { code: "ICT-01", name: "Critical system downtime", department: "Information Technology", actual: "6.2 hrs", status: "Red", owner: "ICT Operations" },
  { code: "OPS-04", name: "Unreconciled transactions", department: "Operations", actual: "18", status: "Amber", owner: "Transaction Banking" },
  { code: "CMP-02", name: "Overdue regulatory actions", department: "Compliance", actual: "1", status: "Green", owner: "Regulatory Compliance" },
  { code: "HR-03", name: "Critical position vacancy rate", department: "Human Resources", actual: "7.5%", status: "Amber", owner: "HR Operations" },
  { code: "FIN-01", name: "Daily reconciliation completion", department: "Finance", actual: "99.1%", status: "Green", owner: "Finance Control" },
];

const departments = [
  { name: "Information Technology", submitted: 8, total: 9, status: "In progress" },
  { name: "Operations", submitted: 12, total: 12, status: "Complete" },
  { name: "Finance", submitted: 7, total: 8, status: "In progress" },
  { name: "Compliance", submitted: 6, total: 6, status: "Complete" },
  { name: "Human Resources", submitted: 4, total: 7, status: "Pending" },
];

const modules = [
  { n: "01", title: "KRI inventory", desc: "Maintain KRI definitions, owners, units and approved limits.", href: "/kri-workspace", tag: "Master data" },
  { n: "02", title: "Monthly collection", desc: "Capture departmental results, explanations and evidence.", href: "/kri-workspace", tag: "Department portal" },
  { n: "03", title: "Review & approval", desc: "Review submissions, return for correction and accept returns.", href: "/kri-workspace", tag: "Workflow" },
  { n: "04", title: "Reminders & escalation", desc: "Track reporting deadlines, reminders and overdue follow-up.", href: "/kri-workspace", tag: "Automation" },
  { n: "05", title: "Risk analytics", desc: "Monitor RAG status, exceptions and historical movements.", href: "/kri-report", tag: "Risk monitoring" },
  { n: "06", title: "Reports & insights", desc: "Prepare consolidated reports and management commentary.", href: "/kri-report", tag: "Reporting" },
];

export default function Home() {
  const [filter, setFilter] = useState("All");
  const [query, setQuery] = useState("");
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadBusy, setUploadBusy] = useState(false);
  const [uploadMessage, setUploadMessage] = useState("");
  const [inspection, setInspection] = useState<UploadInspection | null>(null);
  const uploadInputRef = useRef<HTMLInputElement>(null);
  async function inspectUpload() {
    if (!uploadFile) { setUploadMessage("Choose a CSV or Excel file first."); return; }
    const extension = uploadFile.name.toLowerCase().split(".").pop();
    if (extension !== "csv" && extension !== "xlsx") { setUploadMessage("Only .csv and .xlsx files are supported."); return; }
    if (uploadFile.size > 10 * 1024 * 1024) { setUploadMessage("File size must not exceed 10 MB."); return; }
    setUploadBusy(true); setUploadMessage(""); setInspection(null);
    try {
      const form = new FormData();
      form.append("file", uploadFile);
      const response = await fetch("/api/kri/inspect", { method: "POST", body: form });
      const result = await response.json();
      if (!response.ok) throw new Error(result.detail || "Unable to inspect this file.");
      setInspection(result);
      setUploadMessage(result.ready ? "File validated successfully. You can now generate a KRI report." : "File inspected, but required columns need attention.");
    } catch (error) {
      setUploadMessage(error instanceof Error ? error.message : "Unable to inspect this file.");
    } finally { setUploadBusy(false); }
  }

  async function processUpload() {
    if (!uploadFile || !inspection?.ready) return;
    setUploadBusy(true); setUploadMessage("");
    try {
      const form = new FormData();
      form.append("file", uploadFile);
      const response = await fetch("/api/kri/report", { method: "POST", body: form });
      if (!response.ok) {
        const result = await response.json().catch(() => ({}));
        throw new Error(result.detail || "Report processing failed.");
      }
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = "KRI_Processed_Report.pdf";
      document.body.appendChild(link); link.click(); link.remove();
      URL.revokeObjectURL(url);
      setUploadMessage("Processing complete. Your KRI PDF report has been downloaded.");
    } catch (error) {
      setUploadMessage(error instanceof Error ? error.message : "Report processing failed.");
    } finally { setUploadBusy(false); }
  }

  async function downloadAnalyzedExcel() {
    if (!uploadFile || !inspection?.ready) return;
    setUploadBusy(true); setUploadMessage("");
    try {
      const form = new FormData();
      form.append("file", uploadFile);
      const response = await fetch("/api/kri/excel", { method: "POST", body: form });
      if (!response.ok) {
        const result = await response.json().catch(() => ({}));
        throw new Error(result.detail || "Excel processing failed.");
      }
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = "KRI_Analyzed_Results.xlsx";
      document.body.appendChild(link); link.click(); link.remove();
      URL.revokeObjectURL(url);
      setUploadMessage("Analysis complete. Your analyzed Excel workbook has been downloaded.");
    } catch (error) {
      setUploadMessage(error instanceof Error ? error.message : "Excel processing failed.");
    } finally { setUploadBusy(false); }
  }

  const filtered = useMemo(() => records.filter((r) =>
    (filter === "All" || r.status === filter) &&
    (r.name + r.department + r.code).toLowerCase().includes(query.toLowerCase())
  ), [filter, query]);

  return (
    <main className="appShell">
      <aside className="sideNav">
        <a className="sideBrand" href="/"><img className="sideBrandLogo" src="/nabil-bank-logo.svg" alt="NABIL Bank" /><span><small>Operational Risk Portal</small></span></a>
        <div className="navCaption">WORKSPACE</div>
        <a className="navItem active" href="/">▦ <span>Overview</span></a>
        <a className="navItem" href="/kri-workspace">▤ <span>Monthly collection</span></a>
        <a className="navItem" href="/department-portal">＋ <span>Department portal</span></a>
        <a className="navItem" href="/kri-report">▧ <span>Report generator</span></a>
        <div className="navCaption">MANAGEMENT</div>
        <a className="navItem" href="/kri-workspace">◫ <span>KRI inventory</span></a>
        <a className="navItem" href="/kri-workspace">✓ <span>Review queue</span></a>
        <a className="navItem" href="/kri-report">⌁ <span>Risk analytics</span></a>
        <div className="sideFoot"><span className="avatar">RM</span><span><b>Risk Management</b><small>Demo workspace</small></span></div>
      </aside>

      <section className="mainPanel">
        <header className="dashTop"><div><span className="crumb">KRI MANAGEMENT / OVERVIEW</span><h1>Risk Indicator</h1><p>Consolidated view of Head Office Key Risk Indicators</p></div><div className="topActions"><button className="topUploadButton" onClick={() => uploadInputRef.current?.click()}>↑ &nbsp; Upload KRI File</button><input ref={uploadInputRef} id="kri-dashboard-file" type="file" accept=".csv,.xlsx" hidden onChange={e => { setUploadFile(e.target.files?.[0] ?? null); setInspection(null); setUploadMessage(""); }} /><span className="periodChip">◷ &nbsp; Reporting period: Nov 2026</span><span className="prototypeChip">SAMPLE DATA</span></div></header>

        <div className="welcomeStrip"><div><span className="stripEyebrow">MONTHLY OPERATIONAL RISK REVIEW</span><h2>Good Morning Team,</h2><p>Monitor submissions, identify exceptions and follow up with departments from one workspace.</p></div><a className="primaryAction" href="/kri-workspace">Open KRI workspace&nbsp; →</a></div>

        <section className="dashboardUpload">
          <div className="dashboardUploadIntro">
            <span className="sectionEyebrow">DATA INTAKE · FILE PROCESSING</span>
            <h3>Upload KRI data file</h3>
            <p>Upload a department KRI dataset in CSV or Excel format. The system will validate its columns and prepare a downloadable risk report.</p>
            <small>Supported formats: .csv, .xlsx · Maximum file size: 10 MB</small>
          </div>
          <div className="dashboardUploadControls">
            {uploadFile && <span className="selectedFileName">{uploadFile.name} · {(uploadFile.size / 1024).toFixed(1)} KB</span>}
            <div className="uploadButtonRow">
              <button className="uploadSecondaryButton" onClick={inspectUpload} disabled={!uploadFile || uploadBusy}>{uploadBusy ? "Checking…" : "Validate file"}</button>
              <button className="uploadPrimaryButton" onClick={processUpload} disabled={!inspection?.ready || uploadBusy}>{uploadBusy ? "Processing…" : "Download PDF report"}</button>
              <button className="uploadSecondaryButton" onClick={downloadAnalyzedExcel} disabled={!inspection?.ready || uploadBusy}>{uploadBusy ? "Processing…" : "Download analyzed Excel"}</button>
            </div>
            {inspection && <div className={inspection.ready ? "uploadResult success" : "uploadResult warning"}>
              <b>{inspection.ready ? "File ready for processing" : "File needs correction"}</b>
              <span>{inspection.data_rows} data rows detected · {inspection.detected_columns.length} columns mapped</span>
              {inspection.missing_fields.length > 0 && <span>Missing fields: {inspection.missing_fields.join(", ")}</span>}
            </div>}
            {uploadMessage && <p className="uploadFeedback" role="status">{uploadMessage}</p>}
          </div>
        </section>

        <section className="metricGrid">
          <article className="metricCard"><div className="metricLabel">KRI SUBMISSIONS</div><div className="metricValue">37 <span>/ 42</span></div><div className="metricFoot"><span className="metricGood">↗ 88%</span> reporting completion</div><div className="progressTrack"><i style={{width:"88%"}} /></div></article>
          <article className="metricCard"><div className="metricLabel">DEPARTMENTS REPORTED</div><div className="metricValue">4 <span>/ 5</span></div><div className="metricFoot">1 department still outstanding</div><div className="progressTrack"><i style={{width:"80%"}} /></div></article>
          <article className="metricCard"><div className="metricLabel">RED KRIs</div><div className="metricValue metricRed">03</div><div className="metricFoot">Require management attention</div><span className="metricFlag redFlag">Priority follow-up</span></article>
          <article className="metricCard"><div className="metricLabel">PENDING REVIEW</div><div className="metricValue">06</div><div className="metricFoot">Awaiting review or validation</div><span className="metricFlag amberFlag">Action required</span></article>
        </section>

        <section className="dashGrid">
          <article className="dashCard riskCard"><div className="cardHead"><div><span className="sectionEyebrow">RISK PROFILE</span><h3>KRI status distribution</h3></div><span className="subtleTag">Current period</span></div><div className="riskContent"><div className="donut"><div><b>42</b><small>Total KRIs</small></div></div><div className="legend"><div><i className="dot greenDot" /><span>Green</span><b>27</b></div><div><i className="dot amberDot" /><span>Amber</span><b>12</b></div><div><i className="dot redDot" /><span>Red</span><b>03</b></div></div></div><p className="chartDisclaimer">Illustrative distribution for interface demonstration.</p></article>
          <article className="dashCard"><div className="cardHead"><div><span className="sectionEyebrow">SUBMISSION TRACKER</span><h3>Department progress</h3></div><a href="/kri-workspace" className="textLink">View all →</a></div><div className="departmentList">{departments.map(d=><div className="departmentRow" key={d.name}><div className="deptTop"><b>{d.name}</b><span>{d.submitted}/{d.total}</span></div><div className="progressTrack"><i style={{width:`${d.submitted/d.total*100}%`}} /></div><small className={d.status==="Complete"?"stateComplete":d.status==="Pending"?"statePending":"stateProgress"}>{d.status}</small></div>)}</div></article>
        </section>

        <section className="dashCard tableCard"><div className="cardHead tableHeader"><div><span className="sectionEyebrow">EXCEPTIONS & MONITORING</span><h3>Key Risk Indicators</h3></div><a className="textLink" href="/kri-workspace">Open monthly workspace →</a></div><div className="tableTools"><input aria-label="Search KRIs" placeholder="Search KRI or department…" value={query} onChange={e=>setQuery(e.target.value)} /><div className="filterTabs">{["All","Red","Amber","Green"].map(f=><button key={f} onClick={()=>setFilter(f)} className={filter===f?"selected":""}>{f}</button>)}</div></div><div className="tableWrap"><table className="riskTable"><thead><tr><th>KRI</th><th>Department</th><th>Reported value</th><th>Owner</th><th>Status</th></tr></thead><tbody>{filtered.map(r=><tr key={r.code}><td><b>{r.name}</b><small>{r.code}</small></td><td>{r.department}</td><td>{r.actual}</td><td>{r.owner}</td><td><span className={`ragStatus ${r.status.toLowerCase()}`}>{r.status}</span></td></tr>)}{filtered.length===0&&<tr><td colSpan={5}>No matching KRI records.</td></tr>}</tbody></table></div><p className="chartDisclaimer">All displayed figures, departments and KRI results are synthetic sample data, not live bank records.</p></section>

        <section className="moduleSection"><div className="moduleSectionHead"><div><span className="sectionEyebrow">SYSTEM WORKSPACES</span><h3>Application modules</h3></div><span>Designed around the approved KRI process</span></div><div className="moduleGrid">{modules.map(m=><a className="dashModule" href={m.href} key={m.n}><div className="moduleLine"><span>{m.n}</span><small>{m.tag}</small></div><h4>{m.title}</h4><p>{m.desc}</p><b>Open workspace&nbsp; ↗</b></a>)}</div></section>

        <footer className="dashFooter"><span>Group-B · KRI Management System</span><span>Prototype interface · Synthetic data only · Not for production use</span></footer>
      </section>
    </main>
  );
}
