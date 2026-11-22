import { useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { StudentLayout } from "../../components/StudentLayout";
import { EmptyState, ErrorState, LoadingState } from "../../components/student/States";
import { formatDate, formatMarks, formatPercent } from "../../format";
import { useStudentFetch } from "../../hooks/useStudentFetch";

export function LeaderboardPage() {
  const [params, setParams] = useSearchParams();
  const examId = params.get("exam") || "";
  const exams = useStudentFetch("/api/student/exams");
  const board = useStudentFetch(examId ? `/api/student/leaderboard/${encodeURIComponent(examId)}` : "", Boolean(examId));
  const error = exams.error || board.error;
  const retry = () => {
    exams.retry();
    board.retry();
  };

  useEffect(() => {
    if (!examId && exams.data?.length) setParams({ exam: exams.data[0]._id }, { replace: true });
  }, [examId, exams.data, setParams]);

  return (
    <StudentLayout title="Leaderboard" lede="Standings are calculated by the examination office for one paper at a time.">
      {exams.loading || board.loading ? <LoadingState label="Loading the leaderboard…" /> : null}
      <ErrorState error={error} onRetry={retry} />
      <div className="toolbar">
        <label>
          Examination
          <select value={examId} onChange={(event) => setParams({ exam: event.target.value })}>
            {!examId ? <option value="">Select an examination</option> : null}
            {exams.data?.map((exam) => (
              <option key={exam._id} value={exam._id}>
                {exam.title} · {exam.subject}
              </option>
            ))}
          </select>
        </label>
        {board.data ? (
          <p className="toolbar-note">
            {formatDate(board.data.examination.examDate)} · total {formatMarks(board.data.examination.totalMarks)}
          </p>
        ) : null}
      </div>

      {board.data ? (
        <>
          <section className="panel my-rank-card">
            <header className="panel-head">
              <h2>Your position</h2>
              <p>{board.data.examination.title}</p>
            </header>
            <div className="rank-summary">
              <span className="rank-badge">{board.data.myRank ?? "—"}</span>
              <div>
                {board.data.isParticipant ? (
                  <p>
                    You are ranked #{board.data.myRank} among {board.data.summary.participants} ranked students.
                  </p>
                ) : (
                  <p>No results published yet for this examination.</p>
                )}
              </div>
            </div>
          </section>

          <section className="stat-grid">
            <article>
              <span>Ranked students</span>
              <strong>{board.data.summary.participants}</strong>
            </article>
            <article>
              <span>Highest</span>
              <strong>{formatMarks(board.data.summary.highest)}</strong>
            </article>
            <article>
              <span>Average</span>
              <strong>{formatMarks(board.data.summary.average)}</strong>
            </article>
            <article>
              <span>Pass rate</span>
              <strong>{formatPercent(board.data.summary.passRate)}</strong>
            </article>
          </section>

          <section className="panel">
            <header className="panel-head">
              <h2>Standings</h2>
              <p>{board.data.policy.description}</p>
            </header>
            {board.data.standings.length === 0 ? (
              <EmptyState>No results published yet.</EmptyState>
            ) : (
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Rank</th>
                      <th>Reg no.</th>
                      <th>Name</th>
                      <th>Marks</th>
                      <th>Total</th>
                      <th>Percentage</th>
                    </tr>
                  </thead>
                  <tbody>
                    {board.data.standings.map((row) => (
                      <tr key={`${row.rank}-${row.rollNumber}`} className={row.isMe ? "is-me" : undefined}>
                        <td>
                          <span className={`rank-badge${row.rank <= 3 ? ` rank-${row.rank}` : ""}`}>{row.rank}</span>
                        </td>
                        <td>{row.rollNumber}</td>
                        <td>
                          {row.studentName}
                          {row.isMe ? <span className="pill you">You</span> : null}
                        </td>
                        <td>{formatMarks(row.marksObtained)}</td>
                        <td>{formatMarks(row.totalMarks)}</td>
                        <td>{formatPercent(row.percentage)}</td>
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
