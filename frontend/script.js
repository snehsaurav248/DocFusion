document.getElementById("loginForm")?.addEventListener("submit", async function (event) {
    event.preventDefault();

    const email = document.getElementById("loginEmail").value.trim();
    const password = document.getElementById("loginPassword").value.trim();
    const loginBtn = document.getElementById("loginBtn");

    if (!email || !password) {
        alert("Please enter both email and password.");
        return;
    }

    loginBtn.disabled = true;
    loginBtn.textContent = "Logging in..."; // Show loading state

    try {
        const response = await fetch("http://localhost:3000/api/login", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email, password }),
        });

        const result = await response.json();
        
        if (response.ok) {
            alert(result.message);
            localStorage.setItem("user", JSON.stringify(result.user));
            localStorage.setItem("token", result.token); // Save JWT Token

            window.location.href = result.user.role === "admin" ? "admin-dashboard.html" : "dashboard.html";
        } else {
            alert(result.message);
        }
    } catch (error) {
        alert("Server error! Please try again later.");
        console.error("Login Error:", error);
    } finally {
        loginBtn.disabled = false;
        loginBtn.textContent = "Login"; // Reset button text
    }
});

document.getElementById("registerForm")?.addEventListener("submit", async function (event) {
    event.preventDefault();

    const name = document.getElementById("registerName").value.trim();
    const email = document.getElementById("registerEmail").value.trim();
    const password = document.getElementById("registerPassword").value.trim();
    const registerBtn = document.getElementById("registerBtn");

    if (!name || !email || !password) {
        alert("Please fill in all fields.");
        return;
    }

    registerBtn.disabled = true;
    registerBtn.textContent = "Registering..."; // Show loading state

    try {
        const response = await fetch("http://localhost:3000/api/register", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ name, email, password }),
        });

        const result = await response.json();
        
        if (response.ok) {
            alert(result.message);
            window.location.href = "login.html"; // Redirect to login page
        } else {
            alert(result.message);
        }
    } catch (error) {
        alert("Server error! Please try again later.");
        console.error("Registration Error:", error);
    } finally {
        registerBtn.disabled = false;
        registerBtn.textContent = "Register"; // Reset button text
    }
});
