import { AuthManager } from "../../../core/auth/authManager.js";

const getEnv = () => {
  const root = typeof globalThis !== "undefined" ? globalThis : window;
  return root.__NUVIO_ENV__ || {};
};

const getBaseUrl = () => {
  const url = getEnv().SUPABASE_URL || "";
  return url.endsWith("/") ? url.slice(0, -1) : url;
};

const getAnonKey = () => getEnv().SUPABASE_ANON_KEY || "";

const getHeaders = (useSession = true) => {
  const headers = {
    apikey: getAnonKey(),
    "Content-Type": "application/json",
    Prefer: "return=representation"
  };
  
  const token = useSession ? AuthManager.getAccessToken() : null;
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  } else {
    headers.Authorization = `Bearer ${getAnonKey()}`;
  }
  
  return headers;
};

export const SupabaseApi = {

  async rpc(functionName, body = {}, useSession = true) {
    const baseUrl = getBaseUrl();
    if (!baseUrl) return null;

    const response = await fetch(`${baseUrl}/rest/v1/rpc/${functionName}`, {
      method: "POST",
      headers: getHeaders(useSession),
      body: JSON.stringify(body)
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw { status: response.status, ...error };
    }

    return response.json();
  },

  async select(table, query = "", useSession = true) {
    const baseUrl = getBaseUrl();
    if (!baseUrl) return [];

    const suffix = query ? `?${query}` : "";
    const response = await fetch(`${baseUrl}/rest/v1/${table}${suffix}`, {
      method: "GET",
      headers: getHeaders(useSession)
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw { status: response.status, ...error };
    }

    return response.json();
  },

  async upsert(table, rows, onConflict = null, useSession = true) {
    const baseUrl = getBaseUrl();
    if (!baseUrl) return null;

    const conflictParam = onConflict ? `?on_conflict=${onConflict}` : "";
    const response = await fetch(`${baseUrl}/rest/v1/${table}${conflictParam}`, {
      method: "POST",
      headers: {
        ...getHeaders(useSession),
        Prefer: "resolution=merge-duplicates,return=representation"
      },
      body: JSON.stringify(rows)
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw { status: response.status, ...error };
    }

    return response.json();
  },

  async delete(table, query, useSession = true) {
    const baseUrl = getBaseUrl();
    if (!baseUrl) return null;

    const suffix = query ? `?${query}` : "";
    const response = await fetch(`${baseUrl}/rest/v1/${table}${suffix}`, {
      method: "DELETE",
      headers: getHeaders(useSession)
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw { status: response.status, ...error };
    }

    return true;
  }

};
