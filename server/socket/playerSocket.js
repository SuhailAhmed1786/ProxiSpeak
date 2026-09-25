import Player from "../models/Player.js";

let playerSocket = (io) => {
    console.log("Player socekt calling!!")
  io.on("connection", (socket) => {
    console.log("Player connected:", socket.id);

    socket.on("player:join", async ({ userId, x = 100, y = 100 }) => {
      try {
        const playerX = Number(x);
        const playerY = Number(y);

        if (!Number.isFinite(playerX) || !Number.isFinite(playerY)) {
          console.error("Invalid coordinates:", { x, y });
          return;
        }

        const player = await Player.findOneAndUpdate(
          { userId },
          {
            userId,
            socketId: socket.id,
            x: playerX,
            y: playerY,
            location: {
              type: "Point",
              coordinates: [playerX, playerY],
            },
          },
          {
            new: true,
            upsert: true,
            runValidators: true,
          }
        );

        console.log("Player joined:", player);
      } catch (error) {
        console.error("player:join error:", error);
      }
    });

    socket.on("player:move", async ({ userId, x, y }) => {
      try {
        const playerX = Number(x);
        const playerY = Number(y);

        if (!Number.isFinite(playerX) || !Number.isFinite(playerY)) {
          console.error("Invalid coordinates:", { x, y });
          return;
        }

        await Player.findOneAndUpdate(
          { userId },
          {
            x: playerX,
            y: playerY,
            location: {
              type: "Point",
              coordinates: [playerX, playerY],
            },
          },
          {
            new: true,
            runValidators: true,
          }
        );

        socket.broadcast.emit("player:moved", {
          userId,
          x: playerX,
          y: playerY,
        });
      } catch (error) {
        console.error("player:move error:", error);
      }
    });

    socket.on("disconnect", async () => {
      try {
        await Player.findOneAndDelete({
          socketId: socket.id,
        });

        console.log("Player disconnected:", socket.id);
      } catch (error) {
        console.error("disconnect error:", error);
      }
    });
  });
};

export default playerSocket;