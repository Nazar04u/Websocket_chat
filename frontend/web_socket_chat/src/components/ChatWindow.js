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
            console.log("Connection is already opened!");
            return;
        }

        const websocket = new WebSocket("ws://localhost:8008/ws");

        websocket.onopen = () => {
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
            const now = new Date();
            ws.send(
                JSON.stringify({
                    action: "send_private_message",
                    data: {
                        chat_id: chatId,
                        message: {
                            sender_username: currentUser.username,
                            content: newMessage,
                            timestamp: now.toISOString()
                        },
                    },
                    access_token,
                    csrf_token,
                })
            );
            setNewMessage("");
        }
    };

    // Helper function to determine if the message belongs to the current user
    const isCurrentUser = (username) => username === currentUser.username;

    return (
        <div style={styles.chatContainer}>
            <h3 style={styles.chatHeader}>Chat with {chatUser.username}</h3>
            <div style={styles.messageContainer}>
                {messages.map((msg, index) => (
                    <div key={index} style={isCurrentUser(msg.sender_username) ? styles.currentUserMessage : styles.otherUserMessage}>
                        <strong>{msg.sender_username}:</strong> <span>{msg.content}</span>
                        <div style={styles.timestamp}>{new Date(msg.timestamp).toLocaleString()}</div>
                    </div>
                ))}
            </div>
            <div style={styles.inputContainer}>
                <input
                    type="text"
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    placeholder="Type a message"
                    style={styles.input}
                />
                <button onClick={handleSendMessage} style={styles.sendButton}>Send</button>
            </div>
        </div>
    );
}

const styles = {
    chatContainer: {
        maxWidth: "600px",
        width: "100%",
        margin: "0 auto",
        borderRadius: "10px",
        backgroundColor: "#f4f7fb",
        padding: "20px",
        boxShadow: "0 4px 8px rgba(0, 0, 0, 0.1)",
    },
    chatHeader: {
        fontSize: "24px",
        fontWeight: "600",
        marginBottom: "20px",
        color: "#333",
    },
    messageContainer: {
        maxHeight: "400px",
        overflowY: "auto",
        marginBottom: "20px",
        padding: "10px",
        backgroundColor: "#ffffff",
        borderRadius: "10px",
        boxShadow: "0 2px 4px rgba(0, 0, 0, 0.1)",
    },
    currentUserMessage: {
        marginBottom: "15px",
        padding: "10px",
        backgroundColor: "#d0e7ff",  // Light blue for current user
        borderRadius: "8px",
        boxShadow: "0 1px 3px rgba(0, 0, 0, 0.1)",
        fontSize: "14px",
        alignSelf: "flex-end", // Align current user's messages to the right
    },
    otherUserMessage: {
        marginBottom: "15px",
        padding: "10px",
        backgroundColor: "#f1f1f1",  // Light gray for other user
        borderRadius: "8px",
        boxShadow: "0 1px 3px rgba(0, 0, 0, 0.1)",
        fontSize: "14px",
        alignSelf: "flex-start", // Align other user's messages to the left
    },
    timestamp: {
        fontSize: "12px",
        color: "#777",
        marginTop: "5px",
    },
    inputContainer: {
        display: "flex",
        alignItems: "center",
        gap: "10px",
    },
    input: {
        width: "100%",
        padding: "10px",
        fontSize: "16px",
        borderRadius: "5px",
        border: "1px solid #ccc",
        boxSizing: "border-box",
    },
    sendButton: {
        padding: "10px 20px",
        fontSize: "16px",
        backgroundColor: "#007bff",
        color: "#fff",
        border: "none",
        borderRadius: "5px",
        cursor: "pointer",
        transition: "background-color 0.3s",
    },
};

export default ChatWindow;
