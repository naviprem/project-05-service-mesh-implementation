const express = require('express');
const morgan = require('morgan');
const axios = require('axios');

const app = express();
const PORT = process.env.PORT || 3002;
const PRODUCT_SERVICE_URL = process.env.PRODUCT_SERVICE_URL || 'http://product-service:3001';

app.use(morgan('combined'));
app.use(express.json());

// In-memory cart storage (simplified)
const carts = {};

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'healthy', service: 'cart-service' });
});

// Readiness check endpoint
app.get('/ready', (req, res) => {
  res.json({ status: 'ready', service: 'cart-service' });
});

// Get cart for user
app.get('/cart/:userId', async (req, res) => {
  const { userId } = req.params;
  console.log(`GET /cart/${userId}`);

  const cart = carts[userId] || [];

  // Enrich cart items with product details
  const enrichedCart = [];
  for (const item of cart) {
    try {
      const response = await axios.get(
        `${PRODUCT_SERVICE_URL}/products/${item.product_id}`,
        { timeout: 2000 }
      );

      if (response.status === 200) {
        const { product } = response.data;
        enrichedCart.push({
          product_id: item.product_id,
          quantity: item.quantity,
          product_name: product.name,
          price: product.price
        });
      }
    } catch (error) {
      console.error(`Error fetching product ${item.product_id}:`, error.message);
      enrichedCart.push(item);
    }
  }

  res.json({ user_id: userId, items: enrichedCart });
});

// Add item to cart
app.post('/cart/:userId', (req, res) => {
  const { userId } = req.params;
  const { product_id, quantity = 1 } = req.body;

  console.log(`POST /cart/${userId}`);

  if (!product_id) {
    return res.status(400).json({ error: 'product_id required' });
  }

  if (!carts[userId]) {
    carts[userId] = [];
  }

  // Check if product exists in cart
  const existing = carts[userId].find(item => item.product_id === product_id);

  if (existing) {
    existing.quantity += quantity;
  } else {
    carts[userId].push({ product_id, quantity });
  }

  res.status(201).json({
    message: 'Item added to cart',
    cart: carts[userId]
  });
});

// Remove item from cart
app.delete('/cart/:userId/:productId', (req, res) => {
  const { userId, productId } = req.params;
  console.log(`DELETE /cart/${userId}/${productId}`);

  if (carts[userId]) {
    carts[userId] = carts[userId].filter(
      item => item.product_id !== parseInt(productId)
    );
    return res.json({ message: 'Item removed from cart' });
  }

  res.status(404).json({ error: 'Cart not found' });
});

app.listen(PORT, () => {
  console.log(`Cart Service listening on port ${PORT}`);
  console.log(`Product Service URL: ${PRODUCT_SERVICE_URL}`);
});