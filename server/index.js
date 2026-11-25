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
app.use('/api/reviews', require('./routes/reviews'));
app.use('/api/posts', require('./routes/posts'));
app.use('/api/tutorials', require('./routes/tutorials'));

const PORT = process.env.PORT || 5000;
const http = require('http');
const { Server } = require('socket.io');
const ioJwt = require('jsonwebtoken');

const server = http.createServer(app);
const io = new Server(server, { cors: { origin: '*' } });
io.use((socket, next) => {
  try {
    socket.user = ioJwt.verify(socket.handshake.auth.token, process.env.JWT_SECRET);
    next();
  } catch {
    next(new Error('Invalid token'));
  }
});
app.set('io', io);

require("./graphql")(app).then(() => server.listen(PORT, () => console.log(`Server running on port ${PORT}`))).catch(console.error);
