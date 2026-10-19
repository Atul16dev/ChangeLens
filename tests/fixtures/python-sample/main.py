import sys
from routes.user_routes import register_user_routes

def start_server():
    """Initializes and runs the server application."""
    print("Python server starting...")
    register_user_routes(None)

if __name__ == "__main__":
    start_server()
