const express = require('express');
const morgan = require('morgan');

const app = express();
const PORT = process.env.PORT || 3001;

app.use(morgan('combined'));
app.use(express.json());

// Sample product data
const products = [
  { id: 1, name: 'Laptop', price: 999.99, category: 'Electronics' },
  { id: 2, name: 'Headphones', price: 199.99, category: 'Electronics' },
  { id: 3, name: 'Coffee Maker', price: 79.99, category: 'Appliances' },
  { id: 4, name: 'Desk Chair', price: 249.99, category: 'Furniture' },
  { id: 5, name: 'Monitor', price: 399.99, category: 'Electronics' }
];

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'healthy', service: 'product-service' });
});

// Readiness check endpoint
app.get('/ready', (req, res) => {
  res.json({ status: 'ready', service: 'product-service' });
});

// Get all products
app.get('/products', (req, res) => {
  console.log('GET /products');
  res.json({
    products,
    version: process.env.VERSION || 'v1'
  });
});

// Get product by ID
app.get('/products/:id', (req, res) => {
  const id = parseInt(req.params.id);
  console.log(`GET /products/${id}`);

  const product = products.find(p => p.id === id);
  if (product) {
    res.json({ product, version: process.env.VERSION || 'v1' });
  } else {
    res.status(404).json({ error: 'Product not found' });
  }
});

app.listen(PORT, () => {
  console.log(`Product Service listening on port ${PORT}`);
  console.log(`Version: ${process.env.VERSION || 'v1'}`);
});