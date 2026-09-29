<<<<<<< HEAD:server/server.js
const express = require("express");
const http = require("http");
const cors = require("cors");
const { Server } = require("socket.io");
const { v4: uuidv4 } = require("uuid");
=======
>>>>>>> suhail:server/index.js

import express from "express";
// const http = require("http");
import http from "http";
// const cors = require("cors");
import cors from 'cors';
// const Player = require("./models/Player");
import Player from "./models/Player.js";
import { Server } from "socket.io";
import playerSocket from "./socket/playerSocket.js";
// const { v4: uuidv4 } = require("uuid");
import { v4 as uuidv4 } from "uuid";
import connectDB from './db.js';
// const connectDB = require("./db");

const app = express();
app.use(cors());
app.use(express.json());

const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
  },
});


// connect to MongoDB
connectDB();
playerSocket(io);

io.on("connection", (socket) => {
    console.log("Player connected:", socket.id);

    socket.on("player:move", (position) => {
        console.log("Player movement:", {
            playerId: socket.id,
            x: position.x,
            y: position.y,
        });

        // Send movement to other players
        socket.broadcast.emit("player:move", {
            playerId: socket.id,
            x: position.x,
            y: position.y,
        });
    });

    socket.on("disconnect", () => {
        console.log("Player disconnected:", socket.id);
    });
});

// map socket.id -> userId, so we know who disconnected
const socketToUser = {};

io.on("connection", (socket) => {
  console.log("Player connected:", socket.id);

  // 1. Client explicitly joins with a userId (or we generate one)
  socket.on("player:join", async ({ userId, x = 0, y = 0 } = {}) => {
    const finalUserId = userId || uuidv4();
    socketToUser[socket.id] = finalUserId;

    try {
      // upsert: create if new, update socketId/position if reconnecting
      const player = await Player.findOneAndUpdate(
        { userId: finalUserId },
        { userId: finalUserId, x, y, socketId: socket.id },
        { new: true, upsert: true },

        console.log("Player joined:", {
          userId: finalUserId,
          x,
          y
        }),
      );

      // send the current full player list to the newly joined client
      const allPlayers = await Player.find({});
      socket.emit("players:current", allPlayers);

      // tell everyone else a new player joined
      socket.broadcast.emit("player:new", player);

      // confirm to this client what their assigned id is
      socket.emit("player:joined", { userId: finalUserId, x, y });
    } catch (err) {
      console.error("player:join error:", err);
    }
  });

  // 2. Movement updates
  const lastDbWrite = {};

  socket.on("player:move", async ({ x, y }) => {
    const userId = socketToUser[socket.id];
    if (!userId) return;

    if (typeof x !== "number" || typeof y !== "number" || Number.isNaN(x) || Number.isNaN(y)) {
      console.warn(`Invalid move payload from ${socket.id}:`, { x, y });
      return;
    }

    // broadcast every frame for smooth motion
    socket.broadcast.emit("player:moved", { userId, x, y });

    // persist to Mongo at most every 100ms per user
    const now = Date.now();
    if (!lastDbWrite[userId] || now - lastDbWrite[userId] > 100) {
      lastDbWrite[userId] = now;
      try {
        await Player.findOneAndUpdate({ userId }, { x, y, socketId: socket.id });
      } catch (err) {
        console.error("player:move error:", err);
      }
    }
  });

  // 3. Explicit leave (optional — disconnect handles most cases)
  socket.on("player:leave", async () => {
    await removePlayer(socket);
  });

  // 4. Disconnect
  socket.on("disconnect", async () => {
    console.log("Player disconnected:", socket.id);
    await removePlayer(socket);
  });

  async function removePlayer(socket) {
    const userId = socketToUser[socket.id];
    if (!userId) return;

    try {
      await Player.deleteOne({ userId });
      delete socketToUser[socket.id];
      io.emit("player:left", { userId });
    } catch (err) {
      console.error("removePlayer error:", err);
    }
  }
});

<<<<<<< HEAD:server/server.js
app.get("/api/players", async (req, res) => {
  try {
    const players = await Player.find({});
    res.json(players);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch players" });
  }
});

const PORT = process.env.PORT || 5000;

server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
//server.js
=======
server.listen(5000, () => {
  console.log("Server running on port 5000");
});

>>>>>>> suhail:server/index.js
