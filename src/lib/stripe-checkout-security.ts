import type Stripe from 'stripe';

/** Ask Stripe Radar / 3-D Secure to step up risky cards. Does not block legitimate checkouts. */
export function withCheckoutCard3ds(
  params: Stripe.Checkout.SessionCreateParams
): Stripe.Checkout.SessionCreateParams {
  return {
    ...params,
    payment_method_options: {
      ...params.payment_method_options,
      card: {
        ...(typeof params.payment_method_options?.card === 'object'
          ? params.payment_method_options.card
          : {}),
        request_three_d_secure: 'automatic',
      },
    },
  };
}
