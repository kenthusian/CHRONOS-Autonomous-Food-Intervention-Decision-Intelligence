def score_simulation(simulation: dict) -> float:
    # CHRONOS objective:
    # minimize waste + maximize value recovery + minimize intervention cost.

    waste_score = 100 - simulation["predicted_waste_percent"]
    value_score = simulation["predicted_value_recovery"]
    cost_score = 100 - simulation["operational_cost"]

    overall_score = (
        waste_score * 0.50
        + value_score * 0.30
        + cost_score * 0.20
    )

    return round(overall_score, 2)


def select_best_action(simulations: list[dict]) -> tuple[list[dict], dict]:
    for simulation in simulations:
        simulation["overall_score"] = score_simulation(simulation)

    ranked = sorted(
        simulations,
        key=lambda item: item["overall_score"],
        reverse=True,
    )

    return ranked, ranked[0]