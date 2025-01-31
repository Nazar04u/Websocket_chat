import React, { useState, useEffect } from "react";
import Cookies from "js-cookie";
import axios from "axios";

function GroupChatList({ currentUser, onSelectGroup }) {
    const [groupChats, setGroupChats] = useState([]);
    const [newGroupName, setNewGroupName] = useState("");
    const [adminGroups, setAdminGroups] = useState(new Set());

    useEffect(() => {
        if (!currentUser) return;

        const access_token = Cookies.get("access_token");
        const csrf_token = localStorage.getItem("csrf_token");

        if (!access_token) {
            console.error("User is not authenticated. Please log in.");
            return;
        }

        axios
            .get("http://localhost:8008/groups/", {
                headers: {
                    Authorization: `Bearer ${access_token}`,
                    "X-CSRF-TOKEN": csrf_token,
                },
            })
            .then((response) => {
                if (Array.isArray(response.data)) {
                    setGroupChats(response.data);
                    checkAdminGroups(response.data);
                } else {
                    console.error("Unexpected response format:", response.data);
                }
            })
            .catch((error) => {
                console.error("Error fetching groups:", error.response || error.message);
            });
    }, [currentUser]);

    const checkAdminGroups = (groups) => {
        const adminSet = new Set();
        groups.forEach((group) => {
            checkIfAdmin(group.group_name);
        });
    };

    const checkIfAdmin = (groupName) => {
        const access_token = Cookies.get("access_token");
        const csrf_token = localStorage.getItem("csrf_token");

        axios
            .get(`http://localhost:8008/${groupName}/check_admin/${currentUser.username}`, {
                headers: {
                    Authorization: `Bearer ${access_token}`,
                    "X-CSRF-TOKEN": csrf_token,
                },
            })
            .then((response) => {
                if (response.data.admin) {
                    setAdminGroups((prev) => new Set(prev).add(groupName));
                }
            })
            .catch((error) => {
                console.error("Error checking admin status:", error.response || error.message);
            });
    };

    const createGroupChat = () => {
        const access_token = Cookies.get("access_token");
        const csrf_token = localStorage.getItem("csrf_token");

        if (!access_token) {
            console.error("User is not authenticated. Please log in.");
            return;
        }

        if (!csrf_token) {
            console.error("CSRF token is missing. Ensure it is set.");
            return;
        }

        if (!newGroupName.trim()) {
            console.error("Group name cannot be empty.");
            return;
        }

        const adminUsername = currentUser?.username;
        if (!adminUsername) {
            console.error("Admin username is required.");
            return;
        }

        axios
            .post(
                "http://localhost:8008/group_create/",
                { group_name: newGroupName, admin_username: adminUsername },
                {
                    headers: {
                        Authorization: `Bearer ${access_token}`,
                        "Content-Type": "application/json",
                        "X-CSRF-TOKEN": csrf_token,
                    },
                }
            )
            .then((response) => {
                console.log("Group created successfully:", response.data);
                setGroupChats((prev) => [...prev, response.data]);
                setNewGroupName("");
                checkAdminGroups([...groupChats, response.data]);
            })
            .catch((error) => {
                console.error("Error creating group:", error.response?.data?.detail || error.message);
            });
    };

    const deleteGroup = async (groupName) => {
        if (!window.confirm(`Are you sure you want to delete "${groupName}"?`)) return;

        const access_token = Cookies.get("access_token");
        const csrf_token = localStorage.getItem("csrf_token");

        try {
            const response = await axios.delete(`http://localhost:8008/group/${groupName}/delete/${currentUser.username}`, {
                headers: {
                    Authorization: `Bearer ${access_token}`,
                    "X-CSRF-TOKEN": csrf_token,
                },
            });

            if (response.status === 200) {
                alert(`Group "${groupName}" deleted successfully.`);
                setGroupChats((prev) => prev.filter((group) => group.group_name !== groupName));
                setAdminGroups((prev) => {
                    const newSet = new Set(prev);
                    newSet.delete(groupName);
                    return newSet;
                });
            }
        } catch (error) {
            console.error("Error deleting group:", error.response?.data?.detail || error.message);
        }
    };

    const handleJoinGroup = (group) => {
        console.log("Join button clicked for:", group);
        if (typeof onSelectGroup !== "function") {
            console.error("onSelectGroup is not a function or is undefined.");
            return;
        }
        onSelectGroup(group);
    };

    return (
        <div style={styles.container}>
            <h2 style={styles.header}>Group Chats</h2>

            <div style={styles.formContainer}>
                <input
                    type="text"
                    value={newGroupName}
                    onChange={(e) => setNewGroupName(e.target.value)}
                    placeholder="Enter group name"
                    style={styles.input}
                />
                <button onClick={createGroupChat} style={styles.createButton}>Create Group</button>
            </div>

            <ul style={styles.groupList}>
                {groupChats.length > 0 ? (
                    groupChats.map((group) => (
                        <li key={group.id || group.group_name} style={styles.groupItem}>
                            {group.group_name}{" "}
                            <button onClick={() => handleJoinGroup(group)} style={styles.joinButton}>Join</button>
                            {adminGroups.has(group.group_name) && (
                                <button
                                    onClick={() => deleteGroup(group.group_name)}
                                    style={styles.deleteButton}
                                >
                                    Delete
                                </button>
                            )}
                        </li>
                    ))
                ) : (
                    <p style={styles.noGroupsText}>Loading groups or no groups available. Please create one!</p>
                )}
            </ul>
        </div>
    );
}

const styles = {
    container: {
        padding: "20px",
        backgroundColor: "#f4f7fa",
        borderRadius: "8px",
        boxShadow: "0 2px 10px rgba(0, 0, 0, 0.1)",
        maxWidth: "600px",
        margin: "auto",
    },
    header: {
        fontSize: "24px",
        color: "#333",
        marginBottom: "20px",
        textAlign: "center",
    },
    formContainer: {
        display: "flex",
        marginBottom: "20px",
        justifyContent: "center",
        gap: "10px",
    },
    input: {
        padding: "10px",
        fontSize: "16px",
        borderRadius: "5px",
        border: "1px solid #ccc",
        width: "70%",
    },
    createButton: {
        padding: "10px 20px",
        backgroundColor: "#007bff",
        color: "white",
        borderRadius: "5px",
        border: "none",
        cursor: "pointer",
        transition: "background-color 0.3s",
    },
    createButtonHover: {
        backgroundColor: "#0056b3",
    },
    groupList: {
        listStyleType: "none",
        padding: "0",
    },
    groupItem: {
        backgroundColor: "#fff",
        padding: "10px",
        borderRadius: "8px",
        marginBottom: "10px",
        boxShadow: "0 1px 5px rgba(0, 0, 0, 0.1)",
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
    },
    joinButton: {
        padding: "5px 10px",
        backgroundColor: "#28a745",
        color: "white",
        borderRadius: "5px",
        border: "none",
        cursor: "pointer",
    },
    deleteButton: {
        padding: "5px 10px",
        backgroundColor: "#dc3545",
        color: "white",
        borderRadius: "5px",
        border: "none",
        cursor: "pointer",
        transition: "background-color 0.3s",
    },
    deleteButtonHover: {
        backgroundColor: "#c82333",
    },
    noGroupsText: {
        textAlign: "center",
        color: "#888",
        fontStyle: "italic",
    },
};

export default GroupChatList;
