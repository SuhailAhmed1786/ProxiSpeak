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

    $set: {
      location: {
        type: {
          type: String,
          enum: ["Point"],
          default: "Point",
        },
        coordinates: {
          type: [Number],
          default: [100, 100],
        },
      }
    }


  },
  {
    timestamps: true,
  }
  
);
playerSchema.index({ location: "2dsphere" });
module.exports = mongoose.model("Player", playerSchema);