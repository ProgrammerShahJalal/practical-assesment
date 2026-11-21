import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api";
import { Banner } from "../components/Banner";
import { Layout } from "../components/Layout";
import { formatDate, formatMarks } from "../format";

export function DashboardPage() {
  const [data, setData] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    api("/api/dashboard")
      .then(setData)
      .catch((err) => setError(err.message));
  }, []);

  const counts = data?.counts;

  return (
    <Layout
      title="Overview"
      lede="Students, examinations, and the top of each recent paper."
      action={
        <Link className="button primary" to="/results">
          Enter results
        </Link>
      }
    >
      <Banner>{error}</Banner>
      <section className="stat-grid">
        <article>
          <span>Students</span>
          <strong>{counts ? counts.students : "—"}</strong>
        </article>
        <article>
          <span>Examinations</span>
          <strong>{counts ? counts.examinations : "—"}</strong>
        </article>
        <article>
          <span>Recorded results</span>
          <strong>{counts ? counts.results : "—"}</strong>
        </article>
      </section>
      <section className="panel">
        <header className="panel-head">
          <h2>Recent examinations</h2>
          <Link to="/examinations">Manage examinations</Link>
        </header>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Examination</th>
                <th>Date</th>
                <th>Results</th>
                <th>Highest</th>
                <th>Rank 1</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {data?.examinations?.map((examination) => (
                <tr key={examination._id}>
                  <td>
                    <strong>{examination.title}</strong>
                    <div className="muted">{examination.subject}</div>
                  </td>
                  <td>{formatDate(examination.examDate)}</td>
                  <td>{examination.resultCount}</td>
                  <td>
                    {examination.highest === null
                      ? "—"
                      : `${formatMarks(examination.highest)} / ${formatMarks(examination.totalMarks)}`}
                  </td>
                  <td>{examination.leaders.length ? examination.leaders.map((leader) => leader.name).join(", ") : "—"}</td>
                  <td>
                    <Link to={`/leaderboard?exam=${examination._id}`}>Board</Link>
                  </td>
                </tr>
              ))}
              {data && data.examinations.length === 0 ? (
                <tr>
                  <td colSpan="6" className="empty">
                    No examinations yet.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </section>
    </Layout>
  );
}
