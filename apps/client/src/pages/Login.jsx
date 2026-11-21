import { useState } from "react";
import { useAuth } from "../auth";
import { Banner } from "../components/Banner";

export function LoginPage() {
  const { login } = useAuth();
  const [username, setUsername] = useState("admin");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit(event) {
    event.preventDefault();
    setSubmitting(true);
    setError("");
    try {
      await login(username, password);
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="login-screen">
      <section className="login-story">
        <p className="eyebrow">Examination office</p>
        <h1>Result Ledger</h1>
        <p>
          Record students, examinations, and marks. Each examination keeps its own leaderboard, ranked from the
          marks entered for that paper alone.
        </p>
        <ul>
          <li>Shared marks share a rank. The next score skips the tied places.</li>
          <li>A missing result is left off the board. It is not treated as zero.</li>
          <li>A mark of 49 out of 50 is not compared with a mark of 49 out of 100.</li>
        </ul>
      </section>
      <form className="login-card" onSubmit={onSubmit}>
        <h2>Sign in</h2>
        <p>Administrator access is required to manage records and open a leaderboard.</p>
        <Banner>{error}</Banner>
        <label>
          Username
          <input value={username} onChange={(event) => setUsername(event.target.value)} autoComplete="username" required />
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
          {submitting ? "Signing in…" : "Enter the ledger"}
        </button>
        <p className="hint">Seeded local account: admin / admin123</p>
      </form>
    </main>
  );
}
