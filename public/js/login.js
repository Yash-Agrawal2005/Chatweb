class AuthManager {
  constructor() {
    this.isLoginMode = true
    this.initializeElements()
    this.attachEventListeners()
  }

  initializeElements() {
    this.form = document.getElementById("authForm")
    this.nameField = document.getElementById("name")
    this.emailField = document.getElementById("email")
    this.passwordField = document.getElementById("password")
    this.roleField = document.getElementById("role")
    this.departmentField = document.getElementById("department")
    this.submitBtn = document.getElementById("submitBtn")
    this.toggleText = document.getElementById("toggleText")
    this.toggleMode = document.getElementById("toggleMode")
    this.additionalFields = document.getElementById("additionalFields")
    this.loading = document.getElementById("loading")
  }

  attachEventListeners() {
    this.form.addEventListener("submit", this.handleSubmit.bind(this))
    this.toggleMode.addEventListener("click", this.toggleAuthMode.bind(this))
  }

  toggleAuthMode(e) {
    e.preventDefault()
    this.isLoginMode = !this.isLoginMode

    if (this.isLoginMode) {
      // Switch to login mode
      this.nameField.style.display = "none"
      this.additionalFields.style.display = "none"
      this.nameField.required = false
      this.submitBtn.textContent = "Login"
      this.toggleText.innerHTML = 'Don\'t have an account? <a href="#" id="toggleMode">Sign up</a>'
    } else {
      // Switch to register mode
      this.nameField.style.display = "block"
      this.additionalFields.style.display = "block"
      this.nameField.required = true
      this.submitBtn.textContent = "Sign Up"
      this.toggleText.innerHTML = 'Already have an account? <a href="#" id="toggleMode">Login</a>'
    }

    // Re-attach event listener to new toggle link
    this.toggleMode = document.getElementById("toggleMode")
    this.toggleMode.addEventListener("click", this.toggleAuthMode.bind(this))
  }

  async handleSubmit(e) {
    e.preventDefault()

    const email = this.emailField.value.trim()
    const password = this.passwordField.value.trim()

    if (!email || !password) {
      this.showError("Please fill in all required fields")
      return
    }

    this.showLoading(true)

    try {
      const endpoint = this.isLoginMode ? "/api/auth/login" : "/api/auth/register"
      const payload = { email, password }

      if (!this.isLoginMode) {
        const name = this.nameField.value.trim()
        if (!name) {
          this.showError("Name is required for registration")
          this.showLoading(false)
          return
        }
        payload.name = name
        payload.role = this.roleField.value.trim() || "Employee"
        payload.department = this.departmentField.value.trim() || "General"
      }

      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      })

      const data = await response.json()

      if (response.ok) {
        // Store token and user data
        localStorage.setItem("token", data.token)
        localStorage.setItem("user", JSON.stringify(data.user))

        // Redirect to dashboard
        window.location.href = "/dashboard.html"
      } else {
        this.showError(data.message || "Authentication failed")
      }
    } catch (error) {
      console.error("Auth error:", error)
      this.showError("Network error. Please try again.")
    } finally {
      this.showLoading(false)
    }
  }

  showLoading(show) {
    this.loading.style.display = show ? "flex" : "none"
    this.submitBtn.disabled = show
  }

  showError(message) {
    // Remove existing error messages
    const existingError = document.querySelector(".error-message")
    if (existingError) {
      existingError.remove()
    }

    // Create and show error message
    const errorDiv = document.createElement("div")
    errorDiv.className = "error-message"
    errorDiv.style.cssText = `
            background: #ff4757;
            color: white;
            padding: 10px 15px;
            border-radius: 5px;
            margin-bottom: 15px;
            font-size: 14px;
            animation: slideDown 0.3s ease-out;
        `
    errorDiv.textContent = message

    this.form.insertBefore(errorDiv, this.form.firstChild)

    // Remove error after 5 seconds
    setTimeout(() => {
      if (errorDiv.parentNode) {
        errorDiv.remove()
      }
    }, 5000)
  }
}

// Initialize auth manager when DOM is loaded
document.addEventListener("DOMContentLoaded", () => {
  // Check if user is already logged in
  const token = localStorage.getItem("token")
  if (token) {
    window.location.href = "/dashboard.html"
    return
  }

  new AuthManager()
})

// Add CSS animation for error messages
const style = document.createElement("style")
style.textContent = `
    @keyframes slideDown {
        from {
            opacity: 0;
            transform: translateY(-10px);
        }
        to {
            opacity: 1;
            transform: translateY(0);
        }
    }
`
document.head.appendChild(style)
