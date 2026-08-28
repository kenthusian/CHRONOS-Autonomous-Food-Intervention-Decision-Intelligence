from mcp.server.mcpserver import MCPServer
import backend.database as db
import backend.agent as agent

mcp = MCPServer("Chronos MCP")

@mcp.tool()
async def get_inventory_status() -> dict:
    """Get the current inventory summary across all warehouses."""
    summary = await db.get_inventory_summary()
    return {"summary": summary}

@mcp.tool()
async def get_pending_recommendations() -> list:
    """Get all pending AI agent recommendations."""
    return await db.get_recommendations(status="pending")

@mcp.tool()
async def execute_operation(recommendation_id: int) -> dict:
    """Execute/accept a pending recommendation by its ID."""
    rec = await db.get_recommendation(recommendation_id)
    if not rec:
        return {"error": "Recommendation not found"}
        
    await db.resolve_recommendation(recommendation_id, "accepted")
    
    op_type = rec["action_type"]
    if op_type in ["redistribute", "priority_ship"]:
        op_type = "transfer"
    elif op_type == "reorder":
        op_type = "purchase_order"
    elif op_type == "discount":
        op_type = "discount_event"
    elif op_type == "hold":
        op_type = "hold_note"
        
    op_data = {
        "recommendation_id": recommendation_id,
        "op_type": op_type,
        "product_id": rec["product_id"],
        "from_warehouse_id": rec["from_warehouse_id"],
        "to_warehouse_id": rec["to_warehouse_id"],
        "quantity": rec["quantity"],
        "status": "completed" if op_type in ["discount_event", "hold_note"] else "planned",
        "scheduled_date": None,
        "estimated_cost": rec["estimated_cost"],
        "notes": rec.get("detail", {}).get("reason", "")
    }
    oid = await db.create_operation(op_data)
    return {"status": "success", "operation_id": oid}

@mcp.tool()
async def run_autopilot() -> list:
    """Trigger the autonomous agent to evaluate inventory and generate actions."""
    return await agent.run_autopilot()
