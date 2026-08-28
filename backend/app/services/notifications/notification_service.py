import logging
from abc import ABC, abstractmethod
from typing import List, Dict, Any
from datetime import datetime, timezone

logger = logging.getLogger(__name__)

class NotificationAdapter(ABC):
    @abstractmethod
    async def send(self, recipient: str, title: str, body: str, payload: Dict[str, Any]) -> bool:
        pass

class PushNotificationAdapter(NotificationAdapter):
    async def send(self, recipient: str, title: str, body: str, payload: Dict[str, Any]) -> bool:
        logger.info(f"[PUSH ADAPTER] Sent push to {recipient}: {title} - {body}")
        return True

class SMSNotificationAdapter(NotificationAdapter):
    async def send(self, recipient: str, title: str, body: str, payload: Dict[str, Any]) -> bool:
        logger.info(f"[SMS ADAPTER] Sent SMS to {recipient}: {title} - {body}")
        return True

class EmailNotificationAdapter(NotificationAdapter):
    async def send(self, recipient: str, title: str, body: str, payload: Dict[str, Any]) -> bool:
        logger.info(f"[EMAIL ADAPTER] Sent email to {recipient}: {title} - {body}")
        return True

class NotificationQueue:
    def __init__(self):
        self._queue: List[Dict[str, Any]] = []

    def enqueue(self, recipient: str, title: str, body: str, channel: str, payload: Dict[str, Any]):
        item = {
            "recipient": recipient,
            "title": title,
            "body": body,
            "channel": channel,
            "payload": payload,
            "enqueued_at": datetime.now(timezone.utc).isoformat()
        }
        self._queue.append(item)
        logger.info(f"[NOTIFICATION QUEUE] Enqueued notification for {recipient} via {channel}")

    def get_pending((self) -> List[Dict[str, Any]]:
        return list(self._queue)

class NotificationService:
    def __init__(self):
        self.queue = NotificationQueue()
        self.adapters: Dict[str, NotificationAdapter] = {
            "push": PushNotificationAdapter(),
            "sms": SMSNotificationAdapter(),
            "email": EmailNotificationAdapter()
        }

    async def dispatch_risk_alert(self, user_phone_or_token: str, location_name: str, risk_level: str, risk_score: float, channel: str = "push"):
        title = f"⚠️ Apda Mitra Alert: {risk_level} Landslide Risk in {location_name}"
        body = f"Risk Score: {risk_score}/100. Immediate caution advised. Check Apda Mitra app for safe shelters."
        payload = {"type": "risk_alert", "location": location_name, "risk_level": risk_level}
        
        self.queue.enqueue(user_phone_or_token, title, body, channel, payload)
        
        adapter = self.adapters.get(channel, self.adapters["push"])
        await adapter.send(user_phone_or_token, title, body, payload)

notification_service = NotificationService()
