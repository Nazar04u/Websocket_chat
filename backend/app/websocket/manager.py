from typing import Dict, List

from fastapi import WebSocket, HTTPException
from sqlalchemy.orm import Session

from app.models import PrivateChat, PrivateMessage, User
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
        except HTTPException as e:
            await websocket.close(code=1008, reason=f"Authentication failed: {e.detail}")
        except Exception as e:
            await websocket.close(code=1008, reason="Unexpected error")

    def disconnect(self, websocket: WebSocket):
        """Disconnect the WebSocket and remove it from active connections."""
        websocket_to_delete = websocket
        self.active_connections.pop(websocket_to_delete, None)
        for key, values in self.active_connections.items():
            if isinstance(values, list) and websocket_to_delete in values:
                values.remove(websocket_to_delete)

    async def send_personal_message(self, message: str, websocket: WebSocket):
        """Send a personal message to a specific WebSocket."""
        await websocket.send_text(message)

    def get_user_info(self, websocket: WebSocket):
        """Retrieve user information associated with the WebSocket."""
        return self.active_connections.get(websocket, None)

    async def send_message_to_chat(self, chat_id: int, message: dict):
        """Send a message to all WebSocket connections in the specified chat."""
        if chat_id in self.active_connections:
            connections = self.active_connections[chat_id]
            for websocket in connections:
                await websocket.send_json(message)

    async def add_user_to_chat(self, chat_id: int, websocket: WebSocket):
        """Add a WebSocket connection to a specific chat."""
        if chat_id not in self.active_connections:
            self.active_connections[chat_id] = []
        self.active_connections[chat_id].append(websocket)


class PrivateChatManager:
    def __init__(self, connection_manager: ConnectionManager):
        self.connection_manager = connection_manager
        self.private_chats: Dict[str, List[WebSocket]] = {}

    async def add_user_to_chat(self, chat_id: int, websocket):
        # Manage adding users to a specific chat (e.g., WebSocket connections)
        await self.connection_manager.add_user_to_chat(chat_id, websocket)

    async def send_private_message(self, db: Session, chat_id: int, message: dict):
        # Save the message in the database
        sender = db.query(User).filter(
            User.username == message["sender_username"]
        ).first()
        private_message = PrivateMessage(
            chat_id=chat_id,
            sender_id=sender.id,
            content=message["content"],
        )
        db.add(private_message)
        db.commit()
        db.refresh(private_message)
        # Forward the message to connected users
        await self.connection_manager.send_message_to_chat(chat_id, message)

    async def get_or_create_chat(self, db: Session, user1_id: int, user2_id: int):
        # Filter existing private chats
        chat = (
            db.query(PrivateChat)
            .filter(
                (PrivateChat.user1_id == user1_id) & (PrivateChat.user2_id == user2_id) |
                (PrivateChat.user1_id == user2_id) & (PrivateChat.user2_id == user1_id)
            )
            .first()
        )
        if chat:
            return chat  # Return the existing chat

        # Create a new chat if not found
        new_chat = PrivateChat(user1_id=user1_id, user2_id=user2_id)
        db.add(new_chat)
        db.commit()
        db.refresh(new_chat)
        return new_chat


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
