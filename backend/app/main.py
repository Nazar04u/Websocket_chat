import json
import secrets

from sqlalchemy.orm import Session
from starlette.middleware.cors import CORSMiddleware
from starlette.responses import JSONResponse
from starlette.websockets import WebSocketDisconnect

from app.models import GroupChat, User
from app.websocket.handle_websocket_actions import handle_websocket_action, connection_manager

from app.database import (
    get_db,
    create_all_tables
)
from fastapi import (
    FastAPI,
    Depends,
    HTTPException,
    WebSocket,
    Response,
    Request
)
from app.schemas import (
    UserCreate,
    UserResponse,
    LoginRequest, GroupChatResponse, GroupChatRequest
)
from app.auth import (
    create_access_token,
    decode_token,
    hash_password,
    verify_password,
    create_refresh_token
)

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allows all origins, change this to specific URLs for more security
    allow_credentials=True,
    allow_methods=["*"],  # Allows all methods (GET, POST, OPTIONS, etc.)
    allow_headers=["*"],  # Allows all headers
)


@app.on_event("startup")
async def startup_event():
    create_all_tables()


@app.post("/register/", response_model=UserResponse)
def register(user: UserCreate, db: Session = Depends(get_db)):
    if db.query(User).filter(User.username == user.username).first():
        raise HTTPException(status_code=400, detail="Username already exists")
    if db.query(User).filter(User.email == user.email).first():
        raise HTTPException(status_code=400, detail="Email already exists")

    hashed_password = hash_password(user.password)
    new_user = User(username=user.username, email=user.email, hashed_password=hashed_password)
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    return new_user


@app.post("/login/")
def login(login_data: LoginRequest, response: Response, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.username == login_data.username).first()

    if not user or not verify_password(login_data.password, user.hashed_password):
        raise HTTPException(status_code=401, detail="Invalid credentials")

    access_token = create_access_token({"sub": login_data.username}).decode('utf-8')
    refresh_token = create_refresh_token({"sub": login_data.username}).decode('utf-8')
    csrf_token = secrets.token_hex(32)  # Generate a secure random CSRF token

    response.set_cookie(
        key="access_token",
        value=access_token,
        httponly=True,
        secure=True,
        samesite="strict"
    )
    response.set_cookie(
        key="refresh_token",
        value=refresh_token,
        httponly=True,
        secure=True,
        samesite="strict"
    )
    return JSONResponse(
        content={
            "access_token": access_token,
            "refresh_token": refresh_token,
            "csrf_token": csrf_token,
            "token_type": "bearer",
        }
    )


@app.post("/refresh")
def refresh_token(request: Request, response: Response):
    # Extract refresh_token from cookies
    refresh_token = request.cookies.get("refresh_token")
    if not refresh_token:
        raise HTTPException(status_code=401, detail="Refresh token not provided")

    try:
        payload = decode_token(refresh_token)
        username = payload.get("sub")
        if not username:
            raise HTTPException(status_code=401, detail="Invalid refresh token")

        # Issue a new access token
        new_access_token = create_access_token({"sub": username})
        response.set_cookie(
            key="access_token",
            value=new_access_token,
            httponly=True,
            secure=True,
            samesite="strict"
        )

        return {"msg": "Access token refreshed"}
    except Exception:
        raise HTTPException(status_code=401, detail="Invalid refresh token")


@app.get("/logout")
def logout(response: Response):
    # Delete the cookies
    response.delete_cookie("access_token")
    response.delete_cookie("refresh_token")
    return {"msg": "Logged out successfully"}


@app.get("/users/", response_model=list[UserResponse])
async def get_candidates(db: Session = Depends(get_db)):
    users = db.query(User).all()
    return users


@app.get("/groups/")
async def get_groups(db: Session = Depends(get_db)):
    groups = db.query(GroupChat).all()
    # Properly create a list of dictionaries
    group_list = [{"group_name": group.name} for group in groups]
    return JSONResponse(content=group_list)


@app.post('/group_create/')
async def create_group(group_data: GroupChatRequest, db: Session = Depends(get_db)):
    if db.query(GroupChat).filter(GroupChat.name == group_data.group_name).first():
        raise HTTPException(status_code=400, detail="Group's name already exists")

    admin = db.query(User).filter(
        User.username == group_data.admin_username
    ).first()
    if not admin:
        raise HTTPException(status_code=400, detail="User does not exist")
    new_group = GroupChat(name=group_data.group_name, admin_id=admin.id, users=[], messages=[])
    db.add(new_group)
    db.commit()
    db.refresh(new_group)
    return JSONResponse({
        "message": "Group is successfully created",
        "group_name": new_group.name,
        "admin_user": admin.username
    })


@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket, db: Session = Depends(get_db)):
    await websocket.accept()
    try:
        # Initial connection authentication
        data = await websocket.receive_text()
        message = json.loads(data)
        access_token = message.get("access_token")
        csrf_token = message.get("csrf_token")
        if not access_token or not csrf_token:
            await websocket.close(code=1008, reason="Missing authentication tokens")
            return

        await connection_manager.connect(websocket, csrf_token, access_token)
        await handle_websocket_action(websocket, message, db)
        # Handle subsequent WebSocket messages
        while True:
            data = await websocket.receive_text()
            message = json.loads(data)
            await handle_websocket_action(websocket, message, db)

    except WebSocketDisconnect:
        connection_manager.disconnect(websocket)
        print("Client disconnected")
    except Exception as e:
        print(f"Error: {str(e)}")
        connection_manager.disconnect(websocket)
        await websocket.close(code=1008, reason="Unexpected error")
