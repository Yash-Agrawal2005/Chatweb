const express = require("express")
const http = require("http")
const socketIo = require("socket.io")
const mongoose = require("mongoose")
const cors = require("cors")
const path = require("path")
require("dotenv").config()

const authRoutes = require("./routes/auth")
const userRoutes = require("./routes/users")
const messageRoutes = require("./routes/messages")
const uploadRoutes = require("./routes/upload")

const app = express()
const server = http.createServer(app)
const io = socketIo(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
  },
})

// Middleware
app.use(cors())
app.use(express.json())
app.use(express.static("public"))
app.use("/uploads", express.static("uploads"))

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI || "mongodb://localhost:27017/internal-chat", {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})

// Routes
app.use("/api/auth", authRoutes)
app.use("/api/users", userRoutes)
app.use("/api/messages", messageRoutes)
app.use("/api/upload", uploadRoutes)

// Serve static files
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"))
})

// Add route for login page
app.get("/login", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "login.html"))
})

app.get("/register", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "register.html"));
})

app.get("/dashboard", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "dashboard.html"))
})


// Socket.IO connection handling
const connectedUsers = new Map()

io.on("connection", (socket) => {
  console.log("User connected:", socket.id)

  // User joins with their ID
  socket.on("user-online", (userId) => {
    connectedUsers.set(userId, socket.id)
    socket.userId = userId

    // Update user status in database
    const User = require("./models/User")
    User.findByIdAndUpdate(userId, {
      isOnline: true,
      lastSeen: new Date(),
    }).exec()

    // Broadcast user online status
    socket.broadcast.emit("user-status-change", {
      userId,
      isOnline: true,
    })

    // Send current online users
    io.emit("online-users", Array.from(connectedUsers.keys()))
  })

  // Handle private messages
  socket.on("private-message", async (data) => {
    const { recipientId, message, senderId, type = "text", fileName, fileUrl } = data

    // Save message to database
    const Message = require("./models/Message")
    const newMessage = new Message({
      sender: senderId,
      recipient: recipientId,
      content: message,
      type,
      fileName,
      fileUrl,
      timestamp: new Date(),
    })

    await newMessage.save()
    await newMessage.populate("sender", "name avatar")

    // Send to recipient if online
    const recipientSocketId = connectedUsers.get(recipientId)
    if (recipientSocketId) {
      io.to(recipientSocketId).emit("new-message", {
        ...newMessage.toObject(),
        sender: newMessage.sender,
      })
    }

    // Send back to sender for confirmation
    socket.emit("message-sent", {
      ...newMessage.toObject(),
      sender: newMessage.sender,
    })
  })

  // Handle typing indicators
  socket.on("typing-start", (data) => {
    const { recipientId, senderId } = data
    const recipientSocketId = connectedUsers.get(recipientId)
    if (recipientSocketId) {
      io.to(recipientSocketId).emit("user-typing", { userId: senderId })
    }
  })

  socket.on("typing-stop", (data) => {
    const { recipientId, senderId } = data
    const recipientSocketId = connectedUsers.get(recipientId)
    if (recipientSocketId) {
      io.to(recipientSocketId).emit("user-stopped-typing", { userId: senderId })
    }
  })

  // Handle message read receipts
  socket.on("message-read", async (data) => {
    const { messageId, readerId } = data
    const Message = require("./models/Message")

    await Message.findByIdAndUpdate(messageId, {
      isRead: true,
      readAt: new Date(),
    })

    // Notify sender
    const message = await Message.findById(messageId)
    const senderSocketId = connectedUsers.get(message.sender.toString())
    if (senderSocketId) {
      io.to(senderSocketId).emit("message-read-receipt", {
        messageId,
        readerId,
        readAt: new Date(),
      })
    }
  })

  // Handle disconnect
  socket.on("disconnect", async () => {
    if (socket.userId) {
      connectedUsers.delete(socket.userId)

      // Update user status in database
      const User = require("./models/User")
      await User.findByIdAndUpdate(socket.userId, {
        isOnline: false,
        lastSeen: new Date(),
      })

      // Broadcast user offline status
      socket.broadcast.emit("user-status-change", {
        userId: socket.userId,
        isOnline: false,
      })

      // Send updated online users list
      io.emit("online-users", Array.from(connectedUsers.keys()))
    }
    console.log("User disconnected:", socket.id)
  })
})

const PORT = process.env.PORT || 3000
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`)
})
