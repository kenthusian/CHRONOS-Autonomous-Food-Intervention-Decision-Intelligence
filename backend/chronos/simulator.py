from models import DecisionRequest


ACTION_PROFILES = {
    "Monitor": {
        "waste_reduction": 0.05,
        "value_recovery": 0.95,
        "cost": 0.05,
        "risk": "low",
    },
    "Promote": {
        "waste_reduction": 0.40,
        "value_recovery": 0.75,
        "cost": 0.15,
        "risk": "low",
    },
    "Accelerated Clearance": {
        "waste_reduction": 0.65,
        "value_recovery": 0.55,
        "cost": 0.25,
        "risk": "medium",
    },
    "Transform": {
        "waste_reduction": 0.75,
        "value_recovery": 0.65,
        "cost": 0.40,
        "risk": "medium",
    },
    "Redistribute": {
        "waste_reduction": 0.90,
        "value_recovery": 0.30,
        "cost": 0.30,
        "risk": "medium",
    },
}


def simulate_action(
    action: dict,
    request: DecisionRequest,
    risk: dict,
) -> dict:
    action_name = action["action"]
    profile = ACTION_PROFILES[action_name]

    base_waste = risk["risk_score"] * 0.55

    # High demand helps sales-based actions.
    demand_bonus = max(0, request.demand_multiplier - 1) * 15

    # Very limited shelf life makes passive monitoring ineffective.
    urgency_penalty = max(0, 3 - request.days_remaining) * 8

    predicted_waste = base_waste * (
        1 - profile["waste_reduction"]
    )

    if action_name == "Monitor":
        predicted_waste += urgency_penalty

    if action_name in ["Promote", "Accelerated Clearance"]:
        predicted_waste -= demand_bonus

    predicted_waste = round(
        max(0, min(100, predicted_waste)),
        2,
    )

    # Value recovery depends on action profile and demand.
    value_recovery = profile["value_recovery"] * 100

    if action_name in ["Promote", "Accelerated Clearance"]:
        value_recovery += demand_bonus

    if request.days_remaining <= 1:
        value_recovery -= 10

    value_recovery = round(
        max(0, min(100, value_recovery)),
        2,
    )

    operational_cost = round(profile["cost"] * 100, 2)

    return {
        "action": action_name,
        "predicted_waste_percent": predicted_waste,
        "predicted_value_recovery": value_recovery,
        "operational_cost": operational_cost,
        "operational_risk": profile["risk"],
        "explanation": action["description"],
    }