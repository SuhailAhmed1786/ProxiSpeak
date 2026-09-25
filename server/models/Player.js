const mongoose = require("mongoose");

const playerSchema = new mongoose.Schema(
  {
    userId: {
      type: String,
      required: true,
      unique: true,
    },

    socketId: {
      type: String,
      // required: true,
    },

    x: {
      type: Number,
      // required: true,
      default: 100,
    },

    y: {
      type: Number,
      // required: true,
      default: 100,
    },

    location: {
      type: {
        type: String,
        enum: ["Point"],
        required: true,
        // default: "Point",
      },

      coordinates: {
        type: [Number],
        required: true,
      },
    },
  },
  {
    timestamps: true,
  }
);
playerSchema.index({ location: "2dsphere" });
module.exports = mongoose.model("Player", playerSchema);
