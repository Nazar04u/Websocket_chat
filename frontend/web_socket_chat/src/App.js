import React, { useState } from "react";
import WebSocketConnection from "./websockets/websocketConnection";

function App() {
    const [isLoggedIn, setIsLoggedIn] = useState(false);
    console.log(isLoggedIn)
    return (
        <div>
          <WebSocketConnection />
        </div>
    );
}

export default App;
