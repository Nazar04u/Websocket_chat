import React, { useState } from "react";
import WebSocketConnection from "./websockets/websocketConnection";
import Register from "./components/Register";

function App() {
    const [currentPage, setCurrentPage] = useState("register"); // Default to "register"

    return (
        <div>
            <nav>
                <button onClick={() => setCurrentPage("register")}>Register</button>
                <button onClick={() => setCurrentPage("websocket")}>WebSocket</button>
            </nav>

            {currentPage === "register" && <Register />}
            {currentPage === "websocket" && <WebSocketConnection />}
        </div>
    );
}

export default App;
