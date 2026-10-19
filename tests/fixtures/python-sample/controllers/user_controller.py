import os
from models.user import User

def get_user_profile(user_id: int):
    """Retrieve and construct a User model."""
    return User(id=user_id, username="alice", email="alice@example.com")
