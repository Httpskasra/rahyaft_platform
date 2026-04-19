import axios from "axios";

const BACKEND = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3000/api/v1";

// A plain axios instance with NO interceptors — used only for the refresh call
// to avoid triggering the response interceptor on the refresh itself
const plainAxios = axios.create({ baseURL: BACKEND });

export const apiClient = axios.create({ baseURL: BACKEND });

// ── Request: attach access token ──────────────────────────────
apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem("accessToken");
  if (token) {
    config.headers = config.headers ?? {};
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// ── Response: on 401 refresh once, then retry ─────────────────
apiClient.interceptors.response.use(
  (res) => res,
  async (error) => {
    const original = error.config;

    // Only attempt refresh once, and only on 401
    if (error.response?.status !== 401 || original._retry) {
      return Promise.reject(error);
    }

    original._retry = true;

    const refreshToken = localStorage.getItem("refreshToken");

    // No refresh token at all → go to login immediately
    if (!refreshToken) {
      localStorage.clear();
      window.location.href = "/login";
      return Promise.reject(error);
    }

    try {
      // Use plainAxios — NOT apiClient — so this call doesn't re-trigger
      // this same interceptor if the refresh itself returns 401
      const { data } = await plainAxios.post("/auth/refresh", { refreshToken });

      // Store new tokens
      localStorage.setItem("accessToken", data.accessToken);
      localStorage.setItem("refreshToken", data.refreshToken);

      // Patch the failed request's Authorization header and retry it
      original.headers = original.headers ?? {};
      original.headers.Authorization = `Bearer ${data.accessToken}`;

      return apiClient(original);
    } catch {
      // Refresh failed (token expired or revoked) → force logout
      localStorage.clear();
      window.location.href = "/login";
      return Promise.reject(error);
    }
  }
);