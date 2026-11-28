"use client";

import { useEffect, useMemo, useState } from "react";

type Department = "IT" | "Digital Banking" | "HR";
type Entry = { yesNo: string; location: string; hours: string; remarks: string };
type WorkflowValue = { actual: string; occurred: string; location: string; remarks: string; resignedStaff?: string; currentStaff?: string };
type WorkflowSubmission = {
  id: string; department: string; period: string; frequency: string; dueDate: string;
  status: "REQUESTED" | "SUBMITTED" | "RETURNED" | "APPROVED"; requestedAt: string;
  reminders: number; lastReminder: string; submittedAt: string; reviewedAt: string;
  reviewerNote: string; values: Record<string, WorkflowValue>;
};
type WorkflowLog = { id: string; at: string; department: string; action: string; detail: string };
type WorkflowStore = { metrics?: unknown[]; submissions?: WorkflowSubmission[]; logs?: WorkflowLog[] };

const sourceItems = {
  IT: [
    { group: "IT application Downtime", items: ["a. Core Banking System", "b. SWIFT", "c. Email"] },
    { group: "IT - Infrastructure DownTime", items: ["a. Overall Data Centre down", "b. ATM"] },
  ],
  "Digital Banking": [
    { group: "IT - Application Downtime", items: ["a. Mobile Banking", "b. Internet Banking", "c. e@nabil", "d.corporatePAY", "e. ATM"] },
  ],
  HR: [{ group: "Operational Risk Matrices", items: ["Employee Turnover"] }],
} as const;

const emptyEntry = (): Entry => ({ yesNo: "", location: "", hours: "", remarks: "" });

export default function DepartmentPortal() {
  const [department, setDepartment] = useState<Department>("IT");
  const [period, setPeriod] = useState("2083/08");
  const [entries, setEntries] = useState<Record<string, Entry>>({});
  const [hrResigned, setHrResigned] = useState("");
  const [hrCurrent, setHrCurrent] = useState("");
  const [hrRemarks, setHrRemarks] = useState("");
  const [message, setMessage] = useState("");

  useEffect(() => {
    try {
      const store = JSON.parse(localStorage.getItem("kri-central-demo-v2") || "{}") as WorkflowStore;
      const departmentName = department === "IT" ? "Information Technology" : department === "HR" ? "Human Resources" : department;
      const submission = (store.submissions ?? []).find(item => item.department === departmentName && item.period === period);
      if (!submission) {
        setEntries({}); setHrResigned(""); setHrCurrent(""); setHrRemarks("");
        return;
      }
      if (department === "HR") {
        const value = submission.values["HR-01"];
        setHrResigned(value?.resignedStaff ?? ""); setHrCurrent(value?.currentStaff ?? ""); setHrRemarks(value?.remarks ?? "");
        return;
      }
      const prefix = department === "IT" ? "IT" : "DG";
      const items = sourceItems[department].flatMap(group => [...group.items]);
      setEntries(Object.fromEntries(items.map((name, index) => {
        const value = submission.values[`${prefix}-${String(index + 1).padStart(2, "0")}`];
        return [name, value ? { yesNo: value.occurred, location: value.location, hours: value.actual, remarks: value.remarks } : emptyEntry()];
      })));
    } catch {
      setEntries({}); setHrResigned(""); setHrCurrent(""); setHrRemarks("");
    }
  }, [department, period]);

  const hrRatio = useMemo(() => {
    const resigned = Number(hrResigned);
    const current = Number(hrCurrent);
    return hrResigned !== "" && hrCurrent !== "" && current > 0 && resigned >= 0
      ? (resigned / current) * 100 : null;
  }, [hrResigned, hrCurrent]);

  function updateEntry(name: string, field: keyof Entry, value: string) {
    setEntries(old => ({ ...old, [name]: { ...(old[name] ?? emptyEntry()), [field]: value } }));
  }

  function save() {
    const items = sourceItems[department].flatMap(group => [...group.items]);
    if (department !== "HR") {
      const missing = items.filter(name => {
        const row = entries[name] ?? emptyEntry();
        const hours = Number(row.hours);
        return !row.yesNo || row.hours.trim() === "" || !Number.isFinite(hours) || hours < 0;
      });
      if (missing.length) { setMessage("Enter Yes/No and a valid non-negative number of hours for every listed KRI."); return; }
    } else if (hrResigned === "" || hrCurrent === "" || Number(hrResigned) < 0 || !Number.isInteger(Number(hrResigned)) || Number(hrCurrent) <= 0 || !Number.isInteger(Number(hrCurrent))) {
      setMessage("Enter both the number of resigned permanent staff and the current number of staff."); return;
    }
    try {
      const key = "kri-central-demo-v2";
      const store = JSON.parse(localStorage.getItem(key) || "{}") as WorkflowStore;
      const submissions = Array.isArray(store.submissions) ? store.submissions : [];
      const departmentName = department === "IT" ? "Information Technology" : department === "HR" ? "Human Resources" : department;
      const submissionIndex = submissions.findIndex(item => item.department === departmentName && item.period === period);
      if (submissionIndex < 0) { setMessage("No request exists for this department and period. Create the collection cycle in the KRI workspace first."); return; }
      const request = submissions[submissionIndex];
      if (request.status !== "REQUESTED" && request.status !== "RETURNED") {
        setMessage(request.status === "APPROVED" ? "This submission is approved and locked. Ask ORMD to reopen it before making corrections." : "This submission is already with ORMD for review.");
        return;
      }

      const values: Record<string, WorkflowValue> = { ...request.values };
      if (department === "HR") {
        values["HR-01"] = {
          actual: hrRatio === null ? "" : hrRatio.toFixed(4), occurred: "", location: "", remarks: hrRemarks,
          resignedStaff: hrResigned, currentStaff: hrCurrent
        };
      } else {
        const prefix = department === "IT" ? "IT" : "DG";
        items.forEach((name, index) => {
          const entry = entries[name] ?? emptyEntry();
          values[`${prefix}-${String(index + 1).padStart(2, "0")}`] = {
            actual: entry.hours, occurred: entry.yesNo, location: entry.location, remarks: entry.remarks
          };
        });
      }

      const submittedAt = new Date().toISOString().slice(0, 10);
      const updated = submissions.map((item, index) => index === submissionIndex
        ? { ...item, values, status: "SUBMITTED" as const, submittedAt }
        : item);
      const log: WorkflowLog = {
        id: `LOG-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        at: new Date().toLocaleString(), department: departmentName,
        action: "Department submission received", detail: `Submission for ${period} sent to ORMD for review.`
      };
      localStorage.setItem(key, JSON.stringify({ ...store, submissions: updated, logs: [log, ...(store.logs ?? [])].slice(0, 100) }));
      setMessage("Submitted to ORMD. It is now visible in the KRI workspace review queue in this browser.");
    } catch {
      setMessage("Could not save the submission in this browser. Reopen the KRI workspace and try again.");
    }
  }

  function exportCsv() {
    const quote = (v: unknown) => '"' + String(v ?? "").replaceAll('"', '""') + '"';
    const rows: unknown[][] = [["Department", "Period", "KRI Title", "Yes/No", "Location", "Total Hours During the Month", "Resigned Permanent Staff", "Current Number of Staff", "Calculated Turnover %", "Remarks"]];
    if (department === "HR") {
      rows.push([department, period, "Employee Turnover", "", "", "", hrResigned, hrCurrent, hrRatio === null ? "" : hrRatio.toFixed(4), hrRemarks]);
    } else {
      for (const group of sourceItems[department]) for (const name of group.items) {
        const e = entries[name] ?? emptyEntry();
        rows.push([department, period, name, e.yesNo, e.location, e.hours, "", "", "", e.remarks]);
      }
    }
    const csv = rows.map(row => row.map(quote).join(",")).join("\r\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    const a = document.createElement("a"); a.href = url; a.download = department.replaceAll(" ", "_") + "_KRI_" + period.replaceAll("/", "-") + ".csv"; a.click(); URL.revokeObjectURL(url);
  }

  const monthly = department !== "HR";
  return (
    <main className="departmentPortal" style={{minHeight:"100vh",background:"#f3f6f8",color:"#1c3547",fontFamily:"Arial, sans-serif",padding:"28px 16px"}}>
      <div style={{maxWidth:1050,margin:"0 auto"}}>
        <header style={{display:"flex",justifyContent:"space-between",alignItems:"center",gap:16,flexWrap:"wrap",marginBottom:22}}>
          <a href="/" style={{color:"#176f6b",fontWeight:800,textDecoration:"none"}}>← NABIL KRI MANAGEMENT</a>
          <span style={{fontSize:12,color:"#6d7f8b"}}>Head Office · Department reporting portal</span>
          <a href="/kri-workspace" style={{color:"#176f6b",fontWeight:800,textDecoration:"none"}}>Open KRI workspace →</a>
        </header>
        <section style={{background:"#fff",border:"1px solid #e1e8ed",borderRadius:14,padding:24,boxShadow:"0 8px 28px #18394f0b"}}>
          <p style={{fontSize:11,fontWeight:800,letterSpacing:1.3,color:"#168078"}}>DEPARTMENT DATA ENTRY</p>
          <h1 style={{fontSize:27,margin:"8px 0"}}>Department KRI Submission</h1>
          <p style={{fontSize:13,color:"#687c89",lineHeight:1.6}}>The fields below follow the uploaded Head Office department workbook. Select a department and reporting period with an open request. Submissions appear in the KRI workspace review queue.</p>
          <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(220px,1fr))",gap:14,margin:"22px 0"}}>
            <label style={labelStyle}>Department
              <select value={department} onChange={e=>{setDepartment(e.target.value as Department);setMessage("");}} style={inputStyle}>
                <option value="IT">IT</option><option value="Digital Banking">Digital Banking (Digi)</option><option value="HR">HR</option>
              </select>
            </label>
            <label style={labelStyle}>{monthly ? "Reporting month" : "Reporting quarter"}
              <input value={period} onChange={e=>setPeriod(e.target.value)} placeholder={monthly ? "e.g. 2083/08" : "e.g. Q1 2083/84"} style={inputStyle}/>
            </label>
          </div>

          {department !== "HR" ? sourceItems[department].map(group => (
            <section key={group.group} style={{marginTop:22}}>
              <h2 style={{fontSize:16,borderBottom:"1px solid #e7edf0",paddingBottom:10}}>{group.group}</h2>
              {group.items.map(name => {
                const row = entries[name] ?? emptyEntry();
                return <article key={name} style={{padding:"15px 0",borderBottom:"1px solid #edf1f3"}}>
                  <h3 style={{fontSize:13,margin:"0 0 12px"}}>{name}</h3>
                  <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(175px,1fr))",gap:12}}>
                    <label style={labelStyle}>Yes/No <select value={row.yesNo} onChange={e=>updateEntry(name,"yesNo",e.target.value)} style={inputStyle}><option value="">Select</option><option>Yes</option><option>No</option></select></label>
                    {department === "IT" && <label style={labelStyle}>Location <input value={row.location} onChange={e=>updateEntry(name,"location",e.target.value)} style={inputStyle}/></label>}
                    <label style={labelStyle}>Total Hours During the Month <input type="number" min="0" step="any" value={row.hours} onChange={e=>updateEntry(name,"hours",e.target.value)} style={inputStyle}/></label>
                    <label style={labelStyle}>Remarks <input value={row.remarks} onChange={e=>updateEntry(name,"remarks",e.target.value)} style={inputStyle}/></label>
                  </div>
                </article>;
              })}
            </section>
          )) : (
            <section style={{marginTop:22}}>
              <h2 style={{fontSize:16,borderBottom:"1px solid #e7edf0",paddingBottom:10}}>Employee Turnover</h2>
              <p style={{fontSize:12,color:"#647987",lineHeight:1.7}}><b>Definition:</b> Number of resigned permanent staff in a given quarter.<br/><b>Measurement Methodology:</b> Number of resigned permanent staff in relation to current number of staff.</p>
              <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(210px,1fr))",gap:12,marginTop:16}}>
                <label style={labelStyle}>Number of resigned permanent staff <input type="number" min="0" step="1" value={hrResigned} onChange={e=>setHrResigned(e.target.value)} style={inputStyle}/></label>
                <label style={labelStyle}>Current number of staff <input type="number" min="1" step="1" value={hrCurrent} onChange={e=>setHrCurrent(e.target.value)} style={inputStyle}/></label>
              </div>
              <div style={{background:"#f5f8f9",borderRadius:8,padding:14,marginTop:14,fontSize:13}}>
                Calculated employee turnover: <b>{hrRatio === null ? "Enter both figures" : hrRatio.toFixed(2) + "%"}</b>
              </div>
              <label style={{...labelStyle,marginTop:14}}>Remarks <textarea value={hrRemarks} onChange={e=>setHrRemarks(e.target.value)} rows={3} style={{...inputStyle,resize:"vertical"}}/></label>
              <div style={{background:"#fff8e9",border:"1px solid #f0dfb9",borderRadius:8,padding:13,marginTop:15,fontSize:11,lineHeight:1.6,color:"#755a24"}}>
                <b>Thresholds shown in the source workbook:</b> Tolerance Trigger Level: &gt;10%. Classifications: G: &lt;10%; A: &gt;10% to 12%; R: &gt;12%. The source leaves exactly 10% undefined; for this training prototype it is provisionally treated as Amber. Exactly 12% is Amber under the source wording.
              </div>
              <p style={{fontSize:11,color:"#778994",lineHeight:1.6}}>The numeric cells in the source workbook are not imported as current reporting values because their row/column alignment is unclear.</p>
            </section>
          )}

          {message && <p role="status" style={{background:"#edf7f2",padding:12,borderRadius:8,fontSize:12,color:"#176344",lineHeight:1.5}}>{message}</p>}
          <div style={{display:"flex",gap:10,flexWrap:"wrap",marginTop:24}}>
            <button onClick={save} style={primaryButton}>Submit to ORMD for review</button>
            <button onClick={exportCsv} style={secondaryButton}>Export current form to CSV</button>
          </div>
          <p style={{fontSize:10,color:"#87959d",marginTop:18,lineHeight:1.6}}>Training prototype: submissions and reviews share this browser's local storage, not a central database. Use synthetic data only.</p>
        </section>
      </div>
    </main>
  );
}

const labelStyle: React.CSSProperties = {display:"flex",flexDirection:"column",gap:7,fontSize:11,fontWeight:700,color:"#506575"};
const inputStyle: React.CSSProperties = {width:"100%",minHeight:39,border:"1px solid #d9e2e8",borderRadius:7,padding:"9px 10px",fontSize:12,color:"#20394b",background:"#fff"};
const primaryButton: React.CSSProperties = {background:"#153b50",color:"#fff",border:0,borderRadius:7,padding:"11px 15px",fontSize:11,fontWeight:700,cursor:"pointer"};
const secondaryButton: React.CSSProperties = {background:"#fff",color:"#365467",border:"1px solid #d7e1e7",borderRadius:7,padding:"11px 15px",fontSize:11,fontWeight:700,cursor:"pointer"};
