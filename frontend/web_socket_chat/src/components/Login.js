import React, { useState } from "react";
import axios from "axios";
import Cookies from "js-cookie";

function Login({ setCurrentUser }) {
    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");

    const handleLogin = async (e) => {
        e.preventDefault(); // Prevent page refresh
        setError(""); // Clear any previous errors

        try {
            const response = await axios.post("http://localhost:8008/login/", {
                username,
                password,
            });
            const access_token  = response.data['access_token'];
            const csrf_token = response.data['csrf_token']

            // Mock storing tokens for now
            Cookies.set("access_token", access_token, { secure: true, sameSite: "strict" });
            localStorage.setItem("csrf_token", csrf_token);

            setCurrentUser({ username }); // Set the current user in the parent state
        } catch (err) {
            setError(
                err.response?.data?.detail || "An error occurred during login."
            );
        }
    };

    return (
        <div>
            <h2>Login</h2>
            {error && <p style={{ color: "red" }}>{error}</p>}
            <form onSubmit={handleLogin}>
                <input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="Username"
                />
                <br />
                <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Password"
                />
                <br />
                <button type="submit">Login</button>
            </form>
        </div>
    );
}

export default Login;
