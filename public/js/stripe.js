/*eslint-disable*/
import axios from 'axios';
import { showAlert } from './alerts';

export const bookTour = async (tourId) => {
  const stripe = Stripe(
    'pk_test_51QvQY5LPxWr8XuysyRVpF1VGXk7hby7VTbhXf2V1YAvuWayBu7RDgBN1uUIXGad8qKCgalQLo3jjPTGXohPgADGD00rhM1lCM8',
  );

  try {
    // 1) Get checkout session from API
    const session = await axios(`/api/v1/bookings/checkout-session/${tourId}`);

    // 2) Create checkout form + chanre credit card
    await stripe.redirectToCheckout({
      sessionId: session.data.session.id,
    });
  } catch (err) {
    showAlert('error', err);
  }
};
