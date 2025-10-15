const express = require("express");
const router = express.Router();

const {
  createOrder,
  capturePaymentAndFinalizeOrder,
} = require("../../controllers/student-controller/order-controller");

// Route to create PayPal order
router.post("/create", createOrder);

// Route to capture payment after approval
router.post("/capture", capturePaymentAndFinalizeOrder);

module.exports = router;
