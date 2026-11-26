const modules = [
  { title: "KRI Inventory", description: "Maintain the approved KRI register, definitions, units and department assignments.", status: "Foundation planned" },
  { title: "Monthly Collection", description: "Issue reporting tasks and collect values, narratives and supporting evidence.", status: "Foundation planned" },
  { title: "Review & Approval", description: "Department Head review followed by Risk Management validation.", status: "Foundation planned" },
  { title: "Reminders & Escalation", description: "Schedule department reminders and overdue escalation notifications.", status: "Foundation planned" },
  { title: "Risk Dashboard", description: "Monitor submission compliance, pending departments and operational status.", status: "Foundation planned" },
  { title: "RAG & AI Insights", description: "Apply approved thresholds and generate assisted risk commentary in later releases.", status: "Later release" },
];

export default function Home() {
  return (
    <main className="shell">
      <header className="topbar">
        <div className="brand"><div className="brandMark">K</div><div><strong>KRI Management</strong><span>Operational Risk Portal</span></div></div>
        <div className="envTag">DEVELOPMENT FOUNDATION</div>
      </header>

      <section className="welcome">
        <div>
          <p className="eyebrow">KEY RISK INDICATOR MANAGEMENT</p>
          <h1>One place to collect,<br />review and monitor KRIs.</h1>
          <p className="intro">A centralized workspace for Head Office departments, Risk Management and Senior Management.</p>
        </div>
        <div className="welcomePanel">
          <span className="panelLabel">SYSTEM BUILD</span>
          <strong>Foundation started</strong>
          <p>Core application structure and database model are being established. Operational modules will be enabled incrementally.</p>
        </div>
      </section>

      <section className="quickAction"><div><strong>Need a KRI report?</strong><span>Upload a dataset and generate a PDF with automatic RAG assessment.</span></div><a href="/kri-report">Open KRI Report Generator →</a></section>

      <section className="stats" aria-label="System overview">
        <div className="stat"><span>USER GROUPS</span><strong>03</strong><small>Departments · Risk · Management</small></div>
        <div className="stat"><span>CORE DATA AREAS</span><strong>10</strong><small>Master, submissions and audit records</small></div>
        <div className="stat"><span>DELIVERY MODEL</span><strong>Web</strong><small>Centralized online application</small></div>
      </section>

      <section className="sectionHead"><div><p className="eyebrow">APPLICATION MODULES</p><h2>End-to-end workflow</h2></div><span className="sectionNote">Modules are being developed in sequence</span></section>
      <section className="moduleGrid">
        {modules.map((module, index) => (
          <article className="moduleCard" key={module.title}>
            <div className="moduleTop"><span className="moduleNumber">{String(index + 1).padStart(2, "0")}</span><span className={module.status === "Later release" ? "status later" : "status"}>{module.status}</span></div>
            <h3>{module.title}</h3><p>{module.description}</p>
          </article>
        ))}
      </section>

      <footer>Group-B · KRI Management System <span>Development build — not for production data</span></footer>
    </main>
  );
}
