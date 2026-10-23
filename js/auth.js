// Autenticacion contra la API PHP basada en sesiones del servidor.
(function () {
    "use strict";

    let admin = null;
    let resolveReady;
    const ready = new Promise((resolve) => {
        resolveReady = resolve;
    });

    function updateAuthUI() {
        document.querySelectorAll("[data-auth-link]").forEach((link) => {
            link.textContent = admin ? "Panel" : "Admin";
            link.href = admin ? "admin.html" : "login.html";
            link.title = admin ? "Sesion iniciada como " + admin.email : "Acceso administrador";
        });
        document.querySelectorAll("[data-auth-email]").forEach((element) => {
            element.textContent = admin ? admin.email : "";
        });
        document.querySelectorAll("[data-logout]").forEach((button) => {
            button.hidden = !admin;
        });
    }

    function redirectTarget() {
        const params = new URLSearchParams(window.location.search);
        const redirect = params.get("redirect");
        if (redirect && /^[a-z0-9_-]+\.html$/i.test(redirect)) return redirect;
        return "admin.html";
    }

    async function refresh() {
        try {
            const data = await API.me();
            admin = data.admin;
        } catch (error) {
            admin = null;
        }
        updateAuthUI();
        return admin;
    }

    async function login(email, password, remember) {
        const data = await API.login(email, password, remember);
        admin = data.admin;
        updateAuthUI();
        return admin;
    }

    async function logout() {
        try {
            await API.logout();
        } catch (error) {
            console.warn("No se pudo cerrar la sesion en el servidor.", error);
        }
        admin = null;
        updateAuthUI();
        window.location.href = "index.html";
    }

    async function requireAuth() {
        await ready;
        if (admin) {
            document.body.classList.remove("auth-guard");
            return true;
        }

        const current = window.location.pathname.split("/").pop() || "admin.html";
        window.location.replace("login.html?redirect=" + encodeURIComponent(current));
        return false;
    }

    async function initLoginPage() {
        const form = document.getElementById("login-form");
        if (!form) return;

        if (admin) {
            window.location.replace(redirectTarget());
            return;
        }

        const errorBox = document.getElementById("login-error");
        const submit = form.querySelector('button[type="submit"]');

        form.addEventListener("submit", async (event) => {
            event.preventDefault();
            errorBox.textContent = "";
            submit.disabled = true;

            const email = form.elements.email.value;
            const password = form.elements.password.value;
            const remember = form.elements.remember.checked;

            try {
                await login(email, password, remember);
                window.location.replace(redirectTarget());
            } catch (error) {
                errorBox.textContent =
                    error.status === 401
                        ? "Correo o contrasena incorrectos."
                        : error.message;
            } finally {
                submit.disabled = false;
            }
        });
    }

    document.addEventListener("DOMContentLoaded", async () => {
        updateAuthUI();

        document.querySelectorAll("[data-logout]").forEach((button) => {
            button.addEventListener("click", (event) => {
                event.preventDefault();
                logout();
            });
        });

        try {
            await refresh();
        } finally {
            resolveReady();
        }

        if (document.body.dataset.page === "admin") {
            await requireAuth();
        }

        if (document.getElementById("login-form")) {
            await initLoginPage();
        }
    });

    window.Auth = {
        ready: ready,
        getAdmin: () => admin,
        isAuthenticated: () => Boolean(admin),
        login: login,
        logout: logout,
        refresh: refresh,
        requireAuth: requireAuth
    };
})();
