import { useEffect, useState } from "react";
import { api } from "../api";
import { Banner } from "../components/Banner";
import { Layout } from "../components/Layout";
import { Modal } from "../components/Modal";

const EMPTY = { name: "", rollNumber: "", email: "", className: "", section: "", password: "" };

export function StudentsPage() {
  const [query, setQuery] = useState("");
  const [students, setStudents] = useState([]);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [draft, setDraft] = useState(null);
  const [saving, setSaving] = useState(false);

  async function load(nextQuery = query) {
    const data = await api(`/api/students${nextQuery ? `?q=${encodeURIComponent(nextQuery)}` : ""}`);
    setStudents(data);
  }

  useEffect(() => {
    const handle = setTimeout(() => {
      load(query).catch((err) => setError(err.message));
    }, 200);
    return () => clearTimeout(handle);
  }, [query]);

  function update(field, value) {
    setDraft((current) => ({ ...current, [field]: value }));
  }

  async function save(event) {
    event.preventDefault();
    setSaving(true);
    setError("");
    setNotice("");
    try {
      const path = draft._id ? `/api/students/${draft._id}` : "/api/students";
      await api(path, { method: draft._id ? "PUT" : "POST", body: draft });
      setDraft(null);
      setNotice(draft._id ? "Student updated." : "Student added.");
      await load();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function remove(student) {
    if (!window.confirm(`Remove ${student.name}? Recorded results for this student will also be deleted.`)) return;
    setError("");
    setNotice("");
    try {
      await api(`/api/students/${student._id}`, { method: "DELETE" });
      setNotice("Student removed.");
      await load();
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <Layout
      title="Students"
      lede="The roll number identifies a student on every examination."
      action={
        <button type="button" className="primary" onClick={() => setDraft({ ...EMPTY })}>
          Add student
        </button>
      }
    >
      <Banner>{error}</Banner>
      <Banner tone="ok">{notice}</Banner>
      <div className="toolbar">
        <label className="search">
          Search
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Name, roll number, class, or section"
          />
        </label>
      </div>
      <section className="panel">
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Roll</th>
                <th>Name</th>
                <th>Class</th>
                <th>Section</th>
                <th>Email</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {students.map((student) => (
                <tr key={student._id}>
                  <td>{student.rollNumber}</td>
                  <td>{student.name}</td>
                  <td>{student.className || "—"}</td>
                  <td>{student.section || "—"}</td>
                  <td>{student.email || "—"}</td>
                  <td className="row-actions">
                    <button type="button" onClick={() => setDraft({ ...student, password: "" })}>
                      Edit
                    </button>
                    <button type="button" className="danger" onClick={() => remove(student)}>
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
              {students.length === 0 ? (
                <tr>
                  <td colSpan="6" className="empty">
                    No students match this list.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </section>
      {draft ? (
        <Modal title={draft._id ? "Edit student" : "Add student"} onClose={() => setDraft(null)}>
          <form className="stack" onSubmit={save}>
            <label>
              Name
              <input value={draft.name} onChange={(event) => update("name", event.target.value)} required />
            </label>
            <label>
              Roll number
              <input value={draft.rollNumber} onChange={(event) => update("rollNumber", event.target.value)} required />
            </label>
            <div className="split">
              <label>
                Class
                <input value={draft.className} onChange={(event) => update("className", event.target.value)} />
              </label>
              <label>
                Section
                <input value={draft.section} onChange={(event) => update("section", event.target.value)} />
              </label>
            </div>
            <label>
              Email
              <input type="email" value={draft.email} onChange={(event) => update("email", event.target.value)} />
            </label>
            <label>
              Student login password (optional)
              <input
                type="password"
                autoComplete="new-password"
                placeholder={draft._id ? "Leave blank to keep current password" : "At least 8 characters"}
                value={draft.password || ""}
                onChange={(event) => update("password", event.target.value)}
                minLength={8}
              />
              <span className="hint">Students sign in with this password and their roll number.</span>
            </label>
            <div className="form-actions">
              <button type="button" onClick={() => setDraft(null)}>
                Cancel
              </button>
              <button type="submit" className="primary" disabled={saving}>
                {saving ? "Saving…" : "Save student"}
              </button>
            </div>
          </form>
        </Modal>
      ) : null}
    </Layout>
  );
}
