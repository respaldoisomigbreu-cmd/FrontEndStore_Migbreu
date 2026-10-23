// Render dinamico del catalogo a partir de los productos guardados.
(function () {
    "use strict";

    function createProductCard(product) {
        const card = document.createElement("div");
        card.className = "producto";

        const link = document.createElement("a");
        link.href = "producto.html?id=" + encodeURIComponent(product.id);

        const image = document.createElement("img");
        image.className = "producto__imagen";
        image.src = Store.sanitizeImage(product.imagen);
        image.alt = "Camiseta " + product.nombre;
        image.loading = "lazy";
        link.appendChild(image);

        const info = document.createElement("div");
        info.className = "producto__informacion";

        const name = document.createElement("p");
        name.className = "producto__nombre";
        name.textContent = product.nombre;
        info.appendChild(name);

        const price = document.createElement("p");
        price.className = "producto__precio";
        price.textContent = Store.formatPrice(product.precio);
        info.appendChild(price);

        link.appendChild(info);
        card.appendChild(link);
        return card;
    }

    function createGraphic(modifier, image) {
        const graphic = document.createElement("div");
        graphic.className = "grafico " + modifier;
        graphic.setAttribute("aria-hidden", "true");
        if (image) {
            const source = Store.sanitizeImage(image).replace(/["\\]/g, "\\$&");
            graphic.style.backgroundImage = 'url("' + source + '")';
        }
        return graphic;
    }

    async function renderCatalog() {
        const container = document.getElementById("catalogo");
        if (!container) return;

        let products;
        let settings = {};
        try {
            const data = await Promise.all([
                API.getProducts(),
                API.getSettings().catch(() => ({}))
            ]);
            products = data[0];
            settings = data[1] || {};
        } catch (error) {
            const message = document.createElement("p");
            message.className = "catalogo__vacio";
            message.textContent = "No se pudo cargar el catalogo: " + error.message;
            container.replaceChildren(message);
            return;
        }

        container.replaceChildren();

        products.forEach((product, index) => {
            container.appendChild(createProductCard(product));
            if (index === 1) {
                container.appendChild(createGraphic("grafico__camisa", settings.grafico_camisa));
            }
        });

        container.appendChild(createGraphic("grafico__node", settings.grafico_node));

        if (products.length === 0) {
            const empty = document.createElement("p");
            empty.className = "catalogo__vacio";
            empty.textContent = "No hay productos disponibles por el momento.";
            container.appendChild(empty);
        }
    }

    document.addEventListener("DOMContentLoaded", renderCatalog);
})();
