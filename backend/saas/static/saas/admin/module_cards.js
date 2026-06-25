(function () {
  function syncCard(card) {
    const input = card.querySelector(".ma7aly-module-card__input");
    if (!input) return;
    card.classList.toggle("is-selected", input.checked);
  }

  function bindModuleCards() {
    document.querySelectorAll(".ma7aly-module-card").forEach((card) => {
      if (card.dataset.bound === "1") return;
      card.dataset.bound = "1";
      syncCard(card);
      card.addEventListener("click", (e) => {
        const input = card.querySelector(".ma7aly-module-card__input");
        if (!input || e.target === input) return;
        e.preventDefault();
        input.checked = !input.checked;
        syncCard(card);
        input.dispatchEvent(new Event("change", { bubbles: true }));
      });
      const input = card.querySelector(".ma7aly-module-card__input");
      input?.addEventListener("change", () => syncCard(card));
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", bindModuleCards);
  } else {
    bindModuleCards();
  }
})();
