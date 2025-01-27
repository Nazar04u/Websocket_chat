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
        <div style={styles.container}>
            <div style={styles.formContainer}>
                <h2 style={styles.header}>Register</h2>
                <form onSubmit={handleFormSubmit} style={styles.form}>
                    <div style={styles.formGroup}>
                        <label style={styles.label}>Username</label>
                        <input
                            type="text"
                            placeholder="Enter your username"
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            required
                            style={styles.input}
                        />
                    </div>
                    <div style={styles.formGroup}>
                        <label style={styles.label}>Email</label>
                        <input
                            type="email"
                            placeholder="Enter your email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                            style={styles.input}
                        />
                    </div>
                    <div style={styles.formGroup}>
                        <label style={styles.label}>Password</label>
                        <input
                            type="password"
                            placeholder="Enter your password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                            style={styles.input}
                        />
                    </div>
                    <button type="submit" style={styles.button}>Register</button>
                </form>
                {error && <div style={styles.error}>{error}</div>}
                {success && <div style={styles.success}>Registration successful!</div>}
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
        backgroundColor: "#f4f6f9",
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
    form: {
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: "15px",
    },
    formGroup: {
        width: "100%",
    },
    label: {
        fontSize: "14px",
        color: "#333",
        textAlign: "left",
        marginBottom: "5px",
        display: "block",
    },
    input: {
        width: "100%",
        padding: "12px",
        fontSize: "16px",
        borderRadius: "5px",
        border: "1px solid #ddd",
        boxSizing: "border-box",
        marginBottom: "15px",
    },
    button: {
        width: "100%",
        padding: "12px",
        fontSize: "16px",
        backgroundColor: "#28a745",
        color: "#fff",
        border: "none",
        borderRadius: "5px",
        cursor: "pointer",
        transition: "background-color 0.3s",
    },
    buttonHover: {
        backgroundColor: "#218838",
    },
    error: {
        color: "red",
        fontSize: "14px",
        marginTop: "10px",
    },
    success: {
        color: "green",
        fontSize: "14px",
        marginTop: "10px",
    },
};

export default Register;
