import mongoose from "mongoose";

const playerSchema = new mongoose.Schema(
  {
    userId: {
      type: String,
      required: true,
      unique: true,
    },

    socketId: {
      type: String,
    },

    x: {
      type: Number,
      default: 100,
    },

    y: {
      type: Number,
      default: 100,
    },
  },
  {
    timestamps: true,
  }
);

playerSchema.index({
  location: "2dsphere",
});

export default mongoose.model("Player", playerSchema);