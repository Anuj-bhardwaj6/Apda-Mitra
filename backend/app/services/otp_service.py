import logging
import secrets
from typing import Any, Dict, Optional
from app.core.config import settings
from app.core.redis import RedisCacheService

logger = logging.getLogger("apda.otp_service")


class OtpService:
    """
    Production-grade OTP and token verification service.
    Coordinates OTP generation, in-memory caching via Redis, verification checks,
    and provides architectural interfaces for Government SMS gateways (MSG91/NIC/C-DAC)
    and transactional email providers (SendGrid/AWS SES/SMTP).
    """

    @staticmethod
    def generate_numeric_otp(length: int = 6) -> str:
        """Generates a cryptographically secure numeric OTP."""
        digits = [str(secrets.randbelow(10)) for _ in range(length)]
        return "".join(digits)

    @staticmethod
    def generate_secure_token(nbytes: int = 32) -> str:
        """Generates a cryptographically secure URL-safe token."""
        return secrets.token_urlsafe(nbytes)

    # --- Mobile OTP Operations ---

    async def send_mobile_otp(
        self,
        mobile_number: str,
        purpose: str = "verification",
    ) -> Dict[str, Any]:
        """
        Generates and dispatches a 6-digit verification code to the target mobile number.
        Stores the OTP in Redis with a 5-minute time-to-live.
        """
        cleaned_number = mobile_number.strip()
        otp_code = self.generate_numeric_otp(6)
        key = f"otp:{purpose}:{cleaned_number}"

        await RedisCacheService.set_otp(key, otp_code)

        # Architectural gateway integration placeholder
        await self._dispatch_sms_gateway(
            phone_number=cleaned_number,
            message=f"[APDA MITRA] Your disaster platform security code is {otp_code}. Valid for 5 minutes.",
        )

        return {
            "mobile_number": cleaned_number,
            "purpose": purpose,
            "expires_in_seconds": settings.OTP_TTL_SECONDS,
            "channel": "SMS_GATEWAY",
        }

    async def verify_mobile_otp(
        self,
        mobile_number: str,
        otp: str,
        purpose: str = "verification",
    ) -> bool:
        """Verifies candidate OTP against Redis."""
        cleaned_number = mobile_number.strip()
        key = f"otp:{purpose}:{cleaned_number}"
        return await RedisCacheService.verify_otp(key, otp.strip())

    # --- Email Verification & Password Reset Tokens ---

    async def send_email_token(
        self,
        email: str,
        purpose: str = "email_verification",
    ) -> str:
        """
        Generates and stores a secure verification or reset token for the given email.
        """
        cleaned_email = email.strip().lower()
        token = self.generate_secure_token(32)
        ttl = (
            settings.EMAIL_VERIFICATION_EXPIRE_HOURS * 3600
            if purpose == "email_verification"
            else settings.PASSWORD_RESET_EXPIRE_MINUTES * 60
        )

        key = f"email_token:{purpose}:{token}"
        # Store email associated with token in Redis
        await RedisCacheService.set(key, cleaned_email, expire_seconds=ttl)

        # Architectural email integration placeholder
        await self._dispatch_email_gateway(
            email=cleaned_email,
            subject="APDA MITRA Security Verification",
            body=f"Your verification token is: {token}",
        )

        return token

    async def verify_email_token(
        self,
        token: str,
        purpose: str = "email_verification",
    ) -> Optional[str]:
        """
        Verifies token and returns the associated email address if valid, then consumes the token.
        """
        key = f"email_token:{purpose}:{token.strip()}"
        cached_email = await RedisCacheService.get(key)
        if cached_email:
            # Single-use token: invalidate upon consumption
            await RedisCacheService.delete(key)
            return cached_email
        return None

    # --- Gateway Adapters (Placeholders for Government / Commercial Providers) ---

    async def _dispatch_sms_gateway(self, phone_number: str, message: str) -> bool:
        """
        SMS provider integration adapter (e.g. MSG91, Twilio, CDAC, Firebase).
        In production, this queries external SMS REST APIs.
        """
        logger.info(f"[SMS Gateway Dispatch] To: {phone_number} | Message: {message}")
        return True

    async def _dispatch_email_gateway(self, email: str, subject: str, body: str) -> bool:
        """
        Email provider integration adapter (e.g. AWS SES, SendGrid, SMTP).
        In production, this routes via transactional mail APIs.
        """
        logger.info(f"[Email Gateway Dispatch] To: {email} | Subject: {subject}")
        return True
