import json
import secrets

from sqlalchemy.orm import Session
from starlette.middleware.cors import CORSMiddleware
from starlette.responses import JSONResponse
from starlette.websockets import WebSocketDisconnect

from app.websocket.manager import ConnectionManager
from app.models import User
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
    LoginRequest
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


manager = ConnectionManager()


@app.on_event("startup")
async def startup_event():
    create_all_tables()


@app.post("/register", response_model=UserResponse)
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


@app.post("/login")
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
            "csrf_token": csrf_token,  # Return CSRF token to the client
            "token_type": "bearer",
        }
    )


@app.post("/refresh")
def refresh_token(request: Request, response: Response, db: Session = Depends(get_db)):
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
            samesite="Strict"
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


@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await websocket.accept()
    # Receive initial message with tokens
    data = await websocket.receive_text()
    message = json.loads(data)
    access_token = message.get("access_token")
    csrf_token = message.get("csrf_token")

    if not access_token or not csrf_token:
        await websocket.close(code=1008, reason="Missing authentication tokens")
        return

    # Validate tokens and proceed
    await manager.connect(websocket, csrf_token, access_token)


@app.websocket("/communicate")
async def websocket_endpoint(websocket: WebSocket):
    await manager.connect(websocket)
    try:
        while True:
            data = await websocket.receive_text()
            await manager.send_personal_message(f"Received:{data}", websocket)
    except WebSocketDisconnect:
        manager.disconnect(websocket)
        await manager.send_personal_message("Bye!!!", websocket)
