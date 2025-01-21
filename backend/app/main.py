from fastapi import FastAPI, Depends, HTTPException, WebSocket, Query, Response, Request
from fastapi.responses import HTMLResponse
from sqlalchemy.orm import Session
from app.auth import create_access_token, decode_token, hash_password, verify_password, get_db, create_refresh_token
from app.models import User
from app.database import get_db, create_all_tables
from app.schemas import UserCreate, UserResponse, Token, LoginRequest

app = FastAPI()

html = """
<!DOCTYPE html>
<html>
    <head>
        <title>WebSocket with pyjwt</title>
    </head>
    <body>
        <h1>WebSocket Authentication</h1>
        <button onclick="connectWebSocket()">Connect</button>
        <ul id="messages"></ul>
        <script>
            const connectWebSocket = () => {
                let ws = new WebSocket(`ws://localhost:8000/ws`);
                ws.onopen = () => {
                    console.log("WebSocket connection established.");
                };
                ws.onmessage = (event) => {
                    let messages = document.getElementById('messages');
                    let message = document.createElement('li');
                    message.textContent = event.data;
                    messages.appendChild(message);
                };
            };
        </script>
    </body>
</html>
"""

@app.on_event("startup")
async def startup_event():
    create_all_tables()


@app.get("/")
def read_root():
    return HTMLResponse(html)


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
    # Retrieve the user by username
    user = db.query(User).filter(User.username == login_data.username).first()

    # If user doesn't exist or password doesn't match, raise an error
    if not user or not verify_password(login_data.password, user.hashed_password):
        raise HTTPException(status_code=401, detail="Invalid credentials")

    # Generate access and refresh tokens
    access_token = create_access_token({"sub": login_data.username})
    refresh_token = create_refresh_token({"sub": login_data.username})

    # Set tokens as HttpOnly cookies (using secure cookies for production)
    response.set_cookie(
        key="access_token",
        value=access_token,
        httponly=True,
        secure=True,  # Ensure you use HTTPS for production
        samesite="Strict"
    )
    response.set_cookie(
        key="refresh_token",
        value=refresh_token,
        httponly=True,
        secure=True,
        samesite="Strict"
    )

    return {"access_token": access_token, "refresh_token": refresh_token, "token_type": "bearer"}

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
async def websocket_endpoint(websocket: WebSocket, request: Request):
    # Extract access_token from cookies
    access_token = request.cookies.get("access_token")
    if not access_token:
        await websocket.close()
        return

    try:
        payload = decode_token(access_token)
        username = payload.get("sub")
        await websocket.accept()
        await websocket.send_text(f"Welcome, {username}! Your WebSocket is authenticated.")
    except HTTPException as e:
        await websocket.send_text(f"Authentication failed: {e.detail}")
        await websocket.close()
