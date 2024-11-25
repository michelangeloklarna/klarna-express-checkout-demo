// Console logging system
const sdkConsole = {
    log: function(message, type = 'info') {
        const console = document.getElementById('sdk-console');
        if (console) {
            const line = document.createElement('div');
            line.className = `console-line ${type}`;
            const timestamp = new Date().toLocaleTimeString();
            
            // Check if message is an object or array
            if (typeof message === 'object') {
                line.textContent = `[${timestamp}]`;
                const formattedJson = document.createElement('pre');
                formattedJson.className = 'json-content';
                formattedJson.textContent = JSON.stringify(message, null, 2);
                line.appendChild(document.createElement('br'));
                line.appendChild(formattedJson);
            } else {
                line.textContent = `[${timestamp}] ${message}`;
            }
            
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
        sdkConsole.log('Creating Express Checkout button with configuration:', 'info');
        const buttonConfig = {
            id: "klarna-payment-button",
            shape: KLARNA_CONFIG.BUTTON_CONFIG.shape,
            theme: KLARNA_CONFIG.BUTTON_CONFIG.theme,
            label: KLARNA_CONFIG.BUTTON_CONFIG.label
        };
        
        // Log the button configuration
        sdkConsole.log({
            shape: buttonConfig.shape,
            theme: buttonConfig.theme,
            label: buttonConfig.label
        }, 'info');
        
        currentKlarnaButton = klarna.Payment.button(buttonConfig);

        // Clear the container before mounting
        const container = document.getElementById('kec-button-container');
        if (container) {
            container.innerHTML = '';
            await currentKlarnaButton.mount("#kec-button-container");
            sdkConsole.log('Button mounted successfully!', 'success');
        }

        // Handle button click with conditional shipping
        currentKlarnaButton.on("click", (paymentRequest) => {
            sdkConsole.log('Button clicked - initiating payment...', 'info');
            
            const firstSelectedCountry = KLARNA_CONFIG.ALLOWED_COUNTRIES[0];
            const defaultLocale = firstSelectedCountry ? 
                KLARNA_CONFIG.AVAILABLE_COUNTRIES[firstSelectedCountry].locales[0] : 
                'en-US';

            const paymentConfig = {
                paymentAmount: KLARNA_CONFIG.PAYMENT_AMOUNT,
                currency: KLARNA_CONFIG.CURRENCY,
                locale: defaultLocale,
                supplementaryPurchaseData: {
                    lineItems: [{
                        name: KLARNA_CONFIG.LINE_ITEMS[0].name,
                        quantity: 1,
                        totalAmount: KLARNA_CONFIG.PAYMENT_AMOUNT,
                        totalTaxAmount: 0,
                        unitPrice: KLARNA_CONFIG.PAYMENT_AMOUNT,
                        taxRate: 0
                    }]
                },
                config: {
                    requestCustomerProfile: KLARNA_CONFIG.CUSTOMER_PROFILE,
                    allowedShippingCountries: KLARNA_CONFIG.ALLOWED_COUNTRIES,
                    purchaseCountry: KLARNA_CONFIG.ALLOWED_COUNTRIES[0] || 'US'
                }
            };

            // Only add shipping configuration if handleShipping is true
            if (KLARNA_CONFIG.BUTTON_CONFIG.handleShipping) {
                paymentConfig.config.requestShippingData = [
                    "SHIPPING_ADDRESS",
                    "SHIPPING_OPTION"
                ];
                sdkConsole.log('Shipping handling enabled', 'info');
            } else {
                sdkConsole.log('Shipping handling disabled', 'info');
            }

            return paymentRequest.initiate(paymentConfig);
        });

        // Only add shipping handlers if handleShipping is true
        if (KLARNA_CONFIG.BUTTON_CONFIG.handleShipping) {
            // Handle shipping address changes
            klarna.Payment.on("shippingaddresschange", async (paymentRequest, shippingAddress) => {
                sdkConsole.log('Shipping address changed:', 'info');
                sdkConsole.log(shippingAddress, 'info');
                
                return {
                    shippingOptions: [{
                        shippingOptionReference: "standard",
                        amount: 500,
                        displayName: "Standard shipping",
                        description: "3-5 working days",
                        shippingType: "TO_DOOR"
                    }, {
                        shippingOptionReference: "express",
                        amount: 1000,
                        displayName: "Express shipping",
                        description: "1-2 working days",
                        shippingType: "TO_DOOR"
                    }]
                };
            });

            // Handle shipping option selection
            klarna.Payment.on("shippingoptionselect", async (paymentRequest, shippingOption) => {
                sdkConsole.log('Shipping option selected:', 'info');
                sdkConsole.log(shippingOption, 'info');
                
                const baseAmount = KLARNA_CONFIG.PAYMENT_AMOUNT;
                const shippingAmount = shippingOption.shippingOptionReference === "express" ? 1000 : 500;
                
                return {
                    paymentAmount: baseAmount + shippingAmount
                };
            });
        }

        // Update the payment update handler in initKlarna function
        klarna.Payment.on("update", async (paymentRequest) => {
            sdkConsole.log(`Payment state updated: ${paymentRequest.state}`, 'info');
            
            if (paymentRequest.state === "PENDING_CONFIRMATION") {
                // Format and log the payment request once
                const formattedRequest = {
                    paymentRequestId: paymentRequest.paymentRequestId,
                    state: paymentRequest.state,
                    stateContext: {
                        state: paymentRequest.stateContext.state,
                        shipping: paymentRequest.stateContext.shipping,
                        paymentConfirmationToken: paymentRequest.stateContext.paymentConfirmationToken,
                        klarnaCustomer: paymentRequest.stateContext.klarnaCustomer
                    }
                };

                sdkConsole.log('Payment request:', 'info');
                sdkConsole.log(formattedRequest, 'info');

                const confirmationToken = paymentRequest.stateContext.paymentConfirmationToken;
                if (confirmationToken) {
                    sdkConsole.log('Confirmation Token:', 'success');
                    sdkConsole.log(confirmationToken, 'success');
                    
                    try {
                        await confirmPayment(confirmationToken);
                        sdkConsole.log('Payment confirmed successfully!', 'success');
                    } catch (error) {
                        sdkConsole.log(`Error confirming payment: ${error.message}`, 'error');
                    }
                }
            }
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

// Update the showConfigWindow function
function showConfigWindow() {
    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    document.body.appendChild(overlay);
    
    const configWindow = document.getElementById('config-window');
    configWindow.style.display = 'block';
    
    // Populate current values
    document.getElementById('client-id').value = KLARNA_CONFIG.CLIENT_ID;
    document.getElementById('currency').value = KLARNA_CONFIG.CURRENCY;
    
    // Initialize line items container
    const container = document.getElementById('line-items-container');
    container.innerHTML = ''; // Clear container
    
    // Add existing line items
    if (KLARNA_CONFIG.LINE_ITEMS && KLARNA_CONFIG.LINE_ITEMS.length > 0) {
        KLARNA_CONFIG.LINE_ITEMS.forEach((item, index) => {
            container.appendChild(createLineItemHTML(index, item));
        });
    } else {
        // Add default product if no line items exist
        container.appendChild(createLineItemHTML(0, {
            name: "Sample Product",
            quantity: 1,
            totalAmount: 1000,
            totalTaxAmount: 0,
            unitPrice: 1000,
            taxRate: 0
        }));
    }
    
    // Profile checkboxes
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
    document.getElementById('handle-shipping').checked = KLARNA_CONFIG.BUTTON_CONFIG.handleShipping;
}

function hideConfigWindow() {
    const overlay = document.querySelector('.modal-overlay');
    if (overlay) {
        overlay.remove();
    }
    document.getElementById('config-window').style.display = 'none';
}

// Update the updateProductDisplay function
function updateProductDisplay() {
    const productCard = document.querySelector('.product-card');
    if (!productCard) return;

    // Clear existing content except buttons
    const actionButtons = productCard.querySelector('.action-buttons');
    const buttonContainer = productCard.querySelector('#kec-button-container');
    productCard.innerHTML = '';

    // Create products list
    KLARNA_CONFIG.LINE_ITEMS.forEach((item, index) => {
        const productSection = document.createElement('div');
        productSection.className = 'product-item';
        
        // Format the amount based on currency
        const formatter = new Intl.NumberFormat(undefined, {
            style: 'currency',
            currency: KLARNA_CONFIG.CURRENCY,
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        });

        // Convert minor units to major units
        const unitPrice = item.unitPrice / 100;
        const totalAmount = item.totalAmount / 100;
        const totalTaxAmount = item.totalTaxAmount / 100;

        productSection.innerHTML = `
            <h2>📦 ${item.name}</h2>
            <div class="product-details">
                <p>Unit Price: ${formatter.format(unitPrice)}</p>
                <p>Quantity: ${item.quantity}</p>
                <p>Tax Rate: ${item.taxRate / 100}%</p>
                <p>Tax Amount: ${formatter.format(totalTaxAmount)}</p>
                <p>Total: ${formatter.format(totalAmount)}</p>
            </div>
        `;

        productCard.appendChild(productSection);
    });

    // Add total amount for all products
    const totalAmount = KLARNA_CONFIG.LINE_ITEMS.reduce((sum, item) => sum + item.totalAmount, 0) / 100;
    const formatter = new Intl.NumberFormat(undefined, {
        style: 'currency',
        currency: KLARNA_CONFIG.CURRENCY,
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    });

    const totalSection = document.createElement('div');
    totalSection.className = 'total-amount';
    totalSection.innerHTML = `<p>Total Amount: ${formatter.format(totalAmount)}</p>`;
    productCard.appendChild(totalSection);

    // Re-add the button container and action buttons
    productCard.appendChild(buttonContainer);
    productCard.appendChild(actionButtons);
}

// Update the saveConfiguration function
function saveConfiguration() {
    const newConfig = {
        CLIENT_ID: document.getElementById('client-id').value,
        CURRENCY: document.getElementById('currency').value,
        LINE_ITEMS: [],
        CUSTOMER_PROFILE: [],
        ALLOWED_COUNTRIES: [],
        BUTTON_CONFIG: {
            shape: document.getElementById('button-shape').value,
            theme: document.getElementById('button-theme').value,
            label: document.getElementById('button-label').value,
            handleShipping: document.getElementById('handle-shipping').checked
        }
    };

    // Check if button configuration has changed
    const buttonConfigChanged = JSON.stringify(KLARNA_CONFIG.BUTTON_CONFIG) !== 
        JSON.stringify(newConfig.BUTTON_CONFIG);

    if (buttonConfigChanged) {
        sdkConsole.log('Button configuration changed from:', 'info');
        sdkConsole.log(KLARNA_CONFIG.BUTTON_CONFIG, 'info');
        sdkConsole.log('to:', 'info');
        sdkConsole.log(newConfig.BUTTON_CONFIG, 'info');
    }

    // Validate countries
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

    // Collect profile settings
    Object.keys(KLARNA_CONFIG.AVAILABLE_PROFILES).forEach(profileId => {
        const checkbox = document.getElementById(profileId);
        if (checkbox && checkbox.checked) {
            newConfig.CUSTOMER_PROFILE.push(
                KLARNA_CONFIG.AVAILABLE_PROFILES[profileId]
            );
        }
    });

    // Collect line items
    const lineItems = document.querySelectorAll('.line-item');
    lineItems.forEach(item => {
        const quantity = parseInt(item.querySelector('.item-quantity').value) || 1;
        const unitPrice = parseInt(item.querySelector('.item-unit-price').value) || 0;
        const taxRate = parseInt(item.querySelector('.item-tax-rate').value) || 0;
        const totalAmount = quantity * unitPrice;
        const totalTaxAmount = Math.round(totalAmount * (taxRate / 10000));

        newConfig.LINE_ITEMS.push({
            name: item.querySelector('.item-name').value || 'Product',
            quantity: quantity,
            unitPrice: unitPrice,
            totalAmount: totalAmount,
            taxRate: taxRate,
            totalTaxAmount: totalTaxAmount,
            imageUrl: "https://example.com/product.jpg"
        });
    });

    // Ensure at least one line item exists
    if (newConfig.LINE_ITEMS.length === 0) {
        sdkConsole.log('Error: At least one product is required', 'error');
        return;
    }

    // Calculate total payment amount
    newConfig.PAYMENT_AMOUNT = newConfig.LINE_ITEMS.reduce((sum, item) => 
        sum + item.totalAmount, 0);

    try {
        // Save configuration
        saveConfig(newConfig);
        sdkConsole.log('Configuration saved successfully!', 'success');

        // Close the config window
        hideConfigWindow();

        // Update display
        updateProductDisplay();

        // Always reinitialize the button when button appearance settings change
        sdkConsole.log('Reinitializing button with new appearance...', 'info');
        deleteKlarnaCookies();
        reinitializeKlarna();
    } catch (error) {
        sdkConsole.log(`Error saving configuration: ${error.message}`, 'error');
    }
}

// Add this new function to update payment configuration without reinitializing the button
function updatePaymentConfig() {
    if (currentKlarnaButton) {
        const firstSelectedCountry = KLARNA_CONFIG.ALLOWED_COUNTRIES[0];
        const defaultLocale = firstSelectedCountry ? 
            KLARNA_CONFIG.AVAILABLE_COUNTRIES[firstSelectedCountry].locales[0] : 
            'en-US';

        // Update the payment configuration
        const paymentConfig = {
            paymentAmount: KLARNA_CONFIG.PAYMENT_AMOUNT,
            currency: KLARNA_CONFIG.CURRENCY,
            locale: defaultLocale,
            supplementaryPurchaseData: {
                lineItems: KLARNA_CONFIG.LINE_ITEMS
            },
            config: {
                requestCustomerProfile: KLARNA_CONFIG.CUSTOMER_PROFILE,
                allowedShippingCountries: KLARNA_CONFIG.ALLOWED_COUNTRIES,
                purchaseCountry: KLARNA_CONFIG.ALLOWED_COUNTRIES[0] || 'US'
            }
        };

        // Add shipping configuration if enabled
        if (KLARNA_CONFIG.BUTTON_CONFIG.handleShipping) {
            paymentConfig.config.requestShippingData = [
                "SHIPPING_ADDRESS",
                "SHIPPING_OPTION"
            ];
        }

        sdkConsole.log('Payment configuration updated', 'success');
    }
}

// Update the createLineItemHTML function to better show the current configuration
function createLineItemHTML(index, item = null) {
    const lineItem = document.createElement('div');
    lineItem.className = 'line-item';
    lineItem.innerHTML = `
        <div class="line-item-header">
            <h5>Product ${index + 1}</h5>
            <button type="button" class="win95-button remove-line-item" ${index === 0 ? 'disabled' : ''}>✕</button>
        </div>
        <div class="form-group">
            <label>Name:</label>
            <input type="text" class="win95-input item-name" 
                value="${item?.name || 'Sample Product'}" 
                placeholder="Enter product name">
        </div>
        <div class="form-group">
            <label>Quantity:</label>
            <input type="number" class="win95-input item-quantity" 
                min="1" value="${item?.quantity || 1}">
        </div>
        <div class="form-group">
            <label>Unit Price (in minor units):</label>
            <input type="number" class="win95-input item-unit-price" 
                value="${item?.unitPrice || 1000}">
        </div>
        <div class="form-group">
            <label>Tax Rate (in basis points, e.g., 2000 = 20%):</label>
            <input type="number" class="win95-input item-tax-rate" 
                value="${item?.taxRate || 0}">
        </div>
    `;
    return lineItem;
}

function updateLineItems() {
    const container = document.getElementById('line-items-container');
    container.innerHTML = '';
    KLARNA_CONFIG.LINE_ITEMS.forEach((item, index) => {
        container.appendChild(createLineItemHTML(index, item));
    });
}

// Add event listeners for line item management
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

    // Add line item button
    document.getElementById('add-line-item').addEventListener('click', () => {
        const container = document.getElementById('line-items-container');
        container.appendChild(createLineItemHTML(container.children.length));
    });

    // Remove line item button (using event delegation)
    document.getElementById('line-items-container').addEventListener('click', (e) => {
        if (e.target.classList.contains('remove-line-item')) {
            const lineItem = e.target.closest('.line-item');
            const lineItems = document.querySelectorAll('.line-item');
            
            if (lineItems.length > 1) {
                lineItem.remove();
            } else {
                sdkConsole.log('Cannot remove the last product', 'warning');
            }
        }
    });

    // Initialize with one line item if none exist
    if (!KLARNA_CONFIG.LINE_ITEMS || KLARNA_CONFIG.LINE_ITEMS.length === 0) {
        KLARNA_CONFIG.LINE_ITEMS = [{
            name: "Sample Product",
            quantity: 1,
            totalAmount: 1000,
            totalTaxAmount: 0,
            unitPrice: 1000,
            taxRate: 0,
            imageUrl: "https://example.com/product.jpg"
        }];
    }
}); 