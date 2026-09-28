window.AppAuth = {
  togglePasswordVisibility: function() {
    var passInput = document.getElementById("auth-password");
    var peekBtn = document.getElementById("btn-peek-password");
    if (!passInput || !peekBtn) return;

    if (passInput.type === "password") {
      passInput.type = "text";
      peekBtn.innerText = "🔒";
    } else {
      passInput.type = "password";
      peekBtn.innerText = "👁";
    }
  },

  setError: function(msg) {
    var errEl = document.getElementById("auth-error");
    if (errEl) errEl.innerText = msg || "";
  },

  formatInternalEmail: function(username) {
    var cleanUser = username.trim().toLowerCase().replace(/[^a-z0-9_]/g, "");
    return cleanUser + "@chestsim.internal";
  },

  register: async function() {
    this.setError("");
    var userInput = document.getElementById("auth-username").value.trim();
    var passInput = document.getElementById("auth-password").value;

    if (userInput.length < 3 || userInput.length > 15) {
      this.setError("Username must be 3-15 characters.");
      return;
    }
    if (!/^[a-zA-Z0-9_]+$/.test(userInput)) {
      this.setError("Only letters, numbers, and underscores allowed.");
      return;
    }
    if (passInput.length < 6) {
      this.setError("Passkey must be at least 6 characters.");
      return;
    }

    var dummyEmail = this.formatInternalEmail(userInput);

    try {
      var authResult = await supabaseClient.auth.signUp({
        email: dummyEmail,
        password: passInput
      });

      if (authResult.error) throw authResult.error;

      var profileResult = await supabaseClient
        .from("profiles")
        .insert([
          {
            id: authResult.data.user.id,
            username: userInput,
            coins: 500,
            items_recycled: 0,
            net_worth: 500
          }
        ]);

      if (profileResult.error) throw profileResult.error;

      await this.login();
    } catch (err) {
      this.setError(err.message || "Registration failed.");
    }
  },

  login: async function() {
    this.setError("");
    var userInput = document.getElementById("auth-username").value.trim();
    var passInput = document.getElementById("auth-password").value;

    if (!userInput || !passInput) {
      this.setError("Enter ID and Passkey.");
      return;
    }

    var dummyEmail = this.formatInternalEmail(userInput);

    try {
      var authResult = await supabaseClient.auth.signInWithPassword({
        email: dummyEmail,
        password: passInput
      });

      if (authResult.error) throw authResult.error;

      var profileQuery = await supabaseClient
        .from("profiles")
        .select("*")
        .eq("id", authResult.data.user.id)
        .single();

      if (profileQuery.error || !profileQuery.data) throw new Error("Could not load player profile.");

      AppState.user = authResult.data.user;
      AppState.profile = profileQuery.data;

      document.getElementById("view-auth").style.display = "none";
      document.getElementById("app-shell").style.display = "block";

      if (window.AppUI && AppUI.updateHUD) AppUI.updateHUD();
      if (window.AppChest && AppChest.init) AppChest.init();
    } catch (err) {
      this.setError(err.message || "Invalid credentials.");
    }
  },

  logout: async function() {
    await supabaseClient.auth.signOut();
    AppState.user = null;
    AppState.profile = null;
    document.getElementById("app-shell").style.display = "none";
    document.getElementById("view-auth").style.display = "flex";
  }
};
