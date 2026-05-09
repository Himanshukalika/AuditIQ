"""
AuditIQ — Configurable Audit Rule Engine
=========================================
Rules yahan define hain. Frontend se threshold aur enable/disable
change kiye ja sakte hain — overrides rules_config.json mein save hote hain.
"""

import json, os

# Override file — yahan CA ke changes save hote hain
_CONFIG_FILE = os.path.join(os.path.dirname(__file__), "rules_config.json")

# ─────────────────────────────────────────────────────────────
#  DEFAULT RULE DEFINITIONS  (highest priority first)
# ─────────────────────────────────────────────────────────────
_DEFAULT_RULES = [

    # ── 1. Sec 40A(3): Cash payment > ₹10,000 ────────────────
    {
        "id":       "sec_40a3",
        "section":  "Sec 40A(3)",
        "name":     "Cash Payment Limit",
        "flag_type": "sec_40a3_risk",
        "severity": "high",
        "conditions": {
            "payment_mode_is": "cash",
            "amount_gt":       10000,
        },
        "message": "Cash payment ₹{amount:,.0f} exceeds ₹10,000 limit — expense disallowance risk",
    },

    # ── 2. Sec 194C: TDS on Contractors / Advertising ─────────
    {
        "id":       "tds_194c",
        "section":  "Sec 194C",
        "name":     "TDS on Contract / Advertising",
        "flag_type": "tds_applicable",
        "severity": "medium",
        "conditions": {
            "voucher_type_in": ["payment", "purchase", "journal"],
            "narration_keywords": [
                "advertising", "advertisement", "advert", "advt",
                "contract", "contractor", "sub-contractor", "subcontractor",
                "printing", "transport", "carriage", "freight",
                "labour", "labor", "work order", "job work",
                "civil work", "construction", "fabrication",
            ],
            "amount_gt": 30000,
        },
        "message": "Contract/advertising payment ₹{amount:,.0f} > ₹30,000 — TDS u/s 194C @ 1%/2% may apply",
    },

    # ── 3. Sec 194J: TDS on Professional / Technical Fees ─────
    {
        "id":       "tds_194j",
        "section":  "Sec 194J",
        "name":     "TDS on Professional / Technical Fees",
        "flag_type": "tds_applicable",
        "severity": "medium",
        "conditions": {
            "voucher_type_in": ["payment", "journal"],
            "narration_keywords": [
                "professional", "consultant", "consulting",
                "legal", "lawyer", "advocate", "solicitor",
                "audit", "auditor", "ca fees", "chartered accountant",
                "technical", "royalty", "director fees", "director remuneration",
                "management fees", "retainer", "software", "it service",
            ],
            "amount_gt": 30000,
        },
        "message": "Professional/technical payment ₹{amount:,.0f} > ₹30,000 — TDS u/s 194J @ 10% may apply",
    },

    # ── 4. Sec 194A: TDS on Interest ──────────────────────────
    {
        "id":       "tds_194a",
        "section":  "Sec 194A",
        "name":     "TDS on Interest",
        "flag_type": "tds_applicable",
        "severity": "medium",
        "conditions": {
            "narration_keywords": [
                "interest", "int paid", "interest paid",
                "loan interest", "interest on loan",
            ],
            "amount_gt": 5000,
        },
        "message": "Interest payment ₹{amount:,.0f} > ₹5,000 — TDS u/s 194A @ 10% may apply",
    },

    # ── 5. Sec 194H: TDS on Commission / Brokerage ────────────
    {
        "id":       "tds_194h",
        "section":  "Sec 194H",
        "name":     "TDS on Commission / Brokerage",
        "flag_type": "tds_applicable",
        "severity": "medium",
        "conditions": {
            "narration_keywords": [
                "commission", "brokerage", "broker",
                "agency charges", "agent fees", "referral",
            ],
            "amount_gt": 15000,
        },
        "message": "Commission/brokerage ₹{amount:,.0f} > ₹15,000 — TDS u/s 194H @ 5% may apply",
    },

    # ── 6. Sec 194I: TDS on Rent ──────────────────────────────
    {
        "id":       "tds_194i",
        "section":  "Sec 194I",
        "name":     "TDS on Rent",
        "flag_type": "tds_applicable",
        "severity": "medium",
        "conditions": {
            "narration_keywords": [
                "rent", "rental", "lease", "office rent",
                "shop rent", "godown rent", "warehouse rent",
            ],
            "amount_gt": 20000,
        },
        "message": "Rent ₹{amount:,.0f}/month — check if annual rent > ₹2,40,000; TDS u/s 194I @ 10% may apply",
    },

    # ── 7. Large Cash Transaction ─────────────────────────────
    {
        "id":       "large_cash",
        "section":  "Internal",
        "name":     "Large Cash Transaction",
        "flag_type": "cash_payment",
        "severity": "low",
        "conditions": {
            "payment_mode_is": "cash",
            "amount_gt":       50000,
        },
        "message": "Large cash transaction ₹{amount:,.0f} — verify supporting documentation",
    },
]


# ─────────────────────────────────────────────────────────────
#  OVERRIDE PERSISTENCE
# ─────────────────────────────────────────────────────────────
def _load_overrides() -> dict:
    try:
        with open(_CONFIG_FILE, "r") as f:
            return json.load(f)
    except Exception:
        return {}


def _save_overrides(overrides: dict):
    with open(_CONFIG_FILE, "w") as f:
        json.dump(overrides, f, indent=2)


# ─────────────────────────────────────────────────────────────
#  PUBLIC API
# ─────────────────────────────────────────────────────────────
def get_rules() -> list[dict]:
    """
    Returns all rules merged with CA overrides.
    Each dict has: id, section, name, flag_type, severity,
                   amount_gt, enabled, keywords, voucher_types
    """
    overrides = _load_overrides()
    result = []
    for r in _DEFAULT_RULES:
        ov = overrides.get(r["id"], {})
        result.append({
            "id":            r["id"],
            "section":       r["section"],
            "name":          r["name"],
            "flag_type":     r["flag_type"],
            "severity":      r["severity"],
            "amount_gt":     ov.get("amount_gt",  r["conditions"].get("amount_gt", 0)),
            "enabled":       ov.get("enabled",    True),
            "keywords":      r["conditions"].get("narration_keywords", []),
            "voucher_types": r["conditions"].get("voucher_type_in", []),
            "payment_mode":  r["conditions"].get("payment_mode_is", ""),
            "message":       r["message"],
        })
    return result


def update_rule(rule_id: str, enabled: bool = None, amount_gt: float = None) -> bool:
    """Update a rule's threshold or enabled state. Persists to JSON."""
    if rule_id not in {r["id"] for r in _DEFAULT_RULES}:
        return False
    overrides = _load_overrides()
    if rule_id not in overrides:
        overrides[rule_id] = {}
    if enabled is not None:
        overrides[rule_id]["enabled"] = enabled
    if amount_gt is not None:
        overrides[rule_id]["amount_gt"] = float(amount_gt)
    _save_overrides(overrides)
    return True


def reset_rule(rule_id: str) -> bool:
    """Reset a rule to its default values."""
    overrides = _load_overrides()
    if rule_id in overrides:
        del overrides[rule_id]
        _save_overrides(overrides)
    return True


# ─────────────────────────────────────────────────────────────
#  ENGINE — apply rules to a single entry
# ─────────────────────────────────────────────────────────────
def apply_rules(
    party_name:   str,
    narration:    str,
    amount:       float,
    voucher_type: str,
    payment_mode: str,
) -> tuple:
    """
    Returns (flag_type, flag_description) for the FIRST matching enabled rule.
    Returns ("none", "") if no rule matches.
    """
    text  = f"{(narration or '').lower()} {(party_name or '').lower()}"
    vtype = (voucher_type or "").lower()
    pmode = (payment_mode or "").lower()
    amt   = abs(float(amount or 0))

    for rule in get_rules():
        if not rule["enabled"]:
            continue

        # Amount threshold (with override)
        if amt <= rule["amount_gt"]:
            continue

        # Payment mode
        if rule["payment_mode"]:
            if pmode != rule["payment_mode"].lower():
                continue

        # Voucher type whitelist
        if rule["voucher_types"]:
            if not any(vt in vtype for vt in rule["voucher_types"]):
                continue

        # Narration / party keywords
        if rule["keywords"]:
            if not any(kw in text for kw in rule["keywords"]):
                continue

        # ✅ All conditions passed
        msg = rule["message"].format(amount=amt)
        return rule["flag_type"], f"[{rule['section']}] {msg}"

    return "none", ""


# Backward-compat alias
def list_rules() -> list[dict]:
    return get_rules()
