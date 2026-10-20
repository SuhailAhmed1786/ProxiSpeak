
import Player from "../models/Player.js";

const playerSocket = (io) => {
  io.on("connection", (socket) => {
    console.log("Player connected:", socket.id);

    // PLAYER JOIN
    socket.on(
      "player:join",
      async ({ userId, x = 100, y = 100, name = "Player" }) => {
        try {
          const playerX = Number(x);
          const playerY = Number(y);

          if (!userId) {
            console.error("player:join: userId missing");
            return;
          }

          if (
            !Number.isFinite(playerX) ||
            !Number.isFinite(playerY)
          ) {
            console.error("player:join: Invalid coordinates");
            return;
          }

          // Save or update player
          const player = await Player.findOneAndUpdate(
            { userId },
            {
              $set: {
                socketId: socket.id,
                x: playerX,
                y: playerY,
              },
              $setOnInsert: {
                userId,
              },
            },
            {
              new: true,
              upsert: true,
              runValidators: true,
              setDefaultsOnInsert: true,
            }
          );

          console.log("JOIN SAVED:", {
            userId: player.userId,
            x: player.x,
            y: player.y,
          });

          // Send existing players to the new player
          const existingPlayers = await Player.find({
            socketId: { $ne: socket.id },
          }).lean();

          socket.emit(
            "players:list",
            existingPlayers.map((p) => ({
              playerId: p.userId,
              x: p.x,
              y: p.y,
              name: p.name || p.userId,
            }))
          );

          // Notify other connected players
          socket.broadcast.emit("player:join", {
            playerId: userId,
            x: playerX,
            y: playerY,
            name,
          });
        } catch (error) {
          console.error("player:join error:", error);
        }
      }
    );

    // PLAYER MOVEMENT
    socket.on(
      "player:move",
      async ({ userId, x, y, name = "Player" }) => {
        try {
          const playerX = Number(x);
          const playerY = Number(y);

          if (!userId) {
            console.error("player:move: userId missing");
            return;
          }

          if (
            !Number.isFinite(playerX) ||
            !Number.isFinite(playerY)
          ) {
            console.error("player:move: Invalid coordinates");
            return;
          }

          const player = await Player.findOneAndUpdate(
            { userId },
            {
              $set: {
                x: playerX,
                y: playerY,
                socketId: socket.id,
              },
              $setOnInsert: {
                userId,
              },
            },
            {
              new: true,
              upsert: true,
              runValidators: true,
              setDefaultsOnInsert: true,
            }
          );

          if (!player) {
            return;
          }

          // Broadcast updated position to other players
          socket.broadcast.emit("player:moved", {
            playerId: userId,
            x: playerX,
            y: playerY,
            name,
          });
        } catch (error) {
          console.error("player:move error:", error);
        }
      }
    );

    // PLAYER DISCONNECT
    socket.on("disconnect", async () => {
      try {
        const player = await Player.findOneAndDelete({
          socketId: socket.id,
        });

        if (player) {
          socket.broadcast.emit("player:leave", {
            playerId: player.userId,
          });
        }

        console.log("Player disconnected:", socket.id);
      } catch (error) {
        console.error("disconnect error:", error);
      }
    });
  });
};

export default playerSocket;
