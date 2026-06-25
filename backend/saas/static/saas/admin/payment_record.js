(function () {
  "use strict";

  const tenantSelect = document.getElementById("id_tenant");
  const monthsInput = document.getElementById("id_renewal_months");
  const amountInput = document.getElementById("id_amount");
  const panel = document.getElementById("ma7aly-billing-panel");
  const planEl = document.getElementById("ma7aly-billing-plan");
  const monthlyEl = document.getElementById("ma7aly-billing-monthly");
  const currentEndEl = document.getElementById("ma7aly-billing-current-end");
  const newEndEl = document.getElementById("ma7aly-billing-new-end");
  const warningEl = document.getElementById("ma7aly-billing-warning");

  if (!tenantSelect || !monthsInput || !amountInput) {
    return;
  }

  let amountDirty = false;
  amountInput.addEventListener("input", () => {
    amountDirty = true;
  });

  function billingUrl(tenantId) {
    const template = window.MA7ALY_BILLING_URL_TEMPLATE;
    if (!template) {
      return null;
    }
    return template.replace(
      "00000000-0000-0000-0000-000000000000",
      tenantId
    );
  }

  function formatMoney(value) {
    const num = Number.parseFloat(value);
    if (Number.isNaN(num)) {
      return "—";
    }
    return num.toLocaleString("ar-EG", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }) + " ج.م";
  }

  function setWarning(text) {
    if (!warningEl) {
      return;
    }
    if (text) {
      warningEl.textContent = text;
      warningEl.hidden = false;
    } else {
      warningEl.textContent = "";
      warningEl.hidden = true;
    }
  }

  function clearPanel() {
    if (panel) {
      panel.hidden = true;
    }
    setWarning("");
  }

  function updateBilling() {
    const tenantId = tenantSelect.value;
    const months = Math.max(1, parseInt(monthsInput.value, 10) || 1);

    if (!tenantId) {
      clearPanel();
      return;
    }

    const url = billingUrl(tenantId);
    if (!url) {
      return;
    }

    fetch(`${url}?months=${months}`, {
      headers: { "X-Requested-With": "XMLHttpRequest" },
      credentials: "same-origin",
    })
      .then((response) => {
        if (!response.ok) {
          throw new Error("billing fetch failed");
        }
        return response.json();
      })
      .then((data) => {
        if (panel) {
          panel.hidden = false;
        }
        if (planEl) {
          planEl.textContent = data.plan_name || "—";
        }
        if (monthlyEl) {
          monthlyEl.textContent = formatMoney(data.price_monthly);
        }
        if (currentEndEl) {
          currentEndEl.textContent = data.current_ends_at || "لا يوجد اشتراك";
        }
        if (newEndEl) {
          newEndEl.textContent = data.new_ends_at || "—";
        }

        if (!data.has_subscription) {
          setWarning(
            "لا يوجد اشتراك حالي لهذه المنشأة — سجّل الدفعة لكن لن يُمدَّد التاريخ تلقائياً."
          );
        } else {
          setWarning("");
        }

        if (!amountDirty) {
          amountInput.value = data.amount_total;
        }
      })
      .catch(() => {
        setWarning("تعذّر تحميل بيانات الباقة — تحقق من الاتصال.");
      });
  }

  tenantSelect.addEventListener("change", () => {
    amountDirty = false;
    updateBilling();
  });
  monthsInput.addEventListener("input", () => {
    amountDirty = false;
    updateBilling();
  });
  monthsInput.addEventListener("change", updateBilling);

  if (tenantSelect.value) {
    updateBilling();
  }
})();
