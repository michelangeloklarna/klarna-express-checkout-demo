const KLARNA_CONFIG = {
    // Klarna test client ID
    CLIENT_ID: "klarna_test_client_RWdBYlh2NDlsTlVyZUtBSWp1L3J6QUtWZGZia1h6a0QsMzRlZjNiMzctNDVhNy00NmJmLWE5Y2MtODkyYmY3NGRiMzIyLDEsT3BNa3V1NHJrRHBRWXp4OVlzcDduMXp3VDhSSFNFcXZ2Q0MxUlc1ckpiND0",
    CURRENCY: "EUR",
    PAYMENT_AMOUNT: 1000, // €10.00 in minor units
    LINE_ITEMS: [
        {
            name: "Sample Product",
            quantity: 1,
            totalAmount: 1000,
            totalTaxAmount: 0,
            unitPrice: 1000,
            taxRate: 0, // 20%
            imageUrl: "https://example.com/product.jpg"
        }
    ]
}; 