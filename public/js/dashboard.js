// Import socket.io-client
// const io = require("socket.io-client")

const socket = io() // io is available globally via the script tag

class ChatApp {
  constructor() {
    this.currentUser = null
    this.currentChatUser = null
    this.socket = null
    this.typingTimeout = null
    this.onlineUsers = new Set()
    this.initializeApp()
  }

  async initializeApp() {
    // Check authentication
    const token = localStorage.getItem("token")
    const userData = localStorage.getItem("user")
    if (!token || !userData) {
      window.location.href = "/"
      return
    }
    this.currentUser = JSON.parse(userData)
    this.initializeElements()
    this.attachEventListeners()
    this.initializeSocket()
    await this.loadTeamMembers()
    this.updateUserProfile()
  }

  initializeElements() {
    // User profile elements
    this.userAvatar = document.getElementById("userAvatar")
    this.userName = document.getElementById("userName")
    this.statusSelect = document.getElementById("statusSelect")
    this.logoutBtn = document.getElementById("logoutBtn")
    // Team members elements
    this.userSearch = document.getElementById("userSearch")
    this.teamMembers = document.getElementById("teamMembers")
    // Chat elements
    this.welcomeScreen = document.getElementById("welcomeScreen")
    this.chatContainer = document.getElementById("chatContainer")
    this.chatUserAvatar = document.getElementById("chatUserAvatar")
    this.chatUserName = document.getElementById("chatUserName")
    this.chatUserStatus = document.getElementById("chatUserStatus")
    this.messagesContainer = document.getElementById("messagesContainer")
    this.messageInput = document.getElementById("messageInput")
    this.sendBtn = document.getElementById("sendBtn")
    this.attachBtn = document.getElementById("attachBtn")
    this.fileInput = document.getElementById("fileInput")
    this.closeChatBtn = document.getElementById("closeChatBtn")
    // Search elements
    this.searchToggle = document.getElementById("searchToggle")
    this.messageSearch = document.getElementById("messageSearch")
    this.messageSearchInput = document.getElementById("messageSearchInput")
    this.clearSearch = document.getElementById("clearSearch")
    // Typing indicator
    this.typingIndicator = document.getElementById("typingIndicator")
    // Upload progress
    this.uploadProgress = document.getElementById("uploadProgress")
  }

  attachEventListeners() {
    // Logout
    this.logoutBtn.addEventListener("click", this.logout.bind(this))
    // Status change
    this.statusSelect.addEventListener("change", this.updateStatus.bind(this))
    // Search team members
    this.userSearch.addEventListener("input", this.searchTeamMembers.bind(this))
    // Message sending
    this.sendBtn.addEventListener("click", this.sendMessage.bind(this))
    this.messageInput.addEventListener("keypress", (e) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault()
        this.sendMessage()
      }
    })
    // File attachment
    this.attachBtn.addEventListener("click", () => this.fileInput.click())
    this.fileInput.addEventListener("change", this.handleFileUpload.bind(this))
    // Chat controls
    this.closeChatBtn.addEventListener("click", this.closeChat.bind(this))
    this.searchToggle.addEventListener("click", this.toggleMessageSearch.bind(this))
    this.clearSearch.addEventListener("click", this.clearMessageSearch.bind(this))
    this.messageSearchInput.addEventListener("input", this.searchMessages.bind(this))
    // Typing indicators
    this.messageInput.addEventListener("input", this.handleTyping.bind(this))
  }

  initializeSocket() {
    // Use the global io function from socket.io-client
    this.socket = io()
    // User comes online
    this.socket.emit("user-online", this.currentUser.id)
    // Listen for new messages
    this.socket.on("new-message", this.handleNewMessage.bind(this))
    // Listen for message sent confirmation
    this.socket.on("message-sent", this.handleMessageSent.bind(this))
    // Listen for user status changes
    this.socket.on("user-status-change", this.handleUserStatusChange.bind(this))
    // Listen for online users
    this.socket.on("online-users", this.handleOnlineUsers.bind(this))
    // Listen for typing indicators
    this.socket.on("user-typing", this.handleUserTyping.bind(this))
    this.socket.on("user-stopped-typing", this.handleUserStoppedTyping.bind(this))
    // Listen for read receipts
    this.socket.on("message-read-receipt", this.handleReadReceipt.bind(this))
  }

  updateUserProfile() {
    this.userName.textContent = this.currentUser.name
    this.userAvatar.src = this.currentUser.avatar || "/images/default-avatar.png"
    this.statusSelect.value = this.currentUser.status || "Available"
  }

  async loadTeamMembers() {
    try {
      const response = await this.makeAuthenticatedRequest("/api/users")
      const users = await response.json()
      this.renderTeamMembers(users)
    } catch (error) {
      console.error("Error loading team members:", error)
    }
  }

  renderTeamMembers(users) {
    this.teamMembers.innerHTML = ""
    users.forEach((user) => {
      const memberDiv = document.createElement("div")
      memberDiv.className = "member-item"
      memberDiv.dataset.userId = user._id
      const isOnline = this.onlineUsers.has(user._id)
      const statusClass = isOnline ? "online-indicator" : "offline-indicator"
      memberDiv.innerHTML = `
                <div class="avatar">
                    <img src="${user.avatar || "/images/default-avatar.png"}" alt="${user.name}">
                    <div class="${statusClass}"></div>
                </div>
                <div class="member-info">
                    <h4>${user.name}</h4>
                    <p>${user.role} • ${user.department}</p>
                </div>
            `
      memberDiv.addEventListener("click", () => this.openChat(user))
      this.teamMembers.appendChild(memberDiv)
    })
  }

  searchTeamMembers() {
    const query = this.userSearch.value.toLowerCase()
    const memberItems = this.teamMembers.querySelectorAll(".member-item")
    memberItems.forEach((item) => {
      const name = item.querySelector("h4").textContent.toLowerCase()
      const role = item.querySelector("p").textContent.toLowerCase()
      if (name.includes(query) || role.includes(query)) {
        item.style.display = "flex"
      } else {
        item.style.display = "none"
      }
    })
  }

  async openChat(user) {
    this.currentChatUser = user
    // Update UI
    this.welcomeScreen.style.display = "none"
    this.chatContainer.style.display = "flex"
    // Update chat header
    this.chatUserName.textContent = user.name
    this.chatUserAvatar.src = user.avatar || "/images/default-avatar.png"
    this.chatUserStatus.textContent = this.onlineUsers.has(user._id) ? "Online" : "Offline"
    this.chatUserStatus.className = `user-status ${this.onlineUsers.has(user._id) ? "online" : "offline"}`
    // Highlight selected member
    document.querySelectorAll(".member-item").forEach((item) => {
      item.classList.remove("active")
    })
    document.querySelector(`[data-user-id="${user._id}"]`).classList.add("active")
    // Load chat history
    await this.loadChatHistory(user._id)
  }

  async loadChatHistory(userId) {
    try {
      const response = await this.makeAuthenticatedRequest(`/api/messages/conversation/${userId}`)
      const messages = await response.json()
      this.renderMessages(messages)
      // Use requestAnimationFrame to ensure DOM is updated before scrolling
      requestAnimationFrame(() => {
        this.scrollToBottom()
      })
    } catch (error) {
      console.error("Error loading chat history:", error)
    }
  }

  renderMessages(messages) {
    this.messagesContainer.innerHTML = ""
    messages.forEach((message) => {
      this.displayMessage(message, false) // Don't auto-scroll for bulk rendering
    })
  }

  displayMessage(message, shouldScroll = true) {
    const messageDiv = document.createElement("div")
    const isSent = message.sender._id === this.currentUser.id
    messageDiv.className = `message ${isSent ? "sent" : "received"}`
    messageDiv.dataset.messageId = message._id || Date.now() // Add unique identifier

    const messageContent = document.createElement("div")
    messageContent.className = "message-content"

    if (message.type === "text") {
      messageContent.innerHTML = `
                <div class="message-text">${this.escapeHtml(message.content)}</div>
                <small class="message-time">${this.formatTime(message.timestamp)}</small>
            `
    } else if (message.type === "image") {
      messageContent.innerHTML = `
                <div class="message-file">
                    <img src="${message.fileUrl}" alt="${message.fileName || "Image"}" 
                         onclick="window.open('${message.fileUrl}', '_blank')"
                         onload="this.parentElement.parentElement.parentElement.scrollIntoView({behavior: 'smooth', block: 'end'})">
                </div>
                <small class="message-time">${this.formatTime(message.timestamp)}</small>
            `
    } else if (message.type === "file") {
      messageContent.innerHTML = `
                <div class="message-file">
                    <div class="file-info">
                        <span class="file-icon">📎</span>
                        <a href="${message.fileUrl}" target="_blank">${message.fileName}</a>
                    </div>
                </div>
                <small class="message-time">${this.formatTime(message.timestamp)}</small>
            `
    }

    messageDiv.appendChild(messageContent)
    this.messagesContainer.appendChild(messageDiv)

    // Auto-scroll only for new messages, not when loading history
    if (shouldScroll) {
      requestAnimationFrame(() => {
        this.scrollToBottom()
      })
    }
  }

  async sendMessage() {
    const content = this.messageInput.value.trim()
    if (!content || !this.currentChatUser) return

    const messageData = {
      recipientId: this.currentChatUser._id,
      message: content,
      senderId: this.currentUser.id,
      type: "text",
      timestamp: new Date().toISOString(),
    }

    // Clear input immediately
    this.messageInput.value = ""

    // Emit the message via socket
    this.socket.emit("private-message", messageData)

    // Display the message instantly for sender
    this.displayMessage({
      _id: `temp-${Date.now()}`, // Temporary ID
      sender: { _id: this.currentUser.id },
      recipient: { _id: this.currentChatUser._id },
      content: content,
      type: "text",
      timestamp: messageData.timestamp,
    })

    this.stopTyping()
  }

  async handleFileUpload(event) {
    const file = event.target.files[0]
    if (!file || !this.currentChatUser) return

    // Validate file size (10MB limit)
    if (file.size > 10 * 1024 * 1024) {
      this.showError("File size must be less than 10MB")
      return
    }

    this.showUploadProgress(true)

    try {
      const formData = new FormData()
      formData.append("file", file)

      const response = await this.makeAuthenticatedRequest("/api/upload", {
        method: "POST",
        body: formData,
      })

      const result = await response.json()

      if (response.ok) {
        const messageData = {
          recipientId: this.currentChatUser._id,
          message: "",
          senderId: this.currentUser.id,
          type: result.fileType,
          fileName: result.fileName,
          fileUrl: result.fileUrl,
          timestamp: new Date().toISOString(),
        }

        // Emit via socket
        this.socket.emit("private-message", messageData)

        // Display the uploaded message instantly
        this.displayMessage({
          _id: `temp-${Date.now()}`, // Temporary ID
          sender: { _id: this.currentUser.id },
          recipient: { _id: this.currentChatUser._id },
          content: "",
          type: result.fileType,
          fileName: result.fileName,
          fileUrl: result.fileUrl,
          timestamp: messageData.timestamp,
        })
      } else {
        this.showError(result.error || "File upload failed")
      }
    } catch (error) {
      console.error("File upload error:", error)
      this.showError("File upload failed")
    } finally {
      this.showUploadProgress(false)
      this.fileInput.value = "" // Clear file input
    }
  }

  handleNewMessage(message) {
    // Avoid duplicate messages by checking if message already exists
    const existingMessage = document.querySelector(`[data-message-id="${message._id}"]`)
    if (existingMessage) {
      return // Message already displayed
    }

    if (
      this.currentChatUser &&
      (message.sender._id === this.currentChatUser._id || message.sender._id === this.currentUser.id)
    ) {
      // Only display if it's not from current user (to avoid duplicates)
      if (message.sender._id !== this.currentUser.id) {
        this.displayMessage(message)
      }

      // Mark message as read if chat is open and message is from other user
      if (message.sender._id === this.currentChatUser._id) {
        this.socket.emit("message-read", {
          messageId: message._id,
          readerId: this.currentUser.id,
        })
      }
    }

    // Show notification for new messages from others
    if (message.sender._id !== this.currentUser.id) {
      this.showNotification(`New message from ${message.sender.name}`, message.content)
    }
  }

  handleMessageSent(message) {
    // Update temporary message with real message data if needed
    const tempMessages = document.querySelectorAll('[data-message-id^="temp-"]')
    if (tempMessages.length > 0) {
      const lastTempMessage = tempMessages[tempMessages.length - 1]
      lastTempMessage.dataset.messageId = message._id
    }
  }

  handleUserStatusChange(data) {
    const userId = data.userId
    const isOnline = data.isOnline

    if (isOnline) {
      this.onlineUsers.add(userId)
    } else {
      this.onlineUsers.delete(userId)
    }

    // Update member list
    const memberItem = document.querySelector(`[data-user-id="${userId}"]`)
    if (memberItem) {
      const indicator = memberItem.querySelector(".online-indicator, .offline-indicator")
      if (indicator) {
        indicator.className = isOnline ? "online-indicator" : "offline-indicator"
      }
    }

    // Update chat header if this is the current chat user
    if (this.currentChatUser && this.currentChatUser._id === userId) {
      this.chatUserStatus.textContent = isOnline ? "Online" : "Offline"
      this.chatUserStatus.className = `user-status ${isOnline ? "online" : "offline"}`
    }
  }

  handleOnlineUsers(users) {
    this.onlineUsers = new Set(users)
    // Update all member indicators
    document.querySelectorAll(".member-item").forEach((item) => {
      const userId = item.dataset.userId
      const indicator = item.querySelector(".online-indicator, .offline-indicator")
      if (indicator) {
        indicator.className = this.onlineUsers.has(userId) ? "online-indicator" : "offline-indicator"
      }
    })
  }

  handleTyping() {
    if (!this.currentChatUser) return

    // Send typing start event
    this.socket.emit("typing-start", {
      recipientId: this.currentChatUser._id,
      senderId: this.currentUser.id,
    })

    // Clear existing timeout
    if (this.typingTimeout) {
      clearTimeout(this.typingTimeout)
    }

    // Set timeout to stop typing
    this.typingTimeout = setTimeout(() => {
      this.stopTyping()
    }, 2000)
  }

  stopTyping() {
    if (!this.currentChatUser) return
    this.socket.emit("typing-stop", {
      recipientId: this.currentChatUser._id,
      senderId: this.currentUser.id,
    })
    if (this.typingTimeout) {
      clearTimeout(this.typingTimeout)
      this.typingTimeout = null
    }
  }

  handleUserTyping(data) {
    if (this.currentChatUser && data.userId === this.currentChatUser._id) {
      this.typingIndicator.style.display = "flex"
      this.typingIndicator.querySelector(".typing-text").textContent = `${this.currentChatUser.name} is typing...`
    }
  }

  handleUserStoppedTyping(data) {
    if (this.currentChatUser && data.userId === this.currentChatUser._id) {
      this.typingIndicator.style.display = "none"
    }
  }

  handleReadReceipt(data) {
    // Update message with read receipt (could add checkmarks, etc.)
    console.log("Message read:", data)
  }

  closeChat() {
    this.currentChatUser = null
    this.chatContainer.style.display = "none"
    this.welcomeScreen.style.display = "flex"
    // Clear active selection
    document.querySelectorAll(".member-item").forEach((item) => {
      item.classList.remove("active")
    })
    // Hide typing indicator
    this.typingIndicator.style.display = "none"
  }

  toggleMessageSearch() {
    const isVisible = this.messageSearch.style.display !== "none"
    this.messageSearch.style.display = isVisible ? "none" : "block"
    if (!isVisible) {
      this.messageSearchInput.focus()
    } else {
      this.clearMessageSearch()
    }
  }

  clearMessageSearch() {
    this.messageSearchInput.value = ""
    this.messageSearch.style.display = "none"
    // Reload current chat to show all messages
    if (this.currentChatUser) {
      this.loadChatHistory(this.currentChatUser._id)
    }
  }

  async searchMessages() {
    const query = this.messageSearchInput.value.trim()
    if (!query || !this.currentChatUser) return

    try {
      const response = await this.makeAuthenticatedRequest(
        `/api/messages/search?query=${encodeURIComponent(query)}&userId=${this.currentChatUser._id}`,
      )
      const messages = await response.json()
      this.renderMessages(messages)
    } catch (error) {
      console.error("Error searching messages:", error)
    }
  }

  async updateStatus() {
    const status = this.statusSelect.value
    try {
      await this.makeAuthenticatedRequest("/api/users/status", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ status }),
      })
      // Update local user data
      this.currentUser.status = status
      localStorage.setItem("user", JSON.stringify(this.currentUser))
    } catch (error) {
      console.error("Error updating status:", error)
    }
  }

  logout() {
    localStorage.removeItem("token")
    localStorage.removeItem("user")
    window.location.href = "/"
  }

  showUploadProgress(show) {
    this.uploadProgress.style.display = show ? "block" : "none"
    if (show) {
      // Simulate progress (in real app, you'd track actual upload progress)
      let progress = 0
      const interval = setInterval(() => {
        progress += 10
        const progressFill = this.uploadProgress.querySelector(".progress-fill")
        if (progressFill) {
          progressFill.style.width = `${progress}%`
        }
        if (progress >= 100) {
          clearInterval(interval)
        }
      }, 100)
    }
  }

  showNotification(title, body) {
    if ("Notification" in window && Notification.permission === "granted") {
      new Notification(title, { body: body, icon: "/images/chat-icon.png" })
    } else if ("Notification" in window && Notification.permission !== "denied") {
      Notification.requestPermission().then((permission) => {
        if (permission === "granted") {
          new Notification(title, { body: body, icon: "/images/chat-icon.png" })
        }
      })
    }
  }

  showError(message) {
    // Create error toast
    const errorDiv = document.createElement("div")
    errorDiv.className = "error-toast"
    errorDiv.textContent = message
    document.body.appendChild(errorDiv)

    // Auto remove after 5 seconds
    setTimeout(() => {
      if (errorDiv.parentNode) {
        errorDiv.remove()
      }
    }, 5000)
  }

  scrollToBottom() {
    if (this.messagesContainer) {
      this.messagesContainer.scrollTop = this.messagesContainer.scrollHeight
    }
  }

  formatTime(timestamp) {
    const date = new Date(timestamp)
    const now = new Date()
    const diffInHours = (now - date) / (1000 * 60 * 60)

    if (diffInHours < 24) {
      return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
    } else {
      return date.toLocaleDateString([], { month: "short", day: "numeric" })
    }
  }

  escapeHtml(text) {
    const div = document.createElement("div")
    div.textContent = text
    return div.innerHTML
  }

  async makeAuthenticatedRequest(url, options) {
    options = options || {}
    const token = localStorage.getItem("token")
    const defaultOptions = {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }

    // Merge headers
    if (options.headers) {
      defaultOptions.headers = Object.assign(defaultOptions.headers, options.headers)
    }

    // Merge all options
    const finalOptions = Object.assign(defaultOptions, options)
    return fetch(url, finalOptions)
  }
}

// Initialize the chat app when DOM is loaded
document.addEventListener("DOMContentLoaded", () => {
  new ChatApp()
})
