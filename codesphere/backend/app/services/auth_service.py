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
        if user is None or not verify_password(password, user.password_hash):
            raise InvalidCredentialsError("Invalid email or password")
        return user

    async def login(self, email: str, password: str) -> tuple[User, str]:
        user = await self.authenticate(email, password)
        token = create_access_token(user.id, user.role.value)
        return user, token

    async def change_password(self, user: User, current_password: str, new_password: str) -> None:
        if not verify_password(current_password, user.password_hash):
            raise InvalidCredentialsError("Current password is incorrect")
        await self.user_repository.update_one(
            user.id,
            {
                "passwordHash": hash_password(new_password),
                "mustChangePassword": False,
                "updatedAt": datetime.now(timezone.utc),
            },
        )
