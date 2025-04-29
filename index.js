const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const admin = require('firebase-admin');
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

// Health Check Route
app.get('/', (req, res) => {
  res.status(200).send('Firebase Subscription API is running.');
});

// Endpoint to receive subscription updates (you will connect Razorpay Webhook here later)
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
