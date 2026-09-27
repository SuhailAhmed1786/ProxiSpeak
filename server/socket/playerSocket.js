import Player from "../models/Player.js";

const playerSocket = (io) => {
  io.on("connection", (socket) => {
    console.log("Player connected:", socket.id, Player.userId);
    socket.on("player:join", async ({ userId, x = 100, y = 100 }) => {
      try {
        const playerX = Number(x);
        const playerY = Number(y);

        if (!userId) {
          console.error("player:join: userId missing");
          return;
        }

        if (!Number.isFinite(playerX) || !Number.isFinite(playerY)) {
          console.error("player:join: Invalid coordinates", {
            x,
            y,
          });
          return;
        }

        const player = await Player.findOneAndUpdate(
          { userId },
          {
            $set: {
              socketId: socket.id,
              x: playerX,
              y: playerY,
              location: {
                type: "Point",
                coordinates: [playerX, playerY],
              },
            },
            $setOnInsert: {
              userId,
            },
          },
          {
            new: true,
            upsert: true,
            runValidators: true,
          }
        );

        console.log("JOIN SAVED:", {
          userId,
          x: playerX,
          y: playerY,
          coordinates: player.location.coordinates,
        });

      } catch (error) {
        console.error("player:join error:", error);
      }
    });

    socket.on("player:move", async ({ userId, x, y }) => {
      try {
        const playerX = Number(x);
        const playerY = Number(y);

        console.log("MOVE RECEIVED:", {
          userId,
          x,
          y,
          playerX,
          playerY,
        });

        if (!userId) {
          console.error("player:move: userId missing");
          return;
        }

        if (!Number.isFinite(playerX) || !Number.isFinite(playerY)) {
          console.error("Invalid coordinates:", {
            x,
            y,
          });
          return;
        }

        const player = await Player.findOneAndUpdate(
          { userId },
          {
            $set: {
              socketId: socket.id,
              x: playerX,
              y: playerY,
              location: {
                type: "Point",
                coordinates: [playerX, playerY],
              },
            },
          },
          {
            new: true,
            runValidators: true,
          }
        );

        if (!player) {
          console.error("Player not found:", userId);
          return;
        }

        console.log("MONGO UPDATED:", {
          userId: player.userId,
          x: player.x,
          y: player.y,
          location: player.location,
        });

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