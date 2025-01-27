import React, { useState, useEffect } from "react";
import Cookies from "js-cookie";

function ChatWindow({ currentUser, chatUser }) {
    const [messages, setMessages] = useState([]);
    const [newMessage, setNewMessage] = useState("");
    const [ws, setWs] = useState(null); // WebSocket instance
    const [chatId, setChatId] = useState([]);

    useEffect(() => {
        const access_token = Cookies.get("access_token");
        const csrf_token = localStorage.getItem("csrf_token");
    
        if (!access_token || !csrf_token) {
            console.error("Authentication tokens are missing!");
            return;
        }
    
        // Check if the WebSocket is already open (avoid opening a new connection)
        if (ws && ws.readyState === WebSocket.OPEN) {
            return;
        }
    
        const websocket = new WebSocket("ws://localhost:8008/ws");
    
        websocket.onopen = () => {
            console.log("Port opened")
            console.log(currentUser)
            websocket.send(
                JSON.stringify({
                    action: "join_private_chat",
                    data: {
                        user1: currentUser,
                        user2_id: chatUser.id,
                    },
                    access_token,
                    csrf_token,
                })
            );
        };
    
        websocket.onmessage = (event) => {    
            try {
                const message = JSON.parse(event.data); // Safely parse JSON

                // Access values in the parsed object
                if (message.chat_id) {
                    setChatId(message.chat_id); // Assuming this is a React state setter
                    setMessages(message.history || []); // Handle the empty history
                } else {
                    setMessages((prev) => [...prev, message]); // Append to messages
                }
            } catch (e) {
                console.error("Failed to parse JSON:", event.data, e); // Log parse errors
            }
        };
    
        websocket.onerror = (error) => console.error("WebSocket error:", error.target);
        websocket.onclose = () => console.log("WebSocket closed");
    
        setWs(websocket); // Save the WebSocket object to the state
    
        return () => {
            if (websocket) {
                websocket.close();
            }
        };
    }, [chatUser, currentUser]); // WebSocket is re-created only if `chatUser` or `currentUser` changes
    

    const handleSendMessage = () => {
        if (ws && newMessage.trim()) {
            const access_token = Cookies.get("access_token");
            const csrf_token = localStorage.getItem("csrf_token");
            ws.send(
                JSON.stringify({
                    action: "send_private_message",
                    data: {
                        chat_id: chatId,
                        message: {
                            sender_username: currentUser.username,
                            content: newMessage,
                        },
                    },
                    access_token,
                    csrf_token,
                })
            );
            setNewMessage("");
        }
    };
    

    return (
        <div>
            <h3>Chat with {chatUser.username}</h3>
            <div style={{ border: "1px solid black", padding: "10px", height: "300px", overflowY: "scroll" }}>
                {messages.map((msg, index) => (
                    <div key={index}>
                        <strong>{msg.sender}:</strong> {msg.content}
                    </div>
                ))}
            </div>
            <input
                type="text"
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                placeholder="Type a message"
            />
            <button onClick={handleSendMessage}>Send</button>
        </div>
    );
}

export default ChatWindow;
