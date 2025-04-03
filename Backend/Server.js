import express from 'express';
import mongoose from 'mongoose';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';
import { Server } from 'socket.io';

const app = express();
app.use(express.json());

// MongoDB Connection
mongoose.connect('mongodb://localhost:27017/taskmanager');

// User Schema
const userSchema = new mongoose.Schema({
  email: { type: String, unique: true },
  password: String,
  role: { type: String, default: 'user' }
});

// Task Schema
const taskSchema = new mongoose.Schema({
  title: String,
  description: String,
  dueDate: Date,
  status: { type: String, enum: ['todo', 'in-progress', 'done'] },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
});

const User = mongoose.model('User', userSchema);
const Task = mongoose.model('Task', taskSchema);

// Socket.io Setup
const server = app.listen(5000);
const io = new Server(server);

io.on('connection', (socket) => {
  console.log('Client connected');
  socket.on('taskUpdate', () => {
    io.emit('refreshTasks'); // Notify all clients to refresh
  });
});

// Auth Routes
app.post('/api/register', async (req, res) => {
  const { email, password } = req.body;
  const hashedPassword = await bcrypt.hash(password, 10);
  const user = new User({ email, password: hashedPassword });
  await user.save();
  res.status(201).send('User created');
});

app.post('/api/login', async (req, res) => {
  const { email, password } = req.body;
  const user = await User.findOne({ email });
  if (user && await bcrypt.compare(password, user.password)) {
    const token = jwt.sign({ userId: user._id, role: user.role }, 'SECRET_KEY');
    res.json({ token });
  } else {
    res.status(401).send('Invalid credentials');
  }
});

// Task Routes (Protected with JWT)
app.get('/api/tasks', authenticate, async (req, res) => {
  const tasks = await Task.find({ userId: req.user.userId });
  res.json(tasks);
});

// Middleware
function authenticate(req, res, next) {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).send('Access denied');
  try {
    req.user = jwt.verify(token, 'SECRET_KEY');
    next();
  } catch (err) {
    res.status(400).send('Invalid token');
  }
}
