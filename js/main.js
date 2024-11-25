window.KlarnaSDKCallback = async function() {
    try {
        // Initialize Klarna SDK
        const klarna = await Klarna.init({
            clientId: KLARNA_CONFIG.CLIENT_ID
        });

        // Create and mount the Express Checkout button
        const klarnaExpressCheckout = klarna.Payment.button({
            id: "klarna-payment-button",
            shape: "rectangular",
            theme: "default",
            styles: {
                button: {
                    'border-radius': '0',
                    'font-family': '"MS Sans Serif", "Segoe UI", Tahoma, sans-serif',
                    'font-size': '12px',
                    'padding': '8px'
                }
            }
        });

        // Mount the button to the container
        klarnaExpressCheckout.mount("#kec-button-container");

        // Handle button click
        klarnaExpressCheckout.on("click", (paymentRequest) => {
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
                    allowedShippingCountries: ["DE", "AT", "GB", "NL"]
                }
            });
        });

        // Handle shipping address changes
        klarna.Payment.on("shippingaddresschange", async (paymentRequest, shippingAddress) => {
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
            // Update order total based on selected shipping option
            const shippingCost = shippingOption.shippingOptionReference === "express" ? 1000 : 500;
            return {
                paymentAmount: KLARNA_CONFIG.PAYMENT_AMOUNT + shippingCost
            };
        });

        // Handle payment updates
        klarna.Payment.on("update", async (paymentRequest) => {
            if (paymentRequest.state === "PENDING_CONFIRMATION") {
                const confirmationToken = paymentRequest.stateContext.confirmationToken;
                try {
                    // Here you would typically send the confirmation token to your backend
                    await confirmPayment(confirmationToken);
                    console.log("Payment confirmed successfully!");
                } catch (error) {
                    console.error("Error confirming payment:", error);
                }
            }
        });

    } catch (error) {
        console.error("Error initializing Klarna:", error);
    }
};

// Mock function to simulate backend payment confirmation
async function confirmPayment(confirmationToken) {
    // In a real implementation, this would make an API call to your backend
    // Your backend would then call Klarna's API to confirm the payment
    console.log("Confirming payment with token:", confirmationToken);
    return new Promise(resolve => setTimeout(resolve, 1000));
} 