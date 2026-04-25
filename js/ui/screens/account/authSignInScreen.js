import { Router } from "../../navigation/router.js";
import { ScreenUtils } from "../../navigation/screen.js";
import { AuthManager } from "../../../core/auth/authManager.js";
import { I18n } from "../../../i18n/index.js";

export const AuthSignInScreen = {

  async mount() {
    this.container = document.getElementById("account");
    ScreenUtils.show(this.container);
    this.render();
  },

  render() {
    this.container.innerHTML = `
      <div class="auth-simple-shell">
        <div class="auth-simple-hero">
          <h2 class="auth-simple-title">Sign In with Firebase</h2>
          <p class="auth-simple-subtitle">Enter your email and password to sync your account.</p>
        </div>
        <div class="auth-simple-actions" style="display: flex; flex-direction: column; gap: 10px;">
          <input type="email" id="authEmail" class="focusable" placeholder="Email Address" style="padding: 10px; font-size: 18px;" />
          <input type="password" id="authPassword" class="focusable" placeholder="Password" style="padding: 10px; font-size: 18px;" />
          <div class="auth-simple-card focusable" data-action="submitLogin">Sign In</div>
          <div class="auth-simple-card focusable" data-action="back">${I18n.t("auth.signIn.back")}</div>
        </div>
      </div>
    `;

    ScreenUtils.indexFocusables(this.container);
    ScreenUtils.setInitialFocus(this.container);
  },

  async onKeyDown(event) {
    if (ScreenUtils.handleDpadNavigation(event, this.container)) {
      return;
    }
    if (event.keyCode !== 13) {
      return;
    }

    const current = this.container.querySelector(".focusable.focused");
    if (!current) {
      return;
    }
    
    // If the user presses enter on an input field, just let the TV show the keyboard
    if (current.tagName.toLowerCase() === 'input') {
      current.focus();
      return;
    }

    const action = current.dataset.action;
    
    if (action === "submitLogin") {
      const email = document.getElementById("authEmail").value;
      const password = document.getElementById("authPassword").value;
      
      if (email && password) {
        try {
          await AuthManager.signInWithEmail(email, password);
          Router.navigate("profileSelection");
        } catch (error) {
          console.error("SignIn failed", error);
          alert("Login failed: " + error.message);
        }
      }
      return;
    }
    if (action === "back") {
      Router.back();
    }
  },

  cleanup() {
    ScreenUtils.hide(this.container);
  }

};
