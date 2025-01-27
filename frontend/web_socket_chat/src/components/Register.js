import React, { useState } from "react";
import axios from "axios";

function Register() {
    const [username, setUsername] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState(null);
    const [success, setSuccess] = useState(false);

    const handleFormSubmit = async (e) => {
        e.preventDefault(); // Prevent the form from refreshing the page
        setError(null); // Reset any previous errors
        setSuccess(false); // Reset the success state

        try {
            const response = await axios.post("http://localhost:8008/register/", {
                username,
                email,
                password,
            });

            console.log("User registered successfully:", response.data);
            setSuccess(true); // Indicate successful registration
            setUsername("");
            setEmail("");
            setPassword("");
        } catch (err) {
            console.error("Error during registration:", err.response?.data || err);
            setError(err.response?.data?.detail || "An error occurred. Please try again.");
        }
    };

    return (
        <div>
            <h2>Register</h2>
            <form onSubmit={handleFormSubmit}>
                <div>
                    <label>Username</label>
                    <input
                        type="text"
                        placeholder="Enter your username"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        required
                    />
                </div>
                <div>
                    <label>Email</label>
                    <input
                        type="email"
                        placeholder="Enter your email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                    />
                </div>
                <div>
                    <label>Password</label>
                    <input
                        type="password"
                        placeholder="Enter your password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                    />
                </div>
                <button type="submit">Register</button>
            </form>
            {error && <div style={{ color: "red" }}>{error}</div>}
            {success && <div style={{ color: "green" }}>Registration successful!</div>}
        </div>
    );
}

export default Register;
