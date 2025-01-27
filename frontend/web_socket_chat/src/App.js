import React, { useState, useEffect } from "react";
import Login from "./components/Login";
import Register from "./components/Register";
import UserList from "./components/UserList";
import ChatWindow from "./components/ChatWindow";

function App() {
    const [currentPage, setCurrentPage] = useState("login"); // Default to "register"
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
        <div>
            <nav>
                {!currentUser ? (
                    <>
                        <button onClick={() => setCurrentPage("login")}>Login</button>
                        <button onClick={() => setCurrentPage("register")}>Register</button>
                    </>
                ) : (
                    <>
                        <button onClick={() => setCurrentPage("websocket")}>WebSocket</button>
                        <button onClick={handleLogout}>Logout</button>
                    </>
                )}
            </nav>

            {currentPage === "login" && <Login setCurrentUser={setCurrentUser} />}
            {currentPage === "register" && <Register setCurrentUser={setCurrentUser} />}
            {currentPage === "websocket" && currentUser && (
                <div>
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
    );
}

export default App;
