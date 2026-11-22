import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { useStudentAuth } from "../../auth";
import { Banner } from "../../components/Banner";

const DEMO = import.meta.env.DEV;

export function LoginPage() {
  const { login } = useStudentAuth();
  const location = useLocation();
  const [registrationNumber, setRegistrationNumber] = useState(DEMO ? "R-1001" : "");
  const [password, setPassword] = useState(DEMO ? "student123" : "");
  const [notice, setNotice] = useState(location.state?.message || "");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit(event) {
    event.preventDefault();
    if (!registrationNumber.trim() || !password) {
      setError("Enter your registration number and password.");
      return;
    }
    setSubmitting(true);
    setError("");
    setNotice("");
    try {
      await login(registrationNumber, password);
    } catch (err) {
      setError(err.message || "Invalid registration number or password.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="login-screen">
      <section className="login-story">
        <p className="eyebrow">Student portal</p>
        <h1>Result Ledger</h1>
        <p>
          See only your own marks, your rank in every examination, and the standings for each paper. Your results
          are read-only here.
        </p>
        <ul>
          <li>Ranks are calculated by the office, one examination at a time.</li>
          <li>Shared marks share a rank. Tied places are skipped.</li>
          <li>Your row is highlighted on every leaderboard.</li>
        </ul>
      </section>
      <form className="login-card" onSubmit={onSubmit}>
        <h2>Student Login</h2>
        <p>Use the registration number and password issued by your examination office.</p>
        <Banner>{notice || error}</Banner>
        <label>
          Registration number
          <input
            value={registrationNumber}
            onChange={(event) => setRegistrationNumber(event.target.value)}
            autoComplete="username"
            placeholder="e.g. R-1001"
            required
          />
        </label>
        <label>
          Password
          <input
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            autoComplete="current-password"
            required
          />
        </label>
        <button type="submit" className="primary" disabled={submitting}>
          {submitting ? "Signing in…" : "View my results"}
        </button>
        <p className="login-switch">
          Managing records? <Link to="/login">Admin Login</Link>
        </p>
      </form>
    </main>
  );
}
