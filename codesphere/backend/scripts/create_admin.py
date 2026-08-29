"""One-off script to create the first CodeSphere admin account.

There is no public registration endpoint by design (section 4 of the
spec requires admin-controlled provisioning), so the very first admin
has to be created directly against the database.

Usage (run from backend/, with the venv activated):

    python scripts/create_admin.py --name "Admin" --email admin@example.com \
        --password "ChangeMe123!" --register-number ADMIN001
"""

import argparse
import asyncio
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from app.core.security import hash_password  # noqa: E402
from app.database.mongodb import close_mongo_connection, connect_to_mongo, get_database  # noqa: E402
from app.database.repositories.user_repository import UserRepository  # noqa: E402
from app.models.common import UserRole  # noqa: E402
from app.models.user import User  # noqa: E402


async def create_admin(name: str, email: str, password: str, register_number: str, student_class: str) -> None:
    await connect_to_mongo()
    try:
        repository = UserRepository(get_database())
        existing = await repository.find_one({"email": email.lower()})
        if existing is not None:
            print(f"A user with email {email} already exists (role={existing.role.value}). No changes made.")
            return

        user = User(
            name=name,
            email=email.lower(),
            password_hash=hash_password(password),
            register_number=register_number,
            student_class=student_class,
            role=UserRole.ADMIN,
            must_change_password=False,
        )
        created = await repository.insert_one(user)
        print(f"Admin account created: {created.email} (id={created.id})")
    finally:
        await close_mongo_connection()


def main() -> None:
    parser = argparse.ArgumentParser(description="Create the initial CodeSphere admin account")
    parser.add_argument("--name", required=True)
    parser.add_argument("--email", required=True)
    parser.add_argument("--password", required=True)
    parser.add_argument("--register-number", required=True)
    parser.add_argument("--class", dest="student_class", default="ADMIN")
    args = parser.parse_args()

    asyncio.run(
        create_admin(args.name, args.email, args.password, args.register_number, args.student_class)
    )


if __name__ == "__main__":
    main()
