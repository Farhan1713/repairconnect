require('dotenv').config();
const express = require('express');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

app.get('/', (req, res) => {
  res.json({ message: 'RepairConnect API is running' });
});

app.use('/api/auth', require('./routes/auth'));

app.use('/api/verify', require('./routes/verify'));

app.use('/api/technicians', require('./routes/technicians'));
app.use('/api/requests', require('./routes/requests'));
app.use('/api/quotations', require('./routes/quotations'));
app.use('/api/bookings', require('./routes/bookings'));

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
