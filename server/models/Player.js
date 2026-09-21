const mongoose = require("mongoose");

const playerSchema = new mongoose.Schema(
  {
    userId: { type: String, required: true, unique: true, index: true },
    x: { type: Number, default: 0 },
    y: { type: Number, default: 0 },
    socketId: { type: String, required: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Player", playerSchema);
//Player.js