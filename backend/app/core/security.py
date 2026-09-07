from datetime import datetime, timedelta, timezone

from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from jose import JWTError, jwt
from pwdlib import PasswordHash
from sqlalchemy import select
from sqlalchemy.orm import Session

from backend.app.core.config import settings
from backend.app.core.database import get_db
from backend.app.models.user import User


# =========================================================
# PASSWORD HASHING
# =========================================================

password_hash = PasswordHash.recommended()


# =========================================================
# JWT CONFIGURATION
# =========================================================

ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60

oauth2_scheme = OAuth2PasswordBearer(
    tokenUrl="/api/auth/login"
)


# =========================================================
# PASSWORD FUNCTIONS
# =========================================================

def hash_password(password: str) -> str:
    """Hash a plain-text password."""
    return password_hash.hash(password)


def verify_password(
    plain_password: str,
    hashed_password: str,
) -> bool:
    """Verify a plain-text password against a stored hash."""
    return password_hash.verify(
        plain_password,
        hashed_password,
    )


# =========================================================
# JWT FUNCTIONS
# =========================================================

def create_access_token(data: dict) -> str:
    """Create a JWT access token."""

    to_encode = data.copy()

    expire = datetime.now(timezone.utc) + timedelta(
        minutes=ACCESS_TOKEN_EXPIRE_MINUTES
    )

    to_encode.update(
        {
            "exp": expire,
        }
    )

    return jwt.encode(
        to_encode,
        settings.JWT_SECRET_KEY,
        algorithm=ALGORITHM,
    )


def decode_access_token(token: str) -> dict | None:
    """Decode and validate a JWT access token."""

    try:
        return jwt.decode(
            token,
            settings.JWT_SECRET_KEY,
            algorithms=[ALGORITHM],
        )

    except JWTError:
        return None


# =========================================================
# CURRENT USER
# =========================================================

def get_current_user(
    token: str = Depends(oauth2_scheme),
    db: Session = Depends(get_db),
) -> User:
    """
    Decode the JWT token and return the authenticated user.

    The login endpoint stores the user's database ID
    inside the JWT 'sub' field.
    """

    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={
            "WWW-Authenticate": "Bearer",
        },
    )

    # -----------------------------------------------------
    # Decode JWT
    # -----------------------------------------------------

    payload = decode_access_token(token)

    if payload is None:
        raise credentials_exception

    # -----------------------------------------------------
    # Get user ID from JWT
    # -----------------------------------------------------

    user_id = payload.get("sub")

    if not user_id:
        raise credentials_exception

    # -----------------------------------------------------
    # Convert user ID to integer
    # -----------------------------------------------------

    try:
        user_id = int(user_id)

    except (TypeError, ValueError):
        raise credentials_exception

    # -----------------------------------------------------
    # Find user in database
    # -----------------------------------------------------

    user = db.scalar(
        select(User).where(
            User.id == user_id
        )
    )

    if user is None:
        raise credentials_exception

    return user