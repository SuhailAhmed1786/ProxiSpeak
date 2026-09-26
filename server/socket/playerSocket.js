import Player from "../models/Player.js";

const playerSocket = (io) => {
    console.log("Player socekt calling!!")
  io.on("connection", (socket) => {
    console.log("Player connected:", socket.id);

    socket.on("player:join", async ({ userId, x = 200, y = 200 }) => {
  try {
    x = Number(x);
    y = Number(y);

    const player = await Player.findOneAndUpdate(
      { userId },
      {
        userId,
        socketId: socket.id,
        x,
        y,

        location: {
          type: "Point",
          coordinates: [x, y],
        },
      },
      {
        new: true,
        upsert: true,
        runValidators: true,
      }
    );

    console.log("Player saved:", player);

  } catch (error) {
    console.error("Player join error:", error);
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