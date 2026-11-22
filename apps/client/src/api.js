const ADMIN_TOKEN_KEY = "result_ledger_token";
const STUDENT_TOKEN_KEY = "result_ledger_student_token";

// Admin token helpers keep their original names so existing sessions work.
export function getToken() {
  return localStorage.getItem(ADMIN_TOKEN_KEY);
}

export function setToken(token) {
  if (token) localStorage.setItem(ADMIN_TOKEN_KEY, token);
  else localStorage.removeItem(ADMIN_TOKEN_KEY);
}

export function getStudentToken() {
  return localStorage.getItem(STUDENT_TOKEN_KEY);
}

export function setStudentToken(token) {
  if (token) localStorage.setItem(STUDENT_TOKEN_KEY, token);
  else localStorage.removeItem(STUDENT_TOKEN_KEY);
}

export async function api(path, { method = "GET", body, auth = true } = {}) {
  const headers = { "Content-Type": "application/json" };
  if (auth === "student") {
    const token = getStudentToken();
    if (token) headers.Authorization = `Bearer ${token}`;
  } else if (auth) {
    const token = getToken();
    if (token) headers.Authorization = `Bearer ${token}`;
  }

  let response;
  try {
    response = await fetch(path, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  } catch {
    const error = new Error("Cannot reach the server. Check your connection and retry.");
    error.status = 0;
    throw error;
  }

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    const message = payload.error || "Request failed.";
    if (response.status === 401 && auth === "student") {
      setStudentToken(null);
      window.dispatchEvent(new CustomEvent("student:auth-expired", { detail: { message } }));
    }
    const error = new Error(message);
    error.status = response.status;
    throw error;
  }
  return payload.data;
}
