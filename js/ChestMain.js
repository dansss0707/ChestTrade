// js/ChestMain.js

window.AppChest = {
  crates: [],
  selectedCardIndex: null,
  generatedPicks: [],
  activeCrate: null,

  init: async function() {
    await this.loadCrates();
  },

  loadCrates: async function() {
    var grid = document.getElementById("chest-grid");
    if (!grid) return;
    grid.innerHTML = "<p class='subtitle'>> LOADING CRATE CATALOG...</p>";

    try {
      var res = await supabaseClient
        .from("crates")
        .select("*")
        .eq("is_active", true)
        .order("cost", { ascending: true });

      if (res.error) throw res.error;

      this.crates = res.data || [];

      if (this.crates.length === 0) {
        grid.innerHTML = "<p class='subtitle'>> NO CRATES AVAILABLE IN DATABASE.</p>";
        return;
      }

      grid.innerHTML = "";

      this.crates.forEach(function(c) {
        var card = document.createElement("div");
        card.className = "card";

        var imgSrc = (c.icon && c.icon.includes(".")) ? c.icon : "chest.png";

        card.innerHTML =
          '<div style="margin: 6px auto; display: flex; justify-content: center; align-items: center; width: 40px; height: 40px; overflow: hidden;">' +
            '<img src="' + imgSrc + '" alt="' + c.name + '" width="40" height="40" style="width: 40px !important; height: 40px !important; min-width: 40px !important; min-height: 40px !important; max-width: 40px !important; max-height: 40px !important; transform: none !important; object-fit: contain; image-rendering: pixelated; display: block; margin: 0 auto;" onerror="this.onerror=null; this.src=\'chest.png\';">' +
          '</div>' +
          '<h3 style="margin: 6px 0; font-size: 0.95rem; text-transform: uppercase;">' + c.name + '</h3>' +
          '<p style="font-size: 0.75rem; color: #888; margin-bottom: 12px; flex-grow: 1;">' + (c.description || "") + '</p>' +
          '<button class="btn btn-primary btn-block" onclick="AppChest.buyCrate(\'' + c.id + '\')">' +
            'OPEN [' + c.cost + 'G]' +
          '</button>';

        grid.appendChild(card);
      });
    } catch (err) {
      grid.innerHTML = "<p class='status-msg danger'>Failed to load catalog: " + err.message + "</p>";
    }
  },

  buyCrate: async function(crateId) {
    if (!AppState.profile) return;
    var crate = this.crates.find(function(c) { return c.id === crateId; });
    if (!crate) return;

    if (AppState.profile.coins < crate.cost) {
      alert("INSUFFICIENT COINS! Need " + crate.cost + "G.");
      return;
    }

    this.activeCrate = crate;

    var res = await supabaseClient
      .from("item_templates")
      .select("*")
      .eq("crate_id", crateId);

    if (res.error || !res.data || res.data.length === 0) {
      alert("Error: No items found for this crate.");
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

    if (title) title.innerText = "UNBOXING: " + this.activeCrate.name;
    if (btnCollect) btnCollect.style.display = "none";
    if (container) container.innerHTML = "";

    this.generatedPicks.forEach(function(item, idx) {
      var cardEl = document.createElement("div");
      cardEl.className = "flip-card";
      cardEl.id = "pick-card-" + idx;
      cardEl.onclick = function() { AppChest.revealPick(idx); };

      cardEl.innerHTML =
        '<div class="flip-card-inner">' +
          '<div class="flip-card-front">' +
            '<span style="font-size: 2.2rem; margin-bottom: 8px;">❓</span>' +
            '<div class="pixel-tag">CARD 0' + (idx + 1) + '</div>' +
          '</div>' +
          '<div class="flip-card-back rarity-' + item.rarity + '">' +
            '<span style="font-size: 2.5rem; margin-bottom: 6px;">' + (item.icon || "💎") + '</span>' +
            '<div style="font-size: 0.75rem; font-weight: 700; margin-bottom: 4px;">' + item.name + '</div>' +
            '<div class="pixel-tag">' + item.rarity.toUpperCase() + '</div>' +
          '</div>' +
        '</div>';

      container.appendChild(cardEl);
    });

    if (modal) modal.style.display = "flex";
  },

  revealPick: async function(selectedIndex) {
    if (this.selectedCardIndex !== null) return;
    this.selectedCardIndex = selectedIndex;

    var chosenItem = this.generatedPicks[selectedIndex];
    var pickedCard = document.getElementById("pick-card-" + selectedIndex);
    if (pickedCard) pickedCard.classList.add("flipped");

    setTimeout(function() {
      [0, 1, 2].forEach(function(idx) {
        if (idx !== selectedIndex) {
          var other = document.getElementById("pick-card-" + idx);
          if (other) other.classList.add("flipped", "missed");
        }
      });
    }, 300);

    var rpcRes = await supabaseClient.rpc("claim_card", {
      p_user_id: AppState.user.id,
      p_template_id: chosenItem.id,
      p_cost: this.activeCrate.cost
    });

    if (rpcRes.error) {
      alert("Claim failed: " + rpcRes.error.message);
      return;
    }

    AppState.profile.coins -= this.activeCrate.cost;
    if (window.AppUI && AppUI.updateHUD) AppUI.updateHUD();

    var btnCollect = document.getElementById("btn-collect-loot");
    if (btnCollect) {
      btnCollect.innerText = "CLAIM " + chosenItem.name + " (#" + rpcRes.data.serial_number + ")";
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
