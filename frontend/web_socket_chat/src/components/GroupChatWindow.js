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
            console.log(group)
            console.log(currentUser)
            websocket.send(
                JSON.stringify({
                    action: "join_group_chat",
                    data: {
                        group_name: group.group_name,
                        user_name: currentUser.username
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
                        group_id: group.group_name,
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
        <div style={styles.chatContainer}>
            <h3 style={styles.groupTitle}>{group.group_name}</h3>
            <div style={styles.messageContainer}>
                {messages.map((msg, idx) => (
                    <div
                        key={idx}
                        style={msg.sender_username === currentUser.username ? styles.myMessage : styles.otherMessage}
                    >
                        <strong style={styles.senderName}>{msg.sender_username}</strong>
                        <p style={styles.messageText}>{msg.content}</p>
                    </div>
                ))}
            </div>
            <div style={styles.inputContainer}>
                <input
                    type="text"
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    placeholder="Type a message..."
                    style={styles.inputField}
                />
                <button onClick={sendMessage} style={styles.sendButton}>Send</button>
            </div>
        </div>
    );
}

const styles = {
    chatContainer: {
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        width: "100%",
        maxWidth: "600px",
        height: "400px",
        borderRadius: "8px",
        backgroundColor: "#f8f9fa",
        boxShadow: "0 4px 8px rgba(0, 0, 0, 0.2)",
        padding: "10px",
    },
    groupTitle: {
        textAlign: "center",
        marginBottom: "10px",
        fontSize: "20px",
        fontWeight: "bold",
        color: "#007bff",
    },
    messageContainer: {
        flex: 1,
        overflowY: "auto",
        padding: "10px",
        display: "flex",
        flexDirection: "column",
    },
    myMessage: {
        alignSelf: "flex-end",
        backgroundColor: "#007bff",
        color: "#fff",
        padding: "8px",
        borderRadius: "12px",
        maxWidth: "70%",
        marginBottom: "5px",
    },
    otherMessage: {
        alignSelf: "flex-start",
        backgroundColor: "#e0e0e0",
        color: "#000",
        padding: "8px",
        borderRadius: "12px",
        maxWidth: "70%",
        marginBottom: "5px",
    },
    senderName: {
        fontSize: "12px",
        fontWeight: "bold",
    },
    messageText: {
        margin: "4px 0",
    },
    inputContainer: {
        display: "flex",
        alignItems: "center",
        padding: "10px",
        borderTop: "1px solid #ddd",
    },
    inputField: {
        flex: 1,
        padding: "8px",
        borderRadius: "6px",
        border: "1px solid #ccc",
        fontSize: "14px",
    },
    sendButton: {
        marginLeft: "10px",
        padding: "8px 16px",
        backgroundColor: "#007bff",
        color: "#fff",
        border: "none",
        borderRadius: "6px",
        cursor: "pointer",
        transition: "background-color 0.3s",
    },
};

export default GroupChatWindow;
