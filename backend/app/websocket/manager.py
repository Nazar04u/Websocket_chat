from typing import Dict, List

from fastapi import WebSocket, HTTPException

from app.auth import decode_token
from app.websocket.verify_websocket import verify_connection


class ConnectionManager:
    def __init__(self):
        self.active_connections: dict = {}

    async def connect(self, websocket: WebSocket, csrf_token: str, access_token: str):
        """Connect a WebSocket and associate it with a CSRF token and access token."""
        try:
            username = await verify_connection(websocket, access_token)

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
        print(self.active_connections)
        return self.active_connections.get(websocket, None)


class PrivateChatManager:
    def __init__(self, connection_manager: ConnectionManager):
        self.connection_manager = connection_manager
        self.private_chats: Dict[str, List[WebSocket]] = {}

    async def add_user_to_chat(self, chat_id: str, websocket: WebSocket):
        if chat_id not in self.private_chats:
            self.private_chats[chat_id] = []
        self.private_chats[chat_id].append(websocket)

    async def send_private_message(self, chat_id: str, message: str):
        if chat_id in self.private_chats:
            for connection in self.private_chats[chat_id]:
                await connection.send_text(message)


class GroupChatManager:
    def __init__(self, connection_manager: ConnectionManager):
        self.connection_manager = connection_manager
        self.groups: Dict[str, List[WebSocket]] = {}

    async def add_user_to_group(self, group_id: str, websocket: WebSocket):
        if group_id not in self.groups:
            self.groups[group_id] = []
        self.groups[group_id].append(websocket)

    async def send_group_message(self, group_id: str, message: str):
        if group_id in self.groups:
            for connection in self.groups[group_id]:
                await connection.send_text(message)