
const API_BASE_URL = "http://127.0.0.1:8000";

// Forms and messages
const loginForm = document.getElementById("login-form");
const registerForm = document.getElementById("register-form");
const authMessage = document.getElementById("auth-message");

// Tabs
const loginTab = document.getElementById("login-tab");
const registerTab = document.getElementById("register-tab");

// Heading elements
const authKicker = document.getElementById("auth-kicker");
const authTitle = document.getElementById("auth-title");
const authSubtitle = document.getElementById("auth-subtitle");

// Switch to the login form
function showLoginForm() {
    loginForm.classList.remove("hidden");
    registerForm.classList.add("hidden");

    loginTab.classList.add("active");
    registerTab.classList.remove("active");

    loginTab.setAttribute("aria-selected", "true");
    registerTab.setAttribute("aria-selected", "false");

    authKicker.textContent = "WELCOME BACK";
    authTitle.textContent = "Good to see you.";
    authSubtitle.textContent = "Pick up right where you left off.";
}

// Switch to the registration form
function showRegisterForm() {
    loginForm.classList.add("hidden");
    registerForm.classList.remove("hidden");

    loginTab.classList.remove("active");
    registerTab.classList.add("active");

    loginTab.setAttribute("aria-selected", "false");
    registerTab.setAttribute("aria-selected", "true");

    authKicker.textContent = "GET STARTED";
    authTitle.textContent = "Create your account.";
    authSubtitle.textContent = "Your own space for all your thoughts.";
}

// Connect the tabs
loginTab.addEventListener("click", () => {
    showLoginForm();
    authMessage.textContent = "";
    authMessage.className = "message";
});

registerTab.addEventListener("click", () => {
    showRegisterForm();
    authMessage.textContent = "";
    authMessage.className = "message";
});

// Login
loginForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    authMessage.textContent = "";
    authMessage.className = "message";

    const email = document.getElementById("login-email").value.trim();
    const password = document.getElementById("login-password").value;

    try {
        const response = await fetch(`${API_BASE_URL}/login`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                email: email,
                password: password
            })
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(
                data.detail || "Login failed"
            );
        }

        sessionStorage.setItem(
            "notely_access_token",
            data.access_token
        );

        window.location.href = "notes.html";

    } catch (error) {
        authMessage.textContent = error.message;
        authMessage.className = "message error";
    }
});

// Registration
registerForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    authMessage.textContent = "";
    authMessage.className = "message";

    const formData = new FormData(registerForm);

    const profileImageInput = document.getElementById("register-profile-image");

    if (profileImageInput.files.length === 0) {
        formData.delete("profile_image");
    }

    try {
        const response = await fetch(`${API_BASE_URL}/users`, {
            method: "POST",
            body: formData
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(
                data.detail || "Registration failed"
            );
        }

        showLoginForm();

        document.getElementById("login-email").value =
            formData.get("email");

        document.getElementById("login-password").value = "";

        authMessage.textContent =
            "Account created successfully! You can now sign in.";

        authMessage.className = "message success";

        registerForm.reset();

    } catch (error) {
        authMessage.textContent = error.message;
        authMessage.className = "message error";
    }

});
