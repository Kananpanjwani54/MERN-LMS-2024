const checkoutNodeJssdk = require("@paypal/checkout-server-sdk");
require("dotenv").config();

// ✅ Ensure credentials are trimmed & correct
const environment = new checkoutNodeJssdk.core.SandboxEnvironment(
  process.env.PAYPAL_CLIENT_ID.trim(),
  process.env.PAYPAL_CLIENT_SECRET.trim()
);

const paypal = new checkoutNodeJssdk.core.PayPalHttpClient(environment);

module.exports = paypal;
