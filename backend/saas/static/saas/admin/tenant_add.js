(function () {
  const MAX_SLOTS = 10;

  function branchGroups(index) {
    const nameGroup = document.querySelector(`.form-group.field-branch_${index}_name`);
    const imageGroup = document.querySelector(`.form-group.field-branch_${index}_image`);
    const nameInput = document.getElementById(`id_branch_${index}_name`);
    const imageInput = document.getElementById(`id_branch_${index}_image`);
    return { nameGroup, imageGroup, nameInput, imageInput };
  }

  function getPlanLimits() {
    const planSelect = document.getElementById("id_plan");
    if (!planSelect || !planSelect.value) {
      return { max: 0, name: "" };
    }

    const planId = String(planSelect.value);
    const limits = window.MA7ALY_PLAN_LIMITS?.[planId];
    if (limits) {
      return { max: Number(limits.max) || 0, name: limits.name || "" };
    }

    const selected = planSelect.options[planSelect.selectedIndex];
    const max = parseInt(selected?.dataset?.maxBranches || "0", 10);
    const name = selected?.dataset?.planName || selected?.textContent?.trim() || "";
    return { max: Number.isNaN(max) ? 0 : max, name };
  }

  function ensureHint() {
    let hint = document.getElementById("branch-plan-hint");
    if (hint) return hint;

    const branchesTab =
      document.querySelector(".form-group.field-branch_1_name")?.closest(".tab-pane") ||
      document.querySelector('[id*="tab"][id*="فروع"]') ||
      document.querySelector('[id*="branches"]');

    hint = document.createElement("div");
    hint.id = "branch-plan-hint";
    hint.className = "branch-plan-hint";

    if (branchesTab) {
      const fieldset = branchesTab.querySelector("fieldset") || branchesTab;
      fieldset.insertBefore(hint, fieldset.firstChild);
    } else {
      document.getElementById("tenant_form")?.prepend(hint);
    }
    return hint;
  }

  function updateBranchFields() {
    const { max, name } = getPlanLimits();
    const hint = ensureHint();

    if (max > 0) {
      hint.innerHTML = `<strong>باقة «${name}»</strong> — أدخل <strong>${max}</strong> فرع/فروع (الاسم مطلوب، الصورة اختيارية).`;
      hint.classList.remove("branch-plan-hint--warn");
    } else {
      hint.textContent = "اختر الباقة من تبويب «General» أولاً لعرض حقول الفروع المطلوبة.";
      hint.classList.add("branch-plan-hint--warn");
    }

    for (let i = 1; i <= MAX_SLOTS; i++) {
      const { nameGroup, imageGroup, nameInput, imageInput } = branchGroups(i);
      const visible = max > 0 && i <= max;

      [nameGroup, imageGroup].forEach((el) => {
        if (!el) return;
        el.classList.toggle("ma7aly-branch-visible", visible);
        el.classList.remove("ma7aly-branch-hidden");
      });

      if (nameInput) {
        nameInput.required = visible;
        const label = nameGroup?.querySelector("label");
        if (label) {
          label.innerHTML = visible
            ? `اسم الفرع ${i} <span class="text-danger">*</span>`
            : `اسم الفرع ${i}`;
        }
      }

      if (!visible) {
        if (nameInput) nameInput.value = "";
        if (imageInput) imageInput.value = "";
      }
    }
  }

  function bindPlanSelect() {
    const planSelect = document.getElementById("id_plan");
    if (!planSelect) return;

    planSelect.removeEventListener("change", updateBranchFields);
    planSelect.addEventListener("change", updateBranchFields);

    const $ = window.jQuery || window.django?.jQuery;
    if ($) {
      $(planSelect).off("change.ma7aly select2:select.ma7aly");
      $(planSelect).on("change.ma7aly select2:select.ma7aly", updateBranchFields);
    }

    updateBranchFields();
  }

  function activateTabForElement(el) {
    const pane = el?.closest(".tab-pane");
    if (!pane?.id) return;
    const trigger = document.querySelector(
      `[data-bs-target="#${pane.id}"], [href="#${pane.id}"]`
    );
    if (trigger && window.bootstrap?.Tab) {
      window.bootstrap.Tab.getOrCreateInstance(trigger).show();
    } else if (trigger) {
      trigger.click();
    }
  }

  function revealFieldsWithErrors() {
    const errorGroups = document.querySelectorAll(
      ".form-group.errors, .form-group:has(ul.errorlist li)"
    );
    errorGroups.forEach((group) => {
      group.classList.add("ma7aly-branch-visible");
      group.style.setProperty("display", "block", "important");
      activateTabForElement(group);
    });
  }

  function init() {
    bindPlanSelect();
    revealFieldsWithErrors();
    setTimeout(() => {
      bindPlanSelect();
      revealFieldsWithErrors();
    }, 100);
    setTimeout(() => {
      bindPlanSelect();
      revealFieldsWithErrors();
    }, 500);
  }

  window.ma7alyOnPlanChange = updateBranchFields;

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }

  if (window.jQuery) {
    window.jQuery(init);
  }
})();
