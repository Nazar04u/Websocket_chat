import React from "react";

function UserList({ users, onMessageClick }) {
    return (
        <div style={styles.container}>
            <h2 style={styles.header}>All Users</h2>
            <ul style={styles.userList}>
                {users.map((user) => (
                    <li key={user.id} style={styles.userItem}>
                        <span style={styles.username}>{user.username}</span>
                        <button
                            onClick={() => onMessageClick(user)}
                            style={styles.messageButton}
                        >
                            Message
                        </button>
                    </li>
                ))}
            </ul>
        </div>
    );
}

const styles = {
    container: {
        padding: "20px",
        width: "50%",
        maxWidth: "1000px",
        margin: "0 auto",
        backgroundColor: "#f9f9f9",
        borderRadius: "8px",
        boxShadow: "0 4px 8px rgba(0, 0, 0, 0.1)",
    },
    header: {
        fontSize: "24px",
        color: "#333",
        textAlign: "center",
        marginBottom: "20px",
    },
    userList: {
        listStyleType: "none",
        padding: 0,
    },
    userItem: {
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        padding: "12px",
        marginBottom: "10px",
        backgroundColor: "#fff",
        borderRadius: "6px",
        boxShadow: "0 2px 4px rgba(0, 0, 0, 0.1)",
        transition: "transform 0.3s ease",
    },
    userItemHover: {
        transform: "scale(1.05)",
    },
    username: {
        fontSize: "18px",
        color: "#333",
    },
    messageButton: {
        padding: "8px 16px",
        fontSize: "14px",
        color: "#fff",
        backgroundColor: "#007bff",
        border: "none",
        borderRadius: "4px",
        cursor: "pointer",
        transition: "background-color 0.3s, transform 0.3s",
    },
    messageButtonHover: {
        backgroundColor: "#0056b3",
        transform: "scale(1.05)",
    },
};

export default UserList;
