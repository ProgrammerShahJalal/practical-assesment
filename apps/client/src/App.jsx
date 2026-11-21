import { Navigate, Route, Routes } from "react-router-dom";
import { useAuth } from "./auth";
import { DashboardPage } from "./pages/Dashboard";
import { ExaminationsPage } from "./pages/Examinations";
import { LeaderboardPage } from "./pages/Leaderboard";
import { LoginPage } from "./pages/Login";
import { ResultsPage } from "./pages/Results";
import { StudentsPage } from "./pages/Students";

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
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
