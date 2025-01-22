from fastapi import WebSocket
from typing import Dict


class ConnectionManager:
    """Class defining socket events with CSRF token support"""

    def __init__(self):
        """Initialize the manager with a dictionary to track connections and CSRF tokens"""
        self.active_connections: Dict[WebSocket, str] = {}

    async def connect(self, websocket: WebSocket, csrf_token: str):
        """
        Connect event: Accepts a WebSocket connection and associates it with a CSRF token.
        """
        await websocket.accept()
        self.active_connections[websocket] = csrf_token

    async def send_personal_message(self, message: str, websocket: WebSocket):
        """Send a direct message to a specific WebSocket connection"""
        if websocket in self.active_connections:
            await websocket.send_text(message)

    def disconnect(self, websocket: WebSocket):
        """Disconnect event: Removes a WebSocket connection"""
        if websocket in self.active_connections:
            del self.active_connections[websocket]

    def validate_csrf_token(self, websocket: WebSocket, csrf_token: str) -> bool:
        """Validate the CSRF token for a specific WebSocket connection"""
        return self.active_connections.get(websocket) == csrf_token
