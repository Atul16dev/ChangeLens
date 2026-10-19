from controllers.user_controller import get_user_profile

def register_user_routes(app):
    """Registers route handlers."""
    def handle_user(user_id):
        return get_user_profile(user_id).to_dict()
    return handle_user
