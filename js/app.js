// js/app.js

window.AppUI = {
  updateHUD: function() {
    if (!AppState.profile) return;
    
    var coinsEl = document.getElementById("display-coins");
    var userEl = document.getElementById("display-username");
    if (coinsEl) coinsEl.innerText = AppState.profile.coins;
    if (userEl) userEl.innerText = "@" + AppState.profile.username;

    // Show button ONLY if is_admin is true in Supabase profile
    var adminBtn = document.getElementById("nav-admin-btn");
    if (adminBtn) {
      if (AppState.profile.is_admin === true) {
        adminBtn.style.display = "inline-block";
      } else {
        adminBtn.style.display = "none";
      }
    }
  },

  switchTab: function(tabName) {
    if (tabName === "admin" && (!AppState.profile || !AppState.profile.is_admin)) {
      alert("Access Denied: Admin privileges required.");
      return;
    }

    document.querySelectorAll(".tab-pane").forEach(function(pane) {
      pane.classList.remove("active");
    });
    document.querySelectorAll(".nav-item").forEach(function(item) {
      item.classList.remove("active");
    });

    var targetPane = document.getElementById("tab-" + tabName);
    if (targetPane) targetPane.classList.add("active");

    AppState.activeTab = tabName;

    if (tabName === "chests" && window.AppChest && AppChest.init) {
      AppChest.init();
    } else if (tabName === "inventory" && window.AppInventory && AppInventory.loadVault) {
      AppInventory.loadVault();
    } else if (tabName === "admin" && window.AppAdmin && AppAdmin.init) {
      AppAdmin.init();
    }
  },

  closeBriefing: function() {
    var modal = document.getElementById("modal-briefing");
    if (modal) modal.style.display = "none";
  }
};
