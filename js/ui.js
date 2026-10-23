// Componentes compartidos: notificaciones toast y contador del carrito.
(function () {
    "use strict";

    let toastContainer = null;

    function getToastContainer() {
        if (toastContainer && document.body.contains(toastContainer)) return toastContainer;
        toastContainer = document.createElement("div");
        toastContainer.className = "toast-container";
        toastContainer.setAttribute("aria-live", "polite");
        document.body.appendChild(toastContainer);
        return toastContainer;
    }

    function toast(message, options) {
        const settings = Object.assign(
            { type: "success", link: null, linkText: "Ver carrito", duration: 4500 },
            options || {}
        );
        const container = getToastContainer();

        const element = document.createElement("div");
        element.className = "toast toast--" + settings.type;
        element.setAttribute("role", "status");

        const text = document.createElement("p");
        text.className = "toast__texto";
        text.textContent = message;
        element.appendChild(text);

        if (settings.link) {
            const link = document.createElement("a");
            link.className = "toast__enlace";
            link.href = settings.link;
            link.textContent = settings.linkText;
            element.appendChild(link);
        }

        const close = document.createElement("button");
        close.type = "button";
        close.className = "toast__cerrar";
        close.setAttribute("aria-label", "Cerrar notificación");
        close.textContent = "\u00d7";
        close.addEventListener("click", () => removeToast(element));
        element.appendChild(close);

        container.appendChild(element);
        requestAnimationFrame(() => element.classList.add("toast--visible"));

        if (settings.duration > 0) {
            window.setTimeout(() => removeToast(element), settings.duration);
        }

        return element;
    }

    function removeToast(element) {
        if (!element || !element.parentNode) return;
        element.classList.remove("toast--visible");
        window.setTimeout(() => {
            if (element.parentNode) element.parentNode.removeChild(element);
        }, 220);
    }

    function updateCartBadge() {
        if (!window.Store) return;
        const count = Store.getCartCount();
        document.querySelectorAll("[data-cart-count]").forEach((badge) => {
            badge.textContent = String(count);
            badge.hidden = count === 0;
        });
        document.querySelectorAll("[data-cart-link]").forEach((link) => {
            link.setAttribute("aria-label", count > 0 ? "Ver carrito, " + count + " productos" : "Ver carrito vacío");
        });
    }

    function init() {
        updateCartBadge();
        document.addEventListener("fs:cart-updated", updateCartBadge);
        window.addEventListener("storage", (event) => {
            if (event.key && event.key.indexOf("fs_cart") === 0) updateCartBadge();
        });
    }

    document.addEventListener("DOMContentLoaded", init);

    window.UI = {
        toast: toast,
        updateCartBadge: updateCartBadge
    };
})();
