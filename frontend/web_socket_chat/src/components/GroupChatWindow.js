import React, { useState, useEffect } from "react";
import Cookies from "js-cookie";


function GroupChatWindow({ currentUser, group }) {
    const [messages, setMessages] = useState([]);
    const [newMessage, setNewMessage] = useState("");
    const [ws, setWs] = useState(null);

    useEffect(() => {
        const access_token = Cookies.get("access_token");
        const csrf_token = localStorage.getItem("csrf_token");

        if (!access_token || !csrf_token) {
            console.error("Authentication tokens are missing!");
            return;
        }

        const websocket = new WebSocket("ws://localhost:8008/ws");

        websocket.onopen = () => {
            websocket.send(
                JSON.stringify({
                    action: "join_group_chat",
                    data: {
                        group_id: group.id,
                    },
                    access_token,
                    csrf_token,
                })
            );
        };

        websocket.onmessage = (event) => {
            try {
                const message = JSON.parse(event.data);
                if (message.history) {
                    setMessages(message.history);
                } else {
                    setMessages((prev) => [...prev, message]);
                }
            } catch (e) {
                console.error("Failed to parse WebSocket message", e);
            }
        };

        setWs(websocket);

        return () => {
            websocket.close();
        };
    }, [group.id]);

    const sendMessage = () => {
        if (ws && ws.readyState === WebSocket.OPEN) {
            ws.send(
                JSON.stringify({
                    action: "send_group_message",
                    data: {
                        group_id: group.id,
                        message: {
                            sender_username: currentUser.username,
                            content: newMessage,
                        },
                    },
                })
            );
            setNewMessage("");
        }
    };

    return (
        <div>
            <h3>{group.name}</h3>
            <div>
                {messages.map((msg, idx) => (
                    <div key={idx}>
                        <strong>{msg.sender_username}</strong>: {msg.content}
                    </div>
                ))}
            </div>
            <input
                type="text"
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                placeholder="Type a message"
            />
            <button onClick={sendMessage}>Send</button>
        </div>
    );
}

export default GroupChatWindow;
