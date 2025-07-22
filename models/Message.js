const mongoose = require("mongoose")

const messageSchema = new mongoose.Schema(
  {
    sender: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    recipient: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    content: {
      type: String,
      required: function () {
        return this.type === "text"
      },
    },
    type: {
      type: String,
      enum: ["text", "image", "file"],
      default: "text",
    },
    fileName: String,
    fileUrl: String,
    isRead: {
      type: Boolean,
      default: false,
    },
    readAt: Date,
    timestamp: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  },
)

module.exports = mongoose.model("Message", messageSchema)
