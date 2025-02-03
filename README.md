# Python Test Assignment

## Overview
This project demonstrates a FastAPI-based and React application for chatting online(private and group chatting).
Using websocket technology it allows users to communicate with each other in real-time(near real-time) experience.

## Features
- RESTful APIs for managing websocket and http connection.
- Authorization of each user.
- Admin features for group chats.

---

## Getting Started

### Prerequisites
Ensure you have Python 3.10+, Node.js installed on your system.

### Installation

Follow these steps to install and run the application on Windows and macOS.

1. **Clone the Repository**
   ```bash
   git clone https://github.com/Nazar04u/Websocket_chat
   ```
   Open two terminals
   In the first one
   ```bash
   cd Websocket_chat/backend/
   ```
   In the second one
   ```bash
   cd Websocket_chat/frontend/web_socket_chat
   ```

2. **Create a Virtual Environment**
    In the first terminal enter
   ```bash
   #Windows
   python -m venv venv
   venv\Scripts\activate
   
   #MacOS
   python3 -m venv venv
   source venv/bin/activate
   ```


3. **Install Dependencies**
    In the first terminal:
   ```bash
   pip install -r requirements.txt
   ```
   In the second terminal:
   ```bash
   npm install
   ```

4. **Create a `.env` File**
   Create a `.env` file in backend folder in the project root and add your `SECRET_KEY`:
   ```plaintext
   SECRET_KEY=<your_secret_key>
   ```
   or just use for testing reason:
   ```plaintext
   SECRET_KEY=qwerty
   ```

5. **Apply Migrations**
   Apply the generated migration to create the database schema in first terminal:
   ```bash
   alembic upgrade head
   ```

6. **Run the Application**
    In the first terminal run:
   ```bash
   uvicorn app.main:app --port=8008 --reload
   ```
   In the second run:
   ```bash
   npm start
   ```
   Also open a second browser window(for example, Chrome and Firefox) and run also on the second browser
   to test as if two different cients using app at the same time.
    OR
   You can run two different ports.
   Just open new terminal and run
   ```bash
   npm start
   ```
   then click yes(it will open a client on a new port)

7. **Access API Documentation**
   Open your browser and navigate to [http://127.0.0.1:8008/docs](http://127.0.0.1:8008/docs) to explore the API endpoints.
   In register endpooint register user and then login.
   To use full app go to  [http://localhost:3000/](http://localhost:3000/)
---

### Notes

- Ensure you have `Python 3.10` or newer installed on your system.
- Install Node.js if you haven’t already, as it’s required to run the frontend.
- If you encounter any issues with permissions, try running commands with `sudo` (macOS) or as Administrator (Windows).
- To stop the application, press `Ctrl+C` in the terminal where the server is running.
