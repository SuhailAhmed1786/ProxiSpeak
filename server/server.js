const express = require("express");
const http = require("http");
const cors = require("cors");
const { Server } = require("socket.io");
const { v4: uuidv4 } = require("uuid");

const connectDB = require("./db");
const Player = require("./models/Player");

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

connectDB();

const PROXIMITY_RADIUS = 100;
const socketToUser = {};      // socket.id -> userId
const playerPositions = {};   // userId -> { x, y }
const lastDbWrite = {};       // userId -> timestamp

function isNearby(userIdA, userIdB) {
  const a = playerPositions[userIdA];
  const b = playerPositions[userIdB];
  if (!a || !b) return false;

  const dx = a.x - b.x;
  const dy = a.y - b.y;
  return Math.hypot(dx, dy) <= PROXIMITY_RADIUS;
}

function getSocketIdForUser(userId) {
  return Object.keys(socketToUser).find(
    (socketId) => socketToUser[socketId] === userId
  );
}

async function removePlayer(socket) {
  const userId = socketToUser[socket.id];
  if (!userId) return;

  try {
    await Player.deleteOne({ userId });
    delete socketToUser[socket.id];
    delete playerPositions[userId];
    delete lastDbWrite[userId];
    io.emit("player:left", { userId });
  } catch (err) {
    console.error("removePlayer error:", err);
  }
}

io.on("connection", (socket) => {
  console.log("Player connected:", socket.id);

  socket.on("player:join", async ({ userId, x = 0, y = 0 } = {}) => {
    const finalUserId = userId || uuidv4();
    socketToUser[socket.id] = finalUserId;
    playerPositions[finalUserId] = { x, y };

    try {
      const player = await Player.findOneAndUpdate(
        { userId: finalUserId },
        { userId: finalUserId, x, y, socketId: socket.id },
        { new: true, upsert: true }
      );

      const allPlayers = await Player.find({});
      socket.emit("players:current", allPlayers);
      socket.broadcast.emit("player:new", player);
      socket.emit("player:joined", { userId: finalUserId, x, y });
    } catch (err) {
      console.error("player:join error:", err);
    }
  });

  socket.on("player:move", async ({ x, y }) => {
    const userId = socketToUser[socket.id];
    if (!userId) return;

    if (typeof x !== "number" || typeof y !== "number" || Number.isNaN(x) || Number.isNaN(y)) {
      console.warn(`Invalid move payload from ${socket.id}:`, { x, y });
      return;
    }

    playerPositions[userId] = { x, y };
    socket.broadcast.emit("player:moved", { userId, x, y });

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

  socket.on("player:leave", async () => {
    await removePlayer(socket);
  });

  socket.on("disconnect", async () => {
    console.log("Player disconnected:", socket.id);
    await removePlayer(socket);
  });

  socket.on("webrtc:offer", ({ to, offer }) => {
    const fromUserId = socketToUser[socket.id];
    if (!fromUserId || !isNearby(fromUserId, to)) return;

    const targetSocketId = getSocketIdForUser(to);
    if (targetSocketId) {
      io.to(targetSocketId).emit("webrtc:offer", { from: fromUserId, offer });
    }
  });

  socket.on("webrtc:answer", ({ to, answer }) => {
    const fromUserId = socketToUser[socket.id];
    if (!fromUserId || !isNearby(fromUserId, to)) return;

    const targetSocketId = getSocketIdForUser(to);
    if (targetSocketId) {
      io.to(targetSocketId).emit("webrtc:answer", { from: fromUserId, answer });
    }
  });

  socket.on("webrtc:ice-candidate", ({ to, candidate }) => {
    const fromUserId = socketToUser[socket.id];
    if (!fromUserId || !isNearby(fromUserId, to)) return;

    const targetSocketId = getSocketIdForUser(to);
    if (targetSocketId) {
      io.to(targetSocketId).emit("webrtc:ice-candidate", { from: fromUserId, candidate });
    }
  });
});

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