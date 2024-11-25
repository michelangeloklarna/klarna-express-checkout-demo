const KLARNA_CONFIG = {
    CLIENT_ID: "klarna_test_client_RWdBYlh2NDlsTlVyZUtBSWp1L3J6QUtWZGZia1h6a0QsMzRlZjNiMzctNDVhNy00NmJmLWE5Y2MtODkyYmY3NGRiMzIyLDEsT3BNa3V1NHJrRHBRWXp4OVlzcDduMXp3VDhSSFNFcXZ2Q0MxUlc1ckpiND0",
    CURRENCY: "EUR",
    PAYMENT_AMOUNT: 1000,
    LINE_ITEMS: [
        {
            name: "Sample Product",
            quantity: 1,
            totalAmount: 1000,
            totalTaxAmount: 0,
            unitPrice: 1000,
            taxRate: 0,
            imageUrl: "https://example.com/product.jpg"
        }
    ],
    ALLOWED_COUNTRIES: ["DE", "AT", "GB", "NL", "IT"],
    CUSTOMER_PROFILE: [
        "profile:email",
        "profile:name",
        "profile:phone"
    ],
    AVAILABLE_PROFILES: {
        "profile-email": "profile:email",
        "profile-name": "profile:name",
        "profile-phone": "profile:phone",
        "profile-billing-address": "profile:billing_address",
        "profile-locale": "profile:locale",
        "profile-national-id": "profile:national_identification",
        "profile-dob": "profile:date_of_birth"
    },
    BUTTON_CONFIG: {
        shape: "default",
        theme: "default",
        label: "buy_with_klarna",
        handleShipping: true
    },
    AVAILABLE_COUNTRIES: {
        'AU': { name: 'Australia', currency: 'AUD', locales: ['en-AU'] },
        'AT': { name: 'Austria', currency: 'EUR', locales: ['de-AT', 'en-AT'] },
        'BE': { name: 'Belgium', currency: 'EUR', locales: ['nl-BE', 'fr-BE', 'en-BE'] },
        'CA': { name: 'Canada', currency: 'CAD', locales: ['en-CA', 'fr-CA'] },
        'CZ': { name: 'Czech Republic', currency: 'CZK', locales: ['cs-CZ', 'en-CZ'] },
        'DK': { name: 'Denmark', currency: 'DKK', locales: ['da-DK', 'en-DK'] },
        'FI': { name: 'Finland', currency: 'EUR', locales: ['fi-FI', 'sv-FI', 'en-FI'] },
        'FR': { name: 'France', currency: 'EUR', locales: ['fr-FR', 'en-FR'] },
        'DE': { name: 'Germany', currency: 'EUR', locales: ['de-DE', 'en-DE'] },
        'GR': { name: 'Greece', currency: 'EUR', locales: ['el-GR', 'en-GR'] },
        'HU': { name: 'Hungary', currency: 'HUF', locales: ['hu-HU', 'en-HU'] },
        'IE': { name: 'Ireland', currency: 'EUR', locales: ['en-IE'] },
        'IT': { name: 'Italy', currency: 'EUR', locales: ['it-IT', 'en-IT'] },
        'MX': { name: 'Mexico', currency: 'MXN', locales: ['en-MX', 'es-MX'] },
        'NL': { name: 'Netherlands', currency: 'EUR', locales: ['nl-NL', 'en-NL'] },
        'NZ': { name: 'New Zealand', currency: 'NZD', locales: ['en-NZ'] },
        'NO': { name: 'Norway', currency: 'NOK', locales: ['nb-NO', 'en-NO'] },
        'PL': { name: 'Poland', currency: 'PLN', locales: ['pl-PL', 'en-PL'] },
        'PT': { name: 'Portugal', currency: 'EUR', locales: ['pt-PT', 'en-PT'] },
        'RO': { name: 'Romania', currency: 'RON', locales: ['ro-RO', 'en-RO'] },
        'SK': { name: 'Slovakia', currency: 'EUR', locales: ['sk-SK', 'en-SK'] },
        'ES': { name: 'Spain', currency: 'EUR', locales: ['es-ES', 'en-ES'] },
        'SE': { name: 'Sweden', currency: 'SEK', locales: ['sv-SE', 'en-SE'] },
        'CH': { name: 'Switzerland', currency: 'CHF', locales: ['de-CH', 'fr-CH', 'it-CH', 'en-CH'] },
        'GB': { name: 'United Kingdom', currency: 'GBP', locales: ['en-GB'] },
        'US': { name: 'United States', currency: 'USD', locales: ['en-US', 'es-US'] }
    }
};

// Load saved configuration from localStorage
function loadSavedConfig() {
    const savedConfig = localStorage.getItem('klarnaConfig');
    if (savedConfig) {
        Object.assign(KLARNA_CONFIG, JSON.parse(savedConfig));
    }
}

// Save configuration to localStorage
function saveConfig(config) {
    localStorage.setItem('klarnaConfig', JSON.stringify(config));
    Object.assign(KLARNA_CONFIG, config);
} 