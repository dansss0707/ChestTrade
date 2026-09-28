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
  },

  populateCrateDropdown: async function() {
    var select = document.getElementById("admin-item-crate-select");
    if (!select) return;

    var res = await supabaseClient
      .from("crates")
      .select("id, name, icon")
      .order("created_at", { ascending: true });

    if (res.error || !res.data) return;

    select.innerHTML = '<option value="">-- Choose Target Crate --</option>';
    res.data.forEach(function(c) {
      var opt = document.createElement("option");
      opt.value = c.id;
      opt.innerText = (c.icon || "📦") + " " + c.name;
      select.appendChild(opt);
    });
  },

  createCrate: async function() {
    var name = document.getElementById("admin-crate-name").value.trim();
    var cost = parseInt(document.getElementById("admin-crate-cost").value, 10);
    var icon = document.getElementById("admin-crate-icon").value.trim() || "📦";
    var desc = document.getElementById("admin-crate-desc").value.trim();

    if (!name || isNaN(cost) || cost < 0) {
      this.setStatus("Please provide a valid Crate Name and Cost.", true);
      return;
    }

    try {
      var res = await supabaseClient
        .from("crates")
        .insert([{
          name: name,
          cost: cost,
          icon: icon,
          description: desc,
          is_active: true
        }]);

      if (res.error) throw res.error;

      this.setStatus("✅ Successfully created crate: " + name, false);

      document.getElementById("admin-crate-name").value = "";
      document.getElementById("admin-crate-cost").value = "";
      document.getElementById("admin-crate-icon").value = "";
      document.getElementById("admin-crate-desc").value = "";

      await this.populateCrateDropdown();
      if (window.AppChest && AppChest.loadCrates) {
        AppChest.loadCrates();
      }
    } catch (err) {
      this.setStatus("Error saving crate: " + err.message, true);
    }
  },

  createItem: async function() {
    var crateId = document.getElementById("admin-item-crate-select").value;
    var name = document.getElementById("admin-item-name").value.trim();
    var icon = document.getElementById("admin-item-icon").value.trim() || "💎";
    var rarity = document.getElementById("admin-item-rarity").value;
    var value = parseInt(document.getElementById("admin-item-value").value, 10);

    if (!crateId) {
      this.setStatus("Please select a target crate for this item.", true);
      return;
    }
    if (!name || isNaN(value) || value < 0) {
      this.setStatus("Please provide a valid item name and gold value.", true);
      return;
    }

    try {
      var res = await supabaseClient
        .from("item_templates")
        .insert([{
          crate_id: crateId,
          name: name,
          icon: icon,
          rarity: rarity,
          base_value: value
        }]);

      if (res.error) throw res.error;

      this.setStatus("✅ Created item: " + icon + " " + name + " (" + rarity.toUpperCase() + ")", false);

      document.getElementById("admin-item-name").value = "";
      document.getElementById("admin-item-icon").value = "";
      document.getElementById("admin-item-value").value = "";
    } catch (err) {
      this.setStatus("Error creating item: " + err.message, true);
    }
  }
};
