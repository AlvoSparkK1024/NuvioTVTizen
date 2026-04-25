import { Router } from "../../navigation/router.js";
import { LocalStore } from "../../../core/storage/localStore.js";
import { ScreenUtils } from "../../navigation/screen.js";
import { AuthManager } from "../../../core/auth/authManager.js";

export const AuthQrSignInScreen = {
  async mount({ onboardingMode = false } = {}) {
    this.container = document.getElementById("account");
    this.onboardingMode = Boolean(onboardingMode);
    this.mode = 'login'; 
    ScreenUtils.show(this.container);
    this.render();
  },

  render() {
    if (this.mode === 'qr') {
      this.renderQrMode();
    } else {
      this.renderLoginMode();
    }
  },

  renderLoginMode() {
    this.stopExpiryCheck();
    this.container.innerHTML = `
      <div class="qr-layout">
        <section class="qr-left-panel">
          <div class="qr-brand-lockup">
            <img src="assets/brand/app_logo_wordmark.png" class="qr-logo" alt="Nuvio" />
          </div>
          <div class="qr-copy-block">
            <h1 class="qr-title">Nuvio Ecosystem</h1>
            <p class="qr-description">Sign in to sync your library and addons from the official nuvioapp.space ecosystem.</p>
          </div>
        </section>

        <section class="qr-card-panel">
          <div class="qr-card">
            <header class="qr-card-header">
              <h2 class="qr-card-title">Sign In</h2>
              <p class="qr-card-subtitle">Use your nuvioapp.space credentials</p>
            </header>

            <div style="display: flex; flex-direction: column; gap: 10px; padding: 10px 0;">
              <input type="email" id="nuvioEmail" class="focusable" placeholder="Email" style="background: rgba(255,255,255,0.08); border: 1.5px solid rgba(255,255,255,0.18); border-radius: 8px; color: #fff; padding: 12px; width: 100%; box-sizing: border-box;" />
              <input type="password" id="nuvioPassword" class="focusable" placeholder="Password" style="background: rgba(255,255,255,0.08); border: 1.5px solid rgba(255,255,255,0.18); border-radius: 8px; color: #fff; padding: 12px; width: 100%; box-sizing: border-box;" />
              <div id="login-status" style="color: #f87171; font-size: 13px; text-align: center; min-height: 18px;"></div>
            </div>

            <div class="qr-actions">
              <button id="login-submit-btn" class="qr-action-btn qr-action-btn-primary focusable" data-action="submit">Sign In</button>
              <button id="switch-to-qr-btn" class="qr-action-btn qr-action-btn-secondary focusable" data-action="switch-qr">Link with Phone (QR)</button>
              <button id="login-skip-btn" class="qr-action-btn qr-action-btn-secondary focusable" data-action="skip">Skip</button>
            </div>
          </div>
        </section>
      </div>
    `;
    this.setupEvents();
  },

  async renderQrMode() {
    const code = await AuthManager.generateLinkingCode();
    const linkUrl = AuthManager.getLinkingUrl(code);

    this.container.innerHTML = `
      <div class="qr-layout">
        <section class="qr-left-panel">
          <div class="qr-brand-lockup">
            <img src="assets/brand/app_logo_wordmark.png" class="qr-logo" alt="Nuvio" />
          </div>
          <div class="qr-copy-block">
            <h1 class="qr-title">Link Device</h1>
            <p class="qr-description">1. Scan the QR code with your phone.<br>2. Log in on <b>nuvioapp.space</b>.<br>3. This TV will be linked to your account.</p>
          </div>
        </section>

        <section class="qr-card-panel">
          <div class="qr-card">
             <div id="qr-code-container" style="background: #fff; padding: 10px; border-radius: 12px; margin: 0 auto 15px; width: 210px; height: 210px; display: flex; align-items: center; justify-content: center;">
                <img src="https://api.qrserver.com/v1/create-qr-code/?size=190x190&data=${encodeURIComponent(linkUrl)}" style="width:100%; height:100%;" />
             </div>
             <div id="qr-code-display" style="text-align: center; font-size: 10px; font-family: monospace; color: rgba(255,255,255,0.4); word-break: break-all; margin-bottom: 5px; max-width: 210px;">${code}</div>
             <div id="expiry-timer" style="text-align: center; font-size: 12px; color: #facc15; margin-bottom: 15px;">Code expires in 02:00</div>
             <div class="qr-actions">
                <button id="switch-to-login-btn" class="qr-action-btn qr-action-btn-secondary focusable" data-action="switch-login">Back to Sign In</button>
             </div>
          </div>
        </section>
      </div>
    `;
    this.setupEvents();
    this.startExpiryCheck();
    AuthManager.pollForLink(code);
  },

  startExpiryCheck() {
    this.stopExpiryCheck();
    let secondsLeft = 2 * 60; // 2 Minutes
    this.expiryInterval = setInterval(() => {
      secondsLeft--;
      if (secondsLeft <= 0) {
        this.renderQrMode(); // Refresh code
        return;
      }
      const min = Math.floor(secondsLeft / 60);
      const sec = secondsLeft % 60;
      const timerEl = document.getElementById("expiry-timer");
      if (timerEl) timerEl.innerText = `Code expires in ${min}:${sec < 10 ? '0' : ''}${sec}`;
    }, 1000);
  },

  stopExpiryCheck() {
    if (this.expiryInterval) clearInterval(this.expiryInterval);
  },

  setupEvents() {
    const btns = this.container.querySelectorAll(".focusable");
    btns.forEach(btn => {
      btn.onclick = () => {
        const action = btn.dataset.action;
        if (action === "submit") this.handleLogin();
        if (action === "switch-qr") { this.mode = 'qr'; this.render(); }
        if (action === "switch-login") { this.mode = 'login'; this.render(); }
        if (action === "skip") this.handleSkip();
      };
    });
    ScreenUtils.indexFocusables(this.container);
    ScreenUtils.setInitialFocus(this.container);
  },

  async handleLogin() {
    const email = document.getElementById("nuvioEmail")?.value?.trim();
    const password = document.getElementById("nuvioPassword")?.value;
    const statusEl = document.getElementById("login-status");

    if (!email || !password) {
      if (statusEl) statusEl.innerText = "Please enter credentials";
      return;
    }

    const submitBtn = document.getElementById("login-submit-btn");
    if (submitBtn) { submitBtn.innerText = "Connecting..."; submitBtn.disabled = true; }

    try {
      await AuthManager.signInWithEmail(email, password);
      Router.navigate("profileSelection");
    } catch (error) {
      if (statusEl) statusEl.innerText = error.message;
      if (submitBtn) { submitBtn.innerText = "Sign In"; submitBtn.disabled = false; }
    }
  },

  handleSkip() {
    LocalStore.set("hasSeenAuthQrOnFirstLaunch", true);
    Router.navigate("home", {}, { replaceHistory: true });
  },

  onKeyDown(event) {
    if (ScreenUtils.handleDpadNavigation(event, this.container)) return;
    if (Number(event?.keyCode || 0) !== 13) return;
    const current = this.container?.querySelector(".focusable.focused");
    if (!current) return;
    if (current.tagName.toLowerCase() === "input") return;
    current.click();
  },

  cleanup() {
    this.stopExpiryCheck();
    ScreenUtils.hide(this.container);
  }
};
