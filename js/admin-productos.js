// Administracion de productos con paginacion.
(function () {
    "use strict";

    const MAX_IMAGE_SIZE = 5 * 1024 * 1024;
    const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"];

    let editingId = null;
    let dialog = null;
    let deleteDialog = null;
    let form = null;
    let paginaActual = 1;
    let currentImage = "";
    let previewObjectUrl = null;
    let pendingDeleteId = null;

    function text(tag, className, value) {
        const element = document.createElement(tag);
        if (className) element.className = className;
        if (value !== undefined) element.textContent = value;
        return element;
    }

    function actionButton(label, action, id, variant) {
        const button = document.createElement("button");
        button.type = "button";
        button.className = "boton boton--pequeno " + (variant || "");
        button.textContent = label;
        button.dataset.accion = action;
        button.dataset.id = String(id);
        return button;
    }

    function productCard(product) {
        const card = document.createElement("article");
        card.className = "admin-producto";

        const image = document.createElement("img");
        image.className = "admin-producto__imagen";
        image.src = Store.sanitizeImage(product.imagen);
        image.alt = "Camiseta " + product.nombre;
        card.appendChild(image);

        const info = document.createElement("div");
        info.className = "admin-producto__info";
        info.appendChild(text("h3", "admin-producto__nombre", product.nombre));
        info.appendChild(text("p", "admin-producto__precio", Store.formatPrice(product.precio)));
        info.appendChild(text("p", "admin-producto__desc", product.descripcion));

        const sizes = document.createElement("p");
        sizes.className = "admin-producto__tallas";
        (product.tallas || []).forEach((talla) => {
            const tag = document.createElement("span");
            tag.className = "tag";
            tag.textContent = talla;
            sizes.appendChild(tag);
        });
        info.appendChild(sizes);
        card.appendChild(info);

        const actions = document.createElement("div");
        actions.className = "admin-producto__acciones";
        actions.appendChild(actionButton("Editar", "editar", product.id));
        actions.appendChild(actionButton("Eliminar", "eliminar", product.id, "boton--peligro"));
        card.appendChild(actions);

        return card;
    }

    function renderPagination(pagination) {
        const nav = document.getElementById("admin-productos-paginacion");
        const totalLabel = document.getElementById("admin-productos-total");
        if (!nav) return;

        nav.replaceChildren();

        if (totalLabel) {
            totalLabel.textContent = pagination.total + (pagination.total === 1 ? " producto" : " productos");
        }

        if (pagination.total_paginas <= 1) {
            nav.hidden = true;
            return;
        }

        nav.hidden = false;

        const previous = text("button", "boton boton--pequeno", "Anterior");
        previous.type = "button";
        previous.dataset.pagina = String(pagination.pagina - 1);
        previous.disabled = pagination.pagina <= 1;
        nav.appendChild(previous);

        nav.appendChild(text("span", "paginacion__texto", "Pagina " + pagination.pagina + " de " + pagination.total_paginas));

        const next = text("button", "boton boton--pequeno", "Siguiente");
        next.type = "button";
        next.dataset.pagina = String(pagination.pagina + 1);
        next.disabled = pagination.pagina >= pagination.total_paginas;
        nav.appendChild(next);
    }

    async function loadProducts(page) {
        const list = document.getElementById("admin-lista");
        if (!list) return;

        if (page) paginaActual = page;

        try {
            const data = await API.getAdminProducts({ pagina: paginaActual, porPagina: 10 });
            paginaActual = data.pagination.pagina;
            list.replaceChildren();

            if (data.products.length === 0) {
                list.appendChild(text("p", "admin__vacio", "No hay productos. Crea el primero con el boton de arriba."));
            } else {
                data.products.forEach((product) => list.appendChild(productCard(product)));
            }

            renderPagination(data.pagination);
        } catch (error) {
            list.replaceChildren(text("p", "admin__vacio", "No se pudieron cargar los productos: " + error.message));
            const nav = document.getElementById("admin-productos-paginacion");
            if (nav) nav.hidden = true;
        }
    }

    function setImagePreview(src, objectUrl) {
        const preview = document.getElementById("imagen-preview");
        if (!preview) return;

        if (previewObjectUrl) {
            URL.revokeObjectURL(previewObjectUrl);
            previewObjectUrl = null;
        }

        if (objectUrl) previewObjectUrl = objectUrl;
        preview.src = src;
    }

    function resetImagePreview() {
        const fallback = currentImage ? Store.sanitizeImage(currentImage) : "img/logo.png";
        setImagePreview(fallback);
    }

    function handleFileChange(event) {
        const input = event.currentTarget;
        const errorBox = document.getElementById("producto-error");
        const file = input.files && input.files[0] ? input.files[0] : null;

        if (errorBox) errorBox.textContent = "";

        if (!file) {
            resetImagePreview();
            return;
        }

        if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
            input.value = "";
            resetImagePreview();
            if (errorBox) errorBox.textContent = "Formato no permitido. Usa JPG, PNG o WebP.";
            return;
        }

        if (file.size > MAX_IMAGE_SIZE) {
            input.value = "";
            resetImagePreview();
            if (errorBox) errorBox.textContent = "La imagen no puede superar los 5 MB.";
            return;
        }

        const objectUrl = URL.createObjectURL(file);
        setImagePreview(objectUrl, objectUrl);
    }

    function openForm(product) {
        editingId = product ? product.id : null;
        currentImage = product ? String(product.imagen || "") : "";
        form.reset();
        form.elements.id.value = product ? String(product.id) : "";

        document.getElementById("modal-titulo").textContent = product ? "Editar producto" : "Nuevo producto";
        form.elements.nombre.value = product ? product.nombre : "";
        form.elements.precio.value = product ? product.precio : "";
        form.elements.descripcion.value = product ? product.descripcion : "";
        form.elements.imagen.value = currentImage;

        form.querySelectorAll('input[name="tallas"]').forEach((checkbox) => {
            checkbox.checked = product ? (product.tallas || []).includes(checkbox.value) : false;
        });

        const errorBox = document.getElementById("producto-error");
        if (errorBox) errorBox.textContent = "";
        resetImagePreview();
        dialog.showModal();
    }

    function openDeleteDialog(product) {
        if (!deleteDialog) return;
        pendingDeleteId = product.id;
        deleteDialog.showModal();
    }

    async function confirmDelete() {
        if (!pendingDeleteId) return;

        const id = pendingDeleteId;
        const confirmButton = document.getElementById("confirmar-eliminar");
        pendingDeleteId = null;
        deleteDialog.close();

        if (confirmButton) confirmButton.disabled = true;
        try {
            await API.deleteProduct(id);
            UI.toast("Producto eliminado.");
            await loadProducts();
        } catch (error) {
            UI.toast(error.message, { type: "error", duration: 6000 });
        } finally {
            if (confirmButton) confirmButton.disabled = false;
        }
    }

    async function saveProduct(event) {
        event.preventDefault();
        const errorBox = document.getElementById("producto-error");
        errorBox.textContent = "";

        const nombre = form.elements.nombre.value.trim();
        const precio = Number(form.elements.precio.value);
        const descripcion = form.elements.descripcion.value.trim();
        const imagenActual = form.elements.imagen.value.trim();
        const archivoInput = form.elements.imagen_archivo;
        const archivo = archivoInput.files && archivoInput.files[0] ? archivoInput.files[0] : null;
        const tallas = Array.from(form.querySelectorAll('input[name="tallas"]:checked')).map((input) => input.value);

        if (!nombre) {
            errorBox.textContent = "El nombre es obligatorio.";
            return;
        }
        if (!Number.isFinite(precio) || precio <= 0) {
            errorBox.textContent = "El precio debe ser un numero mayor que cero.";
            return;
        }
        if (!descripcion) {
            errorBox.textContent = "La descripcion es obligatoria.";
            return;
        }
        if (!imagenActual && !archivo) {
            errorBox.textContent = "Selecciona una imagen para el producto.";
            return;
        }
        if (tallas.length === 0) {
            errorBox.textContent = "Selecciona al menos una talla.";
            return;
        }

        const submit = form.querySelector('button[type="submit"]');
        if (submit) submit.disabled = true;

        try {
            const imagen = archivo ? await API.uploadProductImage(archivo) : imagenActual;
            const payload = {
                nombre: nombre,
                precio: precio,
                descripcion: descripcion,
                imagen: imagen,
                tallas: tallas
            };

            if (editingId) {
                await API.updateProduct(editingId, payload);
                UI.toast("Producto actualizado correctamente.");
                await loadProducts();
            } else {
                await API.createProduct(payload);
                UI.toast("Producto creado correctamente.");
                await loadProducts(Number.MAX_SAFE_INTEGER);
            }
            dialog.close();
        } catch (error) {
            errorBox.textContent = error.message;
        } finally {
            if (submit) submit.disabled = false;
        }
    }

    async function handleListClick(event) {
        const button = event.target.closest("[data-accion]");
        if (!button) return;

        const id = Number(button.dataset.id);
        const product = await API.getProduct(id).catch(() => null);
        if (!product) return;

        if (button.dataset.accion === "editar") {
            openForm(product);
        }

        if (button.dataset.accion === "eliminar") {
            openDeleteDialog(product);
        }
    }

    async function handlePagination(event) {
        const button = event.target.closest("[data-pagina]");
        if (!button || button.disabled) return;

        await loadProducts(Number(button.dataset.pagina));
    }

    async function init() {
        await Auth.ready;
        if (!Auth.isAuthenticated()) return;

        dialog = document.getElementById("producto-dialog");
        deleteDialog = document.getElementById("eliminar-dialog");
        form = document.getElementById("producto-form");
        if (!dialog || !form || !deleteDialog) return;

        document.getElementById("nuevo-producto").addEventListener("click", () => openForm(null));
        form.addEventListener("submit", saveProduct);
        document.getElementById("cancelar-producto").addEventListener("click", () => dialog.close());
        document.getElementById("imagen-archivo").addEventListener("change", handleFileChange);
        dialog.addEventListener("close", () => setImagePreview("img/logo.png"));
        document.getElementById("confirmar-eliminar").addEventListener("click", confirmDelete);
        document.getElementById("cancelar-eliminar").addEventListener("click", () => {
            pendingDeleteId = null;
            deleteDialog.close();
        });
        deleteDialog.addEventListener("close", () => {
            pendingDeleteId = null;
        });
        document.getElementById("admin-lista").addEventListener("click", handleListClick);
        document.getElementById("admin-productos-paginacion").addEventListener("click", handlePagination);

        await loadProducts();
    }

    document.addEventListener("DOMContentLoaded", init);
})();
