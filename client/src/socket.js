import { io } from "socket.io-client";

const socket = io("http://localhost:5000");

socket.emit("player:move", {
  x: avatar.x,
  y: avatar.y,
});


io.on("connection", (socket) => {
    console.log("Player connected:", socket.id);

    socket.on("player:move", (position) => {
        console.log("Player movement:", socket.id, position);
    });

    socket.on("disconnect", () => {
        console.log("Player disconnected:", socket.id);
    });
});




