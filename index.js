const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const admin = require('firebase-admin');
const crypto = require('crypto'); // Import crypto module
const app = express();
const port = process.env.PORT || 3000;

// Middlewares
app.use(cors());
app.use(bodyParser.json());

// Initialize Firebase Admin SDK
const serviceAccount = require('./serviceAccountKey.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const db = admin.firestore();

// Razorpay Webhook Secret
const razorpaySecret = 'your_razorpay_webhook_secret'; // Replace with your actual webhook secret

// Health Check Route
app.get('/', (req, res) => {
  res.status(200).send('Firebase Subscription API is running.');
});

// Razorpay Webhook Route
app.post('/razorpay-webhook', (req, res) => {
  const payload = req.body;
  const signature = req.headers['x-razorpay-signature'];

  // Create HMAC with SHA256 using your webhook secret
  const hmac = crypto.createHmac('sha256', razorpaySecret);
  hmac.update(JSON.stringify(payload));  // Hash the body payload (webhook content)
  const calculatedSignature = hmac.digest('hex');

  // Check if the signature from Razorpay matches the one we've calculated
  if (calculatedSignature === signature) {
    console.log('Webhook verified successfully.');

    // Process the webhook based on the event
    if (payload.event === 'payment.captured') {
      const paymentData = payload.payload.payment.entity;
      const email = paymentData.email;

      // Save payment data to Firestore
      db.collection('users').doc(email).set({
        subscriptionStatus: 'active',
        paymentId: paymentData.id,
        subscriptionExpiry: Date.now() + (30 * 24 * 60 * 60 * 1000), // 30 days from now
      }, { merge: true })
      .then(() => {
        console.log(`Subscription activated for ${email}`);
        res.status(200).send('Payment captured and subscription updated!');
      })
      .catch((error) => {
        console.error('Error saving subscription data:', error);
        res.status(500).send('Error saving subscription data');
      });
    } else {
      res.status(200).send('Event received successfully');
    }
  } else {
    console.log('Invalid webhook signature');
    res.status(400).send('Invalid signature');
  }
});

// Subscription Route (Already existing in your code)
app.post('/subscription', async (req, res) => {
  const { email, subscriptionStatus, paymentId, subscriptionExpiry } = req.body;

  if (!email || !subscriptionStatus) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  try {
    await db.collection('users').doc(email).set({
      subscriptionStatus: subscriptionStatus,
      paymentId: paymentId || null,
      subscriptionExpiry: subscriptionExpiry || null,
    }, { merge: true });

    res.status(200).json({ message: 'Subscription data saved successfully.' });
  } catch (error) {
    console.error('Error saving subscription data:', error);
    res.status(500).json({ error: 'Failed to save subscription data.' });
  }
});

// Start Server
app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});
