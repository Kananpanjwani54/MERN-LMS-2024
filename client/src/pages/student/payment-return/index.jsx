import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { captureAndFinalizePaymentService } from "@/services";
import { useEffect } from "react";
import { useLocation } from "react-router-dom";

function PaypalPaymentReturnPage() {
  const location = useLocation();
  const params = new URLSearchParams(location.search);
  const paypalOrderId = params.get("token"); // ✅ correct key from PayPal sandbox

  useEffect(() => {
    async function capturePayment() {
      const orderId = JSON.parse(sessionStorage.getItem("currentOrderId"));

      if (!paypalOrderId || !orderId) {
        console.error("Missing PayPal or Order ID");
        return;
      }

      try {
        const response = await captureAndFinalizePaymentService({
          paypalOrderId,
          orderId,
        });

        if (response?.success) {
          sessionStorage.removeItem("currentOrderId");
          window.location.href = "/student-courses";
        } else {
          console.error("Capture failed:", response);
        }
      } catch (err) {
        console.error("Error capturing PayPal order:", err);
      }
    }

    capturePayment();
  }, [paypalOrderId]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Processing payment... Please wait</CardTitle>
      </CardHeader>
    </Card>
  );
}

export default PaypalPaymentReturnPage;
