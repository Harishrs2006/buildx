import { Router } from 'express';

const router = Router();

// Payments via Razorpay/UPI will be added when the app scales.
// All current orders use Cash on Delivery (COD).

export { router as paymentRoutes };
