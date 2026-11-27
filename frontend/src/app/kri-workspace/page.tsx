"use client";

import { useEffect, useMemo, useState } from "react";
import "./workspace.css";

type Metric = {
  id: string; department: string; name: string; unit: string;
  appetite: number; tolerance: number; direction: "HIGHER" | "LOWER";
  approved: boolean; source: string;
};
type Value = { actual: string; occurred: string; location: string; remarks: string };
type Submission = {
  id: string; department: string; period: string; frequency: string;
  dueDate: string; status: "REQUESTED" | "SUBMITTED" | "RETURNED" | "APPROVED";
  requestedAt: string; reminders: number; lastReminder: string;
  submittedAt: string; reviewedAt: string; reviewerNote: string;
  values: Record<string, Value>;
};
type Log = { id: string; at: string; department: string; action: string; detail: string };

const initialMetrics: Metric[] = [
  ...["Core Banking System", "SWIFT", "Email", "Overall Data Centre", "ATM"].map((name, i) => ({
    id: `IT-${String(i + 1).padStart(2, "0")}`, department: "Information Technology",
    name: name + " downtime", unit: "Hours", appetite: 2, tolerance: 5,
    direction: "HIGHER" as const, approved: false, source: "Illustrative demo limits – approval pending"
  })),
  ...["Mobile Banking", "Internet Banking", "e@nabil", "corporatePAY", "ATM"].map((name, i) => ({
    id: `DG-${String(i + 1).padStart(2, "0")}`, department: "Digital Banking",
    name: name + " downtime", unit: "Hours", appetite: 2, tolerance: 5,
    direction: "HIGHER" as const, approved: false, source: "Illustrative demo limits – approval pending"
  })),
  { id: "HR-01", department: "Human Resources", name: "Employee turnover", unit: "%", appetite: 10, tolerance: 12, direction: "HIGHER" as const, approved: false, source: "Source template classification – confirmation pending" }
];

const departments = ["Information Technology", "Digital Banking", "Human Resources"];
const today = () => { const d = new Date(); return [d.getFullYear(), String(d.getMonth()+1).padStart(2,"0"), String(d.getDate()).padStart(2,"0")].join("-"); };
const fmt = (value: string) => value ? new Date(value + "T00:00:00").toLocaleDateString("en-GB") : "—";
const blankValue = (): Value => ({ actual: "", occurred: "", location: "", remarks: "" });

function addWorkingDays(start: Date, days: number) {
  const date = new Date(start);
  let added = 0;
  while (added < days) {
    if (date.getDay() !== 0 && date.getDay() !== 6) added++;
    if (added < days) date.setDate(date.getDate() + 1);
  }
  return [date.getFullYear(), String(date.getMonth()+1).padStart(2,"0"), String(date.getDate()).padStart(2,"0")].join("-");
}
function statusFor(metric: Metric, raw: string) {
  if (raw.trim() === "" || !Number.isFinite(Number(raw))) return "NOT REPORTED";
  const n = Number(raw);
  if (metric.id === "HR-01") return n < metric.appetite ? "GREEN" : n === metric.appetite ? "THRESHOLD GAP" : n <= metric.tolerance ? "AMBER" : "RED";
  if (metric.direction === "HIGHER") return n <= metric.appetite ? "GREEN" : n < metric.tolerance ? "AMBER" : "RED";
  return n >= metric.appetite ? "GREEN" : n > metric.tolerance ? "AMBER" : "RED";
}
function displayStatus(s: Submission) {
  if ((s.status === "REQUESTED" || s.status === "RETURNED") && s.dueDate < today()) return "OVERDUE";
  return s.status;
}
function newId() { return `SUB-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`; }

export default function KriWorkspace() {
  const [tab, setTab] = useState("Overview");
  const [period, setPeriod] = useState("2083/08");
  const [cycleDate, setCycleDate] = useState(today());
  const [includeHR, setIncludeHR] = useState(true);
  const [metrics, setMetrics] = useState<Metric[]>(initialMetrics);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [logs, setLogs] = useState<Log[]>([]);
  const [selectedId, setSelectedId] = useState("");
  const [reviewNote, setReviewNote] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    try {
      const saved = localStorage.getItem("kri-central-demo-v2");
      if (saved) {
        const data = JSON.parse(saved);
        if (Array.isArray(data.metrics)) setMetrics(data.metrics);
        if (Array.isArray(data.submissions)) setSubmissions(data.submissions);
        if (Array.isArray(data.logs)) setLogs(data.logs);
      }
    } catch { /* use demo starter data */ }
    setLoaded(true);
  }, []);
  useEffect(() => {
    if (!loaded) return;
    localStorage.setItem("kri-central-demo-v2", JSON.stringify({ metrics, submissions, logs }));
  }, [metrics, submissions, logs, loaded]);

  const selected = submissions.find(s => s.id === selectedId) ?? null;
  const assessed = useMemo(() => submissions.flatMap(s => metrics
    .filter(m => m.department === s.department)
    .map(m => ({ submission: s, metric: m, value: s.values[m.id] ?? blankValue() }))
    .filter(x => x.value.actual.trim() !== "")), [submissions, metrics]);
  const rag = assessed.reduce((a, x) => { a[statusFor(x.metric, x.value.actual)] = (a[statusFor(x.metric, x.value.actual)] ?? 0) + 1; return a; }, { GREEN: 0, AMBER: 0, RED: 0, "NOT REPORTED": 0, "THRESHOLD GAP": 0 } as Record<string, number>);
  const approvedAssessed = assessed.filter(x => x.submission.status === "APPROVED");
  const approvedRag = approvedAssessed.reduce((a, x) => { const status = statusFor(x.metric, x.value.actual); a[status] = (a[status] ?? 0) + 1; return a; }, { GREEN: 0, AMBER: 0, RED: 0, "THRESHOLD GAP": 0 } as Record<string, number>);
  const pending = submissions.filter(s => s.status === "REQUESTED" || s.status === "RETURNED").length;
  const overdue = submissions.filter(s => (s.status === "REQUESTED" || s.status === "RETURNED") && s.dueDate < today()).length;
  const reviewQueue = submissions.filter(s => s.status === "SUBMITTED");
  const totalExpected = submissions.reduce((n, s) => n + metrics.filter(m => m.department === s.department).length, 0);
  const totalReported = assessed.length;

  function logAction(department: string, action: string, detail: string) {
    setLogs(old => [{ id: newId(), at: new Date().toLocaleString(), department, action, detail }, ...old].slice(0, 100));
  }
  function startCycle() {
    const activeDepts = includeHR ? departments : departments.filter(d => d !== "Human Resources");
    const existing = submissions.filter(s => s.period === period).map(s => s.department);
    const missing = activeDepts.filter(d => !existing.includes(d));
    if (!missing.length) { setMessage("A collection cycle for this period already exists."); return; }
    const requestDate = new Date(cycleDate + "T00:00:00");
    const nextMonthStart = new Date(requestDate.getFullYear(), requestDate.getMonth() + 1, 1);
    const created = missing.map(department => ({
      id: newId(), department, period,
      frequency: department === "Human Resources" ? "Quarterly" : "Monthly",
      dueDate: addWorkingDays(department === "Human Resources" ? nextMonthStart : requestDate, 13), status: "REQUESTED" as const, requestedAt: cycleDate, reminders: 0,
      lastReminder: "", submittedAt: "", reviewedAt: "", reviewerNote: "",
      values: Object.fromEntries(metrics.filter(m => m.department === department).map(m => [m.id, blankValue()]))
    }));
    setSubmissions(old => [...old, ...created]);
    created.forEach(s => logAction(s.department, "Request issued (simulated)", `KRI request for ${period}; due ${fmt(s.dueDate)}.`));
    setMessage(`Collection cycle created for ${missing.join(", ")}. Email dispatch is simulated in this demonstration.`);
  }
  function openDepartment(department: string) {
    const existing = submissions.find(s => s.period === period && s.department === department);
    if (existing) {
      setSelectedId(existing.id);
      setTab("Department entry");
      setMessage("");
      return;
    }
    const requestDate = new Date(cycleDate + "T00:00:00");
    const nextMonthStart = new Date(requestDate.getFullYear(), requestDate.getMonth() + 1, 1);
    const draft: Submission = {
      id: newId(), department, period,
      frequency: department === "Human Resources" ? "Quarterly" : "Monthly",
      dueDate: addWorkingDays(department === "Human Resources" ? nextMonthStart : requestDate, 13),
      status: "REQUESTED", requestedAt: today(), reminders: 0, lastReminder: "",
      submittedAt: "", reviewedAt: "", reviewerNote: "",
      values: Object.fromEntries(metrics.filter(m => m.department === department).map(m => [m.id, blankValue()]))
    };
    setSubmissions(old => [...old, draft]);
    logAction(department, "Department entry opened", `Draft KRI entry created for ${period}.`);
    setSelectedId(draft.id);
    setTab("Department entry");
    setMessage("");
  }

  function sendReminder(s: Submission) {
    setSubmissions(old => old.map(x => x.id === s.id ? { ...x, reminders: x.reminders + 1, lastReminder: today() } : x));
    logAction(s.department, "Reminder issued (simulated)", `Reminder #${s.reminders + 1} for ${s.period} submission.`);
    setMessage(`Reminder recorded for ${s.department}. No email was sent by this demo.`);
  }
  function updateValue(submissionId: string, metricId: string, field: keyof Value, value: string) {
    setSubmissions(old => old.map(s => {
      if (s.id !== submissionId) return s;
      return { ...s, values: { ...s.values, [metricId]: { ...(s.values[metricId] ?? blankValue()), [field]: value } } };
    }));
  }
  function submitDepartment(s: Submission) {
    const deptMetrics = metrics.filter(m => m.department === s.department);
    const complete = deptMetrics.every(m => (s.values[m.id]?.actual ?? "").trim() !== "");
    if (!complete) { setMessage("Complete all KRI values for this department before submitting."); return; }
    setSubmissions(old => old.map(x => x.id === s.id ? { ...x, status: "SUBMITTED", submittedAt: today() } : x));
    logAction(s.department, "Department submission received", `Submission for ${s.period} sent to ORMD for review.`);
    setSelectedId("");
    setMessage(`${s.department} submission sent for ORMD review.`);
  }
  function review(s: Submission, decision: "APPROVED" | "RETURNED") {
    setSubmissions(old => old.map(x => x.id === s.id ? { ...x, status: decision, reviewedAt: today(), reviewerNote: reviewNote } : x));
    logAction(s.department, decision === "APPROVED" ? "Submission approved" : "Submission returned", reviewNote || `ORMD marked submission ${decision.toLowerCase()}.`);
    setReviewNote("");
    setMessage(`Submission ${decision.toLowerCase()}.`);
  }
  function updateMetric(id: string, field: keyof Metric, value: string | number | boolean) {
    setMetrics(old => old.map(m => m.id === id ? ({ ...m, [field]: value, source: field === "approved" && value === true ? "Marked approved in demo workspace" : m.source } as Metric) : m));
  }
  async function generatePdf() {
    const rows = approvedAssessed.filter(x => x.metric.appetite !== null && x.metric.tolerance !== null);
    if (!rows.length) { setMessage("No ORMD-approved KRI values are available for the report."); return; }
    setBusy(true); setMessage("");
    try {
      const header = ["KRI", "Department", "Period", "Actual", "Green_Limit", "Red_From", "Direction"];
      const quote = (v: unknown) => '"' + String(v ?? "").replaceAll('"', '""') + '"';
      const csv = [header, ...rows.map(x => [x.metric.name, x.metric.department, x.submission.period, x.value.actual, x.metric.appetite, x.metric.tolerance, x.metric.direction])]
        .map(row => row.map(quote).join(",")).join("\n");
      const form = new FormData();
      form.append("file", new Blob([csv], { type: "text/csv" }), "kri-submissions.csv");
      const response = await fetch("/api/kri/report", { method: "POST", body: form });
      if (!response.ok) throw new Error((await response.json().catch(() => ({}))).detail || "PDF generation failed.");
      const blob = await response.blob(); const url = URL.createObjectURL(blob);
      const a = document.createElement("a"); a.href = url; a.download = `KRI_Management_Report_${period.replaceAll("/", "-")}.pdf`;
      document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url);
      setMessage("PDF report generated. The report uses the limits currently configured in this demo.");
      logAction("All departments", "Management report generated", `PDF report generated for ${period}.`);
    } catch (e) { setMessage(e instanceof Error ? e.message : "PDF generation failed."); }
    finally { setBusy(false); }
  }
  function exportCsv() {
    const header = ["KRI_ID","KRI","Department","Period","Actual","Unit","Appetite","Tolerance","Direction","Status","Threshold_Approval","Remarks"];
    const rows = approvedAssessed.map(x => [x.metric.id,x.metric.name,x.metric.department,x.submission.period,x.value.actual,x.metric.unit,x.metric.appetite,x.metric.tolerance,x.metric.direction,statusFor(x.metric,x.value.actual),x.metric.approved ? "Marked approved" : "Not approved",x.value.remarks]);
    const quote = (v: unknown) => '"' + String(v ?? "").replaceAll('"','""') + '"';
    const csv = [header,...rows].map(r=>r.map(quote).join(",")).join("\n");
    const url = URL.createObjectURL(new Blob([csv],{type:"text/csv;charset=utf-8"}));
    const a=document.createElement("a");a.href=url;a.download=`KRI_Data_${period.replaceAll("/","-")}.csv`;a.click();URL.revokeObjectURL(url);
  }
  function resetDemo() {
    if (!window.confirm("Reset this browser demo? All local submissions and activity logs will be cleared.")) return;
    setMetrics(initialMetrics); setSubmissions([]); setLogs([]); setSelectedId(""); setMessage("Demo workspace reset.");
  }

  return (
    <main className="kriApp">
      <aside className="kriSidebar">
        <a className="kriBrand" href="/"><span className="kriLogo">N</span><span><b>NABIL</b><small>Operational Risk Portal</small></span></a>
        <p className="navLabel">WORKSPACE</p>
        {["Overview","Departments","Collection","Review queue","KRI inventory","Reports","Activity log"].map(t =>
          <button key={t} className={tab===t?"navButton active":"navButton"} onClick={()=>{setTab(t);setSelectedId("");}}>{({Overview:"▦",Departments:"▣",Collection:"▤","Review queue":"✓","KRI inventory:"◫",Reports:"▧","Activity log":"⌁"} as Record<string,string>)[t]} <span>{t}</span></button>
        )}
        <div className="sidebarBottom"><b>ORMD DEMO</b><small>Local prototype · Synthetic data</small><button onClick={resetDemo}>Reset demo data</button></div>
      </aside>
      <section className="kriMain">
        <header className="kriTop"><div><small>GROUP-B / KRI MANAGEMENT SYSTEM</small><h1>{tab === "Overview" ? "Operational risk dashboard" : tab}</h1></div><div className="topRight"><span className="demoBadge">DEMONSTRATION MODE</span><span className="periodBadge">Reporting period: {period}</span></div></header>
        <div className="kriContent">
          <div className="notice"><b>Prototype notice:</b> Data is stored in this browser only. Request emails and reminders are simulated. Threshold values are illustrative until formally approved. Do not enter confidential or live bank data.</div>
          {message && <div className="toast">{message}<button onClick={()=>setMessage("")}>×</button></div>}

          {tab === "Overview" && <>
            <div className="heroPanel"><div><small>HEAD OFFICE · OPERATIONAL RISK MONITORING</small><h2>From KRI collection to management reporting</h2><p>Coordinate departmental submissions, assess risk appetite and tolerance, review exceptions and generate the consolidated report.</p></div><button onClick={()=>setTab("Collection")}>Open collection workspace →</button></div>
            <div className="kpiGrid">
              <article><small>SUBMISSIONS CREATED</small><strong>{submissions.length}</strong><span>Reporting cycle records</span></article>
              <article><small>KRIs REPORTED</small><strong>{totalReported}<i> / {totalExpected}</i></strong><span>Values captured in current records</span></article>
              <article><small>RED INDICATORS</small><strong className="redNum">{rag.RED ?? 0}</strong><span>Require attention</span></article>
              <article><small>PENDING / RETURNED</small><strong className="amberNum">{pending}</strong><span>Awaiting department action</span></article>
              <article><small>OVERDUE SUBMISSIONS</small><strong className="redNum">{overdue}</strong><span>Past the configured due date</span></article>
            </div>
            <div className="twoCol">
              <section className="panel"><div className="panelHead"><div><small>RISK POSITION</small><h3>Reported KRI status</h3></div><button className="linkBtn" onClick={()=>setTab("Reports")}>View report →</button></div>
                <div className="ragSummary"><div><b className="greenNum">{rag.GREEN ?? 0}</b><span>Green</span></div><div><b className="amberNum">{rag.AMBER ?? 0}</b><span>Amber</span></div><div><b className="redNum">{rag.RED ?? 0}</b><span>Red</span></div><div><b>{totalReported}</b><span>Reported</span></div></div>
                <p className="mutedText">Status is calculated using the limits currently entered in the KRI inventory. Confirm approval status before relying on classifications.</p>
              </section>
              <section className="panel"><div className="panelHead"><div><small>COLLECTION TRACKER</small><h3>Department submissions</h3></div><button className="linkBtn" onClick={()=>setTab("Collection")}>Manage →</button></div>
                {submissions.length===0?<p className="emptyText">No reporting cycle has been started. Create one to begin the demonstration.</p>:submissions.slice().reverse().slice(0,5).map(s=><div className="trackerRow" key={s.id}><div><b>{s.department}</b><small>{s.period} · Due {fmt(s.dueDate)}</small></div><span className={`stateTag ${displayStatus(s).toLowerCase()}`}>{displayStatus(s)}</span></div>)}
              </section>
            </div>
            <section className="panel"><div className="panelHead"><div><small>END-TO-END PROCESS</small><h3>Demonstration sequence</h3></div></div><div className="processSteps">{["Create reporting cycle","Department submits KRI values","ORMD reviews submission","Assess against appetite / tolerance","Generate PDF report"].map((x,i)=><div key={x}><span>{String(i+1).padStart(2,"0")}</span><b>{x}</b></div>)}</div></section>
          </>}

          {tab === "Departments" && <>
            <section className="panel">
              <div className="panelHead"><div><small>DEPARTMENT WORKSPACE</small><h3>Select your department to enter KRI data</h3></div><span className="countBadge">{departments.length} departments</span></div>
              <p className="mutedText">Choose the department you represent. The corresponding KRI entry form will open for the selected reporting period. Existing entries for the same period will be reopened.</p>
              <div className="departmentCards">
                {departments.map((department, index) => {
                  const record = submissions.find(s => s.department === department && s.period === period);
                  const count = metrics.filter(m => m.department === department).length;
                  const frequency = department === "Human Resources" ? "Quarterly" : "Monthly";
                  return <article className="departmentCard" key={department}>
                    <div className="departmentCardIcon">{["IT","DB","HR"][index]}</div>
                    <div className="departmentCardBody"><h3>{department}</h3><p>{count} KRI fields · {frequency} reporting</p>
                      <span className={record ? `stateTag ${displayStatus(record).toLowerCase()}` : "stateTag"}>{record ? displayStatus(record) : "NOT STARTED"}</span>
                    </div>
                    <button className="primaryBtn" onClick={() => openDepartment(department)}>{record ? "Open entry" : "Enter KRI data"} →</button>
                  </article>;
                })}
              </div>
            </section>
          </>}

          {tab === "Collection" && <>
            <section className="panel"><div className="panelHead"><div><small>STEP 01 · REPORTING CYCLE</small><h3>Create and track department requests</h3></div></div>
              <div className="formGrid"><label>Reporting period (Nepali calendar / bank period)<input value={period} onChange={e=>setPeriod(e.target.value)} /></label><label>Cycle start date (first day of applicable month)<input type="date" value={cycleDate} onChange={e=>setCycleDate(e.target.value)} /></label><label className="checkLabel"><input type="checkbox" checked={includeHR} onChange={e=>setIncludeHR(e.target.checked)}/> Include quarterly HR submission in this cycle</label></div>
              <div className="processRule"><b>Configured process:</b> IT and Digital Banking monthly; HR quarterly. Request at 10:00 AM on the first day of the applicable cycle; follow up every 3 working days; submission deadline within 13 working days. IT / Digital Banking due date: 13th working day of the selected cycle month. HR due date: 13th working day of the succeeding month. Weekends are excluded; public holidays are not applied in this demo.</div>
              <div className="templateDownloads"><b>Department source templates:</b> <a href="/templates/IT.csv" download>IT CSV</a><a href="/templates/Digi.csv" download>Digital Banking CSV</a><a href="/templates/HR.csv" download>HR CSV</a></div>
              <button className="primaryBtn" onClick={startCycle}>＋ Create cycle & issue requests</button>
            </section>
            <section className="panel"><div className="panelHead"><div><small>STEP 02 · SUBMISSION TRACKING</small><h3>Department reporting status</h3></div></div>
              {submissions.length===0?<p className="emptyText">Create a reporting cycle above to activate department collection.</p>:<div className="tableScroll"><table><thead><tr><th>Department</th><th>Period</th><th>Frequency</th><th>Due date</th><th>Next reminder</th><th>Reminders</th><th>Status</th><th>Action</th></tr></thead><tbody>{submissions.map(s=><tr key={s.id}><td><b>{s.department}</b></td><td>{s.period}</td><td>{s.frequency}</td><td>{fmt(s.dueDate)}</td><td>{fmt(addWorkingDays(new Date((s.lastReminder || s.requestedAt) + "T00:00:00"), 3))}</td><td>{s.reminders}</td><td><span className={`stateTag ${displayStatus(s).toLowerCase()}`}>{displayStatus(s)}</span></td><td><div className="actionRow">{(s.status==="REQUESTED"||s.status==="RETURNED")&&<button className="smallBtn" onClick={()=>sendReminder(s)}>Reminder</button>}<button className="smallBtn" onClick={()=>{setSelectedId(s.id);setTab("Department entry");}}>Open</button></div></td></tr>)}</tbody></table></div>}
            </section>
          </>}

          {tab === "Department entry" && selected && <>
            <section className="panel"><div className="panelHead"><div><small>DEPARTMENT PORTAL · {selected.period}</small><h3>{selected.department} KRI submission</h3></div><span className={`stateTag ${selected.status.toLowerCase()}`}>{selected.status}</span></div>
              <p className="mutedText">Enter the values from the department's existing template. All fields below are saved in this browser as you work.</p>
              {metrics.filter(m=>m.department===selected.department).map(m=>{const v=selected.values[m.id]??blankValue();return <div className="metricForm" key={m.id}><div className="metricFormHead"><b>{m.id} · {m.name}</b><span>{m.unit}</span></div><div className="formGrid"><label>Actual value<input type="number" step="any" value={v.actual} onChange={e=>updateValue(selected.id,m.id,"actual",e.target.value)} /></label>{m.department!=="Human Resources"&&<label>Downtime occurred?<select value={v.occurred} onChange={e=>updateValue(selected.id,m.id,"occurred",e.target.value)}><option value="">Select</option><option>Yes</option><option>No</option></select></label>}{m.department!=="Human Resources"&&<label>Location / affected service<input value={v.location} onChange={e=>updateValue(selected.id,m.id,"location",e.target.value)} /></label>}<label>Remarks / explanation<input value={v.remarks} onChange={e=>updateValue(selected.id,m.id,"remarks",e.target.value)} /></label></div><p className="thresholdHint">{m.id==="HR-01" ? `Green < ${m.appetite}% · Amber > ${m.appetite}% to ${m.tolerance}% · Red > ${m.tolerance}% · exactly ${m.appetite}% not specified in source` : `Appetite: ${m.appetite} ${m.unit} · Tolerance: ${m.tolerance} ${m.unit}`} · {m.approved?"Approved limit marked":"Illustrative limit – approval pending"}</p></div>})}
              <div className="actionRow"><button className="primaryBtn" onClick={()=>submitDepartment(selected)} disabled={selected.status==="APPROVED"}>Submit to ORMD for review</button><button className="secondaryBtn" onClick={()=>{setSelectedId("");setTab("Collection");}}>Back to tracker</button></div>
            </section>
          </>}
          {tab === "Department entry" && !selected && <section className="panel"><p className="emptyText">Select a department submission from Collection → Open.</p><button className="secondaryBtn" onClick={()=>setTab("Collection")}>Back to collection</button></section>}

          {tab === "Review queue" && <section className="panel"><div className="panelHead"><div><small>STEP 03 · ORMD REVIEW</small><h3>Review submitted department returns</h3></div><span className="countBadge">{reviewQueue.length} awaiting review</span></div>
            {reviewQueue.length===0?<p className="emptyText">No submissions are waiting for review. Submit a department return from the Collection workspace.</p>:reviewQueue.map(s=><article className="reviewCard" key={s.id}><div className="panelHead"><div><b>{s.department}</b><small>{s.period} · Submitted {fmt(s.submittedAt)}</small></div><span className="stateTag submitted">SUBMITTED</span></div><div className="tableScroll"><table><thead><tr><th>KRI</th><th>Actual</th><th>Appetite</th><th>Tolerance</th><th>Status</th><th>Threshold basis</th></tr></thead><tbody>{metrics.filter(m=>m.department===s.department).map(m=>{const v=s.values[m.id]??blankValue();return <tr key={m.id}><td>{m.name}</td><td>{v.actual} {m.unit}</td><td>{m.appetite}</td><td>{m.tolerance}</td><td><span className={`ragTag ${statusFor(m,v.actual).toLowerCase()}`}>{statusFor(m,v.actual)}</span></td><td>{m.approved?"Marked approved":"Illustrative / pending approval"}</td></tr>})}</tbody></table></div><label className="reviewNote">ORMD review comments<textarea value={selectedId===s.id?reviewNote:""} onFocus={()=>setSelectedId(s.id)} onChange={e=>setReviewNote(e.target.value)} placeholder="Record review comments or required correction…" /></label><div className="actionRow"><button className="primaryBtn" onClick={()=>review(s,"APPROVED")}>Approve submission</button><button className="secondaryBtn" onClick={()=>review(s,"RETURNED")}>Return for correction</button></div></article>)}
          </section>}

          {tab === "KRI inventory" && <section className="panel"><div className="panelHead"><div><small>MASTER DATA · KRI REGISTER</small><h3>Department KRI inventory and thresholds</h3></div><span className="countBadge">{metrics.length} indicators</span></div><p className="mutedText">Inventory items are based on the supplied IT, Digital Banking and HR templates. The limits below are demonstration values, not approved bank thresholds. Edit them only after confirmation from the approved KRI methodology.</p>
            <div className="tableScroll"><table><thead><tr><th>Code / Department</th><th>KRI</th><th>Appetite</th><th>Tolerance</th><th>Risk direction</th><th>Approval status</th></tr></thead><tbody>{metrics.map(m=><tr key={m.id}><td><b>{m.id}</b><small>{m.department}</small></td><td>{m.name}<small>{m.unit}</small></td><td><input className="tableInput" type="number" value={m.appetite} onChange={e=>updateMetric(m.id,"appetite",Number(e.target.value))}/></td><td><input className="tableInput" type="number" value={m.tolerance} onChange={e=>updateMetric(m.id,"tolerance",Number(e.target.value))}/></td><td><select className="tableSelect" value={m.direction} onChange={e=>updateMetric(m.id,"direction",e.target.value)}><option value="HIGHER">Higher = more risk</option><option value="LOWER">Lower = more risk</option></select></td><td><label className="approveCheck"><input type="checkbox" checked={m.approved} onChange={e=>updateMetric(m.id,"approved",e.target.checked)}/> Confirmed</label><small>{m.source}</small></td></tr>)}</tbody></table></div>
            <div className="processRule warningRule"><b>Governance control:</b> marking a threshold as confirmed is a user action in this demo only. It does not constitute formal approval by the bank.</div>
          </section>}

          {tab === "Reports" && <section className="panel"><div className="panelHead"><div><small>STEP 05 · MANAGEMENT INFORMATION</small><h3>KRI analytics and report generation</h3></div></div>
            <div className="ragSummary"><div><b className="greenNum">{approvedRag.GREEN??0}</b><span>Green</span></div><div><b className="amberNum">{approvedRag.AMBER??0}</b><span>Amber</span></div><div><b className="redNum">{approvedRag.RED??0}</b><span>Red</span></div><div><b>{approvedAssessed.length}</b><span>Approved values</span></div></div>
            {approvedAssessed.length===0?<p className="emptyText">No ORMD-approved KRI values yet. Complete the collection and review process to populate the management report.</p>:<div className="tableScroll"><table><thead><tr><th>KRI</th><th>Department</th><th>Period</th><th>Actual</th><th>Appetite</th><th>Tolerance</th><th>Status</th><th>Threshold basis</th></tr></thead><tbody>{approvedAssessed.map((x,i)=><tr key={i}><td>{x.metric.name}</td><td>{x.metric.department}</td><td>{x.submission.period}</td><td>{x.value.actual} {x.metric.unit}</td><td>{x.metric.appetite}</td><td>{x.metric.tolerance}</td><td><span className={`ragTag ${statusFor(x.metric,x.value.actual).toLowerCase()}`}>{statusFor(x.metric,x.value.actual)}</span></td><td>{x.metric.approved?"Marked approved":"Illustrative"}</td></tr>)}</tbody></table></div>}
            <div className="actionRow reportActions"><button className="primaryBtn" onClick={generatePdf} disabled={busy||!approvedAssessed.length}>{busy?"Generating PDF…":"↓ Generate analytical PDF report"}</button><button className="secondaryBtn" onClick={exportCsv} disabled={!approvedAssessed.length}>Export approved results to CSV</button></div>
            <p className="mutedText">PDF report includes department-wise status and KRI-level assessment. Review threshold approval status and commentary before circulation to management.</p>
          </section>}

          {tab === "Activity log" && <section className="panel"><div className="panelHead"><div><small>AUDIT TRAIL · DEMONSTRATION</small><h3>Workflow activity log</h3></div><span className="countBadge">{logs.length} events</span></div>
            {logs.length===0?<p className="emptyText">Activity will appear here as you create cycles, record reminders, submit and review returns, and generate reports.</p>:<div className="tableScroll"><table><thead><tr><th>Date / time</th><th>Department</th><th>Action</th><th>Details</th></tr></thead><tbody>{logs.map(l=><tr key={l.id}><td>{l.at}</td><td>{l.department}</td><td><b>{l.action}</b></td><td>{l.detail}</td></tr>)}</tbody></table></div>}
          </section>}
          <footer className="kriFooter">Group-B · KRI Management System <span>Working demonstration prototype · Not approved for production use</span></footer>
        </div>
      </section>
    </main>
  );
}
