class HomePage {
  constructor() {
    this.initializeElements()
    this.attachEventListeners()
    this.initializeAnimations()
  }

  initializeElements() {
    this.navbar = document.querySelector(".navbar")
    this.hamburger = document.getElementById("hamburger")
    this.navLinks = document.querySelector(".nav-links")
    this.contactForm = document.getElementById("contactForm")
  }

  attachEventListeners() {
    // Navbar scroll effect
    window.addEventListener("scroll", this.handleScroll.bind(this))

    // Mobile menu toggle
    this.hamburger.addEventListener("click", this.toggleMobileMenu.bind(this))

    // Smooth scrolling for anchor links
    document.querySelectorAll('a[href^="#"]').forEach((anchor) => {
      anchor.addEventListener("click", this.handleSmoothScroll.bind(this))
    })

    // Contact form submission
    this.contactForm.addEventListener("submit", this.handleContactForm.bind(this))

    // Close mobile menu when clicking on links
    document.querySelectorAll(".nav-links a").forEach((link) => {
      link.addEventListener("click", () => {
        this.navLinks.classList.remove("active")
        this.hamburger.classList.remove("active")
      })
    })
  }

  handleScroll() {
    if (window.scrollY > 100) {
      this.navbar.classList.add("scrolled")
    } else {
      this.navbar.classList.remove("scrolled")
    }
  }

  toggleMobileMenu() {
    this.navLinks.classList.toggle("active")
    this.hamburger.classList.toggle("active")
  }

  handleSmoothScroll(e) {
    e.preventDefault()
    const targetId = e.currentTarget.getAttribute("href")
    const targetSection = document.querySelector(targetId)

    if (targetSection) {
      const offsetTop = targetSection.offsetTop - 80 // Account for fixed navbar
      window.scrollTo({
        top: offsetTop,
        behavior: "smooth",
      })
    }
  }

  handleContactForm(e) {
    e.preventDefault()

    // Get form data
    const formData = new FormData(this.contactForm)
    const name = formData.get("name") || e.target.querySelector('input[type="text"]').value
    const email = formData.get("email") || e.target.querySelector('input[type="email"]').value
    const message = formData.get("message") || e.target.querySelector("textarea").value

    // Simple validation
    if (!name || !email || !message) {
      this.showNotification("Please fill in all fields", "error")
      return
    }

    // Simulate form submission
    this.showNotification("Thank you! Your message has been sent.", "success")

    // Reset form
    this.contactForm.reset()
  }

  showNotification(message, type) {
    const notification = document.createElement("div")
    notification.className = `notification ${type}`
    notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            padding: 15px 20px;
            border-radius: 5px;
            color: white;
            z-index: 1000;
            animation: slideIn 0.3s ease-out;
            ${type === "success" ? "background: #4CAF50;" : "background: #f44336;"}
        `
    notification.textContent = message

    document.body.appendChild(notification)

    // Remove notification after 5 seconds
    setTimeout(() => {
      notification.remove()
    }, 5000)
  }

  initializeAnimations() {
    // Intersection Observer for scroll animations
    const observerOptions = {
      threshold: 0.1,
      rootMargin: "0px 0px -50px 0px",
    }

    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("animate-in")
        }
      })
    }, observerOptions)

    // Observe elements for animation
    document.querySelectorAll(".feature-card, .about-text, .team-preview").forEach((el) => {
      observer.observe(el)
    })

    // Add animation styles
    const style = document.createElement("style")
    style.textContent = `
            @keyframes slideIn {
                from {
                    opacity: 0;
                    transform: translateX(100%);
                }
                to {
                    opacity: 1;
                    transform: translateX(0);
                }
            }

            .feature-card,
            .about-text,
            .team-preview {
                opacity: 0;
                transform: translateY(30px);
                transition: all 0.6s ease-out;
            }

            .feature-card.animate-in,
            .about-text.animate-in,
            .team-preview.animate-in {
                opacity: 1;
                transform: translateY(0);
            }

            /* Mobile menu styles */
            @media (max-width: 768px) {
                .nav-links {
                    position: fixed;
                    top: 70px;
                    right: -100%;
                    width: 100%;
                    height: calc(100vh - 70px);
                    background: white;
                    flex-direction: column;
                    justify-content: flex-start;
                    align-items: center;
                    padding-top: 2rem;
                    transition: right 0.3s ease;
                    box-shadow: 0 2px 10px rgba(0,0,0,0.1);
                }

                .nav-links.active {
                    right: 0;
                }

                .hamburger.active span:nth-child(1) {
                    transform: rotate(-45deg) translate(-5px, 6px);
                }

                .hamburger.active span:nth-child(2) {
                    opacity: 0;
                }

                .hamburger.active span:nth-child(3) {
                    transform: rotate(45deg) translate(-5px, -6px);
                }
            }
        `
    document.head.appendChild(style)
  }
}

// Initialize the home page when DOM is loaded
document.addEventListener("DOMContentLoaded", () => {
  new HomePage()
})
