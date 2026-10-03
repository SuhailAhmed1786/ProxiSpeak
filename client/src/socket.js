import { io } from "socket.io-client";

const socketUrl = import.meta.env.VITE_SOCKET_URL || "http://localhost:5000";
const socket = io(socketUrl);
export function getPersistentUserId() {
    let id = sessionStorage.getItem("proxispeak_userId");
    if (!id) {
        id = crypto.randomUUID();
        sessionStorage.setItem("proxispeak_userId", id);
    }
    return id;
}
export default socket;
//socket.js