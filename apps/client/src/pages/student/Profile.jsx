import { useState } from "react";
import { api } from "../../api";
import { StudentLayout } from "../../components/StudentLayout";
import { Banner } from "../../components/Banner";
import { ErrorState, LoadingState } from "../../components/student/States";
import { useStudentFetch } from "../../hooks/useStudentFetch";

const EMPTY = { currentPassword: "", newPassword: "", confirmPassword: "" };

export function ProfilePage() {
  const profile = useStudentFetch("/api/student/me");
  const [form, setForm] = useState({ ...EMPTY });
  const [problems, setProblems] = useState({});
  const [formError, setFormError] = useState("");
  const [notice, setNotice] = useState("");
  const [submitting, setSubmitting] = useState(false);

  function update(field, value) {
    setForm((current) => ({ ...current, [field]: value }));
    setProblems((current) => ({ ...current, [field]: "" }));
  }

  function validate() {
    const next = {};
    if (!form.currentPassword) next.currentPassword = "Enter your current password.";
    if (!form.newPassword) next.newPassword = "Enter a new password.";
    else if (form.newPassword.length < 8 || form.newPassword.length > 128) {
      next.newPassword = "Use between 8 and 128 characters.";
    }
    if (form.newPassword !== form.confirmPassword) next.confirmPassword = "Passwords do not match.";
    return next;
  }

  async function onSubmit(event) {
    event.preventDefault();
    const next = validate();
    setProblems(next);
    setFormError("");
    setNotice("");
    if (Object.keys(next).length) return;

    setSubmitting(true);
    try {
      await api("/api/student/me/password", { method: "PATCH", body: form, auth: "student" });
      setForm({ ...EMPTY });
      setNotice("Password updated. Use it the next time you sign in.");
    } catch (err) {
      setFormError(err.message || "Could not update the password.");
    } finally {
      setSubmitting(false);
    }
  }

  const student = profile.data;

  return (
    <StudentLayout title="Profile" lede="Your registered details are read-only. Contact the office if anything is wrong.">
      {profile.loading ? <LoadingState label="Loading your profile…" /> : null}
      <ErrorState error={profile.error} onRetry={profile.retry} />
      {student ? (
        <>
          <section className="panel">
            <header className="panel-head">
              <h2>Registered details</h2>
            </header>
            <div className="detail-list">
              <div>
                <span>Registration number</span>
                <strong>{student.registrationNumber}</strong>
              </div>
              <div>
                <span>Name</span>
                <strong>{student.name}</strong>
              </div>
              <div>
                <span>Email</span>
                <strong>{student.email || "—"}</strong>
              </div>
              <div>
                <span>Batch / session</span>
                <strong>{student.batch || "—"}</strong>
              </div>
              <div>
                <span>Department / course</span>
                <strong>{student.department || "—"}</strong>
              </div>
            </div>
          </section>

          <section className="panel profile-form">
            <header className="panel-head">
              <h2>Change password</h2>
            </header>
            <form className="stack" onSubmit={onSubmit}>
              <Banner>{formError}</Banner>
              <Banner tone="ok">{notice}</Banner>
              <label>
                Current password
                <input
                  type="password"
                  autoComplete="current-password"
                  value={form.currentPassword}
                  onChange={(event) => update("currentPassword", event.target.value)}
                />
                {problems.currentPassword ? <span className="field-error">{problems.currentPassword}</span> : null}
              </label>
              <label>
                New password
                <input
                  type="password"
                  autoComplete="new-password"
                  value={form.newPassword}
                  onChange={(event) => update("newPassword", event.target.value)}
                />
                {problems.newPassword ? <span className="field-error">{problems.newPassword}</span> : null}
              </label>
              <label>
                Confirm new password
                <input
                  type="password"
                  autoComplete="new-password"
                  value={form.confirmPassword}
                  onChange={(event) => update("confirmPassword", event.target.value)}
                />
                {problems.confirmPassword ? <span className="field-error">{problems.confirmPassword}</span> : null}
              </label>
              <div className="form-actions">
                <button type="submit" className="primary" disabled={submitting}>
                  {submitting ? "Updating…" : "Update password"}
                </button>
              </div>
            </form>
          </section>
        </>
      ) : null}
    </StudentLayout>
  );
}
