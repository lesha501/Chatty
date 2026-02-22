import React, { useState, useEffect } from 'react';
import axios from 'axios';
import io from 'socket.io-client';
import Settings from './components/Settings';
import './index.css';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';
const API = axios.create({ baseURL: API_URL });
const socket = io(API_URL);

function App() {
  const [isLogin, setIsLogin] = useState(true);
  const [user, setUser] = useState(null);
  const [users, setUsers] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [showSettings, setShowSettings] = useState(false);
  const [selectedImage, setSelectedImage] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);

  const [formData, setFormData] = useState({
    email: '',
    username: '',
    displayName: '',
    password: '',
    login: '',
    phone: ''
  });

  const applyTheme = (theme) => {
    const root = document.documentElement;
    root.classList.remove('theme-dark', 'theme-light', 'theme-purple');
    
    switch(theme) {
      case 'light':
        root.classList.add('theme-light');
        break;
      case 'purple':
        root.classList.add('theme-purple');
        break;
      default:
        root.classList.add('theme-dark');
    }
  };

  useEffect(() => {
    const savedUser = localStorage.getItem('user');
    const savedToken = localStorage.getItem('token');
    if (savedUser && savedToken) {
      setUser(JSON.parse(savedUser));
    }
  }, []);

  useEffect(() => {
    if (user) {
      fetchUsers();
      socket.emit('user-online', user.id);
      
      socket.on('new-message', (message) => {
        if (selectedUser && message.senderId === selectedUser.id) {
          setMessages(prev => [...prev, message]);
        }
      });

      socket.on('user-status', ({ userId, online }) => {
        setUsers(prev => prev.map(u => 
          u.id === userId ? { ...u, online } : u
        ));
      });
    }

    return () => {
      socket.off('new-message');
      socket.off('user-status');
    };
  }, [user, selectedUser]);

  useEffect(() => {
    if (user && user.theme) {
      applyTheme(user.theme);
    }
  }, [user]);

  const fetchUsers = async () => {
    try {
      const res = await API.get(`/api/users/${user.id}`);
      setUsers(res.data);
    } catch (err) {
      console.error('Ошибка загрузки пользователей:', err);
    }
  };

  const fetchMessages = async (otherUserId) => {
    try {
      const convRes = await API.post('/api/conversations', 
        { userId: otherUserId },
        { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } }
      );
      
      const messagesRes = await API.get(`/api/messages/${convRes.data.id}`);
      setMessages(messagesRes.data);
    } catch (err) {
      console.error('Ошибка загрузки сообщений:', err);
    }
  };

  const sendMessage = async () => {
    if ((!newMessage.trim() && !selectedImage) || !selectedUser) return;

    try {
      const convRes = await API.post('/api/conversations', 
        { userId: selectedUser.id },
        { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } }
      );

      let messageText = newMessage;
      
      if (selectedImage) {
        const formData = new FormData();
        formData.append('image', selectedImage);
        const uploadRes = await axios.post(`${API_URL}/api/upload-image`, formData, {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`,
            'Content-Type': 'multipart/form-data'
          }
        });
        messageText = `📷:${uploadRes.data.imageUrl}`;
      }

      socket.emit('send-message', {
        conversationId: convRes.data.id,
        senderId: user.id,
        receiverId: selectedUser.id,
        text: messageText
      });

      setNewMessage('');
      setSelectedImage(null);
      setImagePreview(null);
      
    } catch (err) {
      alert('Ошибка при отправке');
    }
  };

  const handleImageSelect = (e) => {
    const file = e.target.files[0];
    if (file) {
      setSelectedImage(file);
      setImagePreview(URL.createObjectURL(file));
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    setError('');
    try {
      await API.post('/api/register', {
        email: formData.email,
        username: formData.username,
        displayName: formData.displayName,
        password: formData.password,
        phone: formData.phone
      });
      setMessage('✨ Регистрация успешна! Войдите.');
      setFormData({ ...formData, email: '', username: '', displayName: '', password: '', phone: '' });
      setIsLogin(true);
    } catch (err) {
      setError(err.response?.data?.error || 'Ошибка регистрации');
    }
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    try {
      const res = await API.post('/api/login', {
        login: formData.login,
        password: formData.password
      });
      
      if (res.data.user && res.data.token) {
        localStorage.setItem('token', res.data.token);
        localStorage.setItem('user', JSON.stringify(res.data.user));
        setUser(res.data.user);
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Ошибка входа');
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
    setUsers([]);
    setSelectedUser(null);
    setMessages([]);
    socket.disconnect();
  };

  const handleUpdateUser = (updatedUser) => {
    setUser(updatedUser);
    localStorage.setItem('user', JSON.stringify(updatedUser));
    if (updatedUser.theme) applyTheme(updatedUser.theme);
  };

  const filteredUsers = users.filter(u => 
    u.displayName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    u.username.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getAvatarUrl = (avatarPath) => {
    if (!avatarPath) return null;
    if (avatarPath.startsWith('http')) return avatarPath;
    return `${API_URL}${avatarPath}`;
  };

  if (!user) {
    return (
      <div className="auth-container">
        <div className="auth-card">
          <div className="auth-header">
            <h1>Chatty</h1>
            <p>Общайся с удовольствием</p>
          </div>

          <div className="auth-tabs">
            <button onClick={() => setIsLogin(true)} className={`auth-tab ${isLogin ? 'active' : ''}`}>Вход</button>
            <button onClick={() => setIsLogin(false)} className={`auth-tab ${!isLogin ? 'active' : ''}`}>Регистрация</button>
          </div>

          {error && <div className="error-message">❌ {error}</div>}
          {message && <div className="success-message">{message}</div>}

          {isLogin ? (
            <form onSubmit={handleLogin}>
              <div className="form-group">
                <label>Email или Username</label>
                <input type="text" value={formData.login} onChange={(e) => setFormData({...formData, login: e.target.value})} required />
              </div>
              <div className="form-group">
                <label>Пароль</label>
                <input type="password" value={formData.password} onChange={(e) => setFormData({...formData, password: e.target.value})} required />
              </div>
              <button type="submit" className="auth-button">Войти</button>
            </form>
          ) : (
            <form onSubmit={handleRegister}>
              <div className="form-group">
                <label>Email *</label>
                <input type="email" value={formData.email} onChange={(e) => setFormData({...formData, email: e.target.value})} required />
              </div>
              <div className="form-group">
                <label>Username *</label>
                <input type="text" value={formData.username} onChange={(e) => setFormData({...formData, username: e.target.value})} required />
              </div>
              <div className="form-group">
                <label>Имя *</label>
                <input type="text" value={formData.displayName} onChange={(e) => setFormData({...formData, displayName: e.target.value})} required />
              </div>
              <div className="form-group">
                <label>Пароль *</label>
                <input type="password" value={formData.password} onChange={(e) => setFormData({...formData, password: e.target.value})} required />
              </div>
              <div className="form-group">
                <label>Телефон</label>
                <input type="tel" value={formData.phone || ''} onChange={(e) => setFormData({...formData, phone: e.target.value})} />
              </div>
              <button type="submit" className="auth-button">Зарегистрироваться</button>
            </form>
          )}
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="app">
        <div className="sidebar">
          <div className="profile-header">
            <div className="profile-info">
              <div className="avatar">
                {user.avatar ? <img src={getAvatarUrl(user.avatar)} alt={user.displayName} /> : user.displayName[0].toUpperCase()}
              </div>
              <div className="profile-details">
                <div className="profile-name">{user.displayName}</div>
                <div className="profile-username">@{user.username}</div>
              </div>
              <button onClick={() => setShowSettings(true)} className="settings-button">⚙️</button>
            </div>
          </div>

          <div className="search-box">
            <input type="text" placeholder="🔍 Поиск пользователей..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
          </div>

          <div className="users-list">
            <div className="users-header">ПОЛЬЗОВАТЕЛИ — {filteredUsers.length}</div>
            
            {filteredUsers.map(otherUser => (
              <div key={otherUser.id} onClick={() => { setSelectedUser(otherUser); fetchMessages(otherUser.id); }} className={`user-item ${selectedUser?.id === otherUser.id ? 'selected' : ''}`}>
                <div className="user-avatar">
                  {otherUser.avatar ? <img src={getAvatarUrl(otherUser.avatar)} alt={otherUser.displayName} /> : otherUser.displayName[0].toUpperCase()}
                </div>
                <div className="user-info">
                  <div className="user-name">{otherUser.displayName}</div>
                  <div className="user-username">
                    @{otherUser.username}
                    {otherUser.online && <span className="online-dot"> ● онлайн</span>}
                  </div>
                </div>
              </div>
            ))}

            {filteredUsers.length === 0 && (
              <div className="no-users">
                <div>😕</div>
                <div>Пользователи не найдены</div>
              </div>
            )}
          </div>
        </div>

        <div className="chat-area">
          {selectedUser ? (
            <>
              <div className="chat-header">
                <div className="chat-user-avatar">
                  {selectedUser.avatar ? <img src={getAvatarUrl(selectedUser.avatar)} alt={selectedUser.displayName} /> : selectedUser.displayName[0].toUpperCase()}
                </div>
                <div className="chat-user-info">
                  <div className="chat-user-name">{selectedUser.displayName}</div>
                  <div className="chat-user-username">
                    @{selectedUser.username}
                    {selectedUser.online && <span className="online-dot"> ● онлайн</span>}
                  </div>
                </div>
              </div>

              <div className="messages-container">
                {messages.map(msg => (
                  <div key={msg.id} className={`message ${msg.senderId === user.id ? 'own' : 'other'}`}>
                    <div className="message-bubble">
                      <div className="message-text">{msg.text}</div>
                      <div className="message-time">
                        {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {imagePreview && (
                <div style={{ padding: '10px', background: 'var(--bg-secondary)', borderTop: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <img src={imagePreview} alt="preview" style={{ maxHeight: '60px', borderRadius: '8px' }} />
                  <span style={{ color: 'var(--text-secondary)' }}>Фото выбрано</span>
                  <button onClick={() => { setSelectedImage(null); setImagePreview(null); }} style={{ marginLeft: 'auto', background: 'none', border: 'none', color: 'var(--text-secondary)', fontSize: '18px', cursor: 'pointer' }}>✕</button>
                </div>
              )}

              <div className="message-input-container">
                <label style={{ fontSize: '24px', cursor: 'pointer', padding: '8px', color: 'var(--text-secondary)' }} title="Прикрепить фото">
                  📷
                  <input type="file" accept="image/*" onChange={handleImageSelect} style={{ display: 'none' }} />
                </label>

                <input
                  type="text"
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
                  placeholder="Напишите сообщение..."
                  className="message-input"
                />
                
                <button onClick={sendMessage} className="send-button" disabled={!newMessage.trim() && !selectedImage}>
                  ➤
                </button>
              </div>
            </>
          ) : (
            <div className="no-chat-selected">
              <div className="no-chat-icon">💬</div>
              <div className="no-chat-title">Выберите чат</div>
              <div className="no-chat-text">Начните общение с пользователем</div>
            </div>
          )}
        </div>
      </div>

      {showSettings && (
        <Settings 
          user={user} 
          onClose={() => setShowSettings(false)} 
          onUpdate={handleUpdateUser} 
          applyTheme={applyTheme}
        />
      )}
    </>
  );
}

export default App;