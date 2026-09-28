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
          required: true,
          default: "Point",
        },
        coordinates: {
          type: [Number],
          required: true,
        },
      },
    }

  },
  {
    timestamps: true,
  }

);


playerSchema.index({ location: "2dsphere" });
module.exports = mongoose.model("Player", playerSchema);


// const mongoose = require("mongoose");

// const playerSchema = new mongoose.Schema(
//   {
//     userId: {
//       type: String,
//       required: true,
//       unique: true,
//     },

//     socketId: {
//       type: String,
//     },

//     x: {
//       type: Number,
//       default: 100,
//     },

//     y: {
//       type: Number,
//       default: 100,
//     },

//     position: {
//       type: [Number],
//       required: true,
//       validate: {
//         validator: function (value) {
//           return (
//             Array.isArray(value) &&
//             value.length === 2 &&
//             value.every((v) => Number.isFinite(v))
//           );
//         },
//         message: "Position must contain exactly 2 numbers",
//       },
//     },
//   },
//   {
//     timestamps: true,
//   }
// );

// playerSchema.index({ position: "2d" });

// module.exports = mongoose.model("Player", playerSchema);