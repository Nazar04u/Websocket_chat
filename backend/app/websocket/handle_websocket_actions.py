from sqlalchemy.orm import Session
from starlette.websockets import WebSocket

from app.models import User, GroupChat
from app.websocket.manager import PrivateChatManager, GroupChatManager, ConnectionManager

connection_manager = ConnectionManager()
private_chat_manager = PrivateChatManager(connection_manager)
group_chat_manager = GroupChatManager(connection_manager)


async def handle_websocket_action(websocket: WebSocket, message: dict, db: Session):
    print("Start handling")
    action = message.get("action")
    data = message.get("data", {})
    print("Action:", action)
    print("Data:", data)
    if action == "join_private_chat":
        await handle_join_private_chat(websocket, data, db)
    elif action == "send_private_message":
        print("Handling sending a private message")
        print("Data:", data)
        chat_id = data.get("chat_id")
        message_data = data.get("message")
        if not chat_id or not message_data:
            await handle_join_private_chat(websocket, data, db)
        await private_chat_manager.send_private_message(db, chat_id, message_data)
    elif action == "create_group_chat":
        await handle_create_group_chat(websocket, data, db)
    elif action == "add_user_to_group_chat":
        print("Adding user to a group_chat")
        await handle_add_user_to_group_chat(websocket, data, db)
    elif action == "send_group_message":
        print("Sending a group message")
        await handle_send_group_message(websocket, data, db)
    elif action == "join_group_chat":
        print("Joining a group chat")
        await handle_join_group_chat(websocket, data, db)
    else:
        await websocket.send_text("Unknown action")


# Handlers for specific actions
async def handle_join_private_chat(websocket: WebSocket, data: dict, db: Session):
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
        {"sender_username": db.query(User).filter(
            User.id == message.sender_id
        ).first().username,
         "content": message.content,
         "timestamp": message.timestamp.isoformat()
         }
        for message in chat.messages
    ]
    data_to_send = {"chat_id": chat.id, "history": messages}
    await websocket.send_json(data_to_send)


async def handle_create_group_chat(websocket: WebSocket, data: dict, db: Session):
    admin_id = data.get("admin_id")
    group_name = data.get("group_name")

    if not admin_id or not group_name:
        await websocket.send_text("Missing admin_id or group_name for creating group chat")
        return

    try:
        group_chat = await group_chat_manager.get_or_create_group_chat(admin_id, group_name, db)
        await websocket.send_text(f"Group chat '{group_name}' created successfully with ID: {group_chat.id}")
    except ValueError as e:
        await websocket.send_text(f"Error creating group chat: {str(e)}")


async def handle_join_group_chat(websocket: WebSocket, data: dict, db: Session):
    print("start handling join_group_chat")
    user_name = data.get("user_name")
    group_name = data.get("group_name")
    print("User_name:", user_name)
    print("Group_name:", group_name)
    user_id = db.query(User).filter(User.username == user_name).first().id
    group_id = db.query(GroupChat).filter(GroupChat.name == group_name).first().id
    print("User_id:", user_id)
    print("Group_id:", group_id)
    if not user_id or not group_id:
        await websocket.send_text("Missing user_id or group_id for joining group chat")
        return

    # Fetch the group chat and check if the user is a member
    group_chat = db.query(GroupChat).filter(GroupChat.id == group_id).first()
    if not group_chat:
        await websocket.send_text(f"Group chat with ID {group_id} does not exist.")
        return

    # Check if the user is part of the group
    if not any(user.id == user_id for user in group_chat.users) and user_id != group_chat.admin_id:
        await websocket.send_json({"content": f"User with ID {user_id} is not a member of the group."})
        return
    print("User or Admin")
    # Add the user to the group chat's WebSocket connections
    await group_chat_manager.add_user_to_group(group_id, user_id, "joining", websocket, db)

    # Retrieve the message history of the group chat
    messages = [
        {"sender_username": db.query(User).filter(User.id == message.sender_id).first().username,
         "content": message.content,
         "timestamp": message.timestamp.isoformat()}
        for message in group_chat.messages
    ]

    # Send the message history to the user
    data_to_send = {"group_id": group_id, "history": messages}
    print(data_to_send)
    await websocket.send_json(data_to_send)


async def handle_add_user_to_group_chat(websocket: WebSocket, data: dict, db: Session):
    print("Start handling adding")
    print(data)
    group_name = data.get("group_name")
    user_id = data.get("user_id")
    adder_name = data.get("adder_name")  # The user who is trying to add another user
    print("Group_name:", group_name)
    print("User_id:", user_id)
    print("Adder_name", adder_name)
    user_name = db.query(User).filter(User.id == user_id).first().username
    group_id = db.query(GroupChat).filter(GroupChat.name == group_name).first().id
    adder_id = db.query(User).filter(User.username == adder_name).first().id
    print("Adder_id:", adder_id)
    if not group_id or not user_id or not adder_id:
        await websocket.send_text("Missing group_id, user_id, or adder_id for adding user to group chat")
        return

    try:
        # Check if the adder is a member of the group
        group_chat = db.query(GroupChat).filter(GroupChat.id == group_id).first()

        if not group_chat:
            print("Group_not_found")
            raise ValueError("Group chat does not exist")

        # Check if the adder is part of the group
        print("Users:", group_chat.users)
        print("Admin:", group_chat.admin_id)
        print([i.id for i in group_chat.users])
        if not any(user.id == adder_id for user in group_chat.users) and adder_id != group_chat.admin_id:
            print("Adder is not in group")
            await websocket.send_json({"content": "User is not in the group. You can not add another user to this group"})
            return
            
        # Add the user to the group
        await group_chat_manager.add_user_to_group(group_id, user_id, "adding", websocket, db)
        print("Added successfully")

        await group_chat_manager.send_group_message(group_id,
                                                    adder_id,
                                                    f"I added {user_name}",
                                                    db)
    except ValueError as e:
        await websocket.send_text(f"Error adding user to group chat: {str(e)}")


async def handle_send_group_message(websocket: WebSocket, data: dict, db: Session):
    print("Start handling group message")
    group_name = data.get("group_id")
    message = data.get("message")
    sender_username = message.get("sender_username", None)
    content = message.get("content", None)
    print("Group_name:", group_name)
    print("Message:", message)
    print("Sender_username:", sender_username)
    print("Content:", content)
    group = db.query(GroupChat).filter(GroupChat.name == group_name).first()
    sender_id = db.query(User).filter(User.username == sender_username).first().id
    if not any(user.id == sender_id for user in group.users) and sender_id != group.admin_id:
        print("Not in the group.")
        await websocket.send_json({"content": "User is not in the group. You can not send messages"})
        return
    print("Group_id:", group.id)
    print("Sender_id:", sender_id)
    if not group.id or not message:
        await websocket.send_text("Missing group_id or message for group chat")
        return
    await group_chat_manager.send_group_message(group.id, sender_id, content, db)
