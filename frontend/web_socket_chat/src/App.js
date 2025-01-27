import React, { useState, useEffect } from "react";
import Login from "./components/Login";
import Register from "./components/Register";
import UserList from "./components/UserList";
import ChatWindow from "./components/ChatWindow";

function App() {
    const [currentPage, setCurrentPage] = useState("login"); // Default to "login"
    const [currentUser, setCurrentUser] = useState(null); // Current logged-in user
    const [chatUser, setChatUser] = useState(null); // User to chat with
    const [userList, setUserList] = useState([]); // List of all users

    useEffect(() => {
        if (currentPage === "websocket") {
            // Fetch all users when on WebSocket page
            fetch("http://localhost:8008/users/") // Backend endpoint to fetch all users
                .then((res) => res.json())
                .then((data) => setUserList(data))
                .catch((err) => console.error("Error fetching users:", err));
        }
    }, [currentPage]);

    const handleLogout = () => {
        setCurrentUser(null);
        setCurrentPage("login");
        setChatUser(null);
        // Optionally, clear cookies or tokens from storage
        localStorage.clear();
    };

    const handleMessageClick = (user) => {
        setChatUser(user); // Open chat with the selected user
    };

    return (
        <div style={styles.container}>
            <nav style={styles.navbar}>
                {!currentUser ? (
                    <>
                        <button
                            onClick={() => setCurrentPage("login")}
                            style={styles.navButton}
                        >
                            Login
                        </button>
                        <button
                            onClick={() => setCurrentPage("register")}
                            style={styles.navButton}
                        >
                            Register
                        </button>
                    </>
                ) : (
                    <>
                        <button
                            onClick={() => setCurrentPage("websocket")}
                            style={styles.navButton}
                        >
                            WebSocket
                        </button>
                        <button onClick={handleLogout} style={styles.navButton}>
                            Logout
                        </button>
                    </>
                )}
            </nav>

            <div style={styles.pageContent}>
                {currentPage === "login" && <Login setCurrentUser={setCurrentUser} />}
                {currentPage === "register" && <Register setCurrentUser={setCurrentUser} />}
                {currentPage === "websocket" && currentUser && (
                    <div style={styles.websocketContainer}>
                        <UserList
                            users={userList}
                            onMessageClick={setChatUser}
                            currentUser={currentUser}
                        />
                        {chatUser && (
                            <ChatWindow currentUser={currentUser} chatUser={chatUser} />
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}

const styles = {
    container: {
        fontFamily: "'Arial', sans-serif",
        backgroundColor: "#f4f4f9",
        minHeight: "100vh",
        padding: "20px",
    },
    navbar: {
        backgroundColor: "#007bff",
        color: "#fff",
        display: "flex",
        justifyContent: "center",
        padding: "15px 0",
        borderRadius: "6px",
        boxShadow: "0 4px 8px rgba(0, 0, 0, 0.1)",
    },
    navButton: {
        backgroundColor: "#fff",
        color: "#007bff",
        border: "1px solid #007bff",
        borderRadius: "4px",
        padding: "8px 16px",
        margin: "0 10px",
        cursor: "pointer",
        fontSize: "16px",
        transition: "background-color 0.3s, transform 0.2s",
    },
    navButtonHover: {
        backgroundColor: "#0056b3",
        color: "#fff",
        transform: "scale(1.05)",
    },
    pageContent: {
        marginTop: "30px",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
    },
    websocketContainer: {
        display: "flex",
        justifyContent: "space-between",
        alignItems: "flex-start",
        width: "100%",
        maxWidth: "1000px",
    },
};

export default App;
