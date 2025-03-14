require('dotenv').config();
console.log('API Key loaded:', process.env.OPENAI_API_KEY ? 'Yes' : 'No');

const express = require('express');
const cors = require('cors');
const petRoutes = require('./routes/petRoutes');
const assistantRoutes = require('./routes/assistantRoutes');
const feedbackRoutes = require('./routes/feedbackRoutes');
const authRoutes = require('./routes/authRoutes');
const path = require('path');
const adminRoutes = require('./routes/adminRoutes');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Set the default route to the login page
// Client-side auth will redirect to index.html after successful login
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'login.html'));
});

// Routes
app.use('/api/pets', authRoutes.authenticateToken, petRoutes);
app.use('/api/assistant', assistantRoutes);
app.use('/api/auth', authRoutes.router);
app.use('/api/feedback', feedbackRoutes);
app.use('/api/admin', authRoutes.authenticateToken, adminRoutes.router);

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
