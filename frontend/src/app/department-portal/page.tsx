"use client";

import { useMemo, useState } from "react";

type Department = "IT" | "Digital Banking" | "HR";
type Entry = { yesNo: string; location: string; hours: string; remarks: string };
type SavedRecord = { department: Department; period: string; entries: Record<string, Entry>; hrResigned: string; hrCurrent: string; hrRemarks: string; savedAt: string };

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
        return !row.yesNo || row.hours.trim() === "";
      });
      if (missing.length) { setMessage("Please complete Yes/No and Total Hours During the Month for every listed KRI."); return; }
    } else if (hrResigned === "" || hrCurrent === "" || Number(hrCurrent) <= 0) {
      setMessage("Enter both the number of resigned permanent staff and the current number of staff."); return;
    }

    const record: SavedRecord = {
      department, period, entries: department === "HR" ? {} : Object.fromEntries(items.map(name => [name, entries[name] ?? emptyEntry()])),
      hrResigned, hrCurrent, hrRemarks, savedAt: new Date().toISOString()
    };
    const key = "nabil-kri-department-submissions";
    const prior = JSON.parse(localStorage.getItem(key) || "[]") as SavedRecord[];
    localStorage.setItem(key, JSON.stringify([...prior, record]));
    setMessage("Saved in this browser only. This demonstration does not transmit the submission to Risk Management.");
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
    <main style={{minHeight:"100vh",background:"#f3f6f8",color:"#1c3547",fontFamily:"Arial, sans-serif",padding:"28px 16px"}}>
      <div style={{maxWidth:1050,margin:"0 auto"}}>
        <header style={{display:"flex",justifyContent:"space-between",alignItems:"center",gap:16,flexWrap:"wrap",marginBottom:22}}>
          <a href="/" style={{color:"#176f6b",fontWeight:800,textDecoration:"none"}}>← NABIL KRI MANAGEMENT</a>
          <span style={{fontSize:12,color:"#6d7f8b"}}>Head Office · Department reporting portal</span>
        </header>
        <section style={{background:"#fff",border:"1px solid #e1e8ed",borderRadius:14,padding:24,boxShadow:"0 8px 28px #18394f0b"}}>
          <p style={{fontSize:11,fontWeight:800,letterSpacing:1.3,color:"#168078"}}>DEPARTMENT DATA ENTRY</p>
          <h1 style={{fontSize:27,margin:"8px 0"}}>Department KRI Submission</h1>
          <p style={{fontSize:13,color:"#687c89",lineHeight:1.6}}>The fields below follow the uploaded Head Office department workbook. Select a department to display its own reporting format.</p>
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
                <b>Thresholds shown in the source workbook:</b> Tolerance Trigger Level: &gt;10%. Classifications: G: &lt;10%; A: &gt;10% to 12%; R: &gt;12%. The workbook does not clearly specify the classification at exactly 10% and 12%, so this portal does not automatically assign a risk colour.
              </div>
              <p style={{fontSize:11,color:"#778994",lineHeight:1.6}}>The numeric cells in the source workbook are not imported as current reporting values because their row/column alignment is unclear.</p>
            </section>
          )}

          {message && <p role="status" style={{background:"#edf7f2",padding:12,borderRadius:8,fontSize:12,color:"#176344",lineHeight:1.5}}>{message}</p>}
          <div style={{display:"flex",gap:10,flexWrap:"wrap",marginTop:24}}>
            <button onClick={save} style={primaryButton}>Save submission in this browser</button>
            <button onClick={exportCsv} style={secondaryButton}>Export current form to CSV</button>
          </div>
          <p style={{fontSize:10,color:"#87959d",marginTop:18,lineHeight:1.6}}>Prototype limitation: submissions are stored only in this browser's local storage. There is no login, central database, or live transmission to Risk Management in this release. Do not enter confidential or live bank data.</p>
        </section>
      </div>
    </main>
  );
}

const labelStyle: React.CSSProperties = {display:"flex",flexDirection:"column",gap:7,fontSize:11,fontWeight:700,color:"#506575"};
const inputStyle: React.CSSProperties = {width:"100%",minHeight:39,border:"1px solid #d9e2e8",borderRadius:7,padding:"9px 10px",fontSize:12,color:"#20394b",background:"#fff"};
const primaryButton: React.CSSProperties = {background:"#153b50",color:"#fff",border:0,borderRadius:7,padding:"11px 15px",fontSize:11,fontWeight:700,cursor:"pointer"};
const secondaryButton: React.CSSProperties = {background:"#fff",color:"#365467",border:"1px solid #d7e1e7",borderRadius:7,padding:"11px 15px",fontSize:11,fontWeight:700,cursor:"pointer"};
