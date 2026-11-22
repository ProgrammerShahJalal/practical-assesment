import { Navigate, Route, Routes } from "react-router-dom";
import { useAuth, useStudentAuth } from "./auth";
import { DashboardPage } from "./pages/Dashboard";
import { ExaminationsPage } from "./pages/Examinations";
import { LeaderboardPage } from "./pages/Leaderboard";
import { LoginPage } from "./pages/Login";
import { ResultsPage } from "./pages/Results";
import { StudentsPage } from "./pages/Students";
import { DashboardPage as StudentDashboardPage } from "./pages/student/Dashboard";
import { LeaderboardPage as StudentLeaderboardPage } from "./pages/student/Leaderboard";
import { LoginPage as StudentLoginPage } from "./pages/student/Login";
import { ProfilePage as StudentProfilePage } from "./pages/student/Profile";
import { ResultDetailPage as StudentResultDetailPage } from "./pages/student/ResultDetail";
import { ResultsPage as StudentResultsPage } from "./pages/student/Results";

function Protected({ children }) {
  const { admin, loading } = useAuth();
  if (loading) return <div className="boot">Opening the ledger…</div>;
  if (!admin) return <Navigate to="/login" replace />;
  return children;
}

function Guest({ children }) {
  const { admin, loading } = useAuth();
  if (loading) return <div className="boot">Opening the ledger…</div>;
  if (admin) return <Navigate to="/" replace />;
  return children;
}

function StudentProtected({ children }) {
  const { student, loading, sessionMessage } = useStudentAuth();
  if (loading) return <div className="boot">Opening your results…</div>;
  if (!student) {
    return <Navigate to="/student/login" replace state={sessionMessage ? { message: sessionMessage } : undefined} />;
  }
  return children;
}

function StudentGuest({ children }) {
  const { student, loading } = useStudentAuth();
  if (loading) return <div className="boot">Opening your results…</div>;
  if (student) return <Navigate to="/student" replace />;
  return children;
}

export function App() {
  return (
    <Routes>
      <Route
        path="/login"
        element={
          <Guest>
            <LoginPage />
          </Guest>
        }
      />
      <Route
        path="/"
        element={
          <Protected>
            <DashboardPage />
          </Protected>
        }
      />
      <Route
        path="/students"
        element={
          <Protected>
            <StudentsPage />
          </Protected>
        }
      />
      <Route
        path="/examinations"
        element={
          <Protected>
            <ExaminationsPage />
          </Protected>
        }
      />
      <Route
        path="/results"
        element={
          <Protected>
            <ResultsPage />
          </Protected>
        }
      />
      <Route
        path="/leaderboard"
        element={
          <Protected>
            <LeaderboardPage />
          </Protected>
        }
      />

      <Route
        path="/student/login"
        element={
          <StudentGuest>
            <StudentLoginPage />
          </StudentGuest>
        }
      />
      <Route
        path="/student"
        element={
          <StudentProtected>
            <StudentDashboardPage />
          </StudentProtected>
        }
      />
      <Route
        path="/student/results"
        element={
          <StudentProtected>
            <StudentResultsPage />
          </StudentProtected>
        }
      />
      <Route
        path="/student/results/:examId"
        element={
          <StudentProtected>
            <StudentResultDetailPage />
          </StudentProtected>
        }
      />
      <Route
        path="/student/leaderboard"
        element={
          <StudentProtected>
            <StudentLeaderboardPage />
          </StudentProtected>
        }
      />
      <Route
        path="/student/profile"
        element={
          <StudentProtected>
            <StudentProfilePage />
          </StudentProtected>
        }
      />

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
