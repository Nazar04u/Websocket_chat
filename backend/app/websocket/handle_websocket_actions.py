import json

from fastapi import Depends
from sqlalchemy.orm import Session
from starlette.websockets import WebSocket

from app.database import get_db
from app.models import User
from app.websocket.manager import PrivateChatManager, GroupChatManager, ConnectionManager

connection_manager = ConnectionManager()
private_chat_manager = PrivateChatManager(connection_manager)
group_chat_manager = GroupChatManager(connection_manager)


async def handle_websocket_action(websocket: WebSocket, message: dict, db: Session = Depends(get_db)):
    action = message.get("action")
    data = message.get("data", {})
    if action == "join_private_chat":
        await handle_join_private_chat(websocket, data, db)
    elif action == "send_private_message":
        chat_id = data.get("chat_id")
        message_data = data.get("message")
        if not chat_id or not message_data:
            await handle_join_private_chat(websocket, data, db)
        await private_chat_manager.send_private_message(db, chat_id, message_data)
    elif action == "join_group":
        await handle_join_group(websocket, data)
    elif action == "send_group_message":
        await handle_send_group_message(websocket, data)
    else:
        await websocket.send_text("Unknown action")


# Handlers for specific actions
async def handle_join_private_chat(websocket: WebSocket, data: dict, db: Session = Depends(get_db)):
    user1 = data.get("user1")
    user1 = db.query(User).filter(
        User.username == user1["username"]
    ).first()
    user1_id = user1.id
    user2_id = data.get("user2_id")
    if not user1_id or not user2_id:
        await websocket.send_text("Missing user information for private chat")
        return

    # Get or create a private chat
    chat = await private_chat_manager.get_or_create_chat(db, user1_id, user2_id)
    # Add the user to the chat's WebSocket connections
    await private_chat_manager.add_user_to_chat(chat.id, websocket)

    # Send chat history to the client
    messages = [
        {"sender_id": message.sender_id, "content": message.content}
        for message in chat.messages
    ]
    data_to_send = {"chat_id": chat.id, "history": messages}
    await websocket.send_json(data_to_send)


async def handle_send_private_message(websocket: WebSocket, data: dict):
    chat_id = data.get("chat_id")
    message = data.get("message")
    if not chat_id or not message:
        await websocket.send_text("Missing chat_id or message for private chat")
        return
    await private_chat_manager.send_private_message(chat_id, message)


async def handle_join_group(websocket: WebSocket, data: dict):
    group_id = data.get("group_id")
    if not group_id:
        await websocket.send_text("Missing group_id for group chat")
        return
    await group_chat_manager.add_user_to_group(group_id, websocket)
    await websocket.send_text(f"Joined group {group_id}")


async def handle_send_group_message(websocket: WebSocket, data: dict):
    group_id = data.get("group_id")
    message = data.get("message")
    if not group_id or not message:
        await websocket.send_text("Missing group_id or message for group chat")
        return
    await group_chat_manager.send_group_message(group_id, message)
