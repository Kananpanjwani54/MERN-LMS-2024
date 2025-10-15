const paypal = require("../../helpers/paypal");
const Order = require("../../models/Order");
const Course = require("../../models/Course");
const StudentCourses = require("../../models/StudentCourses");
const checkoutNodeJssdk = require("@paypal/checkout-server-sdk");

// ✅ Create PayPal order
const createOrder = async (req, res) => {
  try {
    const {
      userId,
      userName,
      userEmail,
      instructorId,
      instructorName,
      courseImage,
      courseTitle,
      courseId,
      coursePricing,
    } = req.body;

    const request = new checkoutNodeJssdk.orders.OrdersCreateRequest();
    request.prefer("return=representation");
    request.requestBody({
      intent: "CAPTURE",
      purchase_units: [
        {
          amount: {
            currency_code: "USD",
            value: coursePricing.toFixed(2),
            breakdown: {
              item_total: {
                currency_code: "USD",
                value: coursePricing.toFixed(2),
              },
            },
          },
          description: courseTitle,
          items: [
            {
              name: courseTitle,
              unit_amount: {
                currency_code: "USD",
                value: coursePricing.toFixed(2),
              },
              quantity: "1",
            },
          ],
        },
      ],
      application_context: {
        return_url: `${process.env.CLIENT_URL}/payment-return`,
        cancel_url: `${process.env.CLIENT_URL}/payment-cancel`,
      },
    });

    const order = await paypal.execute(request);

    // ✅ Save internal order
    const newlyCreatedCourseOrder = new Order({
      userId,
      userName,
      userEmail,
      orderStatus: "pending",
      paymentMethod: "paypal",
      paymentStatus: "initiated",
      orderDate: new Date(),
      instructorId,
      instructorName,
      courseImage,
      courseTitle,
      courseId,
      coursePricing,
    });
    await newlyCreatedCourseOrder.save();

    const approveUrl = order.result.links.find((link) => link.rel === "approve")?.href;

    res.status(201).json({
      success: true,
      data: {
        approveUrl,
        orderId: newlyCreatedCourseOrder._id,
        paypalOrderId: order.result.id, // ✅ frontend will use this as token
      },
    });
  } catch (err) {
    console.error("PayPal Create Order Error:", err);
    res.status(500).json({
      success: false,
      message: "Error while creating PayPal order",
      error: err.message,
    });
  }
};

// ✅ Capture PayPal payment (works with frontend ?token param)
const capturePaymentAndFinalizeOrder = async (req, res) => {
  try {
    const { orderId, paypalOrderId } = req.body;

    if (!orderId || !paypalOrderId) {
      return res.status(400).json({
        success: false,
        message: "Missing orderId or paypalOrderId",
      });
    }

    // ✅ Capture payment from PayPal
    const request = new checkoutNodeJssdk.orders.OrdersCaptureRequest(paypalOrderId);
    request.requestBody({});
    const capture = await paypal.execute(request);

    const order = await Order.findById(orderId);
    if (!order) {
      return res.status(404).json({ success: false, message: "Order not found" });
    }

    // ✅ Update order
    order.paymentStatus = "paid";
    order.orderStatus = "confirmed";
    order.paymentId = paypalOrderId;
    await order.save();

    // ✅ Add to StudentCourses
    let studentCourses = await StudentCourses.findOne({ userId: order.userId });
    const courseData = {
      courseId: order.courseId,
      title: order.courseTitle,
      instructorId: order.instructorId,
      instructorName: order.instructorName,
      dateOfPurchase: order.orderDate,
      courseImage: order.courseImage,
    };

    if (studentCourses) {
      studentCourses.courses.push(courseData);
      await studentCourses.save();
    } else {
      studentCourses = new StudentCourses({
        userId: order.userId,
        courses: [courseData],
      });
      await studentCourses.save();
    }

    // ✅ Update Course students
    await Course.findByIdAndUpdate(order.courseId, {
      $addToSet: {
        students: {
          studentId: order.userId,
          studentName: order.userName,
          studentEmail: order.userEmail,
          paidAmount: order.coursePricing,
        },
      },
    });

    res.status(200).json({
      success: true,
      message: "Order confirmed successfully",
      data: order,
      captureDetails: capture.result,
    });
  } catch (err) {
    console.error("PayPal Capture Error:", err);
    res.status(500).json({
      success: false,
      message: "Error capturing PayPal payment",
      error: err.message,
    });
  }
};

module.exports = { createOrder, capturePaymentAndFinalizeOrder };
