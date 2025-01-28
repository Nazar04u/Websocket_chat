import React, { useState, useEffect } from "react";
import Cookies from "js-cookie";
import axios from "axios";

function GroupChatList({ currentUser, onSelectGroup }) {
    const [groupChats, setGroupChats] = useState([]); // Initial state is an empty array
    const [newGroupName, setNewGroupName] = useState(""); // State for new group name
    const [websocket, setWebsocket] = useState(null);

    useEffect(() => {
        const access_token = Cookies.get("access_token");

        // If no access token exists, redirect the user to login or show an error
        if (!access_token) {
            console.error("User is not authenticated. Please log in.");
            return;
        }

        // Fetch all group chats from the backend
        axios
            .get("http://localhost:8008/groups/", {
                headers: {
                    "Authorization": `Bearer ${access_token}`,
                },
            })
            .then((response) => {
                if (Array.isArray(response.data)) {
                    setGroupChats(response.data);
                } else {
                    console.error("Unexpected response format:", response.data);
                }
            })
            .catch((error) => {
                console.error("Error fetching groups:", error.response || error.message);
            });

        // Cleanup WebSocket connection when the component unmounts
        return () => {
            if (websocket) {
                websocket.close();
            }
        };
    }, []);

    const createGroupChat = () => {
        const access_token = Cookies.get("access_token");

        if (!access_token) {
            console.error("User is not authenticated. Please log in.");
            return;
        }

        if (!newGroupName) {
            console.error("Group name cannot be empty.");
            return;
        }

        const adminUsername = currentUser?.username; // Get admin's username from props or state

        if (!adminUsername) {
            console.error("Admin username is required.");
            return;
        }

        axios
            .post(
                "http://localhost:8008/group_create/",
                {
                    group_name: newGroupName,
                    admin_username: adminUsername,
                },
                {
                    headers: {
                        "Authorization": `Bearer ${access_token}`,
                        "Content-Type": "application/json",
                    },
                }
            )
            .then((response) => {
                console.log("Group created successfully:", response.data);
                setGroupChats((prev) => [...prev, response.data]); // Add new group to the state
                setNewGroupName(response.data.group_name); // Clear the input field
            })
            .catch((error) => {
                if (error.response) {
                    console.error("Error creating group:", error.response.data.detail);
                } else {
                    console.error("Error:", error.message);
                }
            });
    };

    const handleJoinGroup = (group) => {
        onSelectGroup(group); // Notify parent component about the selected group
        console.log(`Joined group: ${group.name}`);
    };

    return (
        <div>
            <h2>Group Chats</h2>
            <input
                type="text"
                value={newGroupName}
                onChange={(e) => setNewGroupName(e.target.value)}
                placeholder="Enter group name"
            />
            <button onClick={createGroupChat}>Create Group</button>
            <ul>
                {groupChats.length > 0 ? (
                    groupChats.map((group) => (
                        <li key={group.group_name}>
                            {group.group_name}{" "}
                            <button onClick={() => handleJoinGroup(group)}>Join</button>
                        </li>
                    ))
                ) : (
                    <p>No groups available. Please create one!</p>
                )}
            </ul>
        </div>
    );
}

export default GroupChatList;
