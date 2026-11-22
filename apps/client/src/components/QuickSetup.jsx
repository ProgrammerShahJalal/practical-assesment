import { useEffect, useState } from "react";
import { api } from "../api";
import { Banner } from "./Banner";

const STORAGE_KEY = "result_ledger_quick_setup";
const LIFETIME_MS = 60 * 60 * 1000;

function readSavedResult() {
  try {
    const saved = JSON.parse(sessionStorage.getItem(STORAGE_KEY) || "null");
    if (!saved?.result || Date.now() - saved.savedAt > LIFETIME_MS) return null;
    return saved.result;
  } catch {
    return null;
  }
}

// Plain-language panel on the login screens. It creates the admin login and,
// when the database is empty, loads the example cohort so nobody is locked
// out of a fresh deployment with no data.
export function QuickSetup({ onReady }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState(readSavedResult);

  // If setup was just run on the other login page, fill this form in too.
  useEffect(() => {
    if (result) onReady?.(result);
  }, []);

  async function handleSetup() {
    setBusy(true);
    setError("");
    setResult(null);
    try {
      const data = await api("/api/setup/quick-start", { method: "POST", auth: false });
      setResult(data);
      try {
        sessionStorage.setItem(STORAGE_KEY, JSON.stringify({ result: data, savedAt: Date.now() }));
      } catch {
        // Browsers with storage disabled still see the details on this page.
      }
      onReady?.(data);
    } catch (err) {
      setError(err.message || "Setup failed. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  function whatWasAdded() {
    const total = (result?.studentsAdded || 0) + (result?.examinationsAdded || 0) + (result?.resultsAdded || 0);
    if (!total && !result?.samplePasswordsAdded) {
      return "Everything was already in place, so nothing was changed.";
    }
    return `Added ${result.studentsAdded} students, ${result.examinationsAdded} exams and ${result.resultsAdded} results.`;
  }

  return (
    <section className="quick-setup">
      <div className="quick-setup-copy">
        <h3>First time here?</h3>
        <p>
          Set up the app in one click. This creates the admin login and adds example students, exams and results so
          you can sign in right away.
        </p>
      </div>
      <button type="button" className="primary" onClick={handleSetup} disabled={busy}>
        {busy ? "Setting up…" : "Set up the app in one click"}
      </button>
      <Banner>{error}</Banner>
      {result && (
        <div className="setup-result">
          <p className="setup-result-title">All set. Use these details to sign in:</p>
          {result.adminPassword ? (
            <div className="setup-credentials">
              <span>Admin username</span>
              <strong>{result.adminUsername}</strong>
              <span>Admin password</span>
              <strong>{result.adminPassword}</strong>
            </div>
          ) : (
            <p className="setup-note">The admin login was already created earlier, so its password was left unchanged.</p>
          )}
          {result.studentPassword && (
            <div className="setup-credentials">
              <span>Student registration number</span>
              <strong>{result.studentUsername}</strong>
              <span>Student password</span>
              <strong>{result.studentPassword}</strong>
            </div>
          )}
          <p className="setup-note">{whatWasAdded()}</p>
        </div>
      )}
    </section>
  );
}
