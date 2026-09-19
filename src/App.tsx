import { NavLink, Route, Routes } from "react-router-dom";
import { PricesPage } from "./pages/PricesPage";
import { SourcesPage } from "./pages/SourcesPage";

const links = [
  { to: "/", label: "Prices", end: true },
  { to: "/sources", label: "Sources", end: false },
];

export default function App() {
  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="brand">
          <div className="brand-mark" aria-hidden />
          <div>
            <strong>Pellet Price Radar</strong>
            <span>RM · region · grade · live every 15 min</span>
          </div>
        </div>
        <nav className="nav">
          {links.map((l) => (
            <NavLink key={l.to} to={l.to} end={l.end}>
              {l.label}
            </NavLink>
          ))}
        </nav>
      </header>
      <Routes>
        <Route path="/" element={<PricesPage />} />
        <Route path="/sources" element={<SourcesPage />} />
      </Routes>
    </div>
  );
}
