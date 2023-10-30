const express = require("express");
const app = express();
const { resolve } = require("path");
// Replace if using a different env file or config
const env = require("dotenv").config({ path: "./.env" });

const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);

app.use(express.static(process.env.STATIC_DIR));

app.get("/", (req, res) => {
  const path = resolve(process.env.STATIC_DIR + "/index.html");
  res.sendFile(path);
});

app.get("/config", (req, res) => {
  res.send({
    publishableKey: process.env.STRIPE_PUBLISHABLE_KEY,
  });
});

app.post("/create-payment-intent", async (req, res) => {
  const credits = 8; // Change this to the quantity you want
  const unitPrice = 4; // Price per unit in dollars

  try {
    const totalAmount = credits * unitPrice * 100; // Convert to cents for Stripe

    // Create a Payment Intent with the calculated total amount
    const paymentIntent = await stripe.paymentIntents.create({
      currency: "usd",
      amount: totalAmount,
      automatic_payment_methods: { enabled: true },
    });

    // Send the client secret and other details to the client
    res.send({
      clientSecret: paymentIntent.client_secret,
      paymentAmount: totalAmount,
      currency: "usd",
    });
  } catch (e) {
    return res.status(400).send({
      error: {
        message: e.message,
      },
    });
  }
});

app.post("/webhook", async (req, res) => {
  const sig = req.headers["stripe-signature"];
  let event;

  try {
    event = stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  if (event.type === "payment_intent.succeeded") {
    // Handle the payment success event
    const paymentIntent = event.data.object;
    
    // Generate and send a receipt to the user
    const receipt = generateReceipt(paymentIntent);

    // Send the receipt to the user, e.g., via email, a download link, or display on a confirmation page
    // Example: sendReceiptToUser(receipt);
    console.log(receipt);
    console.log("Payment succeeded:", paymentIntent.id);
  }

  res.status(200).end();
});

function generateReceipt(paymentIntent) {
  // Generate a receipt based on the paymentIntent data
  // You can format the receipt with relevant information like the amount, date, and transaction details.
  // Return the receipt text or HTML.

  const receipt = `Payment Receipt for ${paymentIntent.amount / 100} USD. Transaction ID: ${paymentIntent.id}`;

  return receipt;
}


app.listen(5252, () =>
  console.log(`Node server listening at http://localhost:5252`)
);
