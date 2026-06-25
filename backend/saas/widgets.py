from django import forms
from django.utils.html import format_html
from django.utils.safestring import mark_safe

from saas.module_catalog import TENANT_MODULE_CHOICES

MODULE_ICONS: dict[str, str] = {
    "hr": "fa-users",
    "purchases": "fa-shopping-bag",
    "inventory": "fa-boxes",
    "pos": "fa-cash-register",
    "accounting": "fa-calculator",
}


class ModuleCardWidget(forms.Widget):
    """بطاقات اختيار الموديولات — بدون قوالب خارجية."""

    allow_multiple_selected = True

    def __init__(self, attrs=None, choices=()):
        self.choices = list(choices or TENANT_MODULE_CHOICES)
        super().__init__(attrs)

    def value_from_datadict(self, data, files, name):
        if hasattr(data, "getlist"):
            return data.getlist(name)
        value = data.get(name)
        if value is None:
            return []
        if isinstance(value, (list, tuple)):
            return list(value)
        return [value]

    def format_value(self, value):
        if value is None:
            return []
        if isinstance(value, str):
            return [value]
        return list(value)

    def render(self, name, value, attrs=None, renderer=None):
        value_set = {str(v) for v in self.format_value(value)}
        final_attrs = self.build_attrs(self.attrs, attrs)
        widget_id = final_attrs.get("id", f"id_{name}")

        cards = []
        for index, (opt_val, opt_label) in enumerate(self.choices):
            opt_val = str(opt_val)
            selected = opt_val in value_set
            icon = MODULE_ICONS.get(opt_val, "fa-puzzle-piece")
            cards.append(
                format_html(
                    '<label class="ma7aly-module-card{selected}" data-module="{val}">'
                    '<input type="checkbox" name="{name}" value="{val}" '
                    'class="ma7aly-module-card__input" id="{wid}_{idx}"{checked}>'
                    '<span class="ma7aly-module-card__check" aria-hidden="true">'
                    '<i class="fas fa-check"></i></span>'
                    '<span class="ma7aly-module-card__icon" aria-hidden="true">'
                    '<i class="fas {icon}"></i></span>'
                    '<span class="ma7aly-module-card__label">{label}</span>'
                    "</label>",
                    selected=" is-selected" if selected else "",
                    val=opt_val,
                    name=name,
                    wid=widget_id,
                    idx=index,
                    checked=" checked" if selected else "",
                    icon=icon,
                    label=opt_label,
                )
            )

        inner = mark_safe("".join(str(card) for card in cards))
        return format_html(
            '<div class="ma7aly-module-grid" id="{}">{}</div>',
            widget_id,
            inner,
        )

    class Media:
        css = {"all": ("saas/admin/module_cards.css",)}
        js = ("saas/admin/module_cards.js",)
