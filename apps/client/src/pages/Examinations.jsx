import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api";
import { Banner } from "../components/Banner";
import { Layout } from "../components/Layout";
import { Modal } from "../components/Modal";
import { formatDate, formatMarks, todayInputValue } from "../format";

const EMPTY = { title: "", subject: "", examDate: todayInputValue(), totalMarks: 100, description: "" };

export function ExaminationsPage() {
  const [examinations, setExaminations] = useState([]);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [draft, setDraft] = useState(null);
  const [saving, setSaving] = useState(false);

  async function load() {
    setExaminations(await api("/api/examinations"));
  }

  useEffect(() => {
    load().catch((err) => setError(err.message));
  }, []);

  function update(field, value) {
    setDraft((current) => ({ ...current, [field]: value }));
  }

  function openEdit(examination) {
    setDraft({
      ...examination,
      examDate: String(examination.examDate).slice(0, 10),
    });
  }

  async function save(event) {
    event.preventDefault();
    setSaving(true);
    setError("");
    setNotice("");
    try {
      await api(draft._id ? `/api/examinations/${draft._id}` : "/api/examinations", {
        method: draft._id ? "PUT" : "POST",
        body: {
          title: draft.title,
          subject: draft.subject,
          examDate: draft.examDate,
          totalMarks: Number(draft.totalMarks),
          description: draft.description,
        },
      });
      setDraft(null);
      setNotice(draft._id ? "Examination updated." : "Examination added.");
      await load();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function remove(examination) {
    if (!window.confirm(`Delete ${examination.title}? Its recorded results will also be deleted.`)) return;
    setError("");
    setNotice("");
    try {
      await api(`/api/examinations/${examination._id}`, { method: "DELETE" });
      setNotice("Examination deleted.");
      await load();
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <Layout
      title="Examinations"
      lede="Every paper has its own total. Leaderboards never mix those totals."
      action={
        <button type="button" className="primary" onClick={() => setDraft({ ...EMPTY })}>
          Add examination
        </button>
      }
    >
      <Banner>{error}</Banner>
      <Banner tone="ok">{notice}</Banner>
      <section className="panel">
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Examination</th>
                <th>Date</th>
                <th>Total</th>
                <th>Results</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {examinations.map((examination) => (
                <tr key={examination._id}>
                  <td>
                    <strong>{examination.title}</strong>
                    <div className="muted">{examination.subject}</div>
                  </td>
                  <td>{formatDate(examination.examDate)}</td>
                  <td>{formatMarks(examination.totalMarks)}</td>
                  <td>{examination.resultCount}</td>
                  <td className="row-actions">
                    <Link to={`/results?exam=${examination._id}`}>Results</Link>
                    <Link to={`/leaderboard?exam=${examination._id}`}>Board</Link>
                    <button type="button" onClick={() => openEdit(examination)}>
                      Edit
                    </button>
                    <button type="button" className="danger" onClick={() => remove(examination)}>
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
              {examinations.length === 0 ? (
                <tr>
                  <td colSpan="5" className="empty">
                    No examinations yet.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </section>
      {draft ? (
        <Modal title={draft._id ? "Edit examination" : "Add examination"} onClose={() => setDraft(null)}>
          <form className="stack" onSubmit={save}>
            <label>
              Title
              <input value={draft.title} onChange={(event) => update("title", event.target.value)} required />
            </label>
            <label>
              Subject
              <input value={draft.subject} onChange={(event) => update("subject", event.target.value)} required />
            </label>
            <div className="split">
              <label>
                Date
                <input type="date" value={draft.examDate} onChange={(event) => update("examDate", event.target.value)} required />
              </label>
              <label>
                Total marks
                <input
                  type="number"
                  min="0.01"
                  step="0.01"
                  value={draft.totalMarks}
                  onChange={(event) => update("totalMarks", event.target.value)}
                  required
                />
              </label>
            </div>
            <label>
              Description
              <textarea value={draft.description} onChange={(event) => update("description", event.target.value)} rows="3" />
            </label>
            <div className="form-actions">
              <button type="button" onClick={() => setDraft(null)}>
                Cancel
              </button>
              <button type="submit" className="primary" disabled={saving}>
                {saving ? "Saving…" : "Save examination"}
              </button>
            </div>
          </form>
        </Modal>
      ) : null}
    </Layout>
  );
}
