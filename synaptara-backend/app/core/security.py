from datetime import datetime, timedelta, timezone
import bcrypt
from jose import JWTError, jwt
from app.config import get_settings

settings = get_settings()

# bcrypt has a hard 72-byte limit on the input; anything longer is truncated
# the same way most bcrypt implementations behave. We encode/truncate
# manually and call the `bcrypt` library directly instead of going through
# passlib's CryptContext, since passlib==1.7.4's backend self-test crashes
# on modern bcrypt (>=4.0) with "password cannot be longer than 72 bytes"
# even for short passwords.
_MAX_BCRYPT_BYTES = 72


def _prepare(plain: str) -> bytes:
    return plain.encode("utf-8")[:_MAX_BCRYPT_BYTES]


def hash_password(plain: str) -> str:
    hashed = bcrypt.hashpw(_prepare(plain), bcrypt.gensalt())
    return hashed.decode("utf-8")


def verify_password(plain: str, hashed: str) -> bool:
    try:
        return bcrypt.checkpw(_prepare(plain), hashed.encode("utf-8"))
    except ValueError:
        # Malformed/legacy hash — treat as no match rather than raising.
        return False


def create_access_token(subject: str, expires_delta: timedelta | None = None) -> str:
    """Create a JWT access token with `sub` set to the user's UUID string."""
    expire = datetime.now(timezone.utc) + (
        expires_delta or timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    )
    payload = {"sub": subject, "exp": expire, "iat": datetime.now(timezone.utc)}
    return jwt.encode(payload, settings.SECRET_KEY, algorithm=settings.ALGORITHM)


def decode_access_token(token: str) -> str | None:
    """Return the `sub` claim (user UUID) or None if the token is invalid/expired."""
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        return payload.get("sub")
    except JWTError:
        return None
