import Player from "../models/Player.js";

export const getNearbyPlayers = async (userId) => {
  try {
    const currentPlayer = await Player.findOne({ userId });

    if (!currentPlayer) {
      return [];
    }

    const [x, y] = currentPlayer.location.coordinates;

    const nearbyPlayers = await Player.find({
      userId: { $ne: userId },

      location: {
        $near: {
          $geometry: {
            type: "Point",
            coordinates: [x, y],
          },
          $maxDistance: 100,
        },
      },
    });

    return nearbyPlayers;
  } catch (error) {
    console.error("Proximity query error:", error);
    throw error;
  }
};