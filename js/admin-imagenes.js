// Administracion de las imagenes decorativas del catalogo.
(function () {
    "use strict";

    const MAX_IMAGE_SIZE = 5 * 1024 * 1024;
    const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"];
    const imageFields = {
        camisa: {
            hidden: "grafico-camisa",
            file: "grafico-camisa-archivo",
            preview: "preview-grafico-camisa",
            setting: "grafico_camisa"
        },
        node: {
            hidden: "grafico-node",
            file: "grafico-node-archivo",
            preview: "preview-grafico-node",
            setting: "grafico_node"
        }
    };

    let paletaActual = "hombre";
    let guardandoPaleta = false;
    const currentImages = {
        camisa: "img/grafico1.jpg",
        node: "img/grafico2.jpg"
    };
    const previewObjectUrls = {
        camisa: null,
        node: null
    };

    function nombrePaleta(paleta) {
        return paleta === "mujer" ? "Rosa y lavanda" : "Azul clasico";
    }

    function renderPaleta(paleta) {
        const normalized = window.ThemePalette ? ThemePalette.apply(paleta) : (paleta === "mujer" ? "mujer" : "hombre");
        paletaActual = normalized;

        document.querySelectorAll("#paleta-selector [data-paleta]").forEach((button) => {
            const activa = button.dataset.paleta === normalized;
            button.classList.toggle("paleta-selector__opcion--activo", activa);
            button.setAttribute("aria-pressed", String(activa));
        });

        return normalized;
    }

    async function selectPalette(event) {
        const button = event.target.closest("[data-paleta]");
        if (!button || guardandoPaleta) return;

        const nueva = button.dataset.paleta;
        if (nueva === paletaActual) return;

        const anterior = paletaActual;
        const errorBox = document.getElementById("paleta-error");
        const buttons = document.querySelectorAll("#paleta-selector [data-paleta]");

        if (errorBox) errorBox.textContent = "";
        guardandoPaleta = true;
        buttons.forEach((item) => { item.disabled = true; });
        renderPaleta(nueva);

        try {
            const settings = await API.updateSettings({ paleta: nueva });
            const aplicada = renderPaleta(settings.paleta || nueva);
            UI.toast("Paleta aplicada: " + nombrePaleta(aplicada) + ".");
        } catch (error) {
            renderPaleta(anterior);
            if (errorBox) errorBox.textContent = error.message;
        } finally {
            guardandoPaleta = false;
            buttons.forEach((item) => { item.disabled = false; });
        }
    }

    function setPreview(key, src, objectUrl) {
        const preview = document.getElementById(imageFields[key].preview);
        if (!preview) return;

        if (previewObjectUrls[key]) {
            URL.revokeObjectURL(previewObjectUrls[key]);
            previewObjectUrls[key] = null;
        }

        if (objectUrl) previewObjectUrls[key] = objectUrl;
        preview.src = src;
    }

    function resetPreview(key) {
        const fallback = currentImages[key]
            ? Store.sanitizeImage(currentImages[key])
            : (key === "camisa" ? "img/grafico1.jpg" : "img/grafico2.jpg");
        setPreview(key, fallback);
    }

    function updatePreviews() {
        resetPreview("camisa");
        resetPreview("node");
    }

    function handleFileChange(event, key) {
        const input = event.currentTarget;
        const errorBox = document.getElementById("graficos-error");
        const file = input.files && input.files[0] ? input.files[0] : null;

        if (errorBox) errorBox.textContent = "";

        if (!file) {
            resetPreview(key);
            return;
        }

        if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
            input.value = "";
            resetPreview(key);
            if (errorBox) errorBox.textContent = "Formato no permitido. Usa JPG, PNG o WebP.";
            return;
        }

        if (file.size > MAX_IMAGE_SIZE) {
            input.value = "";
            resetPreview(key);
            if (errorBox) errorBox.textContent = "La imagen no puede superar los 5 MB.";
            return;
        }

        const objectUrl = URL.createObjectURL(file);
        setPreview(key, objectUrl, objectUrl);
    }

    async function loadSettings(form) {
        const errorBox = document.getElementById("graficos-error");
        try {
            const settings = await API.getSettings();
            currentImages.camisa = settings.grafico_camisa || "img/grafico1.jpg";
            currentImages.node = settings.grafico_node || "img/grafico2.jpg";
            form.elements.grafico_camisa.value = currentImages.camisa;
            form.elements.grafico_node.value = currentImages.node;
            form.elements.grafico_camisa_archivo.value = "";
            form.elements.grafico_node_archivo.value = "";
            renderPaleta(settings.paleta || "hombre");
            updatePreviews();
        } catch (error) {
            if (errorBox) errorBox.textContent = "No se pudieron cargar las imagenes: " + error.message;
        }
    }

    async function saveSettings(event) {
        event.preventDefault();
        const form = event.currentTarget;
        const errorBox = document.getElementById("graficos-error");
        const submit = document.getElementById("guardar-graficos");

        const camisaActual = form.elements.grafico_camisa.value.trim();
        const nodeActual = form.elements.grafico_node.value.trim();
        const camisaInput = form.elements.grafico_camisa_archivo;
        const nodeInput = form.elements.grafico_node_archivo;
        const camisaArchivo = camisaInput.files && camisaInput.files[0] ? camisaInput.files[0] : null;
        const nodeArchivo = nodeInput.files && nodeInput.files[0] ? nodeInput.files[0] : null;

        if (errorBox) errorBox.textContent = "";

        if (!camisaActual && !camisaArchivo) {
            if (errorBox) errorBox.textContent = "Selecciona la imagen decorativa 1.";
            return;
        }
        if (!nodeActual && !nodeArchivo) {
            if (errorBox) errorBox.textContent = "Selecciona la imagen decorativa 2.";
            return;
        }

        if (submit) submit.disabled = true;

        try {
            const camisa = camisaArchivo ? await API.uploadCatalogImage(camisaArchivo) : camisaActual;
            const node = nodeArchivo ? await API.uploadCatalogImage(nodeArchivo) : nodeActual;
            const settings = await API.updateSettings({
                grafico_camisa: camisa,
                grafico_node: node
            });

            currentImages.camisa = settings.grafico_camisa;
            currentImages.node = settings.grafico_node;
            form.elements.grafico_camisa.value = currentImages.camisa;
            form.elements.grafico_node.value = currentImages.node;
            camisaInput.value = "";
            nodeInput.value = "";
            updatePreviews();
            UI.toast("Imagenes del catalogo actualizadas.");
        } catch (error) {
            if (errorBox) errorBox.textContent = error.message;
        } finally {
            if (submit) submit.disabled = false;
        }
    }

    async function init() {
        await Auth.ready;
        if (!Auth.isAuthenticated()) return;

        const form = document.getElementById("graficos-form");
        if (!form) return;

        form.addEventListener("submit", saveSettings);
        document.getElementById("paleta-selector").addEventListener("click", selectPalette);
        document.getElementById("grafico-camisa-archivo").addEventListener("change", (event) => handleFileChange(event, "camisa"));
        document.getElementById("grafico-node-archivo").addEventListener("change", (event) => handleFileChange(event, "node"));

        await loadSettings(form);
    }

    document.addEventListener("DOMContentLoaded", init);
})();
