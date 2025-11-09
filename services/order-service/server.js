const express = require('express');
const morgan = require('morgan');
const axios = require('axios');

const app = express();
const PORT = process.env.PORT || 3003;
const USER_SERVICE_URL = process.env.USER_SERVICE_URL || 'http://user-service:3004';
const CART_SERVICE_URL = process.env.CART_SERVICE_URL || 'http://cart-service:3002';

app.use(morgan('combined'));
app.use(express.json());

// In-memory order storage
const orders = {};
let nextID = 1;

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'healthy', service: 'order-service - Node.js' });
});

// Readiness check endpoint
app.get('/ready', (req, res) => {
  res.json({ status: 'ready', service: 'order-service' });
});

// Create order
app.post('/orders', async (req, res) => {
  console.log('POST /orders');

  const { user_id } = req.body;

  if (!user_id) {
    return res.status(400).json({ error: 'user_id required' });
  }

  try {
    // Validate user exists
    const userValid = await validateUser(user_id);
    if (!userValid) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Get cart total
    const total = await getCartTotal(user_id);

    // Create order
    const order = {
      id: nextID++,
      user_id: user_id,
      status: 'pending',
      total: total
    };

    if (!orders[user_id]) {
      orders[user_id] = [];
    }
    orders[user_id].push(order);

    res.status(201).json(orders[user_id]);
  } catch (error) {
    console.error('Error creating order:', error.message);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get orders for user
app.get('/orders/:userId', (req, res) => {
  const { userId } = req.params;
  console.log(`GET /orders/${userId}`);

  const userOrders = orders[userId] || [];

  res.json({
    user_id: userId,
    orders: userOrders
  });
});

// Validate user exists by calling user service
async function validateUser(userId) {
  try {
    const response = await axios.get(
      `${USER_SERVICE_URL}/users/${userId}`,
      { timeout: 2000 }
    );
    return response.status === 200;
  } catch (error) {
    console.error(`Error validating user: ${error.message}`);
    return false;
  }
}

// Get cart total by calling cart service
async function getCartTotal(userId) {
  try {
    const response = await axios.get(
      `${CART_SERVICE_URL}/cart/${userId}`,
      { timeout: 2000 }
    );

    if (response.status === 200) {
      const cart = response.data;
      let total = 0.0;

      if (cart.items) {
        for (const item of cart.items) {
          total += (item.price || 0) * (item.quantity || 0);
        }
      }

      return total;
    }
  } catch (error) {
    console.error(`Error fetching cart: ${error.message}`);
    return 0.0;
  }

  return 0.0;
}

app.listen(PORT, () => {
  console.log(`Order Service listening on port ${PORT}`);
  console.log(`User Service URL: ${USER_SERVICE_URL}`);
  console.log(`Cart Service URL: ${CART_SERVICE_URL}`);
});
