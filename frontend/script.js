document.addEventListener("DOMContentLoaded", function () {
    const loginForm = document.getElementById("loginForm");
    const registerForm = document.getElementById("registerForm");

    // LOGIN FUNCTIONALITY
    if (loginForm) {
        loginForm.addEventListener("submit", async function (event) {
            event.preventDefault();

            const email = document.getElementById("loginEmail").value.trim();
            const password = document.getElementById("loginPassword").value.trim();
            const loginBtn = document.getElementById("loginBtn");

            if (!email || !password) {
                alert("Please enter both email and password.");
                return;
            }

            loginBtn.disabled = true;
            loginBtn.textContent = "Logging in...";

            try {
                const response = await fetch("http://localhost:3000/auth/login", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ email, password }),
                });

                const result = await response.json();

                if (!response.ok) {
                    throw new Error(result.message || "Login failed. Please try again.");
                }

                alert(result.message);
                localStorage.setItem("user", JSON.stringify(result.user));
                localStorage.setItem("token", result.token);

                // Role-based redirection
                const role = result.user?.role; // Expecting role from backend
                const redirectPage = role === "admin" ? "admin-dashboard.html" : "dashboard.html";

                window.location.href = redirectPage;
            } catch (error) {
                alert(error.message);
                console.error("Login Error:", error);
            } finally {
                loginBtn.disabled = false;
                loginBtn.textContent = "Login";
            }
        });
    }

    // REGISTER FUNCTIONALITY
    if (registerForm) {
        registerForm.addEventListener("submit", async function (event) {
            event.preventDefault();

            const name = document.getElementById("registerName").value.trim();
            const email = document.getElementById("registerEmail").value.trim();
            const password = document.getElementById("registerPassword").value.trim();
            const isAdmin = document.getElementById("registerIsAdmin").checked;
            const role = isAdmin ? "admin" : "user"; // Assign role based on checkbox
            const registerBtn = document.getElementById("registerBtn");

            if (!name || !email || !password) {
                alert("Please fill in all fields.");
                return;
            }

            registerBtn.disabled = true;
            registerBtn.textContent = "Registering...";

            try {
                const response = await fetch("http://localhost:3000/auth/register", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ name, email, password, role }),
                });

                const result = await response.json();

                if (!response.ok) {
                    throw new Error(result.message || "Registration failed. Please try again.");
                }

                alert(result.message);
                window.location.href = "login.html";
            } catch (error) {
                alert(error.message);
                console.error("Registration Error:", error);
            } finally {
                registerBtn.disabled = false;
                registerBtn.textContent = "Register";
            }
        });
    }
});
