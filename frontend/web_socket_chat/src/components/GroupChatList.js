import React, { useState, useEffect } from "react";
import Cookies from "js-cookie";
import axios from "axios";

function GroupChatList({ currentUser, onSelectGroup }) {
    const [groupChats, setGroupChats] = useState([]);
    const [newGroupName, setNewGroupName] = useState("");

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
                } else {
                    console.error("Unexpected response format:", response.data);
                }
            })
            .catch((error) => {
                console.error("Error fetching groups:", error.response || error.message);
            });
    }, [currentUser]);

    useEffect(() => {
        console.log("Updated group chats:", groupChats);
    }, [groupChats]);

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
            })
            .catch((error) => {
                console.error("Error creating group:", error.response?.data?.detail || error.message);
            });
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
                        <li key={group.id || group.group_name}>
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
