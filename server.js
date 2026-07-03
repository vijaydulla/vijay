const express = require('express');
const fs = require('fs');
const os = require('os');
const path = require('path');
const http = require('http');
const { Server } = require('socket.io');
const sqlite3 = require('sqlite3').verbose();
const { promisify } = require('util');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

const defaultDataDir = path.join(__dirname, 'data');
const fallbackDataDir = path.join(os.tmpdir(), 'railway-app-data');
let storageDir = defaultDataDir;
let dbPath = path.join(storageDir, 'railway.db');
let db;
let dbAll;
let dbRun;

function resolveStorage() {
  try {
    fs.mkdirSync(defaultDataDir, { recursive: true });
    fs.accessSync(defaultDataDir, fs.constants.W_OK);
    storageDir = defaultDataDir;
  } catch (err) {
    console.warn('Default storage path not writable, falling back to temporary storage:', err.message);
    storageDir = fallbackDataDir;
  }

  try {
    fs.mkdirSync(storageDir, { recursive: true });
  } catch (err) {
    console.error('Unable to create storage directory:', err);
    throw err;
  }

  dbPath = path.join(storageDir, 'railway.db');
}

function initializeDatabase() {
  resolveStorage();

  try {
    db = new sqlite3.Database(dbPath, sqlite3.OPEN_READWRITE | sqlite3.OPEN_CREATE, (err) => {
      if (err) {
        console.error('Unable to open database:', err);
        throw err;
      }
    });

    dbAll = promisify(db.all).bind(db);
    dbRun = promisify(db.run).bind(db);

    db.run(
      `CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        email TEXT NOT NULL,
        phone TEXT NOT NULL,
        created_at TEXT NOT NULL
      )`,
      (err) => {
        if (err) {
          console.error('Unable to create users table:', err);
          throw err;
        }
      }
    );
  } catch (err) {
    console.error('Unable to initialize database:', err);
    throw err;
  }
}

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

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

async function loadUsers() {
  try {
    return await dbAll('SELECT name, email, phone, created_at FROM users ORDER BY id DESC');
  } catch (err) {
    console.error('Unable to load users from database:', err);
    return [];
  }
}

async function appendUser(user) {
  try {
    await dbRun('INSERT INTO users (name, email, phone, created_at) VALUES (?, ?, ?, ?)', [
      user.name,
      user.email,
      user.phone,
      new Date().toISOString(),
    ]);
  } catch (err) {
    console.error('Failed to insert user into database:', err);
    throw err;
  }
}

app.get('/api/users', async (req, res) => {
  const users = await loadUsers();
  res.json(users);
});

app.get('/api/trains', (req, res) => {
  res.json(trains);
});

app.post('/api/users', async (req, res) => {
  const { name, email, phone } = req.body;

  if (!name || !email || !phone) {
    return res.status(400).json({ error: 'Name, email, and phone are required.' });
  }

  const user = {
    name: String(name).trim(),
    email: String(email).trim(),
    phone: String(phone).trim(),
  };

  try {
    await appendUser(user);
    io.emit('userAdded', user);
    res.status(201).json(user);
  } catch (err) {
    res.status(500).json({ error: 'Unable to save booking. Please try again later.' });
  }
});

io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);
  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  initializeDatabase();
  console.log(`Railway app running on http://localhost:${PORT}`);
  console.log(`Using storage directory: ${storageDir}`);
  console.log(`Database file: ${dbPath}`);
});
