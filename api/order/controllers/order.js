"use strict";

const stripe = require("stripe")(
  "sk_test_51JDgQ6LdtfUbodRUSyIW77nTdDTMPRVMaybpTu56weFiqnwhDxnbozSQ1qFgAdhsd3yDpaWU08jRtQtLA50EMXir00YcLhIHkl"
);

/**
 * Read the documentation (https://strapi.io/documentation/developer-docs/latest/development/backend-customization.html#core-controllers)
 * to customize this controller
 */

const checkout = async (ctx) => {
  const data = ctx.request.body;
  console.log("checkout CTX", ctx.request.body);
  // console.log(JSON.stringify(ctx, null, 4));

  const lineItems = data.map((cartItem) => {
    return {
      price_data: {
        currency: "cad",
        product_data: {
          name: `${cartItem.product.name}`,
        },
        unit_amount: cartItem.product.price * 100,
      },
      quantity: cartItem.quantity,
    };
  });

  console.log("LINE ITEMS", lineItems);

  const session = await stripe.checkout.sessions.create({
    payment_method_types: ["card"],

    line_items: lineItems,
    mode: "payment",
    success_url: "http://localhost:3000/about",
    cancel_url: "http://localhost:3000/",
  });

  ctx.status = 200;
  ctx.send(session.url);
};

const handleCreateOrder = async (data) => {
  const results = await strapi
    .query("order")
    .find({ id: data.checkoutSessionId });

  const orderExists = results.length > 0 ? true : false;

  let entry;

  if (!orderExists) {
    entry = await strapi.query("order").create(data);
    console.log("Order was created: ", entry.products.data);
  } else {
    console.log("order already exists");
  }

  return entry;
};

const stripeWebhook = async (ctx) => {
  const event = ctx.request.body;

  // console.log("WEBHOOK", JSON.stringify(event, null, 4));

  // Handle the event
  switch (event.type) {
    case "checkout.session.completed":
      const paymentIntent = event.data.object;
      const sessionId = paymentIntent.id;

      // console.log(
      //   `Checkout Session for ${paymentIntent.amount} was successful!`
      // );

      try {
        const lineItems = await stripe.checkout.sessions.listLineItems(
          `${sessionId}`,
          { limit: 15 }
        );

        const data = {
          products: lineItems,
          checkoutSessionId: sessionId,
        };

        handleCreateOrder(data);

        console.log("1", lineItems);
      } catch (err) {
        console.log(err);
      }

      // Then define and call a method to handle the successful payment intent.
      // handlePaymentIntentSucceeded(paymentIntent);
      break;
    case "payment_method.attached":
      const paymentMethod = event.data.object;
      // Then define and call a method to handle the successful attachment of a PaymentMethod.
      // handlePaymentMethodAttached(paymentMethod);
      break;
    default:
      // Unexpected event type
      console.log(`Unhandled event type ${event.type}.`);
  }

  // Return a 200 response to acknowledge receipt of the event
  ctx.status = 200;
  ctx.send(`http://localhost:3000/`);
};

module.exports = { checkout, stripeWebhook };
