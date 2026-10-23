// Cliente centralizado para la API PHP.
(function () {
    "use strict";

    const BASE = "api/";
    const CSRF_KEY = "fs_csrf_token";
    let csrfToken = sessionStorage.getItem(CSRF_KEY) || "";

    class ApiError extends Error {
        constructor(message, status, data) {
            super(message);
            this.name = "ApiError";
            this.status = status || 0;
            this.data = data || null;
        }
    }

    function setCsrf(token) {
        csrfToken = token || "";
        if (csrfToken) {
            sessionStorage.setItem(CSRF_KEY, csrfToken);
        } else {
            sessionStorage.removeItem(CSRF_KEY);
        }
    }

    async function request(path, options) {
        const settings = Object.assign({ method: "GET", body: null }, options || {});
        const headers = { Accept: "application/json" };
        const isFormData = typeof FormData !== "undefined" && settings.body instanceof FormData;

        if (settings.body !== null && !isFormData) {
            headers["Content-Type"] = "application/json";
        }
        if (settings.method !== "GET" && csrfToken) {
            headers["X-CSRF-Token"] = csrfToken;
        }

        let response;
        try {
            response = await fetch(BASE + path, {
                method: settings.method,
                headers: headers,
                credentials: "same-origin",
                body: settings.body !== null ? (isFormData ? settings.body : JSON.stringify(settings.body)) : undefined
            });
        } catch (error) {
            throw new ApiError("No se pudo conectar con el servidor.", 0, null);
        }

        const raw = await response.text();
        let data = null;
        if (raw) {
            try {
                data = JSON.parse(raw);
            } catch (error) {
                data = null;
            }
        }

        if (!response.ok) {
            throw new ApiError(
                (data && data.error) || "Error al procesar la solicitud.",
                response.status,
                data
            );
        }

        return data;
    }

    async function login(email, password, remember) {
        const data = await request("login.php", {
            method: "POST",
            body: { email: email, password: password, remember: Boolean(remember) }
        });
        setCsrf(data.csrf_token);
        return data;
    }

    async function logout() {
        try {
            await request("logout.php", { method: "POST", body: {} });
        } finally {
            setCsrf("");
        }
    }

    async function me() {
        const data = await request("me.php");
        setCsrf(data.csrf_token);
        return data;
    }

    async function getProducts() {
        const data = await request("products.php");
        return data.products;
    }

    async function getAdminProducts(params) {
        const options = params || {};
        const query = new URLSearchParams();
        query.set("pagina", String(options.pagina || 1));
        query.set("por_pagina", String(options.porPagina || 10));
        return request("products.php?" + query.toString());
    }

    async function getProduct(id) {
        const data = await request("product.php?id=" + encodeURIComponent(id));
        return data.product;
    }

    async function createProduct(product) {
        const data = await request("products.php", { method: "POST", body: product });
        return data.product;
    }

    async function updateProduct(id, product) {
        const data = await request("product.php?id=" + encodeURIComponent(id), {
            method: "PUT",
            body: product
        });
        return data.product;
    }

    async function deleteProduct(id) {
        return request("product.php?id=" + encodeURIComponent(id), { method: "DELETE" });
    }

    async function uploadImage(path, file) {
        const formData = new FormData();
        formData.append("imagen", file);
        const data = await request(path, {
            method: "POST",
            body: formData
        });
        return data.imagen;
    }

    async function uploadProductImage(file) {
        return uploadImage("admin/upload-product-image.php", file);
    }

    async function uploadCatalogImage(file) {
        return uploadImage("admin/upload-catalog-image.php", file);
    }

    async function createOrder(payload) {
        return request("orders.php", { method: "POST", body: payload });
    }

    async function getOrders(params) {
        const options = params || {};
        const query = new URLSearchParams();
        if (options.orden) query.set("orden", options.orden);
        if (options.pagina) query.set("pagina", String(options.pagina));
        const suffix = query.toString() ? "?" + query.toString() : "";
        return request("admin/orders.php" + suffix);
    }

    async function getClientsSummary(params) {
        const options = params || {};
        const query = new URLSearchParams();
        query.set("pagina", String(options.pagina || 1));
        return request("admin/clients-summary.php?" + query.toString());
    }

    async function getSettings() {
        const data = await request("settings.php");
        return data.settings;
    }

    async function updateSettings(settings) {
        const data = await request("admin/settings.php", { method: "POST", body: settings });
        return data.settings;
    }

    async function updateOrderStatus(id, estado) {
        return request("admin/order-status.php", {
            method: "POST",
            body: { id: id, estado: estado }
        });
    }

    async function getClient(telefono) {
        return request("admin/clients.php?telefono=" + encodeURIComponent(telefono));
    }

    window.API = {
        ApiError: ApiError,
        setCsrf: setCsrf,
        login: login,
        logout: logout,
        me: me,
        getProducts: getProducts,
        getAdminProducts: getAdminProducts,
        getProduct: getProduct,
        createProduct: createProduct,
        updateProduct: updateProduct,
        deleteProduct: deleteProduct,
        uploadProductImage: uploadProductImage,
        uploadCatalogImage: uploadCatalogImage,
        createOrder: createOrder,
        getOrders: getOrders,
        getClientsSummary: getClientsSummary,
        getSettings: getSettings,
        updateSettings: updateSettings,
        updateOrderStatus: updateOrderStatus,
        getClient: getClient
    };
})();
