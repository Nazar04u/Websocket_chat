import React, { useState, useEffect } from "react";
import Cookies from "js-cookie";

function GroupChatWindow({ currentUser, group }) {
    const [messages, setMessages] = useState([]);
    const [newMessage, setNewMessage] = useState("");
    const [ws, setWs] = useState(null);
    const [showUserList, setShowUserList] = useState(false);
    const [showMembers, setShowMembers] = useState(false);
    const [availableUsers, setAvailableUsers] = useState([]);
    const [groupMembers, setGroupMembers] = useState([]);
    const [allUsers, setAllUsers] = useState([]);
    const [isAdmin, setIsAdmin] = useState(false);

    useEffect(() => {
        fetchAllUsers();
        fetchGroupMembers();
    }, [group.group_name]);

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

    const fetchGroupMembers = async () => {
        try {
            const response = await fetch(`http://localhost:8008/group/${group.group_name}/members`);
            const data = await response.json();
            console.log(data)
            if (data.members) {
                setGroupMembers(data.members);
                filterAvailableUsers(data.members);
                checkAdminStatus(data.members);
            }
        } catch (error) {
            console.error("Error fetching group members:", error);
        }
    };

    const filterAvailableUsers = (members) => {
        if (!allUsers.length) return;
        const groupUserIds = members.map(user => user.id);
        const nonGroupUsers = allUsers.filter(user => !groupUserIds.includes(user.id));
        setAvailableUsers(nonGroupUsers);
    };

    const checkAdminStatus = async () => {
        try {
            const response = await fetch(`http://localhost:8008/${group.group_name}/check_admin/${currentUser.username}`);
            const data = await response.json();
            console.log(data)
            setIsAdmin(data.admin);
        } catch (error) {
            console.error("Error checking admin status:", error);
            setIsAdmin(false);
        }
    };
    
    useEffect(() => {
        if (showMembers) {
            checkAdminStatus();
            fetchGroupMembers();
        }
    }, [showMembers]);

    useEffect(() => {
        filterAvailableUsers(groupMembers);
    }, [allUsers, groupMembers]);

    useEffect(() => {
        setMessages([]);
        fetchGroupMembers();

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
    }, [group.group_name]);

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
                        group_name: group.group_name,
                        user_id: userId,
                        adder_name: currentUser.username,
                    },
                })
            );

            const addedUser = allUsers.find(user => user.id === userId);
            if (addedUser) {
                setGroupMembers([...groupMembers, addedUser]);
                setAvailableUsers(availableUsers.filter(user => user.id !== userId));
            }
        }
    };

    const removeUserFromGroup = (userId) => {
        if (ws && ws.readyState === WebSocket.OPEN) {
            ws.send(
                JSON.stringify({
                    action: "remove_user_from_group_chat",
                    data: {
                        group_name: group.group_name,
                        user_id: userId,
                        admin_name: currentUser.username,
                    },
                })
            );

            setGroupMembers(groupMembers.filter(user => user.id !== userId));
        }
    };

    return (
        <div style={styles.chatContainer}>
            <h3 style={styles.groupTitle}>{group.group_name}</h3>

            <div style={styles.buttonContainer}>
                <button style={styles.usersButton} onClick={() => setShowMembers(!showMembers)}>
                    Users
                </button>
                <button style={styles.addUserButton} onClick={() => setShowUserList(!showUserList)}>
                    Add User
                </button>
            </div>

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

            {showMembers && (
                <div style={styles.memberList}>
                    {groupMembers.map((user) => (
                        <div key={user.id} style={styles.memberItem}>
                            <span>
                                {user.username} {user.username === currentUser.username ? "(You)" : ""}
                            </span>
                            {isAdmin && user.username !== currentUser.username && (
                                <button style={styles.removeButton} onClick={() => removeUserFromGroup(user.id)}>
                                    Remove
                                </button>
                            )}
                        </div>
                    ))}
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
        width: "100%",
        maxWidth: "600px",
        height: "500px",
        borderRadius: "12px",
        backgroundColor: "#f8f9fa",
        boxShadow: "0 6px 12px rgba(0, 0, 0, 0.2)",
        padding: "15px",
    },
    groupTitle: {
        textAlign: "center",
        fontSize: "22px",
        fontWeight: "bold",
        color: "#0056b3",
        marginBottom: "10px",
    },
    buttonContainer: {
        display: "flex",
        justifyContent: "space-between",
        marginBottom: "10px",
    },
    usersButton: {
        backgroundColor: "#007bff",
        color: "white",
        padding: "8px 15px",
        borderRadius: "8px",
        cursor: "pointer",
        fontSize: "14px",
        border: "none",
    },
    addUserButton: {
        backgroundColor: "#28a745",
        color: "white",
        padding: "8px 15px",
        borderRadius: "8px",
        cursor: "pointer",
        fontSize: "14px",
        border: "none",
    },
    userListContainer: {
        maxHeight: "180px",
        overflowY: "auto",
        backgroundColor: "#fff",
        padding: "10px",
        borderRadius: "8px",
        boxShadow: "0 4px 8px rgba(0, 0, 0, 0.1)",
    },
    userItem: {
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        padding: "8px",
        borderBottom: "1px solid #ddd",
    },
    addButton: {
        backgroundColor: "#007bff",
        color: "white",
        padding: "5px 10px",
        borderRadius: "6px",
        cursor: "pointer",
        fontSize: "12px",
        border: "none",
    },
    noUsersText: {
        textAlign: "center",
        color: "#888",
        fontSize: "14px",
        padding: "10px",
    },
    memberList: {
        backgroundColor: "#fff",
        borderRadius: "8px",
        padding: "10px",
        maxHeight: "180px",
        overflowY: "auto",
        boxShadow: "0 4px 8px rgba(0, 0, 0, 0.1)",
    },
    memberItem: {
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        padding: "8px",
        borderBottom: "1px solid #ddd",
    },
    removeButton: {
        backgroundColor: "#dc3545",
        color: "white",
        padding: "5px 10px",
        borderRadius: "6px",
        cursor: "pointer",
        fontSize: "12px",
        border: "none",
    },
    messageContainer: {
        flex: 1,
        overflowY: "auto",
        padding: "10px",
        backgroundColor: "#e9ecef",
        borderRadius: "8px",
        marginBottom: "10px",
    },
    myMessage: {
        alignSelf: "flex-end",
        backgroundColor: "#007bff",
        color: "white",
        padding: "8px 12px",
        borderRadius: "8px",
        marginBottom: "5px",
        maxWidth: "75%",
    },
    otherMessage: {
        alignSelf: "flex-start",
        backgroundColor: "#f1f1f1",
        color: "black",
        padding: "8px 12px",
        borderRadius: "8px",
        marginBottom: "5px",
        maxWidth: "75%",
    },
    senderName: {
        fontWeight: "bold",
        fontSize: "12px",
    },
    messageText: {
        fontSize: "14px",
        marginTop: "2px",
    },
    inputContainer: {
        display: "flex",
        marginTop: "10px",
        alignItems: "center",
        borderTop: "1px solid #ddd",
        paddingTop: "10px",
    },
    inputField: {
        flex: 1,
        padding: "8px",
        borderRadius: "6px",
        border: "1px solid #ccc",
        marginRight: "10px",
    },
    sendButton: {
        backgroundColor: "#007bff",
        color: "white",
        padding: "8px 12px",
        borderRadius: "6px",
        cursor: "pointer",
        fontSize: "14px",
        border: "none",
    },
};

export default GroupChatWindow;
