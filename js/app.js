// js/app.js

const AppUI = {
  // Tab Switching
  switchTab(tabId) {
    AppState.activeTab = tabId;
    
    // Update navigation active states
    document.querySelectorAll('.nav-item').forEach(el => el.classList.remove('active'));
    event.target.classList.add('active');

    // Show selected pane
    document.querySelectorAll('.tab-pane').forEach(el => el.classList.remove('active'));
    const targetPane = document.getElementById(`tab-${tabId}`);
    if (targetPane) targetPane.classList.add('active');

    // Trigger tab-specific refresh
    if (tabId === 'inventory' && window.AppInventory) AppInventory.loadVault();
    if (tabId === 'trades' && window.AppTrade) AppTrade.refreshView();
    if (tabId === 'leaderboard' && window.AppLeaderboard) AppLeaderboard.loadRankings();
  },

  // Close the Login Briefing Modal
  closeBriefing() {
    document.getElementById('modal-briefing').style.display = 'none';
  },

  // Update HUD Display
  updateHUD() {
    if (!AppState.profile) return;
    document.getElementById('display-coins').innerText = Number(AppState.profile.coins).toLocaleString();
    document.getElementById('display-username').innerText = `@${AppState.profile.username}`;
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
