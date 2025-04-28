const express = require('express');
const admin = require('firebase-admin');
const app = express();
const port = 3000;

// Path to your service account key file
const serviceAccount = require('./serviceAccountKey.json');

// Initialize Firebase Admin SDK with the service account
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: 'https://your-database-name.firebaseio.com' // Replace with your Firebase DB URL if using Firestore
});

// Example of using Firebase to send a notification (just as a test)
app.get('/', (req, res) => {
  res.send('Hello, Subscription Project with Firebase!');
});

app.get('/send-notification', async (req, res) => {
  const message = {
    notification: {
      title: 'Test Notification',
      body: 'This is a test message from Firebase!',
    },
    token: '<FCM_DEVICE_TOKEN>', // Replace with actual device token
  };

  try {
    const response = await admin.messaging().send(message);
    console.log('Successfully sent message:', response);
    res.status(200).send('Notification sent successfully!');
  } catch (error) {
    console.log('Error sending message:', error);
    res.status(500).send('Error sending notification');
  }
});

// Start the Express server
app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});
