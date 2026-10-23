// Aplica la paleta del sitio antes del primer render y la sincroniza con la configuracion.
(function () {
    "use strict";

    const STORAGE_KEY = "frontendStorePaleta";
    const DEFAULT_PALETTE = "hombre";
    const VALID_PALETTES = ["hombre", "mujer"];

    function normalize(value) {
        return VALID_PALETTES.includes(value) ? value : DEFAULT_PALETTE;
    }

    function apply(palette) {
        const normalized = normalize(palette);
        document.documentElement.dataset.paleta = normalized;
        try {
            localStorage.setItem(STORAGE_KEY, normalized);
        } catch (error) {
            // El almacenamiento local puede estar deshabilitado.
        }
        return normalized;
    }

    function current() {
        return normalize(document.documentElement.dataset.paleta);
    }

    function readCached() {
        try {
            return localStorage.getItem(STORAGE_KEY);
        } catch (error) {
            return null;
        }
    }

    window.ThemePalette = {
        apply: apply,
        current: current,
        defaultPalette: DEFAULT_PALETTE
    };

    apply(readCached() || DEFAULT_PALETTE);

    function sync() {
        fetch("api/settings.php", {
            headers: { Accept: "application/json" },
            cache: "no-store"
        })
            .then((response) => response.ok ? response.json() : null)
            .then((data) => {
                if (data && data.settings && data.settings.paleta) {
                    apply(data.settings.paleta);
                }
            })
            .catch(() => {
                // Si falla la sincronizacion se conserva la paleta cacheada.
            });
    }

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", sync);
    } else {
        sync();
    }
})();
