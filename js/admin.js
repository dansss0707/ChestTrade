// js/admin.js

window.AppAdmin = {
  init: async function() {
    await this.populateCrateDropdown();
  },

  setStatus: function(msg, isError) {
    var el = document.getElementById("admin-feedback");
    if (!el) return;
    el.style.color = isError ? "#ef4444" : "#22c55e";
    el.innerText = msg;
    console.log("[AppAdmin]", msg);
  },

  populateCrateDropdown: async function() {
    var select = document.getElementById("admin-item-crate-select");
    if (!select) return;

    var res = await supabaseClient
      .from("crates")
      .select("id, name, icon")
      .order("cost", { ascending: true });

    if (res.error || !res.data) {
      console.error("[AppAdmin] Error populating crates:", res.error);
      return;
    }

    select.innerHTML = '<option value="">-- Choose Target Crate --</option>';
    res.data.forEach(function(c) {
      var opt = document.createElement("option");
      opt.value = c.id;
      opt.innerText = (c.icon || "📦") + " " + c.name;
      select.appendChild(opt);
    });
  },

  createCrate: async function() {
    var nameInput = document.getElementById("admin-crate-name");
    var costInput = document.getElementById("admin-crate-cost");
    var iconInput = document.getElementById("admin-crate-icon");
    var descInput = document.getElementById("admin-crate-desc");

    var name = nameInput ? nameInput.value.trim() : "";
    var cost = costInput ? parseInt(costInput.value, 10) : NaN;
    var icon = (iconInput && iconInput.value.trim()) ? iconInput.value.trim() : "📦";
    var desc = descInput ? descInput.value.trim() : "";

    if (!name) {
      this.setStatus("Please enter a Crate Name.", true);
      return;
    }
    if (isNaN(cost) || cost < 0) {
      this.setStatus("Please enter a valid Gold Cost.", true);
      return;
    }

    // Explicitly generate a unique text ID so it can never be null
    var uniqueSuffix = Math.random().toString(36).substring(2, 8);
    var crateId = "crate_" + name.toLowerCase().replace(/[^a-z0-9]/g, "_") + "_" + uniqueSuffix;

    this.setStatus("Registering crate...", false);

    try {
      var res = await supabaseClient
        .from("crates")
        .insert([
          {
            id: crateId,
            name: name,
            cost: cost,
            icon: icon,
            description: desc,
            is_active: true
          }
        ]);

      if (res.error) throw res.error;

      this.setStatus("✅ Successfully created crate: " + name, false);

      nameInput.value = "";
      costInput.value = "";
      iconInput.value = "";
      descInput.value = "";

      await this.populateCrateDropdown();

      if (window.AppChest && AppChest.loadCrates) {
        AppChest.loadCrates();
      }
    } catch (err) {
      console.error("[AppAdmin] Error creating crate:", err);
      this.setStatus("Failed to create crate: " + (err.message || JSON.stringify(err)), true);
    }
  },

  createItem: async function() {
    var selectEl = document.getElementById("admin-item-crate-select");
    var nameEl = document.getElementById("admin-item-name");
    var iconEl = document.getElementById("admin-item-icon");
    var rarityEl = document.getElementById("admin-item-rarity");
    var valueEl = document.getElementById("admin-item-value");

    var crateId = selectEl ? selectEl.value : "";
    var name = nameEl ? nameEl.value.trim() : "";
    var icon = (iconEl && iconEl.value.trim()) ? iconEl.value.trim() : "💎";
    var rarity = rarityEl ? rarityEl.value : "common";
    var value = valueEl ? parseInt(valueEl.value, 10) : NaN;

    if (!crateId) {
      this.setStatus("Please select a target crate.", true);
      return;
    }
    if (!name) {
      this.setStatus("Please enter an Item Name.", true);
      return;
    }
    if (isNaN(value) || value < 0) {
      this.setStatus("Please enter a valid Base Value.", true);
      return;
    }

    // Explicitly generate a unique text ID so it can never be null
    var uniqueSuffix = Math.random().toString(36).substring(2, 8);
    var itemId = "item_" + name.toLowerCase().replace(/[^a-z0-9]/g, "_") + "_" + uniqueSuffix;

    this.setStatus("Minting item...", false);

    try {
      var res = await supabaseClient
        .from("item_templates")
        .insert([
          {
            id: itemId,
            crate_id: crateId,
            name: name,
            icon: icon,
            rarity: rarity,
            base_value: value,
            total_minted: 0
          }
        ]);

      if (res.error) throw res.error;

      this.setStatus("✅ Created item: " + icon + " " + name + " (" + rarity.toUpperCase() + ")", false);

      nameEl.value = "";
      iconEl.value = "";
      valueEl.value = "";
    } catch (err) {
      console.error("[AppAdmin] Error creating item:", err);
      this.setStatus("Failed to create item: " + (err.message || JSON.stringify(err)), true);
    }
  }
};
