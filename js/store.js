// Capa de acceso a datos: productos, carrito, sesion y pedidos sobre localStorage.
(function () {
    "use strict";

    const KEYS = {
        products: "fs_products_v1",
        cart: "fs_cart_v1",
        session: "fs_session_v1",
        orders: "fs_orders_v1"
    };

    function clone(value) {
        return JSON.parse(JSON.stringify(value));
    }

    function read(key, fallback) {
        try {
            const raw = localStorage.getItem(key);
            if (!raw) return fallback;
            const value = JSON.parse(raw);
            return value === null || value === undefined ? fallback : value;
        } catch (error) {
            console.warn("No se pudo leer", key, error);
            return fallback;
        }
    }

    function write(key, value) {
        try {
            localStorage.setItem(key, JSON.stringify(value));
            return true;
        } catch (error) {
            console.warn("No se pudo guardar", key, error);
            return false;
        }
    }

    function seedProducts() {
        try {
            if (!localStorage.getItem(KEYS.products)) {
                write(KEYS.products, clone(PRODUCTOS_DEFAULT));
            }
        } catch (error) {
            console.warn("No se pudo inicializar el catalogo", error);
        }
    }

    function getProducts() {
        seedProducts();
        return read(KEYS.products, clone(PRODUCTOS_DEFAULT));
    }

    function saveProducts(products) {
        write(KEYS.products, products);
    }

    function getProductById(id) {
        return getProducts().find((product) => product.id === Number(id)) || null;
    }

    function createProduct(data) {
        const products = getProducts();
        const nextId = products.reduce((max, product) => Math.max(max, Number(product.id) || 0), 0) + 1;
        const product = Object.assign({}, data, { id: nextId });
        products.push(product);
        saveProducts(products);
        return product;
    }

    function updateProduct(id, data) {
        const products = getProducts();
        const index = products.findIndex((product) => product.id === Number(id));
        if (index === -1) return null;
        products[index] = Object.assign({}, products[index], data, { id: Number(id) });
        saveProducts(products);
        return products[index];
    }

    function deleteProduct(id) {
        const products = getProducts().filter((product) => product.id !== Number(id));
        saveProducts(products);
        const cart = getCart().filter((line) => line.id !== Number(id));
        write(KEYS.cart, cart);
        notifyCart();
    }

    function resetProducts() {
        saveProducts(clone(PRODUCTOS_DEFAULT));
    }

    function getCart() {
        return read(KEYS.cart, []);
    }

    function notifyCart() {
        document.dispatchEvent(new CustomEvent("fs:cart-updated"));
    }

    function saveCart(cart) {
        write(KEYS.cart, cart);
        notifyCart();
    }

    function addToCart(id, talla, cantidad, productSnapshot) {
        const product = productSnapshot || getProductById(id);
        if (!product) return null;

        const quantity = Math.min(99, Math.max(1, Number(cantidad) || 1));
        const cart = getCart();
        const line = cart.find((item) => item.id === product.id && item.talla === talla);
        const snapshot = {
            nombre: product.nombre,
            precio: Number(product.precio),
            imagen: product.imagen
        };

        if (line) {
            line.cantidad = Math.min(99, line.cantidad + quantity);
            Object.assign(line, snapshot);
        } else {
            cart.push(Object.assign({ id: product.id, talla: talla, cantidad: quantity }, snapshot));
        }

        saveCart(cart);
        return cart;
    }

    function updateCartLine(id, talla, cantidad) {
        const quantity = Math.min(99, Math.max(0, Number(cantidad) || 0));
        let cart = getCart();
        const line = cart.find((item) => item.id === Number(id) && item.talla === talla);
        if (!line) return;
        if (quantity === 0) {
            cart = cart.filter((item) => !(item.id === Number(id) && item.talla === talla));
        } else {
            line.cantidad = quantity;
        }
        saveCart(cart);
    }

    function removeFromCart(id, talla) {
        const cart = getCart().filter((item) => !(item.id === Number(id) && item.talla === talla));
        saveCart(cart);
    }

    function clearCart() {
        saveCart([]);
    }

    function getCartCount() {
        return getCart().reduce((total, line) => total + Number(line.cantidad || 0), 0);
    }

    function getCartDetailed() {
        const products = getProducts();
        return getCart()
            .map((line) => {
                const product = line.nombre
                    ? { id: line.id, nombre: line.nombre, precio: line.precio, imagen: line.imagen }
                    : products.find((item) => item.id === line.id);
                if (!product) return null;
                return {
                    id: line.id,
                    talla: line.talla,
                    cantidad: line.cantidad,
                    producto: product,
                    subtotal: Number(product.precio) * Number(line.cantidad)
                };
            })
            .filter(Boolean);
    }

    function getCartTotal() {
        return getCartDetailed().reduce((total, line) => total + line.subtotal, 0);
    }

    function getOrders() {
        return read(KEYS.orders, []);
    }

    function saveOrder(order) {
        const orders = getOrders();
        orders.unshift(order);
        write(KEYS.orders, orders);
        return order;
    }

    function formatPrice(value) {
        return "$" + Number(value || 0).toFixed(2);
    }

    function sanitizeImage(value) {
        const image = String(value || "").trim();
        if (/^(https?:\/\/|img\/|\.\/|\/)/i.test(image)) return image;
        return "img/logo.png";
    }

    function saveSession(session, remember) {
        clearSession();
        try {
            const storage = remember ? localStorage : sessionStorage;
            storage.setItem(KEYS.session, JSON.stringify(session));
        } catch (error) {
            console.warn("No se pudo guardar la sesion", error);
        }
    }

    function getSession() {
        const storages = [sessionStorage, localStorage];
        for (const storage of storages) {
            try {
                const raw = storage.getItem(KEYS.session);
                if (!raw) continue;
                const session = JSON.parse(raw);
                if (session && session.expira > Date.now()) return session;
                storage.removeItem(KEYS.session);
            } catch (error) {
                console.warn("Sesion invalida", error);
            }
        }
        return null;
    }

    function clearSession() {
        try {
            sessionStorage.removeItem(KEYS.session);
            localStorage.removeItem(KEYS.session);
        } catch (error) {
            console.warn("No se pudo cerrar la sesion", error);
        }
    }

    window.Store = {
        KEYS,
        getProducts,
        saveProducts,
        getProductById,
        createProduct,
        updateProduct,
        deleteProduct,
        resetProducts,
        getCart,
        addToCart,
        updateCartLine,
        removeFromCart,
        clearCart,
        getCartCount,
        getCartDetailed,
        getCartTotal,
        getOrders,
        saveOrder,
        formatPrice,
        sanitizeImage,
        saveSession,
        getSession,
        clearSession
    };
})();
