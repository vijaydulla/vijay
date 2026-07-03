const socket = io();
const usersList = document.getElementById('usersList');
const statusMessage = document.getElementById('statusMessage');
const form = document.getElementById('registrationForm');
const formMessage = document.getElementById('formMessage');
const trainsTableBody = document.getElementById('trainsTableBody');
const trainCount = document.getElementById('trainCount');

function renderUsers(users) {
  usersList.innerHTML = '';

  if (!users.length) {
    statusMessage.textContent = 'No passengers registered yet.';
    return;
  }

  statusMessage.textContent = '';
  users.forEach((user) => {
    const item = document.createElement('li');
    item.innerHTML = `
      <strong>${user.name}</strong>
      <span>${user.email}</span>
      <span>${user.phone}</span>
    `;
    usersList.appendChild(item);
  });
}

function renderTrains(trains) {
  trainsTableBody.innerHTML = '';
  trainCount.textContent = trains.length;

  trains.forEach((train) => {
    const row = document.createElement('tr');
    row.innerHTML = `
      <td>${train.number}</td>
      <td>${train.name}</td>
      <td>${train.origin} → ${train.destination}</td>
      <td>${train.departure}</td>
      <td>${train.arrival}</td>
      <td>${train.seatsAvailable}</td>
    `;
    trainsTableBody.appendChild(row);
  });
}

async function loadUsers() {
  try {
    const res = await fetch('/api/users');
    const users = await res.json();
    renderUsers(users);
  } catch (err) {
    statusMessage.textContent = 'Unable to load passenger list.';
    console.error(err);
  }
}

async function loadTrains() {
  try {
    const response = await fetch('/api/trains');
    const trains = await response.json();
    renderTrains(trains);
  } catch (err) {
    console.error('Unable to load train data.', err);
  }
}

form.addEventListener('submit', async (event) => {
  event.preventDefault();
  formMessage.textContent = '';

  const name = document.getElementById('name').value.trim();
  const email = document.getElementById('email').value.trim();
  const phone = document.getElementById('phone').value.trim();

  if (!name || !email || !phone) {
    formMessage.textContent = 'Please fill in all fields.';
    return;
  }

  try {
    const response = await fetch('/api/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, email, phone }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      formMessage.textContent = errorData.error || 'Booking failed.';
      return;
    }

    document.getElementById('name').value = '';
    document.getElementById('email').value = '';
    document.getElementById('phone').value = '';
    formMessage.textContent = 'Passenger booked successfully.';
  } catch (err) {
    formMessage.textContent = 'Unable to complete booking.';
    console.error(err);
  }
});

socket.on('userAdded', (user) => {
  const item = document.createElement('li');
  item.innerHTML = `
    <strong>${user.name}</strong>
    <span>${user.email}</span>
    <span>${user.phone}</span>
  `;
  usersList.appendChild(item);
  statusMessage.textContent = '';
});

loadTrains();
loadUsers();
