import { useEffect, useState } from "react";
import { api } from "../api";

// Shared loading / error / retry behaviour for every read-only student page.
// 401s clear the student token and raise a global event handled by
// StudentAuthProvider, which redirects to the login page with a message.
export function useStudentFetch(path, enabled = true) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(Boolean(path && enabled));
  const [error, setError] = useState("");
  const [nonce, setNonce] = useState(0);

  useEffect(() => {
    if (!path || !enabled) {
      setLoading(false);
      return undefined;
    }
    let active = true;
    setLoading(true);
    setError("");
    setData(null);
    api(path, { auth: "student" })
      .then((result) => {
        if (active) setData(result);
      })
      .catch((err) => {
        if (active) setError(err.message || "Something went wrong.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [path, enabled, nonce]);

  return { data, loading, error, retry: () => setNonce((value) => value + 1) };
}
