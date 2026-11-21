import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { api } from "../api";
import { Banner } from "../components/Banner";
import { Layout } from "../components/Layout";
import { formatMarks } from "../format";

export function ResultsPage() {
  const [params, setParams] = useSearchParams();
  const [examinations, setExaminations] = useState([]);
  const [sheet, setSheet] = useState(null);
  const [drafts, setDrafts] = useState({});
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [saving, setSaving] = useState(false);
  const examId = params.get("exam") || "";

  useEffect(() => {
    api("/api/examinations")
      .then((data) => {
        setExaminations(data);
        if (!examId && data[0]) setParams({ exam: data[0]._id }, { replace: true });
      })
      .catch((err) => setError(err.message));
  }, []);

  useEffect(() => {
    if (!examId) return undefined;
    let active = true;
    setNotice("");
    api(`/api/examinations/${examId}/sheet`)
      .then((data) => {
        if (!active) return;
        setSheet(data);
        const next = {};
        for (const row of data.rows) {
          next[row.studentId] = {
            marks: row.marksObtained === null || row.marksObtained === undefined ? "" : String(row.marksObtained),
            remarks: row.remarks || "",
          };
        }
        setDrafts(next);
      })
      .catch((err) => {
        if (active) setError(err.message);
      });
    return () => {
      active = false;
    };
  }, [examId]);

  const problems = useMemo(() => {
    if (!sheet) return {};
    const next = {};
    for (const row of sheet.rows) {
      const marks = drafts[row.studentId]?.marks?.trim() ?? "";
      if (marks === "") continue;
      const value = Number(marks);
      if (!Number.isFinite(value) || value < 0 || value > sheet.examination.totalMarks) {
        next[row.studentId] = `Enter a mark from 0 to ${formatMarks(sheet.examination.totalMarks)}.`;
      }
    }
    return next;
  }, [drafts, sheet]);

  function updateDraft(studentId, field, value) {
    setDrafts((current) => ({
      ...current,
      [studentId]: { ...current[studentId], [field]: value },
    }));
  }

  async function save(event) {
    event.preventDefault();
    if (Object.keys(problems).length) return;
    setSaving(true);
    setError("");
    setNotice("");
    try {
      const entries = sheet.rows.map((row) => {
        const draft = drafts[row.studentId] || { marks: "", remarks: "" };
        const marks = draft.marks.trim();
        return {
          studentId: row.studentId,
          marksObtained: marks === "" ? null : Number(marks),
          remarks: draft.remarks,
        };
      });
      await api(`/api/examinations/${examId}/results`, { method: "PUT", body: { entries } });
      const data = await api(`/api/examinations/${examId}/sheet`);
      setSheet(data);
      setNotice("Results saved. Blank marks were removed and are not ranked as zero.");
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Layout
      title="Results"
      lede="Save marks against one examination. Leave a row blank to keep that student off its leaderboard."
    >
      <Banner>{error}</Banner>
      <Banner tone="ok">{notice}</Banner>
      <div className="toolbar">
        <label>
          Examination
          <select value={examId} onChange={(event) => setParams({ exam: event.target.value })}>
            {examinations.map((examination) => (
              <option key={examination._id} value={examination._id}>
                {examination.title} · {examination.subject}
              </option>
            ))}
          </select>
        </label>
        {sheet ? <p className="toolbar-note">Total marks: {formatMarks(sheet.examination.totalMarks)}</p> : null}
      </div>
      <form onSubmit={save}>
        <section className="panel">
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Roll</th>
                  <th>Student</th>
                  <th>Marks</th>
                  <th>Remarks</th>
                </tr>
              </thead>
              <tbody>
                {sheet?.rows.map((row) => (
                  <tr key={row.studentId}>
                    <td>{row.rollNumber}</td>
                    <td>
                      {row.name}
                      <div className="muted">
                        {[row.className && `Class ${row.className}`, row.section && `Section ${row.section}`]
                          .filter(Boolean)
                          .join(" · ") || "—"}
                      </div>
                      {problems[row.studentId] ? <div className="field-error">{problems[row.studentId]}</div> : null}
                    </td>
                    <td>
                      <input
                        className="mark-input"
                        inputMode="decimal"
                        aria-label={`Marks for ${row.name}`}
                        value={drafts[row.studentId]?.marks ?? ""}
                        onChange={(event) => updateDraft(row.studentId, "marks", event.target.value)}
                      />
                    </td>
                    <td>
                      <input
                        aria-label={`Remarks for ${row.name}`}
                        value={drafts[row.studentId]?.remarks ?? ""}
                        onChange={(event) => updateDraft(row.studentId, "remarks", event.target.value)}
                      />
                    </td>
                  </tr>
                ))}
                {sheet && sheet.rows.length === 0 ? (
                  <tr>
                    <td colSpan="4" className="empty">
                      Add a student before entering results.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </section>
        <div className="form-actions sticky-actions">
          <button type="submit" className="primary" disabled={saving || !sheet || Object.keys(problems).length > 0}>
            {saving ? "Saving…" : "Save results"}
          </button>
        </div>
      </form>
    </Layout>
  );
}
