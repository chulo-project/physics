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
            throw new Error(`Invalid translations format in ${path}`);
        }

        window.translations = data.translations;
        if (typeof window.onLanguageLoaded === "function") {
            window.onLanguageLoaded();
        }
    } catch (err) {
        console.error(`Failed to load language '${lang}':`, err.message);
        if (lang !== "en-NP") {
            // Attempt to fallback to English
            await loadLanguage("en-NP");
        } else {
            throw new Error("Failed to load any language file");
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
        return key; // Return key if translations not loaded yet
    }
    const val = window.translations[key];
    return val || key;
}

// Setup global export
window._ = _;
window.loadLanguage = loadLanguage;
window.getParameterByName = getParameterByName;

/**
 * Initialization: preload language and show website only after loading.
 */
(function initI18n() {
    // Hide the body initially
    document.body.style.display = 'none';
    
    const userLang =
        getParameterByName("lan") ||
        navigator.language ||
        navigator.userLanguage ||
        "en-NP";

    const normalizedLang = normalizeLanguage(userLang);
    window.translations = {}; // default
    
    // Load language and show website when ready
    loadLanguage(normalizedLang).then(() => {
        // Hide loading screen and show the website after translations are loaded
        const loadingScreen = document.getElementById('loading-screen');
        if (loadingScreen) {
            loadingScreen.style.display = 'none';
        }
        document.body.style.display = '';
    }).catch((error) => {
        console.error("Failed to initialize language system:", error);
        // Hide loading screen and show website anyway
        const loadingScreen = document.getElementById('loading-screen');
        if (loadingScreen) {
            loadingScreen.style.display = 'none';
        }
        document.body.style.display = '';
    });
})();
