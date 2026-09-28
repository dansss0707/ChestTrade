// js/TradeMain.js

window.AppTrade = {
  selectedUser: null,
  mySelectedItem: null,
  theirSelectedItem: null,

  // 1. Search for a player by username
  searchUsers: async function(query) {
    var resultsEl = document.getElementById("trade-user-results");
    if (!resultsEl) return;
    
    if (!query || query.trim().length < 2) {
      resultsEl.innerHTML = "";
      return;
    }

    resultsEl.innerHTML = "<p class='subtitle'>> SEARCHING PLAYERS...</p>";

    var res = await supabaseClient
      .from("profiles")
      .select("id, username")
      .neq("id", AppState.user.id)
      .ilike("username", "%" + query.trim() + "%")
      .limit(5);

    if (res.error) {
      resultsEl.innerHTML = "<p class='status-msg danger'>Error searching: " + res.error.message + "</p>";
      return;
    }

    if (!res.data || res.data.length === 0) {
      resultsEl.innerHTML = "<p class='subtitle'>> NO USERS FOUND.</p>";
      return;
    }

    resultsEl.innerHTML = "";
    res.data.forEach(function(u) {
      var btn = document.createElement("button");
      btn.className = "btn btn-secondary btn-block";
      btn.style.cssText = "margin-bottom: 6px; text-align: left;";
      btn.innerText = "🎮 " + u.username;
      btn.onclick = function() {
        AppTrade.selectTargetUser(u);
      };
      resultsEl.appendChild(btn);
    });
  },

  // 2. Select the target user and load their inventory
  selectTargetUser: async function(user) {
    this.selectedUser = user;
    this.theirSelectedItem = null;
    this.mySelectedItem = null;

    var header = document.getElementById("trade-target-username");
    if (header) header.innerText = "TRADING WITH: " + user.username;

    var stage = document.getElementById("trade-stage");
    if (stage) stage.style.display = "block";

    await Promise.all([this.loadMyItems(), this.loadTheirItems(user.id)]);
  },

  // 3. Load logged-in user's inventory for trade
  loadMyItems: async function() {
    var container = document.getElementById("trade-my-items");
    if (!container) return;
    container.innerHTML = "Loading your vault...";

    var res = await supabaseClient
      .from("user_inventory")
      .select("id, item_templates (name, rarity, icon)")
      .eq("user_id", AppState.user.id);

    if (res.error || !res.data || res.data.length === 0) {
      container.innerHTML = "<p class='subtitle'>No items in your vault.</p>";
      return;
    }

    container.innerHTML = "";
    res.data.forEach(function(row) {
      var item = row.item_templates;
      var el = document.createElement("div");
      el.className = "trade-slot-card";
      el.innerText = (item.icon || "💎") + " " + item.name;
      el.onclick = function() {
        document.querySelectorAll("#trade-my-items .trade-slot-card").forEach(c => c.classList.remove("selected"));
        el.classList.add("selected");
        AppTrade.mySelectedItem = row.id;
      };
      container.appendChild(el);
    });
  },

  // 4. Load the other user's inventory
  loadTheirItems: async function(targetUserId) {
    var container = document.getElementById("trade-their-items");
    if (!container) return;
    container.innerHTML = "Loading their vault...";

    var res = await supabaseClient
      .from("user_inventory")
      .select("id, item_templates (name, rarity, icon)")
      .eq("user_id", targetUserId);

    if (res.error || !res.data || res.data.length === 0) {
      container.innerHTML = "<p class='subtitle'>User has no items.</p>";
      return;
    }

    container.innerHTML = "";
    res.data.forEach(function(row) {
      var item = row.item_templates;
      var el = document.createElement("div");
      el.className = "trade-slot-card";
      el.innerText = (item.icon || "💎") + " " + item.name;
      el.onclick = function() {
        document.querySelectorAll("#trade-their-items .trade-slot-card").forEach(c => c.classList.remove("selected"));
        el.classList.add("selected");
        AppTrade.theirSelectedItem = row.id;
      };
      container.appendChild(el);
    });
  },

  // 5. Send Offer
  sendOffer: async function() {
    if (!this.selectedUser) return alert("Select a player first.");
    if (!this.mySelectedItem) return alert("Choose an item from your vault to give.");
    if (!this.theirSelectedItem) return alert("Choose an item from their vault to receive.");

    var res = await supabaseClient
      .from("trades")
      .insert({
        sender_id: AppState.user.id,
        receiver_id: this.selectedUser.id,
        sender_item_id: this.mySelectedItem,
        receiver_item_id: this.theirSelectedItem,
        status: "pending"
      });

    if (res.error) {
      alert("Trade offer failed: " + res.error.message);
      return;
    }

    alert("Trade proposal sent to " + this.selectedUser.username + "!");
    this.closeModal();
  },

  // 6. Accept Incoming Trade (Calls the atomic SQL function)
  acceptTrade: async function(tradeId) {
    var res = await supabaseClient.rpc("execute_trade", { p_trade_id: tradeId });
    if (res.error) {
      alert("Failed to complete trade: " + res.error.message);
      return;
    }

    alert("Trade completed successfully!");
    if (window.AppInventory && AppInventory.loadVault) AppInventory.loadVault();
    this.loadPendingTrades();
  },

  // 7. Decline or Cancel Trade
  updateTradeStatus: async function(tradeId, newStatus) {
    var res = await supabaseClient
      .from("trades")
      .update({ status: newStatus })
      .eq("id", tradeId);

    if (res.error) {
      alert("Error: " + res.error.message);
      return;
    }

    this.loadPendingTrades();
  },

  // 8. Load Active/Pending Trades Inbox
  loadPendingTrades: async function() {
    var inbox = document.getElementById("trade-inbox-list");
    if (!inbox) return;

    var res = await supabaseClient
      .from("trades")
      .select("id, status, sender_id, receiver_id, created_at")
      .or("sender_id.eq." + AppState.user.id + ",receiver_id.eq." + AppState.user.id)
      .eq("status", "pending");

    if (res.error || !res.data || res.data.length === 0) {
      inbox.innerHTML = "<p class='subtitle'>No active trade proposals.</p>";
      return;
    }

    inbox.innerHTML = "";
    res.data.forEach(function(t) {
      var isIncoming = t.receiver_id === AppState.user.id;
      var card = document.createElement("div");
      card.className = "trade-inbox-card";
      card.innerHTML = "<p><strong>" + (isIncoming ? "Incoming Offer" : "Sent Offer") + "</strong></p>";

      var actions = document.createElement("div");
      actions.style.marginTop = "8px";

      if (isIncoming) {
        var btnAccept = document.createElement("button");
        btnAccept.className = "btn btn-primary";
        btnAccept.innerText = "Accept";
        btnAccept.onclick = function() { AppTrade.acceptTrade(t.id); };

        var btnDecline = document.createElement("button");
        btnDecline.className = "btn btn-secondary";
        btnDecline.style.marginLeft = "8px";
        btnDecline.innerText = "Decline";
        btnDecline.onclick = function() { AppTrade.updateTradeStatus(t.id, "declined"); };

        actions.appendChild(btnAccept);
        actions.appendChild(btnDecline);
      } else {
        var btnCancel = document.createElement("button");
        btnCancel.className = "btn btn-secondary";
        btnCancel.innerText = "Cancel Offer";
        btnCancel.onclick = function() { AppTrade.updateTradeStatus(t.id, "canceled"); };
        actions.appendChild(btnCancel);
      }

      card.appendChild(actions);
      inbox.appendChild(card);
    });
  },

  openModal: function() {
    var modal = document.getElementById("modal-trading");
    if (modal) modal.style.display = "flex";
    this.loadPendingTrades();
  },

  closeModal: function() {
    var modal = document.getElementById("modal-trading");
    if (modal) modal.style.display = "none";
  }
};
