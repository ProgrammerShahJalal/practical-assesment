import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { api, getStudentToken, getToken, setStudentToken, setToken } from "./api";

const AuthContext = createContext(null);
const StudentAuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [admin, setAdmin] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    if (!getToken()) {
      setLoading(false);
      return undefined;
    }
    api("/api/auth/me")
      .then((next) => {
        if (active) setAdmin(next);
      })
      .catch(() => {
        setToken(null);
        if (active) setAdmin(null);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const value = useMemo(
    () => ({
      admin,
      loading,
      async login(username, password) {
        const result = await api("/api/auth/login", {
          method: "POST",
          body: { username, password },
          auth: false,
        });
        setToken(result.token);
        setAdmin(result.admin);
      },
      logout() {
        setToken(null);
        setAdmin(null);
      },
    }),
    [admin, loading],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function StudentAuthProvider({ children }) {
  const [student, setStudent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [sessionMessage, setSessionMessage] = useState("");

  useEffect(() => {
    let active = true;
    function onExpired(event) {
      setStudent(null);
      setSessionMessage(event.detail?.message || "Session expired. Sign in again.");
      setLoading(false);
    }
    window.addEventListener("student:auth-expired", onExpired);

    if (!getStudentToken()) {
      setLoading(false);
      return () => window.removeEventListener("student:auth-expired", onExpired);
    }

    api("/api/student/me", { auth: "student" })
      .then((next) => {
        if (active) setStudent(next);
      })
      .catch((error) => {
        if (active) setSessionMessage(error.message || "Session expired. Sign in again.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
      window.removeEventListener("student:auth-expired", onExpired);
    };
  }, []);

  const value = useMemo(
    () => ({
      student,
      loading,
      sessionMessage,
      async login(registrationNumber, password) {
        const result = await api("/api/student/auth/login", {
          method: "POST",
          body: { registrationNumber, password },
          auth: false,
        });
        setStudentToken(result.token);
        setStudent(result.student);
        setSessionMessage("");
        return result.student;
      },
      logout() {
        setStudentToken(null);
        setStudent(null);
        setSessionMessage("");
      },
    }),
    [student, loading, sessionMessage],
  );

  return <StudentAuthContext.Provider value={value}>{children}</StudentAuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used inside AuthProvider.");
  return context;
}

export function useStudentAuth() {
  const context = useContext(StudentAuthContext);
  if (!context) throw new Error("useStudentAuth must be used inside StudentAuthProvider.");
  return context;
}
