// js/inventory.js

window.AppInventory = {
  items: [],

  // Load all items belonging to the active player
  loadVault: async function() {
    var grid = document.getElementById("inventory-grid");
    if (!grid) return;
    grid.innerHTML = "<p class='subtitle'>> LOADING VAULT...</p>";

    if (!AppState.user) return;

    try {
      var query = await supabaseClient
        .from("user_inventory")
        .select("id, serial_number, created_at, item_templates ( id, name, rarity, base_value, icon )")
        .eq("user_id", AppState.user.id)
        .order("created_at", { ascending: false });

      if (query.error) throw query.error;

      this.items = query.data || [];
      this.renderVault();
    } catch (err) {
      grid.innerHTML = "<p class='status-msg danger'>Failed to load vault items.</p>";
    }
  },

  renderVault: function() {
    var grid = document.getElementById("inventory-grid");
    if (!grid) return;

    if (this.items.length === 0) {
      grid.innerHTML = "<p class='subtitle'>> VAULT EMPTY. GO OPEN SOME CRATES!</p>";
      return;
    }

    grid.innerHTML = "";

    this.items.forEach(function(entry) {
      var template = entry.item_templates;
      if (!template) return;

      var card = document.createElement("div");
      card.className = "card rarity-" + template.rarity;
      card.style.display = "flex";
      card.style.flexDirection = "column";
      card.style.alignItems = "center";
      card.style.textAlign = "center";
      card.style.gap = "8px";
      card.style.position = "relative";

      card.innerHTML =
        '<div style="font-size: 2.6rem; margin: 6px 0;">' + template.icon + '</div>' +
        '<div class="pixel-tag">#' + entry.serial_number + '</div>' +
        '<div style="font-weight: 700; font-size: 0.85rem;">' + template.name + '</div>' +
        '<div style="font-size: 0.65rem; color: var(--text-dim);">' + template.rarity.toUpperCase() + ' • ' + template.base_value + 'G</div>' +
        '<button class="btn btn-secondary btn-sm btn-block" onclick="AppInventory.recycleItem(\'' + entry.id + '\', ' + template.base_value + ')">' +
          'RECYCLE (+' + Math.floor(template.base_value * 0.75) + 'G)' +
        '</button>';

      grid.appendChild(card);
    });
  },

  // Recycle: deletes the card, pays 75% of base value, updates counters
  recycleItem: async function(inventoryId, baseValue) {
    var refund = Math.floor(baseValue * 0.75);

    if (!confirm("Recycle this item into " + refund + "G? This cannot be undone.")) {
      return;
    }

    try {
      // 1. Delete item from user inventory
      var delRes = await supabaseClient
        .from("user_inventory")
        .delete()
        .eq("id", inventoryId);

      if (delRes.error) throw delRes.error;

      // 2. Add refund coins & bump items_recycled counter
      var newCoins = AppState.profile.coins + refund;
      var newRecycledCount = (AppState.profile.items_recycled || 0) + 1;

      var updateRes = await supabaseClient
        .from("profiles")
        .update({
          coins: newCoins,
          items_recycled: newRecycledCount
        })
        .eq("id", AppState.user.id);

      if (updateRes.error) throw updateRes.error;

      AppState.profile.coins = newCoins;
      AppState.profile.items_recycled = newRecycledCount;

      if (window.AppUI && AppUI.updateHUD) AppUI.updateHUD();
      await this.loadVault();
    } catch (err) {
      alert("Recycle failed: " + err.message);
    }
  }
};
