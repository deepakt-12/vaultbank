import axios, { AxiosError } from "axios";

export const api = axios.create({
  baseURL: "/api/v1",
  withCredentials: true,
  headers: {
    "Content-Type": "application/json",
  },
});

function getCookie(name: string): string | null {
  const match = document.cookie.match(new RegExp("(^| )" + name + "=([^;]+)"));
  return match ? decodeURIComponent(match[2]) : null;
}

// Request interceptor to attach CSRF token
api.interceptors.request.use(
  (config) => {
    const csrfToken = getCookie("vaultbank.csrf");
    if (csrfToken && config.headers) {
      config.headers["X-VaultBank-CSRF"] = csrfToken;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor to handle errors
api.interceptors.response.use(
  (response) => response,
  (error: AxiosError<{ success: boolean; error: { code: string; message: string; details?: any } }>) => {
    const serverMessage = error.response?.data?.error?.message;
    const errorCode = error.response?.data?.error?.code;

    // Enhance error object for UI consumption
    const enhancedError = new Error(serverMessage || error.message || "An unexpected error occurred");
    (enhancedError as any).code = errorCode || "UNKNOWN_ERROR";
    (enhancedError as any).status = error.response?.status;
    (enhancedError as any).details = error.response?.data?.error?.details;

    return Promise.reject(enhancedError);
  }
);

