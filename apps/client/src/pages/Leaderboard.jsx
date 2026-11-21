import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { api } from "../api";
import { Banner } from "../components/Banner";
import { Layout } from "../components/Layout";
import { formatDate, formatMarks, formatPercent } from "../format";

function rankGroups(standings) {
  const groups = [];
  for (const row of standings) {
    const last = groups[groups.length - 1];
    if (!last || last.rank !== row.rank) groups.push({ rank: row.rank, rows: [row] });
    else last.rows.push(row);
  }
  return groups.slice(0, 3);
}

export function LeaderboardPage() {
  const [params, setParams] = useSearchParams();
  const [examinations, setExaminations] = useState([]);
  const [board, setBoard] = useState(null);
  const [error, setError] = useState("");
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
    setBoard(null);
    api(`/api/leaderboard/${examId}`)
      .then((data) => {
        if (active) setBoard(data);
      })
      .catch((err) => {
        if (active) setError(err.message);
      });
    return () => {
      active = false;
    };
  }, [examId]);

  const summary = board?.summary;
  const groups = board ? rankGroups(board.standings) : [];

  return (
    <Layout
      title="Leaderboard"
      lede="Ranks are calculated on the server for the selected examination only."
    >
      <Banner>{error}</Banner>
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
        {board ? (
          <p className="toolbar-note">
            {formatDate(board.examination.examDate)} · total {formatMarks(board.examination.totalMarks)}
          </p>
        ) : null}
      </div>

      {summary ? (
        <section className="stat-grid">
          <article>
            <span>Ranked students</span>
            <strong>{summary.participants}</strong>
          </article>
          <article>
            <span>Highest</span>
            <strong>{formatMarks(summary.highest)}</strong>
          </article>
          <article>
            <span>Average</span>
            <strong>{formatMarks(summary.average)}</strong>
          </article>
          <article>
            <span>Pass rate</span>
            <strong>{formatPercent(summary.passRate)}</strong>
          </article>
        </section>
      ) : null}

      {groups.length ? (
        <section className="podium">
          {groups.map((group) => (
            <article key={group.rank} className={`podium-card${group.rank <= 3 ? ` rank-${group.rank}` : ""}`}>
              <span>Rank {group.rank}</span>
              {group.rows.map((row) => (
                <div key={row.studentId}>
                  <strong>{row.studentName}</strong>
                  <small>
                    {row.rollNumber} · {formatMarks(row.marksObtained)} / {formatMarks(board.examination.totalMarks)}
                  </small>
                </div>
              ))}
            </article>
          ))}
        </section>
      ) : null}

      <section className="panel">
        <header className="panel-head">
          <h2>Standings</h2>
          {board ? <p>{board.policy.description}</p> : null}
        </header>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Rank</th>
                <th>Roll</th>
                <th>Student</th>
                <th>Marks</th>
                <th>Percentage</th>
                <th>Grade</th>
                <th>Result</th>
              </tr>
            </thead>
            <tbody>
              {board?.standings.map((row) => (
                <tr key={row.studentId}>
                  <td>
                    <span className={`rank-badge${row.rank <= 3 ? ` rank-${row.rank}` : ""}`}>{row.rank}</span>
                  </td>
                  <td>{row.rollNumber}</td>
                  <td>
                    {row.studentName}
                    <div className="muted">
                      {[row.className && `Class ${row.className}`, row.section && `Section ${row.section}`]
                        .filter(Boolean)
                        .join(" · ")}
                    </div>
                  </td>
                  <td>
                    {formatMarks(row.marksObtained)} / {formatMarks(board.examination.totalMarks)}
                  </td>
                  <td>{formatPercent(row.percentage)}</td>
                  <td>{row.grade}</td>
                  <td>
                    <span className={row.passed ? "pill pass" : "pill fail"}>{row.passed ? "Pass" : "Fail"}</span>
                  </td>
                </tr>
              ))}
              {board && board.standings.length === 0 ? (
                <tr>
                  <td colSpan="7" className="empty">
                    No results recorded for this examination. Missing marks stay off the board.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
        {board ? (
          <footer className="policy">
            <p>{board.policy.missingResults}</p>
            <p>{board.policy.scope}</p>
            <p>
              Pass mark {board.policy.passPercentage}%. Grades:{" "}
              {board.policy.grades
                .map((band) => (band.grade === "F" ? "F below 40%" : `${band.grade} from ${band.minPercentage}%`))
                .join(" · ")}
            </p>
          </footer>
        ) : null}
      </section>
    </Layout>
  );
}
