(function () {
  "use strict";

  function repositionCalendar(num) {
    const cal = document.getElementById(
      DateTimeShortcuts.calendarDivName1 + num
    );
    const link = document.getElementById(
      DateTimeShortcuts.calendarLinkName + num
    );
    if (!cal || !link) {
      return;
    }

    cal.style.position = "fixed";
    cal.style.zIndex = "10050";

    const margin = 12;
    const linkRect = link.getBoundingClientRect();
    const calWidth = cal.offsetWidth;
    const calHeight = cal.offsetHeight;

    let left = linkRect.left;
    if (document.documentElement.dir === "rtl") {
      left = linkRect.right - calWidth;
    }
    if (left + calWidth > window.innerWidth - margin) {
      left = window.innerWidth - calWidth - margin;
    }
    if (left < margin) {
      left = margin;
    }

    let top = linkRect.bottom + 6;
    if (top + calHeight > window.innerHeight - margin) {
      top = linkRect.top - calHeight - 6;
    }
    if (top < margin) {
      top = margin;
    }

    cal.style.left = left + "px";
    cal.style.top = top + "px";
    cal.style.right = "auto";
  }

  function patchCalendar() {
    if (typeof DateTimeShortcuts === "undefined") {
      return false;
    }
    if (DateTimeShortcuts._ma7alyCalendarPatched) {
      return true;
    }

    const originalOpen = DateTimeShortcuts.openCalendar;
    DateTimeShortcuts.openCalendar = function (num) {
      originalOpen.call(DateTimeShortcuts, num);
      repositionCalendar(num);
    };
    DateTimeShortcuts._ma7alyCalendarPatched = true;
    return true;
  }

  function tryPatch() {
    if (!patchCalendar()) {
      window.setTimeout(tryPatch, 50);
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", tryPatch);
  } else {
    tryPatch();
  }
})();
