import { useEffect } from "react";
import { Link, NavLink, useNavigate } from "react-router-dom";
import { useStudentAuth } from "../auth";

const LINKS = [
  ["/student", "Dashboard"],
  ["/student/results", "My Results"],
  ["/student/leaderboard", "Leaderboard"],
  ["/student/profile", "Profile"],
];

export function StudentLayout({ title, lede, action, children }) {
  const { student, logout } = useStudentAuth();
  const navigate = useNavigate();

  useEffect(() => {
    document.title = `${title} · Student · Result Ledger`;
  }, [title]);

  function signOut() {
    logout();
    navigate("/student/login", { replace: true, state: { message: "You have been signed out." } });
  }

  return (
    <div className="shell">
      <aside className="sidebar">
        <div className="brand">
          <span className="brand-mark">RL</span>
          <div>
            <strong>Result Ledger</strong>
            <small>Student portal</small>
          </div>
        </div>
        <nav className="nav">
          {LINKS.map(([to, label]) => (
            <NavLink key={to} to={to} end={to === "/student"} className={({ isActive }) => (isActive ? "active" : undefined)}>
              {label}
            </NavLink>
          ))}
        </nav>
        <div className="aside-foot">
          <span>{student?.registrationNumber || "Student"}</span>
          <button type="button" onClick={signOut}>
            Logout
          </button>
        </div>
      </aside>
      <div className="workspace">
        <header className="topbar">
          <div>
            <h1>{title}</h1>
            {lede ? <p>{lede}</p> : null}
          </div>
          <div className="topbar-actions">
            {action}
            <Link className="button" to="/login">
              Admin Login
            </Link>
          </div>
        </header>
        <div className="content">{children}</div>
      </div>
    </div>
  );
}
