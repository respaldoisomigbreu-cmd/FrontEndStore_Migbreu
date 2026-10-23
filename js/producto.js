// Detalle de producto: carga datos, tallas y alta en el carrito.
(function () {
    "use strict";

    function renderTallas(select, tallas) {
        select.replaceChildren();
        const placeholder = new Option("--Seleccionar talla--", "", true, true);
        placeholder.disabled = true;
        select.appendChild(placeholder);

        const available = Array.isArray(tallas) && tallas.length > 0 ? tallas : ["S", "M", "L", "XL"];
        available.forEach((talla) => select.appendChild(new Option(talla, talla)));
    }

    async function init() {
        const nombre = document.getElementById("producto-nombre");
        if (!nombre) return;

        const params = new URLSearchParams(window.location.search);
        const id = Number(params.get("id"));
        const detail = document.getElementById("producto-detalle");
        const notFound = document.getElementById("producto-no-encontrado");

        let product = null;
        try {
            product = await API.getProduct(id);
        } catch (error) {
            product = null;
        }

        if (!product) {
            if (detail) detail.hidden = true;
            if (notFound) notFound.hidden = false;
            nombre.textContent = "Producto no encontrado";
            document.title = "Producto no encontrado - FrontEnd Store";
            return;
        }

        const image = document.getElementById("producto-imagen");
        const description = document.getElementById("producto-descripcion");
        const price = document.getElementById("producto-precio");
        const select = document.getElementById("talla");
        const form = document.getElementById("formulario-producto");
        const errorBox = document.getElementById("form-error");

        nombre.textContent = product.nombre;
        image.src = Store.sanitizeImage(product.imagen);
        image.alt = "Camiseta " + product.nombre;
        description.textContent = product.descripcion;
        price.textContent = Store.formatPrice(product.precio);
        renderTallas(select, product.tallas);

        document.title = product.nombre + " - FrontEnd Store";

        const metaDescription = document.querySelector('meta[name="description"]');
        if (metaDescription) {
            metaDescription.setAttribute("content", product.descripcion + " Precio: " + Store.formatPrice(product.precio) + ".");
        }

        form.addEventListener("submit", (event) => {
            event.preventDefault();
            errorBox.textContent = "";

            const talla = select.value;
            const quantityInput = document.getElementById("cantidad");
            const cantidad = Number(quantityInput.value);

            if (!talla) {
                errorBox.textContent = "Selecciona una talla antes de continuar.";
                select.focus();
                return;
            }
            if (!Number.isInteger(cantidad) || cantidad < 1 || cantidad > 99) {
                errorBox.textContent = "La cantidad debe ser un número entre 1 y 99.";
                quantityInput.focus();
                return;
            }

            Cart.add(product.id, talla, cantidad, product);
            UI.toast("\u00a1" + product.nombre + " a\u00f1adido al carrito con \u00e9xito!", {
                link: "carrito.html",
                linkText: "Ver carrito"
            });
            form.reset();
            select.value = "";
            quantityInput.value = "";
        });
    }

    document.addEventListener("DOMContentLoaded", init);
})();
