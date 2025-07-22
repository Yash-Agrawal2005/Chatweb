const express = require("express")
const Message = require("../models/Message")
const auth = require("../middleware/auth")

const router = express.Router()

// Get conversation between two users
router.get("/conversation/:userId", auth, async (req, res) => {
  try {
    const { userId } = req.params
    const { page = 1, limit = 50 } = req.query

    const messages = await Message.find({
      $or: [
        { sender: req.userId, recipient: userId },
        { sender: userId, recipient: req.userId },
      ],
    })
      .populate("sender", "name avatar")
      .sort({ timestamp: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit)

    res.json(messages.reverse())
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message })
  }
})

// Search messages
router.get("/search", auth, async (req, res) => {
  try {
    const { query, userId } = req.query

    const messages = await Message.find({
      $and: [
        {
          $or: [
            { sender: req.userId, recipient: userId },
            { sender: userId, recipient: req.userId },
          ],
        },
        {
          content: { $regex: query, $options: "i" },
        },
      ],
    })
      .populate("sender", "name avatar")
      .sort({ timestamp: -1 })
      .limit(20)

    res.json(messages)
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message })
  }
})

module.exports = router
