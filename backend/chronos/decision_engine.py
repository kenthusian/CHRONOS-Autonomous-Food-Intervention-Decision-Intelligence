from models import DecisionRequest
from chronos.risk_engine import assess_risk
from chronos.action_planner import generate_actions
from chronos.simulator import simulate_action
from chronos.optimizer import select_best_action


def make_decision(request: DecisionRequest) -> dict:
    # 1. OBSERVE + REASON
    risk = assess_risk(request)

    # 2. PLAN
    actions = generate_actions()

    # 3. SIMULATE
    simulations = [
        simulate_action(action, request, risk)
        for action in actions
    ]

    # 4. OPTIMIZE + DECIDE
    ranked_actions, best_action = select_best_action(simulations)

    # 5. Generate transparent reasoning for the decision.
    reasoning = [
        f"Risk score calculated as {risk['risk_score']}/100 ({risk['risk_level']}).",
        f"Expiry risk: {risk['factors']['expiry_risk']}/100.",
        f"Demand risk: {risk['factors']['demand_risk']}/100.",
        f"Temperature risk: {risk['factors']['temperature_risk']}/100.",
        f"Logistics risk: {risk['factors']['logistics_risk']}/100.",
        f"{len(ranked_actions)} intervention alternatives were simulated.",
        f"{best_action['action']} achieved the highest overall score of {best_action['overall_score']}.",
    ]

    return {
        "product_name": request.product_name,
        "risk_assessment": risk,
        "alternatives": ranked_actions,
        "recommended_action": best_action["action"],
        "reasoning": reasoning,
    }