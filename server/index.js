const express = require('express');
const http = require('http');
const socketIO = require('socket.io');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const Database = require('better-sqlite3');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const app = express();
const server = http.createServer(app);

// ========== ПРАВИЛЬНЫЙ CORS С ПОДДЕРЖКОЙ ФАЙЛОВ ==========
const allowedOrigins = [
  'http://localhost:3000',
  'https://chatty-wine.vercel.app'
];

const io = socketIO(server, { 
  cors: { 
    origin: allowedOrigins,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    credentials: true,
    allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With"]
  } 
});

// ВАЖНО: добавляем поддержку preflight запросов (OPTIONS)
app.use(cors({
  origin: allowedOrigins,
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With"]
}));

// Добавляем обработку OPTIONS для всех маршрутов
app.options('*', cors());

app.use(express.json());
app.use('/uploads', express.static('uploads'));

// Создаём папку для аватарок и фото
if (!fs.existsSync('uploads')) {
  fs.mkdirSync('uploads');
}

// Настройка multer для загрузки файлов
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/');
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ 
  storage: storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Только изображения!'));
    }
  }
});

// ========== БАЗА ДАННЫХ ==========
let db;
try {
  db = new Database('chatty.db');
  console.log('✅ База данных открыта');
  
  // Включаем поддержку внешних ключей
  db.pragma('foreign_keys = ON');
  
  // Проверяем существование таблиц
  const tables = db.prepare(`
    SELECT name FROM sqlite_master 
    WHERE type='table' AND name IN ('users', 'conversations', 'messages')
  `).all();
  
  // Если таблиц нет или их меньше 3 - создаём структуру с нуля
  if (tables.length < 3) {
    console.log('🔄 Таблицы не найдены, создаём структуру базы...');
    createDatabaseStructure();
  } else {
    console.log('✅ Таблицы существуют, проверяем структуру...');
    // Проверяем наличие всех нужных колонок в таблице users
    try {
      db.prepare('SELECT theme, notifications, soundEnabled FROM users LIMIT 1').get();
      console.log('✅ Структура базы корректна');
    } catch (e) {
      console.log('🔄 Обновляем структуру базы...');
      // Если нет новых колонок - добавляем их
      try {
        db.exec('ALTER TABLE users ADD COLUMN theme TEXT DEFAULT "dark"');
        db.exec('ALTER TABLE users ADD COLUMN notifications INTEGER DEFAULT 1');
        db.exec('ALTER TABLE users ADD COLUMN soundEnabled INTEGER DEFAULT 1');
        console.log('✅ Структура базы обновлена');
      } catch (alterError) {
        console.log('Колонки уже существуют или ошибка:', alterError.message);
      }
    }
  }
  
} catch (error) {
  console.error('❌ Ошибка открытия базы данных:', error);
  console.log('🔄 Создаём новую базу данных...');
  db = new Database('chatty.db');
  createDatabaseStructure();
}

function createDatabaseStructure() {
  // Создаём таблицы
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      displayName TEXT NOT NULL,
      username TEXT UNIQUE NOT NULL,
      phone TEXT,
      avatar TEXT DEFAULT '',
      bio TEXT DEFAULT '',
      theme TEXT DEFAULT 'dark',
      notifications INTEGER DEFAULT 1,
      soundEnabled INTEGER DEFAULT 1,
      online INTEGER DEFAULT 0,
      lastSeen DATETIME DEFAULT CURRENT_TIMESTAMP,
      createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS conversations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
      updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS conversation_participants (
      conversationId INTEGER,
      userId INTEGER,
      FOREIGN KEY(conversationId) REFERENCES conversations(id) ON DELETE CASCADE,
      FOREIGN KEY(userId) REFERENCES users(id) ON DELETE CASCADE,
      PRIMARY KEY (conversationId, userId)
    );

    CREATE TABLE IF NOT EXISTS messages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      conversationId INTEGER NOT NULL,
      senderId INTEGER NOT NULL,
      text TEXT NOT NULL,
      read INTEGER DEFAULT 0,
      createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(conversationId) REFERENCES conversations(id) ON DELETE CASCADE,
      FOREIGN KEY(senderId) REFERENCES users(id) ON DELETE CASCADE
    );
  `);

  // Создаём индексы
  try {
    db.exec(`CREATE INDEX IF NOT EXISTS idx_messages_conversation ON messages(conversationId)`);
    db.exec(`CREATE INDEX IF NOT EXISTS idx_messages_created ON messages(createdAt)`);
    db.exec(`CREATE INDEX IF NOT EXISTS idx_conversations_participants ON conversation_participants(userId)`);
  } catch (e) {
    console.log('Индексы уже существуют');
  }

  console.log('✅ Структура базы данных создана');
}

// ========== API РОУТЫ ==========

// РЕГИСТРАЦИЯ
app.post('/api/register', (req, res) => {
  try {
    const { email, password, displayName, username, phone } = req.body;
    
    const existing = db.prepare('SELECT * FROM users WHERE email = ? OR username = ?').get(email, username);
    if (existing) {
      return res.status(400).json({ error: 'Email или username уже используются' });
    }
    
    const hashedPassword = bcrypt.hashSync(password, 10);
    
    const stmt = db.prepare(`
      INSERT INTO users (email, password, displayName, username, phone, theme)
      VALUES (?, ?, ?, ?, ?, 'dark')
    `);
    
    const result = stmt.run(email, hashedPassword, displayName, username, phone || null);
    
    const user = db.prepare('SELECT id, email, displayName, username, phone, avatar, bio, theme, notifications, soundEnabled FROM users WHERE id = ?').get(result.lastInsertRowid);
    
    const token = jwt.sign({ id: user.id }, 'secret123');
    
    res.json({ user, token });
  } catch (error) {
    console.error(error);
    res.status(400).json({ error: error.message });
  }
});

// ВХОД
app.post('/api/login', (req, res) => {
  try {
    const { login, password } = req.body;
    
    const user = db.prepare('SELECT * FROM users WHERE email = ? OR username = ?').get(login, login);
    
    if (!user) {
      return res.status(400).json({ error: 'Пользователь не найден' });
    }
    
    const valid = bcrypt.compareSync(password, user.password);
    if (!valid) {
      return res.status(400).json({ error: 'Неверный пароль' });
    }
    
    const token = jwt.sign({ id: user.id }, 'secret123');
    
    res.json({
      user: {
        id: user.id,
        email: user.email,
        displayName: user.displayName,
        username: user.username,
        phone: user.phone,
        avatar: user.avatar,
        bio: user.bio,
        theme: user.theme,
        notifications: user.notifications,
        soundEnabled: user.soundEnabled
      },
      token
    });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// ЗАГРУЗКА АВАТАРКИ (исправлено для Render)
app.post('/api/upload-avatar', upload.single('avatar'), (req, res) => {
  try {
    console.log('📸 Запрос на загрузку аватарки');
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) {
      return res.status(401).json({ error: 'Нет токена' });
    }
    
    const decoded = jwt.verify(token, 'secret123');
    
    if (!req.file) {
      console.log('❌ Файл не загружен');
      return res.status(400).json({ error: 'Файл не загружен' });
    }
    
    console.log('✅ Файл получен:', req.file.filename);
    
    // ВАЖНО: для Render используем полный URL
    const baseUrl = process.env.RENDER_EXTERNAL_URL || `http://localhost:5000`;
    const avatarUrl = `${baseUrl}/uploads/${req.file.filename}`;
    
    db.prepare('UPDATE users SET avatar = ? WHERE id = ?').run(avatarUrl, decoded.id);
    console.log('✅ Аватарка сохранена в БД:', avatarUrl);
    
    res.json({ avatar: avatarUrl });
  } catch (error) {
    console.error('❌ Ошибка загрузки аватарки:', error);
    res.status(400).json({ error: error.message });
  }
});

// ЗАГРУЗКА ИЗОБРАЖЕНИЙ ДЛЯ ЧАТА (исправлено для Render)
app.post('/api/upload-image', upload.single('image'), (req, res) => {
  try {
    console.log('📸 Запрос на загрузку фото в чат');
    const token = req.headers.authorization?.split(' ')[1];
    const decoded = jwt.verify(token, 'secret123');
    
    if (!req.file) {
      return res.status(400).json({ error: 'Файл не загружен' });
    }
    
    const baseUrl = process.env.RENDER_EXTERNAL_URL || `http://localhost:5000`;
    const imageUrl = `${baseUrl}/uploads/${req.file.filename}`;
    console.log('✅ Фото сохранено:', imageUrl);
    res.json({ imageUrl });
  } catch (error) {
    console.error('❌ Ошибка загрузки фото:', error);
    res.status(400).json({ error: error.message });
  }
});

// ОБНОВЛЕНИЕ ПРОФИЛЯ
app.put('/api/profile', (req, res) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    const decoded = jwt.verify(token, 'secret123');
    
    const { displayName, username, phone, bio, email } = req.body;
    
    if (username) {
      const existing = db.prepare('SELECT id FROM users WHERE username = ? AND id != ?').get(username, decoded.id);
      if (existing) {
        return res.status(400).json({ error: 'Username уже занят' });
      }
    }
    
    if (email) {
      const existing = db.prepare('SELECT id FROM users WHERE email = ? AND id != ?').get(email, decoded.id);
      if (existing) {
        return res.status(400).json({ error: 'Email уже используется' });
      }
    }
    
    const updates = [];
    const values = [];
    
    if (displayName) {
      updates.push('displayName = ?');
      values.push(displayName);
    }
    if (username) {
      updates.push('username = ?');
      values.push(username);
    }
    if (phone !== undefined) {
      updates.push('phone = ?');
      values.push(phone);
    }
    if (bio !== undefined) {
      updates.push('bio = ?');
      values.push(bio);
    }
    if (email) {
      updates.push('email = ?');
      values.push(email);
    }
    
    if (updates.length > 0) {
      values.push(decoded.id);
      db.prepare(`UPDATE users SET ${updates.join(', ')} WHERE id = ?`).run(...values);
    }
    
    const user = db.prepare('SELECT id, email, displayName, username, phone, avatar, bio, theme, notifications, soundEnabled FROM users WHERE id = ?').get(decoded.id);
    
    res.json(user);
  } catch (error) {
    console.error(error);
    res.status(400).json({ error: error.message });
  }
});

// ОБНОВЛЕНИЕ НАСТРОЕК
app.put('/api/settings', (req, res) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    const decoded = jwt.verify(token, 'secret123');
    
    const { theme, notifications, soundEnabled } = req.body;
    
    db.prepare('UPDATE users SET theme = ?, notifications = ?, soundEnabled = ? WHERE id = ?')
      .run(theme || 'dark', notifications ? 1 : 0, soundEnabled ? 1 : 0, decoded.id);
    
    const user = db.prepare('SELECT id, email, displayName, username, phone, avatar, bio, theme, notifications, soundEnabled FROM users WHERE id = ?').get(decoded.id);
    
    res.json(user);
  } catch (error) {
    console.error(error);
    res.status(400).json({ error: error.message });
  }
});

// ПОЛУЧИТЬ ПОЛЬЗОВАТЕЛЕЙ
app.get('/api/users/:userId', (req, res) => {
  try {
    const users = db.prepare(`
      SELECT id, email, displayName, username, avatar, bio, online, lastSeen
      FROM users WHERE id != ?
    `).all(req.params.userId);
    
    res.json(users);
  } catch (error) {
    console.error('Ошибка загрузки пользователей:', error);
    res.status(500).json({ error: 'Ошибка базы данных' });
  }
});

// ========== РОУТЫ ДЛЯ ЧАТОВ ==========

// СОЗДАТЬ ИЛИ ПОЛУЧИТЬ ЧАТ
app.post('/api/conversations', (req, res) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    const decoded = jwt.verify(token, 'secret123');
    const { userId } = req.body;

    // Проверяем, существует ли уже чат между этими пользователями
    const existing = db.prepare(`
      SELECT c.id FROM conversations c
      JOIN conversation_participants cp1 ON c.id = cp1.conversationId
      JOIN conversation_participants cp2 ON c.id = cp2.conversationId
      WHERE cp1.userId = ? AND cp2.userId = ?
    `).get(decoded.id, userId);

    if (existing) {
      return res.json({ id: existing.id });
    }

    // Создаём новый чат
    const result = db.prepare('INSERT INTO conversations DEFAULT VALUES').run();
    const conversationId = result.lastInsertRowid;

    // Добавляем участников
    db.prepare('INSERT INTO conversation_participants (conversationId, userId) VALUES (?, ?)').run(conversationId, decoded.id);
    db.prepare('INSERT INTO conversation_participants (conversationId, userId) VALUES (?, ?)').run(conversationId, userId);

    res.json({ id: conversationId });
  } catch (error) {
    console.error(error);
    res.status(400).json({ error: error.message });
  }
});

// ПОЛУЧИТЬ СООБЩЕНИЯ ЧАТА
app.get('/api/messages/:conversationId', (req, res) => {
  try {
    const messages = db.prepare(`
      SELECT m.*, u.displayName as senderName, u.username as senderUsername, u.avatar as senderAvatar
      FROM messages m
      JOIN users u ON m.senderId = u.id
      WHERE m.conversationId = ?
      ORDER BY m.createdAt ASC
    `).all(req.params.conversationId);

    res.json(messages);
  } catch (error) {
    console.error(error);
    res.status(400).json({ error: error.message });
  }
});

// ПОЛУЧИТЬ ВСЕ ЧАТЫ ПОЛЬЗОВАТЕЛЯ
app.get('/api/conversations/:userId', (req, res) => {
  try {
    const conversations = db.prepare(`
      SELECT 
        c.id,
        c.updatedAt,
        (
          SELECT json_group_array(
            json_object(
              'id', u.id,
              'displayName', u.displayName,
              'username', u.username,
              'avatar', u.avatar,
              'online', u.online
            )
          )
          FROM conversation_participants cp
          JOIN users u ON cp.userId = u.id
          WHERE cp.conversationId = c.id AND cp.userId != ?
        ) as participants,
        (
          SELECT json_object(
            'id', m.id,
            'text', m.text,
            'senderId', m.senderId,
            'createdAt', m.createdAt,
            'read', m.read
          )
          FROM messages m
          WHERE m.conversationId = c.id
          ORDER BY m.createdAt DESC
          LIMIT 1
        ) as lastMessage
      FROM conversations c
      JOIN conversation_participants cp ON c.id = cp.conversationId
      WHERE cp.userId = ?
      ORDER BY c.updatedAt DESC
    `).all(req.params.userId, req.params.userId);

    // Парсим JSON
    conversations.forEach(c => {
      if (c.participants) c.participants = JSON.parse(c.participants);
      if (c.lastMessage) c.lastMessage = JSON.parse(c.lastMessage);
    });

    res.json(conversations);
  } catch (error) {
    console.error(error);
    res.status(400).json({ error: error.message });
  }
});

// Проверка версии базы (для клиента)
app.get('/api/health', (req, res) => {
  try {
    // Пытаемся получить любого пользователя
    db.prepare('SELECT id FROM users LIMIT 1').get();
    res.json({ status: 'ok', db: 'connected' });
  } catch (error) {
    res.status(500).json({ status: 'error', db: 'invalid' });
  }
});

// ========== WEB SOCKET (РЕАЛЬНОЕ ВРЕМЯ) ==========

const onlineUsers = new Map(); // socketId -> userId

io.on('connection', (socket) => {
  console.log('🔵 Новое подключение:', socket.id);
  
  // Пользователь онлайн
  socket.on('user-online', (userId) => {
    console.log('✅ Пользователь онлайн:', userId);
    onlineUsers.set(socket.id, userId);
    try {
      db.prepare('UPDATE users SET online = 1, lastSeen = CURRENT_TIMESTAMP WHERE id = ?').run(userId);
      io.emit('user-status', { userId, online: true });
    } catch (error) {
      console.error('Ошибка обновления статуса:', error);
    }
  });
  
  // Отправка сообщения
  socket.on('send-message', (data) => {
    try {
      console.log('📨 Отправка сообщения:', data);
      
      const result = db.prepare(`
        INSERT INTO messages (conversationId, senderId, text)
        VALUES (?, ?, ?)
      `).run(data.conversationId, data.senderId, data.text);
      
      db.prepare('UPDATE conversations SET updatedAt = CURRENT_TIMESTAMP WHERE id = ?').run(data.conversationId);
      
      const message = db.prepare(`
        SELECT m.*, u.displayName as senderName, u.username as senderUsername, u.avatar as senderAvatar
        FROM messages m
        JOIN users u ON m.senderId = u.id
        WHERE m.id = ?
      `).get(result.lastInsertRowid);
      
      console.log('✅ Сообщение сохранено:', message);
      
      const participants = db.prepare(`
        SELECT userId FROM conversation_participants
        WHERE conversationId = ? AND userId != ?
      `).all(data.conversationId, data.senderId);
      
      participants.forEach(p => {
        for (let [sockId, userId] of onlineUsers.entries()) {
          if (userId == p.userId) {
            console.log('📤 Отправка получателю:', p.userId);
            io.to(sockId).emit('new-message', message);
            break;
          }
        }
      });
      
      socket.emit('message-sent', message);
      
    } catch (error) {
      console.error('❌ Ошибка отправки сообщения:', error);
    }
  });
  
  // Индикатор печатает
  socket.on('typing', (data) => {
    const { userId, receiverId, conversationId, isTyping } = data;
    
    for (let [sockId, onlineUserId] of onlineUsers.entries()) {
      if (onlineUserId == receiverId) {
        io.to(sockId).emit('typing-indicator', {
          userId,
          conversationId,
          isTyping
        });
        break;
      }
    }
  });
  
  // Отметка о прочтении
  socket.on('mark-read', ({ conversationId, userId }) => {
    try {
      db.prepare(`
        UPDATE messages SET read = 1
        WHERE conversationId = ? AND senderId != ? AND read = 0
      `).run(conversationId, userId);
      
      const participants = db.prepare(`
        SELECT userId FROM conversation_participants
        WHERE conversationId = ? AND userId != ?
      `).all(conversationId, userId);
      
      participants.forEach(p => {
        for (let [sockId, onlineUserId] of onlineUsers.entries()) {
          if (onlineUserId == p.userId) {
            io.to(sockId).emit('messages-read', {
              conversationId,
              userId
            });
            break;
          }
        }
      });
    } catch (error) {
      console.error('Ошибка отметки прочитано:', error);
    }
  });
  
  // Отключение
  socket.on('disconnect', () => {
    const userId = onlineUsers.get(socket.id);
    if (userId) {
      console.log('🔴 Пользователь офлайн:', userId);
      try {
        db.prepare('UPDATE users SET online = 0, lastSeen = CURRENT_TIMESTAMP WHERE id = ?').run(userId);
        io.emit('user-status', { userId, online: false });
      } catch (error) {
        console.error('Ошибка обновления статуса:', error);
      }
      onlineUsers.delete(socket.id);
    }
  });
});

// ========== ЗАПУСК ДЛЯ RENDER ==========
const PORT = process.env.PORT || 10000;
server.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Сервер запущен на порту ${PORT}`);
  console.log(`📁 База данных: ${process.cwd()}/chatty.db`);
});