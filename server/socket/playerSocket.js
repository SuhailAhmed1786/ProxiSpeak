const express = require("express");
const http = require("http");
const cors = require("cors");
const { Server } = require("socket.io");
const app = express();
const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: "*",
    },
});


const players = new Map();

io.on("connection", (socket) => {
    console.log("Player connected:", socket.id);

    // Create player
    const newPlayer = {
        playerId: socket.id,
        x: 200,
        y: 200,
        name: `Player-${socket.id.substring(0, 4)}`,
    };

    players.set(socket.id, newPlayer);

    // Send all existing players to newly connected player
    socket.emit(
        "players:list",
        Array.from(players.values())
    );

    // Tell other players that a new player joined
    socket.broadcast.emit(
        "player:join",
        newPlayer
    );

    // ------------------------------------------
    // PLAYER MOVEMENT
    // ------------------------------------------

    socket.on("player:move", (data) => {
        const player = players.get(socket.id);

        if (!player) {
            return;
        }

        // Update server position
        player.x = data.x;
        player.y = data.y;

        if (data.name) {
            player.name = data.name;
        }

        // Send movement to everyone except sender
        socket.broadcast.emit(
            "player:move",
            {
                playerId: socket.id,
                x: player.x,
                y: player.y,
                name: player.name,
            }
        );
    });

    // ------------------------------------------
    // PLAYER DISCONNECT
    // ------------------------------------------

    socket.on("disconnect", () => {
        console.log(
            "Player disconnected:",
            socket.id
        );

        players.delete(socket.id);

        socket.broadcast.emit(
            "player:leave",
            {
                playerId: socket.id,
            }
        );
    });
});