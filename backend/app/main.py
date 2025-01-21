from fastapi import FastAPI, Depends, HTTPException, WebSocket, Query, Response
from fastapi.responses import HTMLResponse
from sqlalchemy.orm import Session
from app.auth import create_access_token, decode_token, hash_password, verify_password, get_db, create_refresh_token
from app.models import User
from app.database import get_db, create_all_tables
from app.schemas import UserCreate, UserResponse, Token

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
                let csrfToken = document.cookie.split('; ')
                    .find(row => row.startsWith('access_token'))
                    ?.split('=')[1];

                let ws = new WebSocket(`ws://localhost:8000/ws?csrf_token=${csrfToken}`);
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


@app.post("/login", response_model=Token)
def login(username: str, password: str, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.username == username).first()
    if not user or not verify_password(password, user.hashed_password):
        raise HTTPException(status_code=401, detail="Invalid credentials")

    access_token = create_access_token({"sub": username})
    refresh_token = create_refresh_token({"sub": username})

    return {"access_token": access_token, "refresh_token": refresh_token, "token_type": "bearer"}


@app.get("/logout")
def logout():
    response = Response(content={"msg": "Logout successful"})
    response.delete_cookie(key="access_token")
    return response


@app.post("/refresh", response_model=Token)
def refresh_token(refresh_token: str, db: Session = Depends(get_db)):
    try:
        payload = decode_token(refresh_token)
        username = payload.get("sub")
        if username is None:
            raise HTTPException(status_code=401, detail="Invalid token")

        # Reissue a new access token
        new_access_token = create_access_token({"sub": username})
        return {"access_token": new_access_token, "refresh_token": refresh_token, "token_type": "bearer"}

    except Exception:
        raise HTTPException(status_code=401, detail="Invalid refresh token")


@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket, csrf_token: str = Query(...)):
    await websocket.accept()
    try:
        payload = decode_token(csrf_token)
        username = payload.get("sub")
        await websocket.send_text(f"Welcome, {username}! Your WebSocket is authenticated.")
    except HTTPException as e:
        await websocket.send_text(f"Authentication failed: {e.detail}")
        await websocket.close()
