// Registro de ventas con filtros y paginacion.
(function () {
    "use strict";

    let ordenActual = "ultimas";
    let paginaActual = 1;

    function text(tag, className, value) {
        const element = document.createElement(tag);
        if (className) element.className = className;
        if (value !== undefined) element.textContent = value;
        return element;
    }

    function statusSelect(order) {
        const select = document.createElement("select");
        select.className = "ventas__estado";
        select.dataset.estado = "true";
        select.dataset.id = String(order.id);
        select.dataset.original = order.estado;

        ["Pendiente", "Completado", "Cancelado"].forEach((status) => {
            const option = document.createElement("option");
            option.value = status;
            option.textContent = status;
            option.selected = status === order.estado;
            select.appendChild(option);
        });

        return select;
    }

    function renderOrders(orders) {
        const container = document.getElementById("admin-pedidos");
        if (!container) return;

        container.replaceChildren();

        if (!orders || orders.length === 0) {
            const message = ordenActual === "pendientes"
                ? "No hay ventas pendientes."
                : "Todavia no hay pedidos registrados.";
            container.appendChild(text("p", "admin__vacio", message));
            return;
        }

        const wrap = document.createElement("div");
        wrap.className = "ventas__tabla-wrap";

        const table = document.createElement("table");
        table.className = "ventas__tabla";

        const thead = document.createElement("thead");
        const headRow = document.createElement("tr");
        ["Pedido", "Fecha", "Cliente", "Telefono", "Compras", "Tipo", "Articulos", "Unidades", "Total", "Estado"].forEach((label) => {
            headRow.appendChild(text("th", "", label));
        });
        thead.appendChild(headRow);
        table.appendChild(thead);

        const tbody = document.createElement("tbody");

        orders.forEach((order) => {
            const row = document.createElement("tr");

            row.appendChild(text("td", "ventas__id", "#" + order.id));
            const date = new Date(order.fecha.replace(" ", "T"));
            row.appendChild(text("td", "", isNaN(date.getTime()) ? order.fecha : date.toLocaleString("es-ES")));
            row.appendChild(text("td", "", order.cliente.nombre_completo));
            row.appendChild(text("td", "", order.cliente.telefono));

            const purchases = document.createElement("td");
            const badge = document.createElement("span");
            const count = Number(order.compras_realizadas) || 0;
            badge.className = "badge " + (count <= 1 ? "badge--nuevo" : "badge--frecuente");
            badge.textContent = count <= 1 ? "Cliente Nuevo" : count + " compras";
            purchases.appendChild(badge);
            row.appendChild(purchases);

            row.appendChild(text("td", "", order.tipo_cliente));

            const items = (order.items || [])
                .map((item) => item.nombre + " (" + item.talla + ") x" + item.cantidad)
                .join(", ");
            row.appendChild(text("td", "ventas__articulos", items));
            row.appendChild(text("td", "", String(order.unidades || 0)));

            row.appendChild(text("td", "ventas__total", Store.formatPrice(order.total)));

            const statusCell = document.createElement("td");
            statusCell.appendChild(statusSelect(order));
            row.appendChild(statusCell);

            tbody.appendChild(row);
        });

        table.appendChild(tbody);
        wrap.appendChild(table);
        container.appendChild(wrap);
    }

    function renderClients(clients) {
        const container = document.getElementById("admin-pedidos");
        if (!container) return;

        container.replaceChildren();

        if (!clients || clients.length === 0) {
            container.appendChild(text("p", "admin__vacio", "Todavia no hay clientes registrados."));
            return;
        }

        const wrap = document.createElement("div");
        wrap.className = "ventas__tabla-wrap";

        const table = document.createElement("table");
        table.className = "ventas__tabla";

        const thead = document.createElement("thead");
        const headRow = document.createElement("tr");
        ["Cliente", "Compras realizadas", "Productos adquiridos", "Total gastado"].forEach((label) => {
            headRow.appendChild(text("th", "", label));
        });
        thead.appendChild(headRow);
        table.appendChild(thead);

        const tbody = document.createElement("tbody");

        clients.forEach((client) => {
            const row = document.createElement("tr");
            row.appendChild(text("td", "", client.nombre_completo));
            row.appendChild(text("td", "ventas__numero", String(client.compras_realizadas)));
            row.appendChild(text("td", "ventas__numero", String(client.productos_adquiridos)));
            row.appendChild(text("td", "ventas__total", Store.formatPrice(client.total_gastado)));
            tbody.appendChild(row);
        });

        table.appendChild(tbody);
        wrap.appendChild(table);
        container.appendChild(wrap);
    }

    function renderPagination(pagination, singular, plural) {
        const nav = document.getElementById("admin-pedidos-paginacion");
        const totalLabel = document.getElementById("ventas-total");
        if (!nav) return;

        nav.replaceChildren();

        if (totalLabel) {
            totalLabel.textContent = pagination.total + " " + (pagination.total === 1 ? singular : plural);
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

    function updateModeButtons() {
        document.querySelectorAll("[data-orden]").forEach((button) => {
            button.classList.toggle("ventas__filtro--activo", button.dataset.orden === ordenActual);
        });
    }

    async function loadSales() {
        const container = document.getElementById("admin-pedidos");
        if (!container) return;

        try {
            if (ordenActual === "frecuentes") {
                const data = await API.getClientsSummary({ pagina: paginaActual });
                paginaActual = data.pagination.pagina;
                renderClients(data.clients);
                renderPagination(data.pagination, "cliente", "clientes");
            } else {
                const data = await API.getOrders({ orden: ordenActual, pagina: paginaActual });
                paginaActual = data.pagination.pagina;
                renderOrders(data.orders);
                renderPagination(data.pagination, "venta", "ventas");
            }
            updateModeButtons();
        } catch (error) {
            container.replaceChildren(text("p", "admin__vacio", "No se pudo cargar el registro: " + error.message));
            const nav = document.getElementById("admin-pedidos-paginacion");
            if (nav) nav.hidden = true;
        }
    }

    async function handleStatusChange(event) {
        const select = event.target.closest("[data-estado]");
        if (!select) return;

        const id = Number(select.dataset.id);
        const estado = select.value;

        try {
            await API.updateOrderStatus(id, estado);
            select.dataset.original = estado;
            UI.toast("Estado del pedido actualizado.");
        } catch (error) {
            select.value = select.dataset.original;
            UI.toast(error.message, { type: "error" });
        }
    }

    async function handleFilter(event) {
        const button = event.target.closest("[data-orden]");
        if (!button) return;

        ordenActual = button.dataset.orden;
        paginaActual = 1;
        updateModeButtons();
        await loadSales();
    }

    async function handlePagination(event) {
        const button = event.target.closest("[data-pagina]");
        if (!button || button.disabled) return;

        paginaActual = Number(button.dataset.pagina);
        await loadSales();
    }

    async function init() {
        await Auth.ready;
        if (!Auth.isAuthenticated()) return;

        const container = document.getElementById("admin-pedidos");
        if (!container) return;

        container.addEventListener("change", handleStatusChange);
        document.getElementById("ventas-controles").addEventListener("click", handleFilter);
        document.getElementById("admin-pedidos-paginacion").addEventListener("click", handlePagination);

        await loadSales();
    }

    document.addEventListener("DOMContentLoaded", init);
})();
