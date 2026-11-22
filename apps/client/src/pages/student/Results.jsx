import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { StudentLayout } from "../../components/StudentLayout";
import { EmptyState, ErrorState, LoadingState } from "../../components/student/States";
import { formatDate, formatMarks, formatPercent } from "../../format";
import { useStudentFetch } from "../../hooks/useStudentFetch";

export function ResultsPage() {
  const [params, setParams] = useSearchParams();
  const navigate = useNavigate();
  const examId = params.get("exam") || "";
  const requestedPage = Number(params.get("page") || 1);
  const page = Number.isInteger(requestedPage) && requestedPage > 0 ? requestedPage : 1;

  const query = new URLSearchParams({ page: String(page), limit: "10" });
  if (examId) query.set("examination", examId);
  const results = useStudentFetch(`/api/student/results?${query}`);
  const exams = useStudentFetch("/api/student/exams");
  const error = results.error || exams.error;
  const retry = () => {
    results.retry();
    exams.retry();
  };

  function chooseExam(next) {
    setParams(next ? { exam: next, page: "1" } : {}, { replace: true });
  }

  function goToPage(next) {
    setParams({ ...(examId ? { exam: examId } : {}), page: String(next) });
  }

  const pagination = results.data?.pagination;

  return (
    <StudentLayout title="My Results" lede="Your marks and rank for each examination, newest first.">
      {results.loading || exams.loading ? <LoadingState label="Loading your results…" /> : null}
      <ErrorState error={error} onRetry={retry} />
      <div className="toolbar">
        <label>
          Examination
          <select value={examId} onChange={(event) => chooseExam(event.target.value)}>
            <option value="">All examinations</option>
            {exams.data?.map((exam) => (
              <option key={exam._id} value={exam._id}>
                {exam.title} · {exam.subject}
              </option>
            ))}
          </select>
        </label>
        {pagination ? <p className="toolbar-note">{pagination.total} result(s) found.</p> : null}
      </div>

      {results.data ? (
        <section className="panel">
          {results.data.items.length === 0 ? (
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
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {results.data.items.map((result) => (
                    <tr
                      key={result.resultId}
                      className="clickable-row"
                      tabIndex={0}
                      onClick={() => navigate(`/student/results/${result.examinationId}`)}
                      onKeyDown={(event) => {
                        if (event.key === "Enter") navigate(`/student/results/${result.examinationId}`);
                      }}
                    >
                      <td>
                        <strong>{result.examTitle}</strong>
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
                      <td>
                        <Link to={`/student/results/${result.examinationId}`} onClick={(event) => event.stopPropagation()}>
                          Details
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      ) : null}

      {pagination && pagination.pages > 1 ? (
        <div className="pagination">
          <button type="button" disabled={pagination.page <= 1} onClick={() => goToPage(pagination.page - 1)}>
            Previous
          </button>
          <span>
            Page {pagination.page} of {pagination.pages}
          </span>
          <button
            type="button"
            disabled={!pagination.hasMore}
            onClick={() => goToPage(pagination.page + 1)}
          >
            Next
          </button>
        </div>
      ) : null}
    </StudentLayout>
  );
}
