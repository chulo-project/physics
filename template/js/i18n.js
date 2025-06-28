/**
 * Simple async JSON-based i18n loader for language localization.
 * 
 * Expected file structure:
 * ./locale/en-NP/messages.json
 * ./locale/ne-NP/messages.json
 * 
 * Each JSON file must export:
 * {
 *   "translations": {
 *     "key1": "value1",
 *     ...
 *   }
 * }
 * 
 * Usage:
 *   In HTML/JS:
 *   _("key") // returns the localized string for 'key'
 *   To add a new language, add a JSON file in ./locale/{lang}/messages.json
 * 
 * Globals:
 *   - window._ (translation function)
 *   - window.loadLanguage (async loader)
 *   - window.getParameterByName (URL param helper)
 */

/**
 * Extracts a query parameter value from the URL using modern URLSearchParams API.
 * @param {string} name - Parameter name (e.g., 'lan')
 * @returns {string} Value of the parameter or empty string
 */
function getParameterByName(name) {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get(name) || "";
}

/**
 * Normalizes language code casing and validates against supported locales.
 * @param {string} lang - Raw input language code
 * @returns {string} Normalized language code
 */
function normalizeLanguage(lang) {
    lang = lang.toLowerCase();
    if (lang === "ne-np") return "ne-NP";
    if (lang === "en-np") return "en-NP";
    return "en-NP"; // Default fallback
}

/**
 * Loads a locale file and sets global `window.translations`.
 * @param {string} lang - Normalized language code
 * @returns {Promise<void>}
 */
async function loadLanguage(lang) {
    const path = `./locale/${lang}/messages.json`;
    try {
        const response = await fetch(path);
        if (!response.ok) throw new Error(`HTTP ${response.status}`);

        const data = await response.json();

        if (!data.translations || typeof data.translations !== 'object') {
            console.warn(`Invalid translations format in ${path}`);
            window.translations = {};
            return;
        }

        window.translations = data.translations;
        if (typeof window.onLanguageLoaded === "function") {
            window.onLanguageLoaded();
        }
    } catch (err) {
        console.warn(`Failed to load language '${lang}':`, err.message);
        if (lang !== "en-NP") {
            // Attempt to fallback to English
            await loadLanguage("en-NP");
        } else {
            window.translations = {};
        }
    }
}

/**
 * Global translation function for resolving localized strings.
 * @param {string} key - Translation key
 * @returns {string} Translated value or key if missing
 */
function _(key) {
    if (!window.translations) {
        console.warn("Translations not loaded yet.");
        // Provide fallback values for common keys to prevent console warnings
        const fallbacks = {
            "ON": "ON",
            "OFF": "OFF",
            "Auto Clock Control": "Auto Clock Control",
            "Quick Reset": "Quick Reset",
            "Start Experiment": "Start Experiment"
        };
        return fallbacks[key] || key;
    }
    const val = window.translations[key];
    if (!val) {
        console.warn(`Missing translation key: '${key}'`);
    }
    return val || key;
}

// Setup global export
window._ = _;
window.loadLanguage = loadLanguage;
window.getParameterByName = getParameterByName;

/**
 * Initialization: auto-detect or use ?lan= override.
 */
(function initI18n() {
    const userLang =
        getParameterByName("lan") ||
        navigator.language ||
        navigator.userLanguage ||
        "en-NP";

    const normalizedLang = normalizeLanguage(userLang);
    window.translations = {}; // default
    loadLanguage(normalizedLang);
})();
