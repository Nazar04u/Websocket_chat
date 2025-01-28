import React, { useState, useEffect } from "react";
import Cookies from "js-cookie";
import axios from "axios";

function GroupChatList({ currentUser, onSelectGroup }) {
    const [groupChats, setGroupChats] = useState([]); // Initial state is an empty array
    const [newGroupName, setNewGroupName] = useState("");
    const [websocket, setWebsocket] = useState(null);

    useEffect(() => {
        // Fetch all group chats from the backend
        const access_token = Cookies.get("access_token");
        const csrf_token = localStorage.getItem("csrf_token");
    
        fetch("http://localhost:8008/groups/", {
            method: "GET",
            headers: {
                "Authorization": `Bearer ${access_token}`,
                "X-CSRF-TOKEN": csrf_token, // Include CSRF token here
            },
            credentials: "include" // Include cookies if you are using session-based authentication
        })
            .then((res) => res.json())
            .then((data) => {
                if (Array.isArray(data)) {
                    setGroupChats(data);
                } else {
                    console.error("Expected an array of groups but got:", data);
                }
            })
            .catch((err) => console.error("Error fetching groups:", err));
    
        // Cleanup WebSocket connection when the component unmounts
        return () => {
            if (websocket) {
                websocket.close();
            }
        };
    }, []);

    const createGroupChat = () => {
        console.log("Creating Group chat");
    
        const access_token = Cookies.get("access_token");
        const csrf_token = localStorage.getItem("csrf_token");
    
        if (!access_token) {
            console.error("No access token available");
            return;
        }
    
        // Only send group_name (admin_id is derived from the token in backend)
        axios.post(
            "http://localhost:8008/groups/create",
            {
                group_name: "newGroupName", // Only send the group name
            },
            {
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${access_token}`, // Sending access token in headers
                    "X-CSRF-TOKEN": csrf_token, // CSRF token to prevent cross-site request forgery
                },
                withCredentials: true, // Include cookies if needed
            }
        )
        .then((response) => {
            const data = response.data;
            if (data.detail) {
                console.error("Error:", data.detail);
                return;
            }
            console.log("Group created:", data);
            setGroupChats((prev) => [...prev, data]); // Add the new group to the list
            setNewGroupName(""); // Clear input after creating the group
        })
        .catch((error) => {
            if (error.response) {
                console.error("Error creating group:", error.response.data);
            } else {
                console.error("Error:", error.message);
            }
        });
        
    };
    

    const initiateWebSocketConnection = () => {
        // Assuming that you have access to CSRF token and access token
        const access_token = Cookies.get("access_token");
        const csrf_token = localStorage.getItem("csrf_token");

        const ws = new WebSocket("ws://localhost:8008/ws");

        ws.onopen = () => {
            console.log("WebSocket connected");
            // Send authentication data once connected
            ws.send(
                JSON.stringify({
                    access_token: access_token,
                    csrf_token: csrf_token,
                })
            );
        };

        ws.onmessage = (event) => {
            const message = JSON.parse(event.data);
            // Handle incoming messages
            console.log("Message received:", message);
        };

        ws.onerror = (error) => {
            console.error("WebSocket error:", error);
        };

        ws.onclose = () => {
            console.log("WebSocket closed");
        };

        setWebsocket(ws);  // Store WebSocket connection in state
    };

    const handleJoinGroup = (group) => {
        // Handle logic to join the group (could involve sending a WebSocket message to join)
        onSelectGroup(group); // This will set the selected group in the parent component
        initiateWebSocketConnection(); // Optionally, reinitiate WebSocket connection for the selected group
    };

    return (
        <div>
            <h2>Group Chats</h2>
            <input
                type="text"
                value={newGroupName}
                onChange={(e) => setNewGroupName(e.target.value)}
                placeholder="Group Name"
            />
            <button onClick={createGroupChat}>Create Group</button>
            <ul>
                {groupChats.length > 0 ? (
                    groupChats.map((group) => (
                        <li key={group.id}>
                            {group.name}{" "}
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
