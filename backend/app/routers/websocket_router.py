from fastapi import APIRouter, WebSocket, WebSocketDisconnect
import logging
import json
from typing import List, Dict, Any
from datetime import datetime, timezone

logger = logging.getLogger(__name__)

router = APIRouter(tags=["Real-time WebSockets"])

class ConnectionManager:
    def __init__(self):
        self.active_connections: List[WebSocket] = []

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)
        logger.info(f"WebSocket client connected. Total active: {len(self.active_connections)}")

    def disconnect(self, websocket: WebSocket):
        if websocket in self.active_connections:
            self.active_connections.remove(websocket)
            logger.info(f"WebSocket client disconnected. Total active: {len(self.active_connections)}")

    async def broadcast(self, message: Dict[str, Any]):
        """Broadcasts payload to all connected clients."""
        payload = json.dumps(message)
        for connection in list(self.active_connections):
            try:
                await connection.send_text(payload)
            except Exception as e:
                logger.warning(f"Error sending message to client: {e}")
                self.disconnect(connection)

ws_manager = ConnectionManager()

@router.websocket("/api/v1/ws")
async def websocket_endpoint(websocket: WebSocket):
    await ws_manager.connect(websocket)
    try:
        # Send initial connection handshake
        await websocket.send_text(json.dumps({
            "type": "handshake",
            "status": "connected",
            "message": "Apda Mitra Real-Time Telemetry Feed Active",
            "timestamp": datetime.now(timezone.utc).isoformat()
        }))

        while True:
            # Listen for client ping / subscriptions
            data = await websocket.receive_text()
            try:
                parsed = json.loads(data)
                action = parsed.get("action")
                if action == "ping":
                    await websocket.send_text(json.dumps({"type": "pong", "timestamp": datetime.now(timezone.utc).isoformat()}))
            except Exception:
                pass
    except WebSocketDisconnect:
        ws_manager.disconnect(websocket)
    except Exception as e:
        logger.warning(f"WebSocket connection error: {e}")
        ws_manager.disconnect(websocket)
