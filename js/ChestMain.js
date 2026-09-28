// js/ChestMain.js

window.AppChest = {
  crates: [],
  selectedCardIndex: null,
  generatedPicks: [],
  activeCrate: null,

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

    // 1. Audio and Visual Impact Hit
    var isLegendary = (chosenItem.rarity || "").toLowerCase() === "legendary";
    this.playSound(isLegendary ? "legendary" : "card-flip");

    if (rays) rays.classList.add("active");
    if (modal) {
      modal.classList.remove("shake-impact");
      void modal.offsetWidth; // Trigger reflow for fresh animation
      modal.classList.add("shake-impact");
    }

    // 2. Flip the chosen card
    if (pickedCard) pickedCard.classList.add("flipped");

    // 3. Stagger-reveal remaining missed cards
    setTimeout(function() {
      for (var idx = 0; idx < 3; idx++) {
        if (idx !== selectedIndex) {
          var other = document.getElementById("pick-card-" + idx);
          if (other) other.classList.add("flipped", "missed");
        }
      }
    }, 450);

    // 4. Supabase Transaction
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

    // 5. Present the Claim Button
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
  }
};
