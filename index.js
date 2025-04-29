const express = require('express');
const bodyParser = require('body-parser');
const Razorpay = require('razorpay');
const mongoose = require('mongoose');
require('dotenv').config();

// Initialize Express
const app = express();
const port = process.env.PORT || 3000;

// Middlewares
app.use(bodyParser.json());

// Connect to MongoDB
mongoose.connect(process.env.MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => console.log('MongoDB connected successfully'))
  .catch((err) => console.log('MongoDB connection error: ', err));

// Razorpay Instance
const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET
});

// MongoDB Subscription Model
const userSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true },
  subscriptionStatus: { type: String, default: 'inactive' },
  paymentId: { type: String },
  subscriptionExpiry: { type: Date },
  subscriptionCode: { type: String },
});

const User = mongoose.model('User', userSchema);

// Health Check Route
app.get('/', (req, res) => {
  res.status(200).send('YogaAsana Subscription Backend Running ✅');
});

// Create Razorpay Subscription (Frontend will call this)
app.post('/create-subscription', async (req, res) => {
  const { email, planId } = req.body;

  if (!email || !planId) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  // Create a Razorpay subscription
  try {
    const subscription = await razorpay.subscriptions.create({
      plan_id: planId, // Use your Razorpay Plan ID
      total_count: 12, // Example: 12 months subscription
      customer_notify: 1,
      add_ons: [
        {
          item: {
            name: 'Extra Service',
            amount: 500,
            currency: 'INR',
            description: 'Extra service charges'
          },
          quantity: 1
        }
      ]
    });

    // Save user subscription data to MongoDB
    const user = new User({
      email: email,
      subscriptionStatus: 'active',
      paymentId: subscription.id,
      subscriptionExpiry: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // Example 30 days subscription expiry
      subscriptionCode: Math.random().toString(36).substring(2, 8).toUpperCase(),
    });

    await user.save();

    res.status(200).json({ success: true, subscriptionLink: subscription.short_url });
  } catch (error) {
    console.error('Error creating Razorpay subscription:', error);
    res.status(500).json({ error: 'Error creating subscription' });
  }
});

// Verify Payment Route
app.post('/verify-payment', async (req, res) => {
  const { paymentId, email } = req.body;

  if (!paymentId || !email) {
    return res.status(400).json({ error: 'Missing paymentId or email' });
  }

  try {
    const payment = await razorpay.payments.fetch(paymentId);

    if (payment.status === 'captured') {
      const user = await User.findOne({ email: email });
      if (!user) return res.status(404).json({ error: 'User not found' });

      // Update subscription status
      user.subscriptionStatus = 'active';
      user.paymentId = paymentId;
      user.subscriptionExpiry = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // Set expiry
      await user.save();

      res.status(200).json({ success: true, message: 'Subscription activated!' });
    } else {
      res.status(400).json({ success: false, message: 'Payment not captured yet' });
    }
  } catch (error) {
    console.error('Payment fetch error:', error);
    res.status(500).json({ error: 'Payment verification failed' });
  }
});

// Start server
app.listen(port, () => {
  console.log(`🚀 Server running at http://localhost:${port}`);
});
