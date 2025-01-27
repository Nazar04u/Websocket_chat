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
            const access_token = response.data['access_token'];
            const csrf_token = response.data['csrf_token'];

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
        <div style={styles.container}>
            <div style={styles.formContainer}>
                <h2 style={styles.header}>Login</h2>
                {error && <p style={styles.error}>{error}</p>}
                <form onSubmit={handleLogin} style={styles.form}>
                    <input
                        type="text"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        placeholder="Username"
                        style={styles.input}
                    />
                    <br />
                    <input
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="Password"
                        style={styles.input}
                    />
                    <br />
                    <button type="submit" style={styles.button}>Login</button>
                </form>
            </div>
        </div>
    );
}

const styles = {
    container: {
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        height: "100vh",
        backgroundColor: "#f0f4f8",
    },
    formContainer: {
        backgroundColor: "#fff",
        padding: "30px",
        borderRadius: "8px",
        boxShadow: "0 4px 8px rgba(0, 0, 0, 0.1)",
        width: "100%",
        maxWidth: "400px",
        textAlign: "center",
    },
    header: {
        fontSize: "24px",
        color: "#333",
        marginBottom: "20px",
        fontWeight: "600",
    },
    error: {
        color: "red",
        fontSize: "14px",
        marginBottom: "20px",
    },
    form: {
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: "15px",
    },
    input: {
        width: "100%",
        padding: "12px",
        fontSize: "16px",
        borderRadius: "5px",
        border: "1px solid #ddd",
        boxSizing: "border-box",
        marginBottom: "10px",
    },
    button: {
        width: "100%",
        padding: "12px",
        fontSize: "16px",
        backgroundColor: "#007bff",
        color: "#fff",
        border: "none",
        borderRadius: "5px",
        cursor: "pointer",
        transition: "background-color 0.3s",
    },
};

// Optional: add a hover effect for the button
styles.buttonHover = {
    backgroundColor: "#0056b3",
};

export default Login;
