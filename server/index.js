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
    origin: "http://localhost:5173",
    methods: ["GET", "POST"],
  },
});

// connect to MongoDB
connectDB();

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
  socket.on("player:move", async ({ x, y }) => {
    const userId = socketToUser[socket.id];
    if (!userId) return; // ignore movement before join

    try {
      await Player.findOneAndUpdate({ userId }, { x, y, socketId: socket.id });
      socket.broadcast.emit("player:moved", { userId, x, y });
    } catch (err) {
      console.error("player:move error:", err);
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

server.listen(5000, () => {
  console.log("Server running on port 5000");
});