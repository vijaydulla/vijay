const express = require('express');
const fs = require('fs');
const path = require('path');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server);
const dataDir = path.join(__dirname, 'data');
const usersFile = path.join(dataDir, 'users.csv');

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

function ensureStorage() {
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir);
  }
  if (!fs.existsSync(usersFile)) {
    fs.writeFileSync(usersFile, 'name,email,phone\n', 'utf8');
  }
}

const trains = [
  {
    number: '12248',
    name: 'Shatabdi Express',
    origin: 'New Delhi',
    destination: 'Kalka',
    departure: '06:00',
    arrival: '10:15',
    duration: '4h 15m',
    seatsAvailable: 72,
    fare: '₹1,250',
  },
  {
    number: '12951',
    name: 'Mumbai Rajdhani',
    origin: 'Mumbai Central',
    destination: 'New Delhi',
    departure: '16:05',
    arrival: '06:35',
    duration: '14h 30m',
    seatsAvailable: 54,
    fare: '₹2,950',
  },
  {
    number: '12460',
    name: 'Garib Rath',
    origin: 'New Delhi',
    destination: 'Howrah',
    departure: '14:25',
    arrival: '08:30',
    duration: '18h 05m',
    seatsAvailable: 145,
    fare: '₹1,150',
  },
  {
    number: '12518',
    name: 'Kolkata Duronto',
    origin: 'Howrah',
    destination: 'New Delhi',
    departure: '22:40',
    arrival: '12:55',
    duration: '14h 15m',
    seatsAvailable: 36,
    fare: '₹3,400',
  },
];

function loadUsers() {
  ensureStorage();
  const raw = fs.readFileSync(usersFile, 'utf8').trim();
  const lines = raw.split('\n').filter(Boolean);
  if (lines.length <= 1) return [];

  const [header, ...rows] = lines;
  return rows.map((row) => {
    const [name, email, phone] = row.split(',').map((value) => value.trim());
    return { name, email, phone };
  });
}

function appendUser(user) {
  ensureStorage();
  const line = `${user.name},${user.email},${user.phone}\n`;
  fs.appendFileSync(usersFile, line, 'utf8');
}

app.get('/api/users', (req, res) => {
  const users = loadUsers();
  res.json(users);
});

app.get('/api/trains', (req, res) => {
  res.json(trains);
});

app.post('/api/users', (req, res) => {
  const { name, email, phone } = req.body;

  if (!name || !email || !phone) {
    return res.status(400).json({ error: 'Name, email, and phone are required.' });
  }

  const user = {
    name: String(name).trim(),
    email: String(email).trim(),
    phone: String(phone).trim(),
  };

  appendUser(user);
  io.emit('userAdded', user);

  res.status(201).json(user);
});

io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);
  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  ensureStorage();
  console.log(`Railway app running on http://localhost:${PORT}`);
});
