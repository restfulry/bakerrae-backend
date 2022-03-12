"use strict";
/**
 * Read the documentation (https://strapi.io/documentation/developer-docs/latest/development/backend-customization.html#core-controllers)
 * to customize this controller
 */
const dev = process.env.NODE_ENV !== "production";

const stripe = require("stripe")(process.env.STRIPE_SK_LIVE);

const domain = dev ? 'http://localhost:3000/' : process.env.DOMAIN;

const checkout = async (ctx) => {
  const data = ctx.request.body;
  // console.log("checkout CTX", ctx.request.body);
  // console.log("checkout CTX: ", JSON.stringify(data, null, 4));
  
  const customerData = data.customer;
  console.log("checkout customer: ", JSON.stringify(customerData, null, 4));

  const shippingRate = () => {
    if (data.shipping === "Local Delivery ($10)") {
      return "shr_1KYahdLdtfUbodRUXUHLRqN1";
    } else if (data.shipping === "GTA Delivery ($15)") {
      return "shr_1KYaiPLdtfUbodRUda5khiia";
    } else if (data.shipping === "Free Pickup (Toronto)") {
      return "shr_1K1kwaLdtfUbodRU2ouWW0bD";
    } else if (data.shipping === "Free Pickup (Scarborough)") {
      return "shr_1K1knVLdtfUbodRUtoYaiZL1";
    }
  };

  const lineItems = data.cart.map((cartItem) => {
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
    shipping_rates: [shippingRate()],
    shipping_address_collection: {
      allowed_countries: ["CA"],
    },
    customer: {
      name: customerData.name,
    },
    line_items: lineItems,
    phone_number_collection: {
      enabled: true,
    },
    mode: "payment",
    success_url: `${domain}/checkout/success?sessionid={CHECKOUT_SESSION_ID}`,
    cancel_url: domain,
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
      console.log(`Unhandled event type ${event.type}.`);
  }
  ctx.status = 200;
  ctx.send(`${domain}`);
};

module.exports = { checkout, stripeWebhook };
