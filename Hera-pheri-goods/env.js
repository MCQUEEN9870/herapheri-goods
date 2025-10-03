// Environment detection and API base URL management
// This file automatically detects the environment and sets appropriate URLs

// Detect if we're running locally or on live frontend
function isLocalEnvironment() {
    // Check if we're running from file:// protocol (local development)
    if (location.protocol === 'file:') return true;
    
    // Check if we're running on localhost
    if (location.hostname === 'localhost' || location.hostname === '127.0.0.1') return true;
    
    // Check if we're running on LAN IP (local network)
    if (location.hostname.match(/^192\.168\.|^10\.|^172\.(1[6-9]|2[0-9]|3[0-1])\./)) return true;
    
    // If none of the above, assume we're on live frontend
    return false;
}

// Function to get the appropriate URL extension
function getUrlExtension() {
    return isLocalEnvironment() ? '.html' : '';
}

// Function to build URLs that work in both environments
function buildUrl(path) {
    const extension = getUrlExtension();
    // Remove leading slash if present
    const cleanPath = path.startsWith('/') ? path.substring(1) : path;
    // Add .html extension for local, none for live
    return extension ? `${cleanPath}${extension}` : cleanPath;
}

// Set API base URL based on environment (initial guess)
let base;
if (location.protocol === 'file:') {
    base = 'http://localhost:8080';
} else if (location.hostname === 'localhost' || location.hostname === '127.0.0.1') {
    base = 'http://localhost:8080';
} else if (location.hostname.match(/^192\.168\.|^10\.|^172\.(1[6-9]|2[0-9]|3[0-1])\./)) {
    base = `http://${location.hostname}:8080`;
} else {
    base = 'https://api.herapherigoods.in';
}

// Check for URL parameter override
const urlParams = new URLSearchParams(location.search);
const apiOverride = urlParams.get('api');
if (apiOverride) {
    if (apiOverride === 'local') {
        base = 'http://localhost:8080';
    } else if (apiOverride.startsWith('http')) {
        base = apiOverride;
    }
}

// Check for localStorage override
const storedApi = localStorage.getItem('apiBaseUrl');
if (storedApi) {
    base = storedApi;
}

// Set global API base URL
window.API_BASE_URL = base;
console.info('[env] API base in use:', window.API_BASE_URL, '(origin:', location.origin || location.protocol + '//' + location.host, ')');

// Helper functions for URL management
window.setApiBase = function(url) {
    localStorage.setItem('apiBaseUrl', url);
    window.API_BASE_URL = url;
    console.info('[env] API base updated to:', url);
};

window.clearApiBase = function() {
    localStorage.removeItem('apiBaseUrl');
    location.reload();
};

// Export the URL building function globally
window.buildUrl = buildUrl;
window.isLocalEnvironment = isLocalEnvironment;

// Try to auto-detect a working API base on live by probing candidates
(async function autoDetectApiBase() {
    if (isLocalEnvironment()) return; // skip in local
    // Only consider API subdomain and current base; avoid picking the site origin by mistake
    const candidates = [
        window.API_BASE_URL,
        'https://api.herapherigoods.in'
    ].filter(Boolean);

    const check = async (b) => {
        const controller = new AbortController();
        const t = setTimeout(() => controller.abort(), 3000);
        try {
            const resp = await fetch(b.replace(/\/$/, '') + '/api/posts', { method: 'GET', headers: { 'Accept': 'application/json' }, signal: controller.signal });
            clearTimeout(t);
            const ct = resp.headers.get('content-type') || '';
            // Accept only JSON responses; HTML means it's the frontend site, not the API
            return resp && resp.ok && ct.includes('application/json');
        } catch (_e) {
            clearTimeout(t);
            return false;
        }
    };

    for (const c of candidates) {
        if (await check(c)) {
            if (c !== window.API_BASE_URL) {
                window.setApiBase(c);
            }
            break;
        }
    }
})();



