import React, { useState, useEffect } from "react";
import Cookies from "js-cookie";

function GroupChatWindow({ currentUser, group }) {
    const [messages, setMessages] = useState([]);
    const [newMessage, setNewMessage] = useState("");
    const [ws, setWs] = useState(null);
    const [showUserList, setShowUserList] = useState(false);
    const [availableUsers, setAvailableUsers] = useState([]);
    const [groupMembers, setGroupMembers] = useState([]);
    const [allUsers, setAllUsers] = useState([]);

    useEffect(() => {
        fetchAllUsers();
        fetchGroupMembers();
    }, [group.id]);

    // Fetch all users
    const fetchAllUsers = async () => {
        try {
            const response = await fetch("http://localhost:8008/all_user");
            const data = await response.json();
            if (data.users) {
                setAllUsers(data.users);
            }
        } catch (error) {
            console.error("Error fetching all users:", error);
        }
    };

    // Fetch current group members
    const fetchGroupMembers = async () => {
        try {
            const response = await fetch(`http://localhost:8008/group/${group.group_name}/members`);
            const data = await response.json();
            if (data.members) {
                setGroupMembers(data.members);
                filterAvailableUsers(data.members);
            }
        } catch (error) {
            console.error("Error fetching group members:", error);
        }
    };

    // Filter users who are not in the group
    const filterAvailableUsers = (members) => {
        if (!allUsers.length) return;
        const groupUserIds = members.map(user => user.id);
        const nonGroupUsers = allUsers.filter(user => !groupUserIds.includes(user.id));
        setAvailableUsers(nonGroupUsers);
    };

    // Recalculate available users when allUsers updates
    useEffect(() => {
        filterAvailableUsers(groupMembers);
    }, [allUsers, groupMembers]);

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
                        group_name: group.group_name,
                        user_name: currentUser.username,
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

    const addUserToGroup = (userId) => {
        if (ws && ws.readyState === WebSocket.OPEN) {
            ws.send(
                JSON.stringify({
                    action: "add_user_to_group_chat",
                    data: {
                        group_id: group.id,
                        user_id: userId,
                        adder_id: currentUser.id,
                    },
                })
            );

            // Optimistically update UI
            const addedUser = allUsers.find(user => user.id === userId);
            if (addedUser) {
                setGroupMembers([...groupMembers, addedUser]);
                setAvailableUsers(availableUsers.filter(user => user.id !== userId));
            }
        }
    };

    return (
        <div style={styles.chatContainer}>
            <h3 style={styles.groupTitle}>{group.group_name}</h3>
            <button style={styles.addUserButton} onClick={() => setShowUserList(!showUserList)}>
                Add User
            </button>
            {showUserList && (
                <div style={styles.userListContainer}>
                    {availableUsers.length > 0 ? (
                        availableUsers.map((user) => (
                            <div key={user.id} style={styles.userItem}>
                                <span>{user.username}</span>
                                <button style={styles.addButton} onClick={() => addUserToGroup(user.id)}>
                                    Add
                                </button>
                            </div>
                        ))
                    ) : (
                        <p style={styles.noUsersText}>No users available to add</p>
                    )}
                </div>
            )}
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
        height: "500px",
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
    addUserButton: {
        alignSelf: "center",
        backgroundColor: "#28a745",
        color: "white",
        padding: "8px 12px",
        border: "none",
        borderRadius: "6px",
        cursor: "pointer",
        marginBottom: "10px",
    },
    userListContainer: {
        backgroundColor: "#fff",
        border: "1px solid #ddd",
        borderRadius: "8px",
        padding: "10px",
        marginBottom: "10px",
        maxHeight: "150px",
        overflowY: "auto",
    },
    userItem: {
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        padding: "5px 10px",
        borderBottom: "1px solid #ddd",
    },
    addButton: {
        backgroundColor: "#007bff",
        color: "white",
        padding: "5px 10px",
        border: "none",
        borderRadius: "4px",
        cursor: "pointer",
    },
    noUsersText: {
        textAlign: "center",
        color: "#666",
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
    },
    sendButton: {
        marginLeft: "10px",
        padding: "8px 16px",
        backgroundColor: "#007bff",
        color: "#fff",
        border: "none",
        borderRadius: "6px",
    },
};

export default GroupChatWindow;
