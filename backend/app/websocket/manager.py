from fastapi import WebSocket, HTTPException

from app.auth import decode_token


class ConnectionManager:
    def __init__(self):
        self.active_connections: dict = {}

    async def connect(self, websocket: WebSocket, csrf_token: str, access_token: str):
        """Connect a WebSocket and associate it with a CSRF token and access token."""
        try:
            # Decode the access token to verify the user
            payload = decode_token(access_token)
            username = payload.get("sub")
            if not username:
                raise HTTPException(status_code=401, detail="Invalid access token")

            # Store the username and csrf_token with the WebSocket
            self.active_connections[websocket] = {
                "username": username,
                "csrf_token": csrf_token
            }
            await websocket.send_text(f"Welcome, {username}! Your WebSocket is authenticated.")

        except HTTPException as e:
            await websocket.close(code=1008, reason=f"Authentication failed: {e.detail}")
        except Exception as e:
            await websocket.close(code=1008, reason="Unexpected error")

    def disconnect(self, websocket: WebSocket):
        """Disconnect the WebSocket and remove it from active connections."""
        self.active_connections.pop(websocket, None)

    async def send_personal_message(self, message: str, websocket: WebSocket):
        """Send a personal message to a specific WebSocket."""
        await websocket.send_text(message)

    def get_user_info(self, websocket: WebSocket):
        """Retrieve user information associated with the WebSocket."""
        return self.active_connections.get(websocket, None)
