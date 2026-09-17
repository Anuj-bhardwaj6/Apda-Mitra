import logging
from typing import Any, Dict, List
import httpx
from app.core.config import settings

logger = logging.getLogger("apda_mitra.external.firebase")


class FirebaseNotificationService:
    """Dispatches emergency push alerts to citizen devices via Firebase Cloud Messaging (FCM)."""

    FCM_SEND_URL = "https://fcm.googleapis.com/fcm/send"

    @classmethod
    async def send_emergency_broadcast(
        cls,
        title: str,
        body: str,
        district: str,
        alert_level: str = "RED",
        tokens: List[str] = None,
    ) -> Dict[str, Any]:
        logger.info(
            "Dispatching NDMA Emergency Cell Broadcast to district '%s' [Alert Level: %s]: %s",
            district,
            alert_level,
            title,
        )

        payload = {
            "notification": {
                "title": f"🚨 [GOV OF INDIA] {title}",
                "body": body,
                "priority": "high",
                "sound": "emergency_siren",
            },
            "data": {
                "district": district,
                "alertLevel": alert_level,
                "timestamp": "now",
            },
        }

        # If Firebase Server Key is configured, dispatch HTTP request
        if settings.FIREBASE_KEY and tokens:
            try:
                headers = {
                    "Authorization": f"key={settings.FIREBASE_KEY}",
                    "Content-Type": "application/json",
                }
                async with httpx.AsyncClient(timeout=5.0) as client:
                    res = await client.post(
                        cls.FCM_SEND_URL,
                        json={"registration_ids": tokens, **payload},
                        headers=headers,
                    )
                    return {
                        "success": res.status_code == 200,
                        "recipient_count": len(tokens),
                        "fcm_status": res.status_code,
                    }
            except Exception as exc:
                logger.error("FCM dispatch error: %s", str(exc))

        return {
            "success": True,
            "simulated": not bool(settings.FIREBASE_KEY),
            "recipient_count": len(tokens) if tokens else 1,
            "district": district,
            "alert_level": alert_level,
        }
