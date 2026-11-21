import { useEffect } from "react";
import { NavLink } from "react-router-dom";
import { useAuth } from "../auth";

const LINKS = [
  ["/", "Overview"],
  ["/students", "Students"],
  ["/examinations", "Examinations"],
  ["/results", "Results"],
  ["/leaderboard", "Leaderboard"],
];

export function Layout({ title, lede, action, children }) {
  const { admin, logout } = useAuth();

  useEffect(() => {
    document.title = `${title} · Result Ledger`;
  }, [title]);

  return (
    <div className="shell">
      <aside className="sidebar">
        <div className="brand">
          <span className="brand-mark">RL</span>
          <div>
            <strong>Result Ledger</strong>
            <small>Examination office</small>
          </div>
        </div>
        <nav className="nav">
          {LINKS.map(([to, label]) => (
            <NavLink key={to} to={to} end={to === "/"} className={({ isActive }) => (isActive ? "active" : undefined)}>
              {label}
            </NavLink>
          ))}
        </nav>
        <div className="aside-foot">
          <span>{admin?.username}</span>
          <button type="button" onClick={logout}>
            Sign out
          </button>
        </div>
      </aside>
      <div className="workspace">
        <header className="topbar">
          <div>
            <h1>{title}</h1>
            {lede ? <p>{lede}</p> : null}
          </div>
          {action}
        </header>
        <div className="content">{children}</div>
      </div>
    </div>
  );
}
