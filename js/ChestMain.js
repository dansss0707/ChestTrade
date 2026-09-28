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
    const grid = document.getElementById("chest-grid");
    if (!grid) return;
    grid.innerHTML = '<p class="subtitle">> LOADING CRATE CATALOG...</p>';

    try {
      const res = await supabaseClient
        .from("crates")
        .select("*")
        .eq("is_active", true)
        .order("cost", { ascending: true });

      if (res.error) throw res.error;

      this.crates = res.data || [];

      if (this.crates.length === 0) {
        grid.innerHTML = '<p class="subtitle">> NO CRATES AVAILABLE IN DATABASE.</p>';
        return;
      }

      grid.innerHTML = "";

      this.crates.forEach((c) => {
        const card = document.createElement("div");
        card.className = "card";

        const imgSrc = (c.icon && c.icon.indexOf(".") !== -1) ? c.icon : "chest.png";

        const imgBox = document.createElement("div");
        imgBox.style.cssText = "margin: 6px auto; display: flex; justify-content: center; align-items: center; width: 40px; height: 40px;";

        const img = document.createElement("img");
        img.src = imgSrc;
        img.alt = c.name || "Crate";
        img.width = 40;
        img.height = 40;
        img.style.cssText = "width: 40px !important; height: 40px !important; max-width: 40px !important; max-height: 40px !important; transform: none !important; object-fit: contain; image-rendering: pixelated; display: block; margin: 0 auto;";
        img.addEventListener("error", function() {
          this.src = "chest.png";
        });
        imgBox.appendChild(img);

        const title = document.createElement("h3");
        title.style.cssText = "margin: 6px 0; font-size: 0.95rem; text-transform: uppercase;";
        title.innerText = c.name;

        const desc = document.createElement("p");
        desc.style.cssText = "font-size: 0.75rem; color: #888; margin-bottom: 12px; flex-grow: 1;";
        desc.innerText = c.description || "";

        const btn = document.createElement("button");
        btn.className = "btn btn-primary btn-block";
        btn.innerText = "OPEN [" + c.cost + "G]";
        btn.addEventListener("click", () => {
          AppChest.buyCrate(c.id);
        });

        card.appendChild(imgBox);
        card.appendChild(title);
        card.appendChild(desc);
        card.appendChild(btn);

        grid.appendChild(card);
      });
    } catch (err) {
      grid.innerHTML = '<p class="status-msg danger">Failed to load catalog: ' + err.message + '</p>';
    }
  },

  buyCrate: async function(crateId) {
    if (!AppState.profile) return;
    const crate = this.crates.find((c) => c.id === crateId);
    if (!crate) return;

    if (AppState.profile.coins < crate.cost) {
      alert("INSUFFICIENT COINS! Need " + crate.cost + "G.");
      return;
    }

    this.activeCrate = crate;

    const res = await supabaseClient
      .from("item_templates")
      .select("*")
      .eq("crate_id", crateId);

    if (res.error || !res.data || res.data.length === 0) {
      alert("Error: No items found for this crate.");
      return;
    }

    const items = res.data;
    this.generatedPicks = [];
    for (let i = 0; i < 3; i++) {
      const pick = items[Math.floor(Math.random() * items.length)];
      this.generatedPicks.push(pick);
    }

    this.selectedCardIndex = null;
    this.renderOpeningStage();
  },

  renderOpeningStage: function() {
    const modal = document.getElementById("modal-opening");
    const container = document.getElementById("cards-container");
    const title = document.getElementById("opening-chest-name");
    const btnCollect = document.getElementById("btn-collect-loot");

    if (title) title.innerText = "UNBOXING: " + this.activeCrate.name;
    if (btnCollect) btnCollect.style.display = "none";
    if (container) container.innerHTML = "";

    this.generatedPicks.forEach((item, idx) => {
      const cardEl = document.createElement("div");
      cardEl.className = "flip-card";
      cardEl.id = "pick-card-" + idx;
      cardEl.addEventListener("click", () => {
        AppChest.revealPick(idx);
      });

      cardEl.innerHTML = `
        <div class="flip-card-inner">
          <div class="flip-card-front">
            <span style="font-size: 2.2rem; margin-bottom: 8px;">❓</span>
            <div class="pixel-tag">CARD 0${idx + 1}</div>
          </div>
          <div class="flip-card-back rarity-${item.rarity}">
            <span style="font-size: 2.5rem; margin-bottom: 6px;">${item.icon || "💎"}</span>
            <div style="font-size: 0.75rem; font-weight: 700; margin-bottom: 4px;">${item.name}</div>
            <div class="pixel-tag">${(item.rarity || "").toUpperCase()}</div>
          </div>
        </div>
      `;

      container.appendChild(cardEl);
    });

    if (modal) modal.style.display = "flex";
  },

  revealPick: async function(selectedIndex) {
    if (this.selectedCardIndex !== null) return;
    this.selectedCardIndex = selectedIndex;

    const chosenItem = this.generatedPicks[selectedIndex];
    const pickedCard = document.getElementById("pick-card-" + selectedIndex);
    if (pickedCard) pickedCard.classList.add("flipped");

    setTimeout(() => {
      [0, 1, 2].forEach((idx) => {
        if (idx !== selectedIndex) {
          const other = document.getElementById("pick-card-" + idx);
          if (other) other.classList.add("flipped", "missed");
        }
      });
    }, 300);

    const rpcRes = await supabaseClient.rpc("claim_card", {
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

    const btnCollect = document.getElementById("btn-collect-loot");
    if (btnCollect) {
      btnCollect.innerText = "CLAIM " + chosenItem.name + " (#" + rpcRes.data.serial_number + ")";
      btnCollect.style.display = "block";
    }
  },

  collectAndClose: function() {
    const modal = document.getElementById("modal-opening");
    if (modal) modal.style.display = "none";
    if (window.AppInventory && AppInventory.loadVault) {
      AppInventory.loadVault();
    }
  }
};
