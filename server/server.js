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

// connect to MongoDB
connectDB();


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
        { new: true, upsert: true }
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
const PROXIMITY_RADIUS = 100;

// in-memory cache of last known positions, keyed by userId
// (avoids a DB read on every signaling message)
const playerPositions = {};

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