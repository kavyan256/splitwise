require('dotenv').config();

//importing dependencies
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const { redis } = require('./config/redis');

//importing routes
const authRoutes = require('./routes/auth');
const groupRoutes = require('./routes/groups');
const expenseRoutes = require('./routes/expenses');

const app = express();

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json());

// Routes
app.use('/auth', authRoutes);
app.use('/groups', groupRoutes);
app.use('/expenses', expenseRoutes);

app.get('/health', (req, res) => {
    res.status(200).json({ status: 'OK' });
})

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
