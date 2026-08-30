import asyncio
from datetime import datetime, timezone

from app.core.security import create_access_token, hash_password, verify_password
from app.database.repositories.user_repository import UserRepository
from app.models.user import User


class InvalidCredentialsError(Exception):
    pass


class AuthService:
    def __init__(self, user_repository: UserRepository):
        self.user_repository = user_repository

    async def authenticate(self, email: str, password: str) -> User:
        user = await self.user_repository.find_one({"email": email.lower()})
        # bcrypt is deliberately slow and fully synchronous (CPU-bound) -
        # calling it directly here would block the whole asyncio event loop
        # for its entire duration, so every other in-flight request (any
        # student, any endpoint) stalls behind it. Offloading to a worker
        # thread via to_thread lets bcrypt's ~100ms+ cost overlap across
        # concurrent logins instead of serializing them - the difference
        # between ~60x100ms one after another and 100ms in parallel when a
        # club session's worth of students all log in at once (found via
        # Phase 14 load testing: 60 concurrent logins took up to 13s each
        # before this fix, all other endpoints included).
        if user is None or not await asyncio.to_thread(verify_password, password, user.password_hash):
            raise InvalidCredentialsError("Invalid email or password")
        return user

    async def login(self, email: str, password: str) -> tuple[User, str]:
        user = await self.authenticate(email, password)
        token = create_access_token(user.id, user.role.value)
        return user, token

    async def change_password(self, user: User, current_password: str, new_password: str) -> None:
        if not await asyncio.to_thread(verify_password, current_password, user.password_hash):
            raise InvalidCredentialsError("Current password is incorrect")
        new_hash = await asyncio.to_thread(hash_password, new_password)
        await self.user_repository.update_one(
            user.id,
            {
                "passwordHash": new_hash,
                "mustChangePassword": False,
                "updatedAt": datetime.now(timezone.utc),
            },
        )
