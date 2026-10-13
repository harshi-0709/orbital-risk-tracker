import { useState } from "react";
import "./space.css";
import SpaceBackground from "./components/SpaceBackground";
import Landing from "./pages/Landing";
import Overview from "./pages/Overview";
import Objects from "./pages/Objects";
import Alerts from "./pages/Alerts";
import Analytics from "./pages/Analytics";

const TABS = ["Overview", "Objects", "Alerts", "Analytics"];

export default function App() {
  // the URL hash remembers which screen you are on, so a refresh does not throw you back to the landing page
  const [view, setView] = useState(() => (window.location.hash === "#/dashboard" ? "dashboard" : "landing"));
  const [tab, setTab] = useState("Overview");
  const [objectFilter, setObjectFilter] = useState({});

  function go(next) {
    setView(next);
    window.history.replaceState(null, "", next === "dashboard" ? "#/dashboard" : "#/");
    window.scrollTo(0, 0);
  }

  // Clicking a zone or launch site on Overview jumps to Objects with that filter applied
  function openObjects(filter) {
    setObjectFilter(filter);
    setTab("Objects");
  }

  return (
    <>
      <SpaceBackground />
      <div className="app">
        {view === "landing" ? (
          <Landing onEnter={() => go("dashboard")} />
        ) : (
          <>
            <header className="topbar">
              <button className="brand" onClick={() => go("landing")} title="Back to the landing page">
                ORBITAL RISK TRACKER
              </button>
              <nav className="tabs">
                {TABS.map((t) => (
                  <button key={t} className={"tab" + (tab === t ? " on" : "")} onClick={() => setTab(t)}>
                    {t}
                  </button>
                ))}
              </nav>
            </header>
            <main className="page">
              {tab === "Overview" && <Overview onOpenObjects={openObjects} />}
              {tab === "Objects" && <Objects initial={objectFilter} />}
              {tab === "Alerts" && <Alerts />}
              {tab === "Analytics" && <Analytics />}
            </main>
          </>
        )}
      </div>
    </>
  );
}
