// Carrito de compras: alta, edicion, total y finalizacion del pedido.
(function () {
    "use strict";

    function renderCartLine(line) {
        const article = document.createElement("article");
        article.className = "carrito__linea";
        article.dataset.id = String(line.id);
        article.dataset.talla = line.talla;

        const image = document.createElement("img");
        image.className = "carrito__imagen";
        image.src = Store.sanitizeImage(line.producto.imagen);
        image.alt = "Camiseta " + line.producto.nombre;
        article.appendChild(image);

        const info = document.createElement("div");
        info.className = "carrito__info";

        const name = document.createElement("p");
        name.className = "carrito__nombre";
        name.textContent = line.producto.nombre;
        info.appendChild(name);

        const meta = document.createElement("p");
        meta.className = "carrito__meta";
        meta.textContent = "Talla " + line.talla + " \u00b7 " + Store.formatPrice(line.producto.precio) + " c/u";
        info.appendChild(meta);

        article.appendChild(info);

        const quantity = document.createElement("input");
        quantity.className = "carrito__cantidad";
        quantity.type = "number";
        quantity.min = "1";
        quantity.max = "99";
        quantity.value = String(line.cantidad);
        quantity.setAttribute("aria-label", "Cantidad de " + line.producto.nombre);
        quantity.dataset.cantidad = "true";
        article.appendChild(quantity);

        const subtotal = document.createElement("p");
        subtotal.className = "carrito__subtotal";
        subtotal.textContent = Store.formatPrice(line.subtotal);
        article.appendChild(subtotal);

        const remove = document.createElement("button");
        remove.type = "button";
        remove.className = "boton boton--peligro boton--pequeno";
        remove.textContent = "Eliminar";
        remove.dataset.accion = "eliminar";
        article.appendChild(remove);

        return article;
    }

    function renderCartPage() {
        const list = document.getElementById("carrito-lista");
        if (!list) return;

        const empty = document.getElementById("carrito-vacio");
        const content = document.getElementById("carrito-contenido");
        const detailed = Store.getCartDetailed();

        if (detailed.length === 0) {
            empty.hidden = false;
            content.hidden = true;
            return;
        }

        empty.hidden = true;
        content.hidden = false;
        list.replaceChildren();
        detailed.forEach((line) => list.appendChild(renderCartLine(line)));
        document.getElementById("carrito-total").textContent = Store.formatPrice(Store.getCartTotal());
    }

    async function checkout() {
        const detailed = Store.getCartDetailed();
        const errorBox = document.getElementById("checkout-error");
        const button = document.getElementById("finalizar-pedido");

        if (errorBox) errorBox.textContent = "";

        if (detailed.length === 0) {
            UI.toast("Tu carrito está vacío.", { type: "error" });
            return;
        }

        const nameInput = document.getElementById("nombre-comprador");
        const phoneInput = document.getElementById("telefono-comprador");
        const nombre = nameInput ? nameInput.value.trim() : "";
        const telefono = phoneInput ? phoneInput.value.replace(/\D/g, "") : "";

        if (nombre.length < 3) {
            if (errorBox) errorBox.textContent = "Escribe el nombre completo del comprador (mínimo 3 caracteres).";
            if (nameInput) nameInput.focus();
            return;
        }
        if (telefono.length < 7 || telefono.length > 15) {
            if (errorBox) errorBox.textContent = "Escribe un teléfono válido de entre 7 y 15 dígitos.";
            if (phoneInput) phoneInput.focus();
            return;
        }

        if (button) button.disabled = true;

        try {
            const result = await API.createOrder({
                nombre_completo: nombre,
                telefono: telefono,
                items: detailed.map((line) => ({
                    producto_id: line.producto.id,
                    talla: line.talla,
                    cantidad: line.cantidad
                }))
            });

            Store.clearCart();
            renderCartPage();
            showOrderConfirmation(result);
            UI.toast("¡Su compra fue realizada exitosamente!", { type: "success", duration: 6000 });
        } catch (error) {
            if (errorBox) errorBox.textContent = error.message;
            UI.toast(error.message, { type: "error" });
        } finally {
            if (button) button.disabled = false;
        }
    }

    function showOrderConfirmation(result) {
        const confirmation = document.getElementById("pedido-confirmacion");
        if (!confirmation) return;

        const summary = document.getElementById("pedido-resumen");
        const order = result.order || {};

        if (summary) {
            const cliente = result.cliente || {};
            summary.textContent =
                "Pedido #" + order.id + " \u00b7 " + (cliente.nombre_completo || "") +
                " \u00b7 " + (result.compras_realizadas || 0) + " compras realizadas \u00b7 " +
                (result.tipo_cliente || "") + " \u00b7 " + Store.formatPrice(order.total);
        }

        confirmation.hidden = false;
        confirmation.scrollIntoView({ behavior: "smooth", block: "start" });
    }

    function bindCartPage() {
        const list = document.getElementById("carrito-lista");
        const finalize = document.getElementById("finalizar-pedido");
        if (!list) return;

        renderCartPage();
        document.addEventListener("fs:cart-updated", renderCartPage);

        list.addEventListener("click", (event) => {
            const button = event.target.closest("[data-accion]");
            if (!button) return;
            const line = button.closest(".carrito__linea");
            if (!line) return;

            if (button.dataset.accion === "eliminar") {
                Store.removeFromCart(Number(line.dataset.id), line.dataset.talla);
                UI.toast("Producto eliminado del carrito.");
            }
        });

        list.addEventListener("change", (event) => {
            const input = event.target.closest("[data-cantidad]");
            if (!input) return;
            const line = input.closest(".carrito__linea");
            if (!line) return;
            Store.updateCartLine(Number(line.dataset.id), line.dataset.talla, input.value);
        });

        if (finalize) finalize.addEventListener("click", checkout);
    }

    document.addEventListener("DOMContentLoaded", bindCartPage);

    window.Cart = {
        add: function (id, talla, cantidad, product) {
            return Store.addToCart(id, talla, cantidad, product);
        },
        remove: function (id, talla) {
            Store.removeFromCart(id, talla);
        },
        updateQuantity: function (id, talla, cantidad) {
            Store.updateCartLine(id, talla, cantidad);
        },
        render: renderCartPage,
        checkout: checkout
    };
})();
