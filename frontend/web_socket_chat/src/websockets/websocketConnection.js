import React, { useState } from "react";
import axios from "axios";

function WebSocketConnection() {
    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");
    const [messages, setMessages] = useState([]);
    const [error, setError] = useState(null);
    const [csrfToken, setCsrfToken] = useState("");

    const connectWebSocket = async () => {
        try {
            // Send login request
            const response = await axios.post("http://localhost:8008/login", {
                username,
                password,
            }, {
                withCredentials: true, // Ensure cookies are sent
            });
    
            const { csrf_token, access_token } = response.data;
            setCsrfToken(csrf_token);
            // Establish WebSocket connection
            const ws = new WebSocket("ws://localhost:8008/ws");
    
            ws.onopen = () => {
                // Send tokens when the connection opens
                ws.send(JSON.stringify({ csrf_token, access_token }));
                console.log("WebSocket connection opened.");
            };
    
            ws.onmessage = (event) => {
                const message = event.data;
                console.log("Message from server:", message);
                setMessages((prevMessages) => [...prevMessages, message]);
            };
    
            ws.onclose = () => {
                console.log("WebSocket connection closed.");
            };
    
            ws.onerror = (err) => {
                console.error("WebSocket error:", err);
            };
        } catch (err) {
            console.error("Failed to connect to WebSocket:", err.response?.data || err);
            setError("Failed to connect. Please check your credentials.");
        }
    };

    const handleFormSubmit = (e) => {
        e.preventDefault();
        connectWebSocket();
    };

    return (
        <div>
            <h2>WebSocket Login</h2>
            <form onSubmit={handleFormSubmit}>
                <input
                    type="text"
                    placeholder="Username"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    required
                />
                <input
                    type="password"
                    placeholder="Password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                />
                <button type="submit">Login and Connect to WebSocket</button>
            </form>
            {error && <div style={{ color: "red" }}>{error}</div>}
            <div>
                <h3>Messages</h3>
                <ul>
                    {messages.map((msg, index) => (
                        <li key={index}>{msg}</li>
                    ))}
                </ul>
            </div>
        </div>
    );
}

export default WebSocketConnection;
