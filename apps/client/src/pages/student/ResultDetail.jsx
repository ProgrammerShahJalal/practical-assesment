import { Link, useParams } from "react-router-dom";
import { StudentLayout } from "../../components/StudentLayout";
import { EmptyState, ErrorState, LoadingState } from "../../components/student/States";
import { formatDate, formatMarks, formatPercent } from "../../format";
import { useStudentFetch } from "../../hooks/useStudentFetch";

export function ResultDetailPage() {
  const { examId } = useParams();
  const { data, loading, error, retry } = useStudentFetch(`/api/student/results/${encodeURIComponent(examId)}`);
  const result = data?.result;
  const notFound = error?.status === 404;

  return (
    <StudentLayout
      title="Result Detail"
      lede={data ? `${data.examination.title} · ${data.examination.subject}` : "One examination, one rank."}
      action={
        data ? (
          <Link className="button primary" to={`/student/leaderboard?exam=${data.examination._id}`}>
            View leaderboard
          </Link>
        ) : null
      }
    >
      {loading ? <LoadingState label="Loading this result…" /> : null}
      <ErrorState error={notFound ? "" : error} onRetry={retry} />
      {notFound || (data && !result) ? <EmptyState>No results published yet.</EmptyState> : null}
      {result ? (
        <>
          <section className="stat-grid">
            <article>
              <span>Obtained</span>
              <strong>{formatMarks(result.marksObtained)}</strong>
            </article>
            <article>
              <span>Total marks</span>
              <strong>{formatMarks(result.totalMarks)}</strong>
            </article>
            <article>
              <span>Percentage</span>
              <strong>{formatPercent(result.percentage)}</strong>
            </article>
            <article>
              <span>Rank</span>
              <strong>#{result.rank}</strong>
            </article>
          </section>
          <section className="panel">
            <header className="panel-head">
              <h2>{result.examTitle}</h2>
              <p>{formatDate(result.examDate)}</p>
            </header>
            <div className="detail-list">
              <div>
                <span>Subject</span>
                <strong>{result.subject || "—"}</strong>
              </div>
              <div>
                <span>Remarks</span>
                <strong>{result.remarks || "—"}</strong>
              </div>
            </div>
            <footer className="policy">
              <p>
                <Link to={`/student/leaderboard?exam=${result.examinationId}`}>
                  See the full leaderboard for this examination
                </Link>
              </p>
            </footer>
          </section>
        </>
      ) : null}
    </StudentLayout>
  );
}
