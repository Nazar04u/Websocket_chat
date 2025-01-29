from typing import Dict, List
from datetime import datetime
from fastapi import WebSocket, HTTPException
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session, joinedload

from app.models import PrivateChat, PrivateMessage, User, GroupChat, GroupMessage
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
            message["timestamp"] = datetime.now().isoformat()
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
            timestamp=datetime.now()
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
        self.groups: Dict[int, List[WebSocket]] = {}

    async def get_or_create_group_chat(self, admin_id: int, name: str, db: Session):
        # Validate input
        if not db.query(User).filter(User.id == admin_id).first():
            raise ValueError("Invalid admin_id")

        # Try to find an existing group chat
        group_chat = (
            db.query(GroupChat)
            .filter(GroupChat.admin_id == admin_id, GroupChat.name == name)
            .options(joinedload(GroupChat.users), joinedload(GroupChat.messages))  # Preload relationships
            .first()
        )

        if group_chat:
            return group_chat  # Return existing group chat

        # Create a new group chat if not found
        new_group_chat = GroupChat(admin_id=admin_id, name=name)
        db.add(new_group_chat)

        try:
            db.commit()
            db.refresh(new_group_chat)
        except IntegrityError:
            db.rollback()
            raise ValueError("Group name already exists for this admin")

        return new_group_chat

    async def add_user_to_group(self, group_id: int, user_id: int, websocket: WebSocket, db: Session):
        """Add a user to a group chat and persist the membership in the database."""
        # Fetch the group from the database
        group_chat = db.query(GroupChat).filter(GroupChat.id == group_id).first()
        if not group_chat:
            raise ValueError(f"Group with id {group_id} does not exist.")

        # Fetch the user from the database
        user = db.query(User).filter(User.id == user_id).first()
        if not user:
            raise ValueError(f"User with id {user_id} does not exist.")

        # Check if the user is already a member of the group
        if user not in group_chat.users:
            try:
                group_chat.users.append(user)
                db.commit()
            except IntegrityError:
                db.rollback()
                raise ValueError(f"Failed to add user {user_id} to group {group_id} due to a database error.")

        # Add the user's WebSocket connection to the in-memory group structure
        if group_id not in self.groups:
            self.groups[group_id] = []
        self.groups[group_id].append(websocket)

    async def send_group_message(self, group_id: int, sender_id: int, message_text: str, db: Session):
        """Send a message to a group chat, store it in the database, and broadcast it to group members."""
        # Fetch the group chat from the database
        group_chat = db.query(GroupChat).filter(GroupChat.id == group_id).first()
        if not group_chat:
            raise ValueError(f"Group with id {group_id} does not exist.")

        # Fetch the sender from the database
        sender = db.query(User).filter(User.id == sender_id).first()
        if not sender:
            raise ValueError(f"Sender with id {sender_id} does not exist.")

        # Persist the message in the database
        try:
            new_message = GroupMessage(
                group_id=group_id,
                sender_id=sender_id,
                content=message_text,
                timestamp=datetime.now()
            )
            db.add(new_message)
            db.commit()
            db.refresh(new_message)  # Refresh to get the newly created message's ID, etc.
        except IntegrityError:
            db.rollback()
            raise ValueError("Failed to save the group message to the database.")

        # Prepare the message payload for broadcasting
        message_payload = {
            "id": new_message.id,
            "group_id": group_id,
            "sender_id": sender_id,
            "sender_username": sender.username,
            "content": message_text,
            "timestamp": new_message.timestamp.isoformat()
        }

        # Broadcast the message to all WebSocket connections in the group
        await self.connection_manager.send_message_to_chat(group_id, message_payload)

