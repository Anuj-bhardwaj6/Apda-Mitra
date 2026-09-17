import secrets


def generate_secure_otp(length: int = 6) -> str:
    """Generates a cryptographically strong numeric OTP."""
    digits = [str(secrets.randbelow(10)) for _ in range(length)]
    return "".join(digits)
