import React, { useState, useEffect } from "react";
import Cookies from "js-cookie";
import axios from "axios";

function GroupChatList({ currentUser, onSelectGroup }) {
    const [groupChats, setGroupChats] = useState([]); // Store fetched groups
    const [newGroupName, setNewGroupName] = useState(""); // Store new group name

    useEffect(() => {
        if (!currentUser) return; // Avoid fetching if no user

        const access_token = Cookies.get("access_token");
        const csrf_token = localStorage.getItem("csrf_token");

        if (!access_token) {
            console.error("User is not authenticated. Please log in.");
            return;
        }

        // Fetch all group chats
        axios
            .get("http://localhost:8008/groups/", {
                headers: {
                    Authorization: `Bearer ${access_token}`,
                    "X-CSRF-TOKEN": csrf_token,
                },
            })
            .then((response) => {
                if (Array.isArray(response.data)) {
                    setGroupChats(response.data); // Update state with fetched groups
                } else {
                    console.error("Unexpected response format:", response.data);
                }
            })
            .catch((error) => {
                console.error("Error fetching groups:", error.response || error.message);
            });
    }, [currentUser]); // Fetch groups when currentUser changes

    // Log updates to groupChats
    useEffect(() => {
    }, [groupChats]);

    // Create a new group
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

        const adminUsername = currentUser?.username; // Get admin's username
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
                setGroupChats((prev) => [...prev, response.data]); // Add new group to list
                setNewGroupName(""); // Clear input field
            })
            .catch((error) => {
                console.error("Error creating group:", error.response?.data?.detail || error.message);
            });
    };

    // Select a group to join
    const handleJoinGroup = (group) => {
        onSelectGroup(group);
    };

    return (
        <div>
            <h2>Group Chats</h2>

            {/* Create New Group */}
            <input
                type="text"
                value={newGroupName}
                onChange={(e) => setNewGroupName(e.target.value)}
                placeholder="Enter group name"
            />
            <button onClick={createGroupChat}>Create Group</button>

            {/* Display Groups */}
            <ul>
                {groupChats.length > 0 ? (
                    groupChats.map((group) => (
                        <li key={group.group_name}>
                            {group.group_name}{" "}
                            <button onClick={() => handleJoinGroup(group)}>Join</button>
                        </li>
                    ))
                ) : (
                    <p>Loading groups or no groups available. Please create one!</p>
                )}
            </ul>
        </div>
    );
}

export default GroupChatList;
