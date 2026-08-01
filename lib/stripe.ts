import Stripe from "stripe";

// Server-side only — never import this in a client component.
// The secret key must stay on the server at all times.
export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2024-06-20",
});
