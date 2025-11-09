const express = require('express');
const morgan = require('morgan');

const app = express();
const PORT = process.env.PORT || 3004;

app.use(morgan('combined'));
app.use(express.json());

// Sample user data
const users = [
  { id: 1, name: 'John Doe', email: 'john@example.com', type: 'regular' },
  { id: 2, name: 'Jane Smith', email: 'jane@example.com', type: 'vip' },
  { id: 3, name: 'Bob Johnson', email: 'bob@example.com', type: 'regular' }
];

app.get('/health', (req, res) => {
  res.json({ status: 'healthy', service: 'user-service' });
});

app.get('/ready', (req, res) => {
  res.json({ status: 'ready', service: 'user-service' });
});

// Get user by ID
app.get('/users/:id', (req, res) => {
  const id = parseInt(req.params.id);
  console.log(`GET /users/${id}`);

  const user = users.find(u => u.id === id);
  if (user) {
    res.json({ user });
  } else {
    res.status(404).json({ error: 'User not found' });
  }
});

// Create user
app.post('/users', (req, res) => {
  console.log('POST /users');

  const { name, email, type } = req.body;
  if (!name || !email) {
    return res.status(400).json({ error: 'Name and email required' });
  }

  const newUser = {
    id: users.length + 1,
    name,
    email,
    type: type || 'regular'
  };

  users.push(newUser);
  res.status(201).json({ user: newUser });
});

app.listen(PORT, () => {
  console.log(`User Service listening on port ${PORT}`);
});