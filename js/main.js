// Console logging system
const sdkConsole = {
    log: function(message, type = 'info') {
        const console = document.getElementById('sdk-console');
        if (console) {
            const line = document.createElement('div');
            line.className = `console-line ${type}`;
            const timestamp = new Date().toLocaleTimeString();
            line.textContent = `[${timestamp}] ${message}`;
            console.appendChild(line);
            console.scrollTop = console.scrollHeight;
        }
    },
    clear: function() {
        const console = document.getElementById('sdk-console');
        if (console) {
            console.innerHTML = '<div class="console-line">Console cleared...</div>';
        }
    }
};

// Add these functions at the top of your main.js file
function disableNewSessionButton() {
    const button = document.getElementById('new-session-btn');
    if (button) {
        button.disabled = true;
    }
}

function enableNewSessionButton() {
    const button = document.getElementById('new-session-btn');
    if (button) {
        button.disabled = false;
    }
}

// Add this function to handle cookie deletion
function deleteKlarnaCookies() {
    const cookies = document.cookie.split(';');
    
    sdkConsole.log('Cleaning Klarna cookies...', 'info');
    
    cookies.forEach(cookie => {
        const cookieName = cookie.split('=')[0].trim();
        // Delete all cookies that start with 'klarna' or 'kec'
        if (cookieName.toLowerCase().startsWith('klarna') || 
            cookieName.toLowerCase().startsWith('kec')) {
            document.cookie = `${cookieName}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/; domain=.klarna.com`;
            document.cookie = `${cookieName}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/; domain=.klarnaservices.com`;
            document.cookie = `${cookieName}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/`;
            sdkConsole.log(`Deleted cookie: ${cookieName}`, 'success');
        }
    });
}

// Add this at the top with other global variables
let currentKlarnaButton = null;

// Update the initKlarna function to handle button cleanup
async function initKlarna() {
    try {
        sdkConsole.log('Starting Klarna initialization...', 'info');
        
        // Initialize Klarna SDK with client ID
        const klarna = await Klarna.init({
            clientId: KLARNA_CONFIG.CLIENT_ID
        });
        
        sdkConsole.log('Klarna SDK initialized successfully!', 'success');

        // Cleanup existing button if it exists
        if (currentKlarnaButton) {
            try {
                sdkConsole.log('Cleaning up existing button...', 'info');
                await currentKlarnaButton.unmount();
                currentKlarnaButton = null;
            } catch (error) {
                sdkConsole.log(`Error cleaning up button: ${error.message}`, 'warning');
            }
        }

        // Create and mount the Express Checkout button with updated config
        sdkConsole.log('Creating Express Checkout button...', 'info');
        currentKlarnaButton = klarna.Payment.button({
            id: "klarna-payment-button",
            shape: KLARNA_CONFIG.BUTTON_CONFIG.shape,
            theme: KLARNA_CONFIG.BUTTON_CONFIG.theme,
            label: KLARNA_CONFIG.BUTTON_CONFIG.label,
            styles: {
                button: {
                    'border-radius': KLARNA_CONFIG.BUTTON_CONFIG.shape === 'pill' ? '50px' : '0',
                    'font-family': '"MS Sans Serif", "Segoe UI", Tahoma, sans-serif',
                    'font-size': '12px',
                    'padding': '8px',
                    'width': '100%'
                }
            }
        });

        // Clear the container before mounting
        const container = document.getElementById('kec-button-container');
        if (container) {
            container.innerHTML = '';
            await currentKlarnaButton.mount("#kec-button-container");
            sdkConsole.log('Button mounted successfully!', 'success');
        }

        // Handle button click with all configuration options
        currentKlarnaButton.on("click", (paymentRequest) => {
            sdkConsole.log('Button clicked - initiating payment...', 'info');
            
            // Get the selected country's locale
            const firstSelectedCountry = KLARNA_CONFIG.ALLOWED_COUNTRIES[0];
            const defaultLocale = firstSelectedCountry ? 
                KLARNA_CONFIG.AVAILABLE_COUNTRIES[firstSelectedCountry].locales[0] : 
                'en-US';

            return paymentRequest.initiate({
                paymentAmount: KLARNA_CONFIG.PAYMENT_AMOUNT,
                currency: KLARNA_CONFIG.CURRECY,
                locale: defaultLocale, // Use the first locale of the first selected country
                supplementaryPurchaseData: {
                    lineItems: KLARNA_CONFIG.LINE_ITEMS
                },
                config: {
                    requestCustomerProfile: KLARNA_CONFIG.CUSTOMER_PROFILE,
                    requestShippingData: [
                        "SHIPPING_ADDRESS",
                        "SHIPPING_OPTION"
                    ],
                    allowedShippingCountries: KLARNA_CONFIG.ALLOWED_COUNTRIES,
                    purchaseCountry: KLARNA_CONFIG.ALLOWED_COUNTRIES[0] || 'US', // Use first selected country
                    locale: defaultLocale
                }
            });
        });

        // Update the payment update handler in initKlarna function
        klarna.Payment.on("update", async (paymentRequest) => {
            try {
                sdkConsole.log(`Payment state updated: ${paymentRequest.state}`, 'info');
                
                // The customer has successfully completed the payment flow
                if (paymentRequest.state === "PENDING_CONFIRMATION") {
                    // Log the full payment request for debugging
                    sdkConsole.log('Full payment request:', 'info');
                    sdkConsole.log(JSON.stringify({
                        paymentRequestId: paymentRequest.paymentRequestId,
                        state: paymentRequest.state,
                        stateContext: paymentRequest.stateContext
                    }, null, 2), 'info');

                    // Get confirmation token from stateContext
                    const confirmationToken = paymentRequest.stateContext.confirmationToken;
                    
                    if (confirmationToken) {
                        sdkConsole.log('Payment pending confirmation', 'success');
                        sdkConsole.log('Confirmation Token:', 'success');
                        sdkConsole.log(confirmationToken, 'success');
                        
                        try {
                            // Here you would send the confirmation token to your backend
                            await confirmPayment(confirmationToken);
                            sdkConsole.log('Payment confirmed successfully!', 'success');
                        } catch (error) {
                            sdkConsole.log(`Error confirming payment: ${error.message}`, 'error');
                        }
                    } else {
                        sdkConsole.log('Error: No confirmation token found in stateContext', 'error');
                    }
                } else if (paymentRequest.state === "AUTHORIZED") {
                    sdkConsole.log('Payment authorized!', 'success');
                    if (paymentRequest.stateContext.authorized_payment_method) {
                        sdkConsole.log('Authorized Payment Method:', 'success');
                        sdkConsole.log(JSON.stringify(paymentRequest.stateContext.authorized_payment_method, null, 2), 'success');
                    }
                } else if (paymentRequest.state === "CANCELLED") {
                    sdkConsole.log('Payment cancelled by user', 'warning');
                } else if (paymentRequest.state === "ERROR") {
                    const errorMessage = paymentRequest.stateContext.error_message || 'Unknown error';
                    sdkConsole.log(`Payment error: ${errorMessage}`, 'error');
                }
            } catch (error) {
                sdkConsole.log(`Error handling payment update: ${error.message}`, 'error');
                console.error('Payment update error:', error);
            }
        });

        // Handle shipping address changes
        klarna.Payment.on("shippingaddresschange", async (paymentRequest, shippingAddress) => {
            sdkConsole.log('Shipping address changed:', 'info');
            sdkConsole.log(JSON.stringify(shippingAddress, null, 2), 'info');
            
            // Return available shipping options for the address
            return {
                shippingOptions: [
                    {
                        shippingOptionReference: "standard",
                        amount: 500,
                        displayName: "Standard Shipping",
                        description: "3-5 business days",
                        shippingType: "TO_DOOR"
                    },
                    {
                        shippingOptionReference: "express",
                        amount: 1000,
                        displayName: "Express Shipping",
                        description: "1-2 business days",
                        shippingType: "TO_DOOR"
                    }
                ]
            };
        });

        // Handle shipping option selection
        klarna.Payment.on("shippingoptionselect", async (paymentRequest, shippingOption) => {
            sdkConsole.log('Shipping option selected', 'info');
            // Update order total based on selected shipping option
            const shippingCost = shippingOption.shippingOptionReference === "express" ? 1000 : 500;
            return {
                paymentAmount: KLARNA_CONFIG.PAYMENT_AMOUNT + shippingCost
            };
        });

        // Enable the new session button after successful initialization
        enableNewSessionButton();

    } catch (error) {
        sdkConsole.log(`Error: ${error.message}`, 'error');
        console.error("Error initializing Klarna:", error);
        const container = document.getElementById('kec-button-container');
        if (container) {
            container.innerHTML = `<div style="color: red;">Error loading Klarna button. Please refresh the page.</div>`;
        }
        // Enable the button even if initialization fails
        enableNewSessionButton();
    }
}

async function confirmPayment(confirmationToken) {
    sdkConsole.log(`Confirming payment with token: ${confirmationToken}`, 'info');
    
    // In a real implementation, you would make an API call to your backend
    // Your backend would then call Klarna's API to confirm the payment
    const mockApiCall = new Promise((resolve, reject) => {
        setTimeout(() => {
            if (confirmationToken) {
                resolve({
                    status: 'success',
                    payment_transaction_id: 'krn:payment:eu1:transaction:' + Math.random().toString(36).substr(2, 9)
                });
            } else {
                reject(new Error('Invalid confirmation token'));
            }
        }, 1000);
    });

    try {
        const result = await mockApiCall;
        sdkConsole.log(`Payment confirmed with transaction ID: ${result.payment_transaction_id}`, 'success');
        return result;
    } catch (error) {
        sdkConsole.log(`Payment confirmation failed: ${error.message}`, 'error');
        throw error;
    }
}

// Update the reinitializeKlarna function
async function reinitializeKlarna() {
    sdkConsole.log('Reinitializing Klarna session...', 'info');
    
    // Disable the button during reinitialization
    disableNewSessionButton();
    
    try {
        // Cleanup existing button if it exists
        if (currentKlarnaButton) {
            try {
                sdkConsole.log('Cleaning up existing button...', 'info');
                await currentKlarnaButton.unmount();
                currentKlarnaButton = null;
            } catch (error) {
                sdkConsole.log(`Error cleaning up button: ${error.message}`, 'warning');
            }
        }

        // Delete Klarna cookies before reinitializing
        deleteKlarnaCookies();
        
        // Clear local storage items related to Klarna
        Object.keys(localStorage).forEach(key => {
            if (key.toLowerCase().includes('klarna')) {
                localStorage.removeItem(key);
                sdkConsole.log(`Cleared localStorage item: ${key}`, 'success');
            }
        });

        // Clear session storage items related to Klarna
        Object.keys(sessionStorage).forEach(key => {
            if (key.toLowerCase().includes('klarna')) {
                sessionStorage.removeItem(key);
                sdkConsole.log(`Cleared sessionStorage item: ${key}`, 'success');
            }
        });

        await initKlarna();
        sdkConsole.log('Session reinitialized successfully!', 'success');
    } catch (error) {
        sdkConsole.log('Failed to reinitialize session: ' + error.message, 'error');
    } finally {
        enableNewSessionButton();
    }
}

// Configuration window handling
function showConfigWindow() {
    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    document.body.appendChild(overlay);
    
    const configWindow = document.getElementById('config-window');
    configWindow.style.display = 'block';
    
    // Populate current values
    document.getElementById('client-id').value = KLARNA_CONFIG.CLIENT_ID;
    document.getElementById('product-name').value = KLARNA_CONFIG.LINE_ITEMS[0].name;
    document.getElementById('currency').value = KLARNA_CONFIG.CURRENCY;
    document.getElementById('amount').value = KLARNA_CONFIG.PAYMENT_AMOUNT;
    
    // Profile checkboxes - update to handle all profiles
    Object.keys(KLARNA_CONFIG.AVAILABLE_PROFILES).forEach(profileId => {
        const checkbox = document.getElementById(profileId);
        if (checkbox) {
            checkbox.checked = KLARNA_CONFIG.CUSTOMER_PROFILE.includes(
                KLARNA_CONFIG.AVAILABLE_PROFILES[profileId]
            );
        }
    });
    
    // Country checkboxes
    Object.keys(KLARNA_CONFIG.AVAILABLE_COUNTRIES).forEach(countryCode => {
        const checkbox = document.getElementById(`country-${countryCode.toLowerCase()}`);
        if (checkbox) {
            checkbox.checked = KLARNA_CONFIG.ALLOWED_COUNTRIES.includes(countryCode);
        }
    });
    
    // Button settings
    document.getElementById('button-shape').value = KLARNA_CONFIG.BUTTON_CONFIG.shape;
    document.getElementById('button-theme').value = KLARNA_CONFIG.BUTTON_CONFIG.theme;
    document.getElementById('button-label').value = KLARNA_CONFIG.BUTTON_CONFIG.label;
}

function hideConfigWindow() {
    const overlay = document.querySelector('.modal-overlay');
    if (overlay) {
        overlay.remove();
    }
    document.getElementById('config-window').style.display = 'none';
}

// Add this function to update the product display
function updateProductDisplay() {
    const amount = KLARNA_CONFIG.PAYMENT_AMOUNT;
    const currency = KLARNA_CONFIG.CURRENCY;
    const productName = KLARNA_CONFIG.LINE_ITEMS[0].name;
    
    // Format the amount based on currency
    const formatter = new Intl.NumberFormat(undefined, {
        style: 'currency',
        currency: currency,
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    });

    // Convert minor units to major units (e.g., cents to dollars)
    const majorAmount = amount / 100;
    const formattedPrice = formatter.format(majorAmount);
    
    // Update the product name and price display
    const nameElement = document.querySelector('.product-card h2');
    const priceElement = document.querySelector('.product-card p');
    
    if (nameElement) {
        nameElement.textContent = `📦 ${productName}`;
    }
    if (priceElement) {
        priceElement.textContent = `Price: ${formattedPrice}`;
    }
}

// Update the saveConfiguration function
function saveConfiguration() {
    const newConfig = {
        CLIENT_ID: document.getElementById('client-id').value,
        CURRENCY: document.getElementById('currency').value,
        PAYMENT_AMOUNT: parseInt(document.getElementById('amount').value),
        LINE_ITEMS: [{
            name: document.getElementById('product-name').value || 'Sample Product',
            quantity: 1,
            totalAmount: parseInt(document.getElementById('amount').value),
            totalTaxAmount: 0,
            unitPrice: parseInt(document.getElementById('amount').value),
            taxRate: 0,
            imageUrl: "https://example.com/product.jpg"
        }],
        CUSTOMER_PROFILE: [],
        ALLOWED_COUNTRIES: [],
        BUTTON_CONFIG: {
            shape: document.getElementById('button-shape').value,
            theme: document.getElementById('button-theme').value,
            label: document.getElementById('button-label').value
        }
    };
    
    // Collect all profile settings
    Object.keys(KLARNA_CONFIG.AVAILABLE_PROFILES).forEach(profileId => {
        const checkbox = document.getElementById(profileId);
        if (checkbox && checkbox.checked) {
            newConfig.CUSTOMER_PROFILE.push(
                KLARNA_CONFIG.AVAILABLE_PROFILES[profileId]
            );
        }
    });
    
    // Collect country settings and validate at least one country is selected
    Object.keys(KLARNA_CONFIG.AVAILABLE_COUNTRIES).forEach(countryCode => {
        const checkbox = document.getElementById(`country-${countryCode.toLowerCase()}`);
        if (checkbox && checkbox.checked) {
            newConfig.ALLOWED_COUNTRIES.push(countryCode);
        }
    });

    if (newConfig.ALLOWED_COUNTRIES.length === 0) {
        sdkConsole.log('Error: At least one country must be selected', 'error');
        return;
    }
    
    // Save configuration and reinitialize
    saveConfig(newConfig);
    sdkConsole.log('Configuration saved successfully!', 'success');
    hideConfigWindow();
    
    // Update the product display
    updateProductDisplay();
    
    // Clean up and reinitialize
    deleteKlarnaCookies();
    reinitializeKlarna();
}

// Wait for DOM to be fully loaded
document.addEventListener('DOMContentLoaded', function() {
    // Set up console clear button
    const clearButton = document.querySelector('.console-clear');
    if (clearButton) {
        clearButton.addEventListener('click', sdkConsole.clear);
    }

    // Add new session button handler
    const newSessionBtn = document.getElementById('new-session-btn');
    if (newSessionBtn) {
        newSessionBtn.addEventListener('click', reinitializeKlarna);
    }

    sdkConsole.log('Initializing Klarna SDK...', 'info');
    
    // Check if Klarna object exists
    if (window.Klarna) {
        sdkConsole.log('Klarna SDK found, initializing...', 'info');
        initKlarna();
    } else {
        sdkConsole.log('Waiting for Klarna SDK to load...', 'warning');
        window.KlarnaSDKCallback = initKlarna;
    }

    // Load saved configuration and update display
    loadSavedConfig();
    updateProductDisplay();
    
    // Configuration window handlers
    document.getElementById('config-btn').addEventListener('click', showConfigWindow);
    document.querySelector('.window-close').addEventListener('click', hideConfigWindow);
    document.getElementById('save-config').addEventListener('click', saveConfiguration);
    document.getElementById('reset-config').addEventListener('click', () => {
        localStorage.removeItem('klarnaConfig');
        location.reload();
    });
}); 