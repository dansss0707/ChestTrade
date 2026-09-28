// js/auth.js

const AppAuth = {
  togglePasswordVisibility: function() {
    const passInput = document.getElementById("auth-password");
    const peekBtn = document.getElementById("btn-peek-password");
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
    const errEl = document.getElementById("auth-error");
    if (errEl) errEl.innerText = msg || "";
  },

  formatInternalEmail: function(username) {
    const cleanUser = username.trim().toLowerCase().replace(/[^a-z0-9_]/g, "");
    return cleanUser + "@chestsim.internal";
  },

  register: async function() {
    this.setError("");
    const userInput = document.getElementById("auth-username").value.trim();
    const passInput = document.getElementById("auth-password").value;

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

    const dummyEmail = this.formatInternalEmail(userInput);

    try {
      const { data: authData, error: authError } = await supabaseClient.auth.signUp({
        email: dummyEmail,
        password: passInput,
      });

      if (authError) throw authError;

      const { error: profileError } = await supabaseClient
        .from("profiles")
        .insert([
          {
            id: authData.user.id,
            username: userInput,
            coins: 500,
            items_recycled: 0,
            net_worth: 500,
          }
        ]);

      if (profileError) throw profileError;

      await this.login();
    } catch (err) {
      this.setError(err.message || "Registration failed.");
    }
  },

  login: async function() {
    this.setError("");
    const userInput = document.getElementById("auth-username").value.trim();
    const passInput = document.getElementById("auth-password").value;

    if (!userInput || !passInput) {
      this.setError("Enter ID and Passkey.");
      return;
    }

    const dummyEmail = this.formatInternalEmail(userInput);

    try {
      const { data: authData, error: authError } = await supabaseClient.auth.signInWithPassword({
        email: dummyEmail,
        password: passInput,
      });

      if (authError) throw authError;

      const { data: profile, error: profileError } = await supabaseClient
        .from("profiles")
        .select("*")
        .eq("id", authData.user.id)
        .single();

      if (profileError || !profile) throw new Error("Could not load player profile.");

      AppState.user = authData.user;
      AppState.profile = profile;

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
