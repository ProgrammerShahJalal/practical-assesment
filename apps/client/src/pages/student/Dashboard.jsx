import { Link } from "react-router-dom";
import { StudentLayout } from "../../components/StudentLayout";
import { EmptyState, ErrorState, LoadingState } from "../../components/student/States";
import { formatDate, formatMarks, formatPercent } from "../../format";
import { useStudentFetch } from "../../hooks/useStudentFetch";

export function DashboardPage() {
  const { data, loading, error, retry } = useStudentFetch("/api/student/dashboard");
  const stats = [
    ["Exams attempted", data ? data.totalExamsAttempted : "—"],
    ["Average", data ? formatPercent(data.averagePercentage) : "—"],
    ["Best", data ? formatPercent(data.bestPercentage) : "—"],
    ["Latest rank", data?.latestRank ? `#${data.latestRank}` : "—"],
  ];

  return (
    <StudentLayout
      title="Dashboard"
      lede="Your results at a glance. Nothing here can be edited from the student portal."
      action={
        <Link className="button primary" to="/student/results">
          My results
        </Link>
      }
    >
      {loading ? <LoadingState label="Loading your dashboard…" /> : null}
      <ErrorState error={error} onRetry={retry} />
      {data ? (
        <>
          <section className="stat-grid">
            {stats.map(([label, value]) => (
              <article key={label}>
                <span>{label}</span>
                <strong>{value}</strong>
              </article>
            ))}
          </section>
          <section className="panel">
            <header className="panel-head">
              <h2>Recent results</h2>
              <Link to="/student/results">View all</Link>
            </header>
            {data.recentResults.length === 0 ? (
              <EmptyState>No results published yet.</EmptyState>
            ) : (
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Examination</th>
                      <th>Date</th>
                      <th>Marks</th>
                      <th>Percentage</th>
                      <th>Rank</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.recentResults.map((result) => (
                      <tr key={result.resultId}>
                        <td>
                          <Link to={`/student/results/${result.examinationId}`}>
                            <strong>{result.examTitle}</strong>
                          </Link>
                          <div className="muted">{result.subject}</div>
                        </td>
                        <td>{formatDate(result.examDate)}</td>
                        <td>
                          {formatMarks(result.marksObtained)} / {formatMarks(result.totalMarks)}
                        </td>
                        <td>{formatPercent(result.percentage)}</td>
                        <td>
                          <span className="rank-badge">{result.rank}</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </>
      ) : null}
    </StudentLayout>
  );
}
