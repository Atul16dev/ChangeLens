import { useEffect, useState } from "react";
import "./styles.css";

export default function App() {
  const [users, setUsers] = useState([]);

  useEffect(() => {
    fetch("/api/users")
      .then((response) => response.json())
      .then(setUsers);
  }, []);

  return <main>{users.map((user) => <p key={user._id}>{user.name}</p>)}</main>;
}
