/* ==========================================================================
   AddCo — auth.js
   No password system — AddCo is a personal, single-device expense tracker,
   so instead of a full login/signup we just ask who's using it once
   (first name, last name, username, email) and remember it on this device.

   Flow:
     First visit  -> onboarding (3 screens) -> profile setup -> dashboard
     Later visits -> straight to dashboard (profile already saved)
     After logout -> profile setup again (pre-filled, just hit Continue)
   ========================================================================== */

(function () {
  "use strict";

  var ONBOARD_KEY = "addco_onboarded";
  var PROFILE_KEY = "addco_profile";
  var SESSION_KEY = "addco_session";

  var ONBOARDING_VIEWS = ["onboarding-1", "onboarding-2", "onboarding-3"];

  var skipBtn = document.getElementById("authSkipBtn");
  var dotsNav = document.getElementById("authDots");
  var screens = Array.prototype.slice.call(document.querySelectorAll(".auth-screen"));
  var dots = Array.prototype.slice.call(document.querySelectorAll(".auth-dot"));

  var currentView = null;

  /* ---------------- storage helpers ---------------- */
  function getProfile() {
    try {
      return JSON.parse(localStorage.getItem(PROFILE_KEY));
    } catch (e) {
      return null;
    }
  }
  function saveProfile(profile) {
    localStorage.setItem(PROFILE_KEY, JSON.stringify(profile));
  }
  function getSession() {
    return localStorage.getItem(SESSION_KEY) === "active";
  }
  function setSession(active) {
    if (active) localStorage.setItem(SESSION_KEY, "active");
    else localStorage.removeItem(SESSION_KEY);
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
    if (fromIndex !== -1 && toIndex !== -1 && toIndex < fromIndex) direction = "backward";

    // If focus is currently inside the screen we're about to hide, move it
    // away first — setting aria-hidden on an ancestor of a focused element
    // is invalid and browsers warn about it (and it's bad for a11y).
    if (document.activeElement && screens.some(function (s) { return s.contains(document.activeElement); })) {
      document.activeElement.blur();
    }

    screens.forEach(function (s) {
      s.classList.remove("auth-screen--active", "auth-screen--enter", "auth-screen--enter-back");
      s.setAttribute("aria-hidden", "true");
    });

    // Force a reflow before adding the animation class again, otherwise the
    // browser can coalesce the remove+add into a no-op and the animation
    // silently fails to restart on the next transition.
    void toEl.offsetWidth;

    toEl.classList.add("auth-screen--active", direction === "backward" ? "auth-screen--enter-back" : "auth-screen--enter");
    toEl.setAttribute("aria-hidden", "false");

    var isOnboarding = ONBOARDING_VIEWS.indexOf(view) !== -1;
    if (dotsNav) dotsNav.classList.toggle("is-hidden", !isOnboarding);
    if (skipBtn) skipBtn.classList.toggle("is-hidden", !isOnboarding);

    if (isOnboarding) {
      var n = ONBOARDING_VIEWS.indexOf(view) + 1;
      dots.forEach(function (dot) {
        dot.classList.toggle("auth-dot--active", Number(dot.getAttribute("data-dot")) === n);
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
  }

  /* Writes the person's name/email into AddCo's own settings storage (so the
     dashboard shows their real name/initials instead of a placeholder) and
     refreshes the profile UI immediately. */
  function syncProfileToApp(fullName, email) {
    if (typeof getSettings !== "function" || typeof saveSettings !== "function") return;
    var settings = getSettings();
    settings.name = fullName;
    settings.email = email;
    saveSettings(settings);
    if (typeof updateProfileDisplay === "function") updateProfileDisplay();
  }

  function prefillProfileForm() {
    var profile = getProfile();
    if (!profile) return;
    var firstEl = document.getElementById("profileFirstName");
    var lastEl = document.getElementById("profileLastName");
    var userEl = document.getElementById("profileUsername");
    var emailEl = document.getElementById("profileEmail");
    if (firstEl) firstEl.value = profile.firstName || "";
    if (lastEl) lastEl.value = profile.lastName || "";
    if (userEl) userEl.value = profile.username || "";
    if (emailEl) emailEl.value = profile.email || "";
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
      prefillProfileForm();
      showView("profile-setup");
    });
  }

  /* data-view-target: any link/button that jumps straight to a named view */
  document.querySelectorAll("[data-view-target]").forEach(function (el) {
    el.addEventListener("click", function (e) {
      e.preventDefault();
      var target = el.getAttribute("data-view-target");
      if (ONBOARDING_VIEWS.indexOf(currentView) !== -1 && target === "profile-setup") {
        leaveOnboarding();
        prefillProfileForm();
      }
      showView(target);
    });
  });

  /* ---------------- PROFILE SETUP (replaces login/signup) ---------------- */
  var profileForm = document.getElementById("profileForm");
  if (profileForm) {
    profileForm.addEventListener("submit", function (e) {
      e.preventDefault();
      clearErrors(profileForm);

      var firstName = document.getElementById("profileFirstName").value.trim();
      var lastName = document.getElementById("profileLastName").value.trim();
      var username = document.getElementById("profileUsername").value.trim();
      var email = document.getElementById("profileEmail").value.trim().toLowerCase();
      var valid = true;

      if (!firstName) {
        setError("profileFirstName", "Enter your first name.");
        valid = false;
      }
      if (!lastName) {
        setError("profileLastName", "Enter your last name.");
        valid = false;
      }
      if (!username || !/^[a-zA-Z0-9_.]{3,20}$/.test(username)) {
        setError("profileUsername", "3-20 letters, numbers, _ or . only.");
        valid = false;
      }
      if (!isValidEmail(email)) {
        setError("profileEmail", "Enter a valid email address.");
        valid = false;
      }
      if (!valid) return;

      var fullName = (firstName + " " + lastName).trim();
      saveProfile({ firstName: firstName, lastName: lastName, username: username, email: email });

      leaveOnboarding();
      setSession(true);
      syncProfileToApp(fullName, email);
      unlockApp();
      if (typeof showToast === "function") showToast("Welcome to AddCo, " + firstName + "!");
    });
  }

  /* ---------------- validators ---------------- */
  function isValidEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  }

  /* ---------------- boot ---------------- */
  function boot() {
    var profile = getProfile();
    if (profile && getSession()) {
      unlockApp();
      return;
    }

    var onboarded = localStorage.getItem(ONBOARD_KEY) === "true";
    if (!onboarded) {
      showView("onboarding-1");
    } else {
      prefillProfileForm();
      showView("profile-setup");
    }
  }

  boot();

  /* Expose a small API so noting.js can clear the session on logout. */
  window.AddCoAuth = {
    logout: function () {
      setSession(false);
    },
  };
})();
