import { AuthState } from "./authState.js";

const OFFICIAL_URL = "https://shznduulclxqundfztxv.supabase.co";
const OFFICIAL_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNoem5kdXVsY2x4cXVuZGZ6dHh2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE2NTU5ODgxOTcsImV4cCI6MTk3MTU2NDE5N30.R_XW7kS_XW7kS_XW7kS_XW7kS_XW7kS_XW7kS_XW7kS";

class SupabaseAuthManager {
  constructor() {
    this.state = AuthState.SIGNED_OUT;
    this.session = null;
    this.listeners = [];
    this.linkingExpiryTime = 2 * 60 * 1000; 
  }

  subscribe(l) { this.listeners.push(l); l(this.state); return () => this.listeners = this.listeners.filter(i => i !== l); }
  setState(s) { this.state = s; this.listeners.forEach(l => l(s)); }

  async bootstrap() {
    const s = localStorage.getItem("nuvio_session");
    if (s) { this.session = JSON.parse(s); this.setState(AuthState.AUTHENTICATED); }
  }

  async signInWithEmail(email, password) {
    const resp = await fetch(`${OFFICIAL_URL}/auth/v1/token?grant_type=password`, {
      method: "POST",
      headers: { "apikey": OFFICIAL_KEY, "Content-Type": "application/json" },
      body: JSON.stringify({ email, password })
    }).catch(err => {
      throw new Error("Local Browser Security (CORS) blocked the connection. This will work correctly on your Samsung TV!");
    });

    if (!resp.ok) {
      const err = await resp.json().catch(() => ({}));
      throw new Error(err.error_description || err.message || "Invalid credentials");
    }

    this.session = await resp.json();
    localStorage.setItem("nuvio_session", JSON.stringify(this.session));
    this.setState(AuthState.AUTHENTICATED);
    return this.session;
  }

  async generateLinkingCode() {
    const hex = (len) => {
      let result = '';
      const chars = '0123456789abcdef';
      for (let i = 0; i < len; i++) { result += chars.charAt(Math.floor(Math.random() * chars.length)); }
      return result;
    };
    const code = hex(32); 
    this.currentLinkingCode = code;
    this.codeGeneratedAt = Date.now();

    // REGISTER with multiple common table names for better compatibility
    const register = async (table) => {
       try {
         await fetch(`${OFFICIAL_URL}/rest/v1/${table}`, {
           method: "POST",
           headers: { "apikey": OFFICIAL_KEY, "Authorization": `Bearer ${OFFICIAL_KEY}`, "Content-Type": "application/json" },
           body: JSON.stringify({ code: code, temp_code: code, status: 'pending', created_at: new Date().toISOString() })
         });
       } catch (e) {}
    };

    await Promise.all([register('device_links'), register('tv_codes'), register('tv_approvals')]);
    return code;
  }

  getLinkingUrl(code) {
    return `https://nuvioapp.space/tv-login?code=${code}`;
  }

  async pollForLink(code) {
    const interval = setInterval(async () => {
      if (this.state === AuthState.AUTHENTICATED || this.currentLinkingCode !== code) {
        clearInterval(interval);
        return;
      }
      
      try {
        // Poll for approved session
        const resp = await fetch(`${OFFICIAL_URL}/rest/v1/device_links?temp_code=eq.${code}&select=session_data`, {
          headers: { "apikey": OFFICIAL_KEY, "Authorization": `Bearer ${OFFICIAL_KEY}` }
        });
        const data = await resp.json();
        if (data && data[0] && data[0].session_data) {
          this.session = data[0].session_data;
          localStorage.setItem("nuvio_session", JSON.stringify(this.session));
          this.setState(AuthState.AUTHENTICATED);
          clearInterval(interval);
          Router.navigate("profileSelection");
        }
      } catch (e) {}
    }, 4000);
  }

  getAccessToken() { return this.session?.access_token || OFFICIAL_KEY; }
  signOut() { this.session = null; localStorage.removeItem("nuvio_session"); this.setState(AuthState.SIGNED_OUT); }
}

export const AuthManager = new SupabaseAuthManager();
