import React, { useState } from "react";

function AddUserToGroup({ groupId }) {
    const [userId, setUserId] = useState("");

    const addUser = () => {
        fetch(`http://localhost:8008/groups/${groupId}/add_user`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                user_id: userId,
                adder_id: currentUser.id,
            }),
        })
            .then((res) => {
                if (!res.ok) {
                    throw new Error("Error adding user to group");
                }
                return res.json();
            })
            .then((data) => {
                alert(`User added successfully!`);
            })
            .catch((err) => console.error(err));
    };

    return (
        <div>
            <h4>Add User to Group</h4>
            <input
                type="text"
                value={userId}
                onChange={(e) => setUserId(e.target.value)}
                placeholder="User ID"
            />
            <button onClick={addUser}>Add</button>
        </div>
    );
}

export default AddUserToGroup;
