/* ==========================================================================
   AddCo — auth.js
   Handles: first-time onboarding, login, signup, and a simulated
   forgot-password / OTP flow — all stored locally in this browser.

   NOTE ON THE OTP FLOW:
   AddCo is a front-end-only project (no server, no email/SMS provider),
   so a "real" OTP cannot be emailed or texted. To still demonstrate the
   full flow, the generated code is shown directly on screen labeled
   "Demo mode". Wiring this to a real email/SMS OTP later just means
   swapping sendOtpDemo() below for a real API call.
   ========================================================================== */

(function () {
  "use strict";

  var ONBOARD_KEY = "addco_onboarded";
  var USERS_KEY = "addco_users";
  var SESSION_KEY = "addco_session";

  var ONBOARDING_VIEWS = ["onboarding-1", "onboarding-2", "onboarding-3"];

  var authFlow = document.getElementById("authFlow");
  var skipBtn = document.getElementById("authSkipBtn");
  var dotsNav = document.getElementById("authDots");
  var screens = Array.prototype.slice.call(
    document.querySelectorAll(".auth-screen"),
  );
  var dots = Array.prototype.slice.call(document.querySelectorAll(".auth-dot"));

  var currentView = null;

  /* ---------------- storage helpers ---------------- */
  function getUsers() {
    try {
      return JSON.parse(localStorage.getItem(USERS_KEY)) || [];
    } catch (e) {
      return [];
    }
  }
  function saveUsers(users) {
    localStorage.setItem(USERS_KEY, JSON.stringify(users));
  }
  function findUser(email) {
    email = String(email || "")
      .trim()
      .toLowerCase();
    return getUsers().find(function (u) {
      return u.email === email;
    });
  }
  function getSession() {
    return localStorage.getItem(SESSION_KEY);
  }
  function setSession(email) {
    localStorage.setItem(SESSION_KEY, email);
  }

  /* ---------------- view switching ---------------- */
  function getScreen(view) {
    return screens.filter(function (s) {
      return s.getAttribute("data-view") === view;
    })[0];
  }

  function showView(view) {
    var toEl = getScreen(view);
    if (!toEl) return;

    var fromIndex = ONBOARDING_VIEWS.indexOf(currentView);
    var toIndex = ONBOARDING_VIEWS.indexOf(view);
    var direction = "forward";
    if (fromIndex !== -1 && toIndex !== -1 && toIndex < fromIndex)
      direction = "backward";

    // If focus is currently inside the screen we're about to hide, move it
    // away first — setting aria-hidden on an ancestor of a focused element
    // is invalid and browsers warn about it (and it's bad for a11y).
    if (
      document.activeElement &&
      screens.some(function (s) {
        return s.contains(document.activeElement);
      })
    ) {
      document.activeElement.blur();
    }

    screens.forEach(function (s) {
      s.classList.remove(
        "auth-screen--active",
        "auth-screen--enter",
        "auth-screen--enter-back",
      );
      s.setAttribute("aria-hidden", "true");
    });

    // Force a reflow before adding the animation class again, otherwise the
    // browser can coalesce the remove+add into a no-op and the animation
    // silently fails to restart on the next transition.
    void toEl.offsetWidth;

    toEl.classList.add(
      "auth-screen--active",
      direction === "backward"
        ? "auth-screen--enter-back"
        : "auth-screen--enter",
    );
    toEl.setAttribute("aria-hidden", "false");

    var isOnboarding = ONBOARDING_VIEWS.indexOf(view) !== -1;
    if (dotsNav) dotsNav.classList.toggle("is-hidden", !isOnboarding);
    if (skipBtn) skipBtn.classList.toggle("is-hidden", !isOnboarding);

    if (isOnboarding) {
      var n = ONBOARDING_VIEWS.indexOf(view) + 1;
      dots.forEach(function (dot) {
        dot.classList.toggle(
          "auth-dot--active",
          Number(dot.getAttribute("data-dot")) === n,
        );
      });
    }

    clearErrors(toEl);
    currentView = view;
  }

  function clearErrors(scopeEl) {
    scopeEl.querySelectorAll(".form-error").forEach(function (el) {
      el.textContent = "";
    });
    scopeEl.querySelectorAll(".form-input.has-error").forEach(function (el) {
      el.classList.remove("has-error");
    });
  }

  function setError(inputId, message) {
    var input = document.getElementById(inputId);
    var errorEl = document.getElementById(inputId + "Error");
    if (input) input.classList.add("has-error");
    if (errorEl) errorEl.textContent = message;
  }

  function leaveOnboarding() {
    localStorage.setItem(ONBOARD_KEY, "true");
  }

  /* ---------------- unlocking the real app ---------------- */
  function unlockApp() {
    document.body.classList.remove("auth-active");
    if (typeof initApp === "function" && !window.__addcoAppStarted) {
      // App already initialises itself on DOMContentLoaded in noting.js,
      // this is just a safety net in case auth resolves after that.
      window.__addcoAppStarted = true;
    }
  }

  /* Writes the real logged-in user's name/email into AddCo's own settings
     storage (so the dashboard stops showing the placeholder "Riya Agarwal"
     demo profile) and refreshes the profile UI immediately. */
  function syncProfileToApp(name, email) {
    if (typeof getSettings !== "function" || typeof saveSettings !== "function")
      return;
    var settings = getSettings();
    settings.name = name;
    settings.email = email;
    saveSettings(settings);
    if (typeof updateProfileDisplay === "function") updateProfileDisplay();
  }

  /* ---------------- onboarding navigation ---------------- */
  document.querySelectorAll(".auth-screen [data-next]").forEach(function (btn) {
    btn.addEventListener("click", function () {
      var idx = ONBOARDING_VIEWS.indexOf(currentView);
      if (idx > -1 && idx < ONBOARDING_VIEWS.length - 1) {
        showView(ONBOARDING_VIEWS[idx + 1]);
      }
    });
  });

  dots.forEach(function (dot) {
    dot.addEventListener("click", function () {
      var n = Number(dot.getAttribute("data-dot"));
      showView(ONBOARDING_VIEWS[n - 1]);
    });
  });

  if (skipBtn) {
    skipBtn.addEventListener("click", function () {
      leaveOnboarding();
      showView("login");
    });
  }

  /* data-view-target: any link/button that jumps straight to a named view */
  document.querySelectorAll("[data-view-target]").forEach(function (el) {
    el.addEventListener("click", function (e) {
      e.preventDefault();
      var target = el.getAttribute("data-view-target");
      if (ONBOARDING_VIEWS.indexOf(currentView) !== -1 && target === "login") {
        leaveOnboarding();
      }
      showView(target);
    });
  });

  /* ---------------- LOGIN ---------------- */
  var loginForm = document.getElementById("loginForm");
  if (loginForm) {
    loginForm.addEventListener("submit", function (e) {
      e.preventDefault();
      clearErrors(loginForm);

      var email = document
        .getElementById("loginEmail")
        .value.trim()
        .toLowerCase();
      var password = document.getElementById("loginPassword").value;
      var valid = true;

      if (!isValidEmail(email)) {
        setError("loginEmail", "Enter a valid email address.");
        valid = false;
      }
      if (!password) {
        setError("loginPassword", "Enter your password.");
        valid = false;
      }
      if (!valid) return;

      var user = findUser(email);
      if (!user || user.password !== password) {
        setError("loginPassword", "Incorrect email or password.");
        return;
      }

      leaveOnboarding();
      setSession(user.email);
      syncProfileToApp(user.name, user.email);
      unlockApp();
      if (typeof showToast === "function")
        showToast("Welcome back, " + user.name + "!");
    });
  }

  /* ---------------- SIGN UP ---------------- */
  var signupForm = document.getElementById("signupForm");
  if (signupForm) {
    signupForm.addEventListener("submit", function (e) {
      e.preventDefault();
      clearErrors(signupForm);

      var name = document.getElementById("signupName").value.trim();
      var email = document
        .getElementById("signupEmail")
        .value.trim()
        .toLowerCase();
      var password = document.getElementById("signupPassword").value;
      var confirm = document.getElementById("signupConfirm").value;
      var valid = true;

      if (name.length < 2) {
        setError("signupName", "Enter your full name.");
        valid = false;
      }
      if (!isValidEmail(email)) {
        setError("signupEmail", "Enter a valid email address.");
        valid = false;
      } else if (findUser(email)) {
        setError("signupEmail", "An account with this email already exists.");
        valid = false;
      }
      if (password.length < 6) {
        setError("signupPassword", "Use at least 6 characters.");
        valid = false;
      }
      if (confirm !== password) {
        setError("signupConfirm", "Passwords do not match.");
        valid = false;
      }
      if (!valid) return;

      var users = getUsers();
      users.push({ name: name, email: email, password: password });
      saveUsers(users);

      leaveOnboarding();
      setSession(email);
      syncProfileToApp(name, email);
      unlockApp();
      if (typeof showToast === "function")
        showToast("Account created! Welcome to AddCo, " + name + ".");
    });
  }

  /* ---------------- FORGOT PASSWORD ---------------- */
  /* Password reset needs a real backend (to actually email/SMS a code and
     verify it) which this front-end-only build doesn't have yet. Rather than
     fake it, we tell the person honestly that it's not available yet. */
  var forgotPasswordLink = document.getElementById("forgotPasswordLink");
  if (forgotPasswordLink) {
    forgotPasswordLink.addEventListener("click", function (e) {
      e.preventDefault();
      if (typeof showToast === "function") {
        showToast("Password reset isn't available yet — under development.");
      } else {
        window.alert("Password reset isn't available yet — under development.");
      }
    });
  }

  /* ---------------- validators ---------------- */
  function isValidEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  }

  /* ---------------- boot ---------------- */
  function boot() {
    var session = getSession();
    if (session) {
      unlockApp();
      return;
    }
    var onboarded = localStorage.getItem(ONBOARD_KEY) === "true";
    showView(onboarded ? "login" : "onboarding-1");
  }

  boot();

  /* Expose a small API so noting.js can clear the session on logout. */
  window.AddCoAuth = {
    logout: function () {
      localStorage.removeItem(SESSION_KEY);
    },
  };
})();
