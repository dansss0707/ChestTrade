// js/ChestMain.js

window.AppChest = {
  crates: [],
  selectedCardIndex: null,
  generatedPicks: [],
  activeCrate: null,

  selectedTradeUser: null,
  mySelectedTradeItem: null,
  theirSelectedTradeItem: null,

  // Minimal mechanical blip generator
  blip: function(freq, dur) {
    try {
      var ctx = new (window.AudioContext || window.webkitAudioContext)();
      var osc = ctx.createOscillator();
      var gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.type = "square";
      osc.frequency.setValueAtTime(freq, ctx.currentTime);
      gain.gain.setValueAtTime(0.08, ctx.currentTime);
      gain.gain.linearRampToValueAtTime(0.001, ctx.currentTime + dur);
      osc.start();
      osc.stop(ctx.currentTime + dur);
    } catch (e) {}
  },

  init: async function() {
    await this.loadCrates();
  },

  // 1. CRATES CATALOG
  loadCrates: async function() {
    var grid = document.getElementById("chest-grid");
    if (!grid) return;
    grid.innerHTML = "<p style='color:var(--text-muted); font-size:0.8rem;'>> Querying registry...</p>";

    try {
      var res = await supabaseClient
        .from("crates")
        .select("*")
        .eq("is_active", true)
        .order("cost", { ascending: true });

      if (res.error) throw res.error;
      this.crates = res.data || [];

      if (this.crates.length === 0) {
        grid.innerHTML = "<p style='color:var(--text-muted); font-size:0.8rem;'>> No active crates.</p>";
        return;
      }

      grid.innerHTML = "";
      for (var i = 0; i < this.crates.length; i++) {
        var c = this.crates[i];
        var card = document.createElement("div");
        card.className = "crate-card";

        var tag = document.createElement("span");
        tag.className = "crate-tag";
        tag.innerText = "REF // 0" + (i + 1);

        var iconBox = document.createElement("div");
        iconBox.className = "crate-icon-box";

        var imgSrc = (c.icon && c.icon.indexOf(".") !== -1) ? c.icon : "chest.png";
        var img = document.createElement("img");
        img.src = imgSrc;
        img.alt = c.name || "Crate";
        img.onerror = function() { this.onerror = null; this.src = "chest.png"; };
        iconBox.appendChild(img);

        var title = document.createElement("div");
        title.className = "crate-title";
        title.innerText = c.name;

        var desc = document.createElement("div");
        desc.className = "crate-desc";
        desc.innerText = c.description || "Standard issue asset supply.";

        var btn = document.createElement("button");
        btn.className = "btn btn-action btn-block";
        btn.innerText = "EXTRACT [" + c.cost + " CR]";
        (function(crateId) {
          btn.onclick = function() { AppChest.buyCrate(crateId); };
        })(c.id);

        card.appendChild(tag);
        card.appendChild(iconBox);
        card.appendChild(title);
        card.appendChild(desc);
        card.appendChild(btn);

        grid.appendChild(card);
      }
    } catch (err) {
      grid.innerHTML = "<p style='color:#ef4444; font-size:0.8rem;'>Error: " + err.message + "</p>";
    }
  },

  // 2. VAULT STORAGE
  loadVault: async function() {
    var grid = document.getElementById("vault-grid");
    if (!grid) return;
    grid.innerHTML = "<p style='color:var(--text-muted); font-size:0.8rem;'>Reading inventory memory...</p>";

    if (!AppState.user) {
      grid.innerHTML = "<p style='color:var(--text-muted); font-size:0.8rem;'>No operative session detected.</p>";
      return;
    }

    try {
      var res = await supabaseClient
        .from("user_inventory")
        .select("id, item_templates (name, rarity, icon)")
        .eq("user_id", AppState.user.id);

      if (res.error) throw res.error;

      if (!res.data || res.data.length === 0) {
        grid.innerHTML = "<p style='color:var(--text-muted); font-size:0.8rem;'>Vault empty.</p>";
        return;
      }

      grid.innerHTML = "";
      res.data.forEach(function(row) {
        var item = row.item_templates || { name: "Artifact", rarity: "common", icon: "📦" };
        var card = document.createElement("div");
        card.className = "vault-card rarity-" + (item.rarity || "common").toLowerCase();

        var icon = document.createElement("span");
        icon.style.cssText = "font-size: 2rem; margin-bottom: 6px;";
        icon.innerText = item.icon || "📦";

        var name = document.createElement("div");
        name.style.cssText = "font-size: 0.78rem; font-weight: 700; color: #fff;";
        name.innerText = item.name;

        var pill = document.createElement("span");
        pill.className = "rarity-pill";
        pill.innerText = (item.rarity || "COMMON").toUpperCase();

        card.appendChild(icon);
        card.appendChild(name);
        card.appendChild(pill);
        grid.appendChild(card);
      });
    } catch (err) {
      grid.innerHTML = "<p style='color:#ef4444; font-size:0.8rem;'>Vault read failure: " + err.message + "</p>";
    }
  },

  // 3. PACK OPENING (CLEAN ARCADE EXTRACTION)
  buyCrate: async function(crateId) {
    var crate = this.crates.find(function(c) { return c.id === crateId; });
    if (!crate) return;

    if (AppState.profile && AppState.profile.coins < crate.cost) {
      alert("INSUFFICIENT CREDITS. Required: " + crate.cost + " CR");
      return;
    }

    this.activeCrate = crate;

    var res = await supabaseClient
      .from("item_templates")
      .select("*")
      .eq("crate_id", crateId);

    if (res.error || !res.data || res.data.length === 0) {
      alert("No data recovered for this crate.");
      return;
    }

    var items = res.data;
    this.generatedPicks = [];
    for (var i = 0; i < 3; i++) {
      this.generatedPicks.push(items[Math.floor(Math.random() * items.length)]);
    }

    this.selectedCardIndex = null;
    this.renderOpeningStage();
  },

  renderOpeningStage: function() {
    var modal = document.getElementById("modal-opening");
    var container = document.getElementById("cards-container");
    var title = document.getElementById("opening-chest-name");
    var btnCollect = document.getElementById("btn-collect-loot");

    if (title) title.innerText = this.activeCrate.name.toUpperCase();
    if (btnCollect) btnCollect.style.display = "none";
    if (container) container.innerHTML = "";

    this.generatedPicks.forEach(function(item, idx) {
      var card = document.createElement("div");
      card.className = "pick-card";
      card.id = "pick-card-" + idx;
      card.innerHTML = 
        '<span style="font-size: 2rem; color: #475569; margin-bottom: 10px;">[ ? ]</span>' +
        '<div style="font-size: 0.72rem; color: var(--text-muted); font-weight: 700;">SLOT ' + (idx + 1) + '</div>';

      card.onclick = function() { AppChest.revealPick(idx); };
      container.appendChild(card);
    });

    if (modal) modal.style.display = "flex";
  },

  revealPick: async function(selectedIndex) {
    if (this.selectedCardIndex !== null) return;
    this.selectedCardIndex = selectedIndex;

    var chosenItem = this.generatedPicks[selectedIndex];
    var pickedCard = document.getElementById("pick-card-" + selectedIndex);
    var isLegendary = (chosenItem.rarity || "").toLowerCase() === "legendary";

    this.blip(isLegendary ? 580 : 380, 0.2);

    // Reveal picked slot
    if (pickedCard) {
      pickedCard.classList.add("revealed");
      if (isLegendary) pickedCard.classList.add("legendary-hit");
      pickedCard.innerHTML = 
        '<span style="font-size: 2.5rem; margin-bottom: 8px;">' + (chosenItem.icon || "📦") + '</span>' +
        '<div style="font-size: 0.8rem; font-weight: 700; color: #fff; margin-bottom: 4px;">' + chosenItem.name + '</div>' +
        '<div class="rarity-pill rarity-' + (chosenItem.rarity || "common").toLowerCase() + '">' + (chosenItem.rarity || "COMMON").toUpperCase() + '</div>';
    }

    // Reveal remaining unselected slots dimmed
    setTimeout(function() {
      [0, 1, 2].forEach(function(idx) {
        if (idx !== selectedIndex) {
          var other = document.getElementById("pick-card-" + idx);
          var otherItem = AppChest.generatedPicks[idx];
          if (other) {
            other.classList.add("revealed", "missed");
            other.innerHTML = 
              '<span style="font-size: 2rem; margin-bottom: 6px;">' + (otherItem.icon || "📦") + '</span>' +
              '<div style="font-size: 0.75rem; color: var(--text-muted);">' + otherItem.name + '</div>';
          }
        }
      });
    }, 250);

    // Save claim
    await supabaseClient.rpc("claim_card", {
      p_user_id: AppState.user.id,
      p_template_id: chosenItem.id,
      p_cost: this.activeCrate.cost
    });

    if (AppState.profile) {
      AppState.profile.coins -= this.activeCrate.cost;
      if (window.AppUI) AppUI.updateHUD();
    }

    var btnCollect = document.getElementById("btn-collect-loot");
    if (btnCollect) {
      btnCollect.innerText = "STORE " + chosenItem.name.toUpperCase();
      btnCollect.style.display = "block";
    }
  },

  collectAndClose: function() {
    var modal = document.getElementById("modal-opening");
    if (modal) modal.style.display = "none";
    this.loadVault();
  },

  // 4. TRADING PROTOCOL
  openTradeModal: function() {
    var modal = document.getElementById("modal-trading");
    if (modal) modal.style.display = "flex";
    this.loadPendingTrades();
  },

  closeTradeModal: function() {
    var modal = document.getElementById("modal-trading");
    if (modal) modal.style.display = "none";
  },

  searchUsers: async function(query) {
    var results = document.getElementById("trade-user-results");
    if (!results) return;

    if (!query || query.trim().length < 2) {
      results.innerHTML = "";
      return;
    }

    var myId = AppState.user ? AppState.user.id : "00000000-0000-0000-0000-000000000000";
    var res = await supabaseClient
      .from("profiles")
      .select("id, username")
      .neq("id", myId)
      .ilike("username", "%" + query.trim() + "%")
      .limit(4);

    if (res.error || !res.data || res.data.length === 0) {
      results.innerHTML = "<p style='color:var(--text-muted); font-size:0.75rem; padding: 4px 0;'>No matching handles found.</p>";
      return;
    }

    results.innerHTML = "";
    res.data.forEach(function(u) {
      var btn = document.createElement("button");
      btn.className = "btn";
      btn.style.cssText = "width: 100%; text-align: left; margin-top: 4px; font-size: 0.75rem;";
      btn.innerText = "> " + u.username;
      btn.onclick = function() { AppChest.selectTradeTarget(u); };
      results.appendChild(btn);
    });
  },

  selectTradeTarget: async function(user) {
    this.selectedTradeUser = user;
    this.mySelectedTradeItem = null;
    this.theirSelectedTradeItem = null;

    var header = document.getElementById("trade-target-username");
    if (header) header.innerText = "CONNECTED: @" + user.username.toUpperCase();

    var stage = document.getElementById("trade-stage");
    if (stage) stage.style.display = "block";

    var myId = AppState.user ? AppState.user.id : "";
    await Promise.all([
      this.populateTradeShelf("trade-my-items", myId, true),
      this.populateTradeShelf("trade-their-items", user.id, false)
    ]);
  },

  populateTradeShelf: async function(elementId, userId, isSelf) {
    var shelf = document.getElementById(elementId);
    if (!shelf) return;
    shelf.innerHTML = "<p style='font-size:0.7rem; color:var(--text-muted);'>Querying items...</p>";

    var res = await supabaseClient
      .from("user_inventory")
      .select("id, item_templates (name, icon)")
      .eq("user_id", userId);

    if (res.error || !res.data || res.data.length === 0) {
      shelf.innerHTML = "<p style='font-size:0.7rem; color:var(--text-muted);'>None available.</p>";
      return;
    }

    shelf.innerHTML = "";
    res.data.forEach(function(row) {
      var item = row.item_templates;
      var el = document.createElement("div");
      el.className = "trade-shelf-item";
      el.innerHTML = "<span style='font-size:1.2rem;'>" + (item.icon || "📦") + "</span><div style='margin-top:2px; font-weight:700;'>" + item.name + "</div>";

      el.onclick = function() {
        document.querySelectorAll("#" + elementId + " .trade-shelf-item").forEach(c => c.classList.remove("selected"));
        el.classList.add("selected");
        if (isSelf) {
          AppChest.mySelectedTradeItem = row.id;
        } else {
          AppChest.theirSelectedTradeItem = row.id;
        }
      };
      shelf.appendChild(el);
    });
  },

  sendTradeOffer: async function() {
    if (!this.selectedTradeUser) return alert("Select an operative.");
    if (!this.mySelectedTradeItem) return alert("Select an item to give.");
    if (!this.theirSelectedTradeItem) return alert("Select an item to take.");

    var res = await supabaseClient
      .from("trades")
      .insert({
        sender_id: AppState.user ? AppState.user.id : null,
        receiver_id: this.selectedTradeUser.id,
        sender_item_id: this.mySelectedTradeItem,
        receiver_item_id: this.theirSelectedTradeItem,
        status: "pending"
      });

    if (res.error) {
      alert("Failed: " + res.error.message);
      return;
    }

    alert("Proposal logged.");
    this.closeTradeModal();
  },

  loadPendingTrades: async function() {
    var inbox = document.getElementById("trade-inbox-list");
    if (!inbox || !AppState.user) return;

    var res = await supabaseClient
      .from("trades")
      .select("id, status, sender_id, receiver_id")
      .or("sender_id.eq." + AppState.user.id + ",receiver_id.eq." + AppState.user.id)
      .eq("status", "pending");

    if (res.error || !res.data || res.data.length === 0) {
      inbox.innerHTML = "<p style='color:var(--text-muted); font-size:0.72rem; padding: 4px 0;'>No active proposals.</p>";
      return;
    }

    inbox.innerHTML = "";
    res.data.forEach(function(t) {
      var isIncoming = t.receiver_id === AppState.user.id;
      var row = document.createElement("div");
      row.className = "trade-inbox-row";
      row.innerHTML = "<span>" + (isIncoming ? "[INCOMING OFFER]" : "[SENT OFFER]") + "</span>";

      var actions = document.createElement("div");
      if (isIncoming) {
        var btnAcc = document.createElement("button");
        btnAcc.className = "btn btn-action";
        btnAcc.style.padding = "4px 8px";
        btnAcc.innerText = "ACCEPT";
        btnAcc.onclick = function() { AppChest.acceptTrade(t.id); };
        actions.appendChild(btnAcc);
      } else {
        var btnCan = document.createElement("button");
        btnCan.className = "btn";
        btnCan.style.padding = "4px 8px";
        btnCan.innerText = "CANCEL";
        btnCan.onclick = function() { AppChest.updateTradeStatus(t.id, "canceled"); };
        actions.appendChild(btnCan);
      }
      row.appendChild(actions);
      inbox.appendChild(row);
    });
  },

  acceptTrade: async function(tradeId) {
    var res = await supabaseClient.rpc("execute_trade", { p_trade_id: tradeId });
    if (res.error) return alert("Trade error: " + res.error.message);
    alert("Transaction cleared.");
    this.loadPendingTrades();
    this.loadVault();
  },

  updateTradeStatus: async function(tradeId, newStatus) {
    await supabaseClient.from("trades").update({ status: newStatus }).eq("id", tradeId);
    this.loadPendingTrades();
  }
};
