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

// Wait for DOM to be fully loaded
document.addEventListener('DOMContentLoaded', function() {
    // Set up console clear button
    const clearButton = document.querySelector('.console-clear');
    if (clearButton) {
        clearButton.addEventListener('click', sdkConsole.clear);
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
});

async function initKlarna() {
    try {
        sdkConsole.log('Starting Klarna initialization...', 'info');
        
        // Initialize Klarna SDK
        const klarna = await Klarna.init({
            clientId: KLARNA_CONFIG.CLIENT_ID
        });
        
        sdkConsole.log('Klarna SDK initialized successfully!', 'success');

        // Create and mount the Express Checkout button
        sdkConsole.log('Creating Express Checkout button...', 'info');
        const klarnaExpressCheckout = klarna.Payment.button({
            id: "klarna-payment-button",
            shape: "rectangular",
            theme: "default",
            label: "Buy with Klarna",
            styles: {
                button: {
                    'border-radius': '0',
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
            klarnaExpressCheckout.mount("#kec-button-container");
            sdkConsole.log('Button mounted successfully!', 'success');
        }

        // Handle button click
        klarnaExpressCheckout.on("click", (paymentRequest) => {
            sdkConsole.log('Button clicked - initiating payment...', 'info');
            return paymentRequest.initiate({
                paymentAmount: KLARNA_CONFIG.PAYMENT_AMOUNT,
                currency: KLARNA_CONFIG.CURRENCY,
                supplementaryPurchaseData: {
                    lineItems: KLARNA_CONFIG.LINE_ITEMS
                },
                config: {
                    requestCustomerProfile: [
                        "profile:email",
                        "profile:name",
                        "profile:phone"
                    ],
                    requestShippingData: [
                        "SHIPPING_ADDRESS",
                        "SHIPPING_OPTION"
                    ],
                    allowedShippingCountries: ["DE", "AT", "GB", "NL", "IT"]
                }
            });
        });

    } catch (error) {
        sdkConsole.log(`Error: ${error.message}`, 'error');
        console.error("Error initializing Klarna:", error);
        const container = document.getElementById('kec-button-container');
        if (container) {
            container.innerHTML = `<div style="color: red;">Error loading Klarna button. Please refresh the page.</div>`;
        }
    }
}

async function confirmPayment(confirmationToken) {
    sdkConsole.log(`Confirming payment with token: ${confirmationToken}`, 'info');
    return new Promise(resolve => setTimeout(resolve, 1000));
} 