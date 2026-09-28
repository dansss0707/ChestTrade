// js/app.js

window.AppUI = {
  updateHUD: function() {
    if (!AppState.profile) return;

    var coinsEl = document.getElementById("display-coins");
    var userEl = document.getElementById("display-username");
    if (coinsEl) coinsEl.innerText = AppState.profile.coins;
    if (userEl) userEl.innerText = "@" + AppState.profile.username;

    // Show DEV TOOLS button if user has admin privileges
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

    var activeBtn = Array.from(document.querySelectorAll(".nav-item")).find(function(btn) {
      return btn.getAttribute("onclick") && btn.getAttribute("onclick").includes("'" + tabName + "'");
    });
    if (activeBtn) activeBtn.classList.add("active");

    AppState.activeTab = tabName;

    // Load active tab data
    if (tabName === "chests" && window.AppChest && AppChest.init) {
      AppChest.init();
    } else if (tabName === "inventory" && window.AppInventory && AppInventory.loadVault) {
      AppInventory.loadVault();
    } else if (tabName === "admin" && window.AppAdmin && AppAdmin.init) {
      AppAdmin.init();
    } else if (tabName === "trades" && window.AppTrade && AppTrade.init) {
      AppTrade.init();
    } else if (tabName === "leaderboard" && window.AppLeaderboard && AppLeaderboard.load) {
      AppLeaderboard.load();
    }
  },

  closeBriefing: function() {
    var modal = document.getElementById("modal-briefing");
    if (modal) modal.style.display = "none";
  }
};
