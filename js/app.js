// js/app.js
// js/app.js

const AppUI = {
  updateHUD: function() {
    if (!AppState.profile) return;
    const coinsEl = document.getElementById("display-coins");
    const userEl = document.getElementById("display-username");
    if (coinsEl) coinsEl.innerText = AppState.profile.coins;
    if (userEl) userEl.innerText = "@" + AppState.profile.username;
  },

  switchTab: function(tabName) {
    document.querySelectorAll(".tab-pane").forEach(pane => pane.classList.remove("active"));
    document.querySelectorAll(".nav-item").forEach(item => item.classList.remove("active"));

    const targetPane = document.getElementById("tab-" + tabName);
    if (targetPane) targetPane.classList.add("active");

    AppState.activeTab = tabName;
  },

  closeBriefing: function() {
    const modal = document.getElementById("modal-briefing");
    if (modal) modal.style.display = "none";
  }
};

// "Boss Key" Emergency Disguise (Press Escape to hide the game immediately)
window.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    const shell = document.getElementById('app-shell');
    if (shell.style.display !== 'none') {
      shell.style.opacity = '0.02'; // Instantly makes the UI virtually invisible
      document.title = "Google Docs";
    } else {
      shell.style.opacity = '1';
      document.title = "Document Hub - Unit 4 Study Guide";
    }
  }
});
