import React from "react";

function UserList({ users, onMessageClick }) {
    return (
        <div>
            <h2>All Users</h2>
            <ul>
                {users.map((user) => (
                    <li key={user.id}>
                        {user.username}
                        <button onClick={() => onMessageClick(user)}>Message</button>
                    </li>
                ))}
            </ul>
        </div>
    );
}

export default UserList;
