from starlette.websockets import WebSocket

from app.auth import decode_token


async def verify_connection(websocket: WebSocket, access_token: str):
    try:
        payload = decode_token(access_token)
        username = payload.get("sub")
        if not username:
            await websocket.close(code=1008, reason="Invalid access token")
            return
        return username
    except Exception as e:
        await websocket.close(code=1008, reason=f"Authentication failed: {str(e)}")
        raise
