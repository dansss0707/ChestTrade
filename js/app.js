// js/app.js

window.AppUI = {
  updateHUD: function() {
    if (!AppState.profile) return;
    var coinsEl = document.getElementById("display-coins");
    var userEl = document.getElementById("display-username");
    if (coinsEl) coinsEl.innerText = AppState.profile.coins;
    if (userEl) userEl.innerText = "@" + AppState.profile.username;
  },

  switchTab: function(tabName) {
    document.querySelectorAll(".tab-pane").forEach(function(pane) {
      pane.classList.remove("active");
    });
    document.querySelectorAll(".nav-item").forEach(function(item) {
      item.classList.remove("active");
    });

    var targetPane = document.getElementById("tab-" + tabName);
    if (targetPane) targetPane.classList.add("active");

    AppState.activeTab = tabName;

    // Load data specific to tab
    if (tabName === "chests" && window.AppChest && AppChest.init) {
      AppChest.init();
    } else if (tabName === "inventory" && window.AppInventory && AppInventory.loadVault) {
      AppInventory.loadVault();
    } else if (tabName === "leaderboard" && window.AppLeaderboard && AppLeaderboard.load) {
      AppLeaderboard.load();
    }
  },

  closeBriefing: function() {
    var modal = document.getElementById("modal-briefing");
    if (modal) modal.style.display = "none";
  }
};
