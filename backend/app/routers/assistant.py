from fastapi import APIRouter
from app.schemas.schemas import ChatRequest, ChatResponse
from app.services.ai_assistant.assistant_service import process_assistant_query

router = APIRouter(prefix="/assistant", tags=["Tool-Grounded AI Assistant"])

@router.post("/chat", response_model=ChatResponse)
async def chat_with_assistant(req: ChatRequest):
    lat = req.latitude or 11.6854
    lon = req.longitude or 76.1320
    
    res = await process_assistant_query(req.message, lat, lon)
    
    return ChatResponse(
        reply=res["reply"],
        tools_executed=res["tools_executed"],
        structured_data=res["structured_data"],
        trust_layer=res["trust_layer"]
    )
