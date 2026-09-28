// js/ChestMain.js

window.AppChest = {
  crates: [],
  selectedCardIndex: null,
  generatedPicks: [],
  activeCrate: null,

  // Trading State Variables
  selectedTradeUser: null,
  mySelectedTradeItem: null,
  theirSelectedTradeItem: null,

  // Built-in Synthesizer for pack opening sounds (No audio files needed)
  playSound: function(type) {
    try {
      var ctx = new (window.AudioContext || window.webkitAudioContext)();
      var osc = ctx.createOscillator();
      var gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);

      if (type === "card-flip") {
        osc.type = "sine";
        osc.frequency.setValueAtTime(320, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(780, ctx.currentTime + 0.15);
        gain.gain.setValueAtTime(0.25, ctx.currentTime);
        gain.gain.linearRampToValueAtTime(0.01, ctx.currentTime + 0.15);
        osc.start();
        osc.stop(ctx.currentTime + 0.15);
      } else if (type === "legendary") {
        osc.type = "triangle";
        osc.frequency.setValueAtTime(440, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.35);
        gain.gain.setValueAtTime(0.35, ctx.currentTime);
        gain.gain.linearRampToValueAtTime(0.01, ctx.currentTime + 0.35);
        osc.start();
        osc.stop(ctx.currentTime + 0.35);
      }
    } catch (e) {
      // Audio autoplay policy guard
    }
  },

  init: async function() {
    await this.loadCrates();
  },

  loadCrates: async function() {
    var grid = document.getElementById("chest-grid");
    if (!grid) return;
    grid.innerHTML = "<p style='color:#64748b; font-weight:700;'>> ESTABLISHING SECURE UPLINK...</p>";

    try {
      var res = await supabaseClient
        .from("crates")
        .select("*")
        .eq("is_active", true)
        .order("cost", { ascending: true });

      if (res.error) throw res.error;

      this.crates = res.data || [];

      if (this.crates.length === 0) {
        grid.innerHTML = "<p style='color:#64748b; font-weight:700;'>> NO CRATES DETECTED IN SECTOR.</p>";
        return;
      }

      grid.innerHTML = "";

      for (var i = 0; i < this.crates.length; i++) {
        var c = this.crates[i];
        var card = document.createElement("div");
        card.className = "card";

        var imgSrc = (c.icon && c.icon.indexOf(".") !== -1) ? c.icon : "chest.png";

        var imgBox = document.createElement("div");
        imgBox.style.cssText = "display: flex; justify-content: center; align-items: center; width: 100%; min-height: 52px; margin: 8px 0;";

        var img = document.createElement("img");
        img.src = imgSrc;
        img.alt = c.name || "Crate";
        img.style.cssText = "max-width: 44px !important; max-height: 44px !important; width: auto !important; height: auto !important; object-fit: contain !important; image-rendering: pixelated; display: block; margin: 0 auto;";
        img.onerror = function() {
          this.onerror = null;
          this.src = "chest.png";
        };
        imgBox.appendChild(img);

        var title = document.createElement("h3");
        title.style.cssText = "margin: 8px 0 4px 0; font-size: 1rem; font-weight: 800; letter-spacing: 0.5px; text-transform: uppercase;";
        title.innerText = c.name;

        var desc = document.createElement("p");
        desc.style.cssText = "font-size: 0.75rem; color: #94a3b8; margin-bottom: 16px; flex-grow: 1; line-height: 1.4;";
        desc.innerText = c.description || "";

        var btn = document.createElement("button");
        btn.className = "btn btn-primary btn-block";
        btn.innerText = "OPEN [" + c.cost + "G]";
        (function(crateId) {
          btn.onclick = function() {
            AppChest.buyCrate(crateId);
          };
        })(c.id);

        card.appendChild(imgBox);
        card.appendChild(title);
        card.appendChild(desc);
        card.appendChild(btn);

        grid.appendChild(card);
      }
    } catch (err) {
      grid.innerHTML = "<p style='color:#ef4444; font-weight:700;'>Data link corrupted: " + err.message + "</p>";
    }
  },

  buyCrate: async function(crateId) {
    if (!AppState.profile) return;
    var crate = this.crates.find(function(c) { return c.id === crateId; });
    if (!crate) return;

    if (AppState.profile.coins < crate.cost) {
      alert("INSUFFICIENT FUNDS! Need " + crate.cost + "G.");
      return;
    }

    this.activeCrate = crate;

    var res = await supabaseClient
      .from("item_templates")
      .select("*")
      .eq("crate_id", crateId);

    if (res.error || !res.data || res.data.length === 0) {
      alert("Anomaly detected: No artifacts discovered in this crate.");
      return;
    }

    var items = res.data;
    this.generatedPicks = [];
    for (var i = 0; i < 3; i++) {
      var pick = items[Math.floor(Math.random() * items.length)];
      this.generatedPicks.push(pick);
    }

    this.selectedCardIndex = null;
    this.renderOpeningStage();
  },

  renderOpeningStage: function() {
    var modal = document.getElementById("modal-opening");
    var container = document.getElementById("cards-container");
    var title = document.getElementById("opening-chest-name");
    var btnCollect = document.getElementById("btn-collect-loot");
    var rays = document.getElementById("god-rays");

    if (title) title.innerText = "UNBOXING: " + this.activeCrate.name;
    if (btnCollect) btnCollect.style.display = "none";
    if (rays) rays.classList.remove("active");
    if (container) container.innerHTML = "";

    for (var idx = 0; idx < this.generatedPicks.length; idx++) {
      (function(i, item) {
        var cardEl = document.createElement("div");
        cardEl.className = "flip-card";
        cardEl.id = "pick-card-" + i;
        cardEl.onclick = function() {
          AppChest.revealPick(i);
        };

        var rarityKey = (item.rarity || "common").toLowerCase();

        var inner = document.createElement("div");
        inner.className = "flip-card-inner";

        var front = document.createElement("div");
        front.className = "flip-card-front";
        front.innerHTML = '<span class="mystery-icon">❓</span><div class="pixel-tag" style="margin-top: 14px;">CARD 0' + (i + 1) + '</div>';

        var back = document.createElement("div");
        back.className = "flip-card-back rarity-" + rarityKey;

        var iconSpan = document.createElement("span");
        iconSpan.style.cssText = "font-size: 3.2rem; margin-bottom: 8px; filter: drop-shadow(0 4px 12px rgba(0,0,0,0.6));";
        iconSpan.innerText = item.icon || "💎";

        var nameDiv = document.createElement("div");
        nameDiv.style.cssText = "font-size: 0.85rem; font-weight: 800; margin-bottom: 6px; letter-spacing: 0.5px; color: #fff;";
        nameDiv.innerText = item.name;

        var rarityDiv = document.createElement("div");
        rarityDiv.className = "pixel-tag";
        rarityDiv.innerText = (item.rarity || "COMMON").toUpperCase();

        back.appendChild(iconSpan);
        back.appendChild(nameDiv);
        back.appendChild(rarityDiv);

        inner.appendChild(front);
        inner.appendChild(back);
        cardEl.appendChild(inner);
        container.appendChild(cardEl);
      })(idx, this.generatedPicks[idx]);
    }

    if (modal) modal.style.display = "flex";
  },

  revealPick: async function(selectedIndex) {
    if (this.selectedCardIndex !== null) return;
    this.selectedCardIndex = selectedIndex;

    var chosenItem = this.generatedPicks[selectedIndex];
    var pickedCard = document.getElementById("pick-card-" + selectedIndex);
    var modal = document.getElementById("modal-opening");
    var rays = document.getElementById("god-rays");

    var isLegendary = (chosenItem.rarity || "").toLowerCase() === "legendary";
    this.playSound(isLegendary ? "legendary" : "card-flip");

    if (rays) rays.classList.add("active");
    if (modal) {
      modal.classList.remove("shake-impact");
      void modal.offsetWidth;
      modal.classList.add("shake-impact");
    }

    if (pickedCard) pickedCard.classList.add("flipped");

    setTimeout(function() {
      for (var idx = 0; idx < 3; idx++) {
        if (idx !== selectedIndex) {
          var other = document.getElementById("pick-card-" + idx);
          if (other) other.classList.add("flipped", "missed");
        }
      }
    }, 450);

    var rpcRes = await supabaseClient.rpc("claim_card", {
      p_user_id: AppState.user.id,
      p_template_id: chosenItem.id,
      p_cost: this.activeCrate.cost
    });

    if (rpcRes.error) {
      alert("Claim transmission failure: " + rpcRes.error.message);
      return;
    }

    AppState.profile.coins -= this.activeCrate.cost;
    var coinDisplay = document.getElementById("user-coins");
    if (coinDisplay) coinDisplay.innerText = AppState.profile.coins;
    if (window.AppUI && AppUI.updateHUD) AppUI.updateHUD();

    var btnCollect = document.getElementById("btn-collect-loot");
    if (btnCollect) {
      btnCollect.innerText = "COLLECT " + chosenItem.name.toUpperCase() + " (#" + rpcRes.data.serial_number + ")";
      btnCollect.style.display = "block";
    }
  },

  collectAndClose: function() {
    var modal = document.getElementById("modal-opening");
    if (modal) modal.style.display = "none";
    if (window.AppInventory && AppInventory.loadVault) {
      AppInventory.loadVault();
    }
  },

  // ================= INTEGRATED TRADING POST LOGIC =================

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
    var resultsEl = document.getElementById("trade-user-results");
    if (!resultsEl) return;

    if (!query || query.trim().length < 2) {
      resultsEl.innerHTML = "";
      return;
    }

    resultsEl.innerHTML = "<p style='color:#64748b; font-size:0.8rem;'>> LOCATING AGENT...</p>";

    var res = await supabaseClient
      .from("profiles")
      .select("id, username")
      .neq("id", AppState.user.id)
      .ilike("username", "%" + query.trim() + "%")
      .limit(4);

    if (res.error) {
      resultsEl.innerHTML = "<p style='color:#ef4444; font-size:0.8rem;'>Error: " + res.error.message + "</p>";
      return;
    }

    if (!res.data || res.data.length === 0) {
      resultsEl.innerHTML = "<p style='color:#64748b; font-size:0.8rem;'>> NO OPERATIVE FOUND.</p>";
      return;
    }

    resultsEl.innerHTML = "";
    res.data.forEach(function(u) {
      var btn = document.createElement("button");
      btn.className = "btn btn-secondary";
      btn.style.cssText = "width: 100%; margin-top: 4px; text-align: left; padding: 8px 12px; font-size: 0.85rem;";
      btn.innerText = "🎮 " + u.username;
      btn.onclick = function() {
        AppChest.selectTradeTarget(u);
      };
      resultsEl.appendChild(btn);
    });
  },

  selectTradeTarget: async function(user) {
    this.selectedTradeUser = user;
    this.mySelectedTradeItem = null;
    this.theirSelectedTradeItem = null;

    var header = document.getElementById("trade-target-username");
    if (header) header.innerText = "UPLINK ESTABLISHED WITH: " + user.username.toUpperCase();

    var stage = document.getElementById("trade-stage");
    if (stage) stage.style.display = "block";

    await Promise.all([
      this.loadTradeVault("trade-my-items", AppState.user.id, true),
      this.loadTradeVault("trade-their-items", user.id, false)
    ]);
  },

  loadTradeVault: async function(elementId, userId, isSelf) {
    var container = document.getElementById(elementId);
    if (!container) return;
    container.innerHTML = "<p style='font-size:0.75rem; color:#64748b; grid-column: 1/-1;'>Accessing vault...</p>";

    var res = await supabaseClient
      .from("user_inventory")
      .select("id, item_templates (name, rarity, icon)")
      .eq("user_id", userId);

    if (res.error || !res.data || res.data.length === 0) {
      container.innerHTML = "<p style='font-size:0.75rem; color:#64748b; grid-column: 1/-1;'>Vault empty.</p>";
      return;
    }

    container.innerHTML = "";
    res.data.forEach(function(row) {
      var item = row.item_templates;
      var el = document.createElement("div");
      el.className = "trade-slot-card";
      el.innerHTML = "<span style='font-size:1.4rem;'>" + (item.icon || "💎") + "</span><span style='margin-top:4px; font-weight:700; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; width:100%;'>" + item.name + "</span>";

      el.onclick = function() {
        document.querySelectorAll("#" + elementId + " .trade-slot-card").forEach(function(c) {
          c.classList.remove("selected");
        });
        el.classList.add("selected");
        if (isSelf) {
          AppChest.mySelectedTradeItem = row.id;
        } else {
          AppChest.theirSelectedTradeItem = row.id;
        }
      };

      container.appendChild(el);
    });
  },

  sendTradeOffer: async function() {
    if (!this.selectedTradeUser) return alert("Select an operative first.");
    if (!this.mySelectedTradeItem) return alert("Select an item from your vault to offer.");
    if (!this.theirSelectedTradeItem) return alert("Select an item from their vault to request.");

    var res = await supabaseClient
      .from("trades")
      .insert({
        sender_id: AppState.user.id,
        receiver_id: this.selectedTradeUser.id,
        sender_item_id: this.mySelectedTradeItem,
        receiver_item_id: this.theirSelectedTradeItem,
        status: "pending"
      });

    if (res.error) {
      alert("Proposal transmission failed: " + res.error.message);
      return;
    }

    alert("Trade proposal dispatched to " + this.selectedTradeUser.username + "!");
    this.closeTradeModal();
  },

  loadPendingTrades: async function() {
    var inbox = document.getElementById("trade-inbox-list");
    if (!inbox) return;

    var res = await supabaseClient
      .from("trades")
      .select("id, status, sender_id, receiver_id, created_at")
      .or("sender_id.eq." + AppState.user.id + ",receiver_id.eq." + AppState.user.id)
      .eq("status", "pending");

    if (res.error || !res.data || res.data.length === 0) {
      inbox.innerHTML = "<p style='color:#64748b; font-size:0.75rem;'>No pending transmissions.</p>";
      return;
    }

    inbox.innerHTML = "";
    res.data.forEach(function(t) {
      var isIncoming = t.receiver_id === AppState.user.id;
      var card = document.createElement("div");
      card.className = "trade-inbox-card";
      card.innerHTML = "<div><span style='font-size:0.8rem; font-weight:800; color:" + (isIncoming ? "#38bdf8" : "#fbbf24") + ";'>" + (isIncoming ? "INCOMING PROPOSAL" : "OUTGOING PROPOSAL") + "</span></div>";

      var actions = document.createElement("div");
      actions.style.display = "flex";
      actions.style.gap = "8px";

      if (isIncoming) {
        var btnAccept = document.createElement("button");
        btnAccept.className = "btn btn-primary";
        btnAccept.style.padding = "6px 14px";
        btnAccept.innerText = "Accept";
        btnAccept.onclick = function() { AppChest.acceptTrade(t.id); };

        var btnDecline = document.createElement("button");
        btnDecline.className = "btn btn-secondary";
        btnDecline.style.padding = "6px 14px";
        btnDecline.innerText = "Decline";
        btnDecline.onclick = function() { AppChest.updateTradeStatus(t.id, "declined"); };

        actions.appendChild(btnAccept);
        actions.appendChild(btnDecline);
      } else {
        var btnCancel = document.createElement("button");
        btnCancel.className = "btn btn-secondary";
        btnCancel.style.padding = "6px 14px";
        btnCancel.innerText = "Withdraw";
        btnCancel.onclick = function() { AppChest.updateTradeStatus(t.id, "canceled"); };
        actions.appendChild(btnCancel);
      }

      card.appendChild(actions);
      inbox.appendChild(card);
    });
  },

  acceptTrade: async function(tradeId) {
    var res = await supabaseClient.rpc("execute_trade", { p_trade_id: tradeId });
    if (res.error) {
      alert("Exchange failed: " + res.error.message);
      return;
    }

    alert("Exchange confirmed! Items reallocated in your vault.");
    if (window.AppInventory && AppInventory.loadVault) AppInventory.loadVault();
    this.loadPendingTrades();
  },

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
  }
};
