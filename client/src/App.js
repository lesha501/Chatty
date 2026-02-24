import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import io from 'socket.io-client';
import Settings from './components/Settings';
import UserProfile from './components/UserProfile';
import CreateGroup from './components/CreateGroup';
import GroupSettings from './components/GroupSettings';
import './index.css';

const API = axios.create({ baseURL: 'http://localhost:5000' });
const socket = io('http://localhost:5000');

function App() {
  const [isLogin, setIsLogin] = useState(true);
  const [user, setUser] = useState(null);
  const [conversations, setConversations] = useState([]);
  const [selectedConversation, setSelectedConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [showSettings, setShowSettings] = useState(false);
  const [showCreateGroup, setShowCreateGroup] = useState(false);
  const [showGroupSettings, setShowGroupSettings] = useState(false);
  const [selectedImage, setSelectedImage] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [viewedProfile, setViewedProfile] = useState(null);
  const [activeTab, setActiveTab] = useState('personal');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(null);
  
  // Для поиска пользователей
  const [showUserSearch, setShowUserSearch] = useState(false);
  const [allUsers, setAllUsers] = useState([]);
  const [userSearchQuery, setUserSearchQuery] = useState('');

  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const [formData, setFormData] = useState({
    email: '',
    username: '',
    displayName: '',
    password: '',
    login: '',
    phone: '',
    birthDate: ''
  });

  const applyTheme = (theme) => {
    const root = document.documentElement;
    root.classList.remove('theme-dark', 'theme-light', 'theme-purple');
    
    switch(theme) {
      case 'light': root.classList.add('theme-light'); break;
      case 'purple': root.classList.add('theme-purple'); break;
      default: root.classList.add('theme-dark');
    }
  };

  useEffect(() => {
    const savedUser = localStorage.getItem('user');
    const savedToken = localStorage.getItem('token');
    if (savedUser && savedToken) setUser(JSON.parse(savedUser));
  }, []);

  useEffect(() => {
    if (!user) return;

    fetchConversations();
    fetchAllUsers();
    socket.emit('user-online', user.id);
    
    socket.on('new-message', (message) => {
      console.log('🔥 Новое сообщение:', message);
      
      if (selectedConversation && message.conversationId === selectedConversation.id) {
        setMessages(prev => [...prev, message]);
      }
      
      fetchConversations();
    });

    socket.on('message-sent', (message) => {
      console.log('✅ Сообщение отправлено:', message);
      
      if (selectedConversation && message.conversationId === selectedConversation.id) {
        setMessages(prev => {
          const exists = prev.some(m => m.id === message.id);
          if (!exists) return [...prev, message];
          return prev;
        });
      }
      
      fetchConversations();
    });

    socket.on('user-status', ({ userId, online }) => {
      setConversations(prev => prev.map(conv => {
        if (!conv.participants) return conv;
        return {
          ...conv,
          participants: conv.participants.map(p => 
            p.id === userId ? { ...p, online } : p
          )
        };
      }));
      setAllUsers(prev => prev.map(u => 
        u.id === userId ? { ...u, online } : u
      ));
    });

    const interval = setInterval(fetchConversations, 3000);

    return () => {
      socket.off('new-message');
      socket.off('message-sent');
      socket.off('user-status');
      clearInterval(interval);
    };
  }, [user, selectedConversation]);

  useEffect(() => {
    if (user?.theme) applyTheme(user.theme);
  }, [user]);

  const fetchConversations = async () => {
    if (!user) return;
    try {
      const res = await API.get(`/api/conversations/${user.id}`);
      const sorted = res.data.sort((a, b) => {
        const timeA = a.lastMessageTime || a.updatedAt;
        const timeB = b.lastMessageTime || b.updatedAt;
        return new Date(timeB) - new Date(timeA);
      });
      setConversations(sorted);
    } catch (err) {
      console.error('Ошибка загрузки чатов:', err);
    }
  };

  const fetchAllUsers = async () => {
    if (!user) return;
    try {
      const res = await API.get(`/api/users/${user.id}`);
      setAllUsers(res.data);
    } catch (err) {
      console.error('Ошибка загрузки пользователей:', err);
    }
  };

  const startPersonalChat = async (otherUserId) => {
    try {
      const token = localStorage.getItem('token');
      const res = await API.post('/api/conversations', 
        { userId: otherUserId },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      const newConv = conversations.find(c => c.id === res.data.id);
      if (newConv) {
        setSelectedConversation(newConv);
        fetchMessages(newConv.id);
      } else {
        await fetchConversations();
        const updatedConv = conversations.find(c => c.id === res.data.id);
        if (updatedConv) {
          setSelectedConversation(updatedConv);
          fetchMessages(updatedConv.id);
        }
      }
      
      setShowUserSearch(false);
    } catch (err) {
      console.error('Ошибка создания чата:', err);
    }
  };

  const deleteConversation = async (conversationId) => {
    try {
      const token = localStorage.getItem('token');
      await axios.delete(`${API_URL}/api/conversations/${conversationId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (selectedConversation?.id === conversationId) {
        setSelectedConversation(null);
        setMessages([]);
      }
      
      fetchConversations();
      setShowDeleteConfirm(null);
    } catch (err) {
      console.error('Ошибка удаления чата:', err);
      alert('Ошибка при удалении чата');
    }
  };

  const fetchMessages = async (conversationId) => {
    try {
      const messagesRes = await API.get(`/api/messages/${conversationId}`);
      setMessages(messagesRes.data);
    } catch (err) {
      console.error('Ошибка загрузки сообщений:', err);
    }
  };

  const sendMessage = async () => {
    if ((!newMessage.trim() && !selectedImage) || !selectedConversation) return;

    try {
      let messageText = newMessage;
      
      if (selectedImage) {
        const formData = new FormData();
        formData.append('image', selectedImage);
        const uploadRes = await axios.post('http://localhost:5000/api/upload-image', formData, {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`,
            'Content-Type': 'multipart/form-data'
          }
        });
        messageText = `📷:${uploadRes.data.imageUrl}`;
      }

      socket.emit('send-message', {
        conversationId: selectedConversation.id,
        senderId: user.id,
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
        phone: formData.phone,
        birthDate: formData.birthDate
      });
      setMessage('✨ Регистрация успешна! Войдите.');
      setFormData({ 
        email: '', 
        username: '', 
        displayName: '', 
        password: '', 
        login: '', 
        phone: '',
        birthDate: ''
      });
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
    setConversations([]);
    setSelectedConversation(null);
    setMessages([]);
    setViewedProfile(null);
    setShowSettings(false);
    socket.disconnect();
  };

  const handleUpdateUser = (updatedUser) => {
    setUser(updatedUser);
    localStorage.setItem('user', JSON.stringify(updatedUser));
    if (updatedUser.theme) applyTheme(updatedUser.theme);
  };

  const personalConversations = conversations.filter(c => c.type === 'personal');
  const groupConversations = conversations.filter(c => c.type === 'group');

  const getConversationName = (conv) => {
    if (conv.type === 'personal') {
      const otherUser = conv.participants?.find(p => p.id !== user.id);
      return otherUser?.displayName || 'Пользователь';
    }
    return conv.name || 'Безымянная группа';
  };

  const getConversationAvatar = (conv) => {
    if (conv.type === 'personal') {
      const otherUser = conv.participants?.find(p => p.id !== user.id);
      return otherUser?.avatar || null;
    }
    return conv.avatar || null;
  };

  const getAvatarUrl = (avatarPath) => {
    if (!avatarPath) return null;
    if (avatarPath.startsWith('http')) return avatarPath;
    return `http://localhost:5000${avatarPath}`;
  };

  const getLastMessageText = (conv) => {
    if (!conv.lastMessage) return 'Нет сообщений';
    if (conv.lastMessage.senderId === user.id) {
      return `Вы: ${conv.lastMessage.text}`;
    }
    if (conv.type !== 'personal') {
      const sender = conv.participants?.find(p => p.id === conv.lastMessage.senderId);
      return `${sender?.displayName || 'Кто-то'}: ${conv.lastMessage.text}`;
    }
    return conv.lastMessage.text;
  };

  const formatTime = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    const now = new Date();
    const diff = now - date;
    
    if (diff < 24 * 60 * 60 * 1000) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }
    return date.toLocaleDateString([], { day: 'numeric', month: 'short' });
  };

  const renderMessage = (msg) => {
    if (msg.text?.startsWith('📷:')) {
      const imageUrl = msg.text.substring(3);
      return (
        <img 
          src={imageUrl} 
          alt="chat" 
          style={{ 
            maxWidth: '200px', 
            maxHeight: '200px', 
            borderRadius: '10px', 
            cursor: 'pointer' 
          }} 
          onClick={() => window.open(imageUrl)} 
        />
      );
    }
    return <div className="message-text">{msg.text}</div>;
  };

  const filteredUsers = allUsers.filter(u => 
    u.displayName.toLowerCase().includes(userSearchQuery.toLowerCase()) ||
    u.username.toLowerCase().includes(userSearchQuery.toLowerCase())
  );

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
              <div className="form-group"><label>Email или Username</label><input type="text" value={formData.login} onChange={(e) => setFormData({...formData, login: e.target.value})} required /></div>
              <div className="form-group"><label>Пароль</label><input type="password" value={formData.password} onChange={(e) => setFormData({...formData, password: e.target.value})} required /></div>
              <button type="submit" className="auth-button">Войти</button>
            </form>
          ) : (
            <form onSubmit={handleRegister}>
              <div className="form-group"><label>Email *</label><input type="email" value={formData.email} onChange={(e) => setFormData({...formData, email: e.target.value})} required /></div>
              <div className="form-group"><label>Username *</label><input type="text" value={formData.username} onChange={(e) => setFormData({...formData, username: e.target.value})} required /></div>
              <div className="form-group"><label>Имя *</label><input type="text" value={formData.displayName} onChange={(e) => setFormData({...formData, displayName: e.target.value})} required /></div>
              <div className="form-group"><label>Пароль *</label><input type="password" value={formData.password} onChange={(e) => setFormData({...formData, password: e.target.value})} required /></div>
              <div className="form-group"><label>Телефон</label><input type="tel" value={formData.phone} onChange={(e) => setFormData({...formData, phone: e.target.value})} /></div>
              <div className="form-group"><label>Дата рождения</label><input type="date" value={formData.birthDate} onChange={(e) => setFormData({...formData, birthDate: e.target.value})} /></div>
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
              <div className="avatar">{user.avatar ? <img src={getAvatarUrl(user.avatar)} alt={user.displayName} /> : user.displayName[0].toUpperCase()}</div>
              <div className="profile-details">
                <div className="profile-name">{user.displayName}</div>
                <div className="profile-username">@{user.username}</div>
              </div>
              <button onClick={() => setShowSettings(true)} className="settings-button">⚙️</button>
            </div>
          </div>

          <div style={{
            display: 'flex',
            padding: '10px',
            gap: '5px',
            borderBottom: '1px solid var(--border-color)'
          }}>
            <button
              onClick={() => setActiveTab('personal')}
              style={{
                flex: 1,
                padding: '8px',
                background: activeTab === 'personal' ? 'var(--accent-color)' : 'transparent',
                border: 'none',
                borderRadius: '8px',
                color: activeTab === 'personal' ? 'white' : 'var(--text-secondary)',
                cursor: 'pointer'
              }}
            >
              Личные ({personalConversations.length})
            </button>
            <button
              onClick={() => setActiveTab('groups')}
              style={{
                flex: 1,
                padding: '8px',
                background: activeTab === 'groups' ? 'var(--accent-color)' : 'transparent',
                border: 'none',
                borderRadius: '8px',
                color: activeTab === 'groups' ? 'white' : 'var(--text-secondary)',
                cursor: 'pointer'
              }}
            >
              Группы ({groupConversations.length})
            </button>
          </div>

          {activeTab === 'personal' && (
            <div className="search-box">
              <button
                onClick={() => setShowUserSearch(true)}
                style={{
                  width: '100%',
                  padding: '12px',
                  background: 'var(--bg-tertiary)',
                  border: '1px solid var(--border-color)',
                  borderRadius: '12px',
                  color: 'var(--text-secondary)',
                  fontSize: '14px',
                  textAlign: 'left',
                  cursor: 'pointer'
                }}
              >
                🔍 Найти пользователя...
              </button>
            </div>
          )}

          {activeTab === 'groups' && (
            <div className="search-box">
              <button
                onClick={() => setShowCreateGroup(true)}
                style={{
                  width: '100%',
                  padding: '12px',
                  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                  border: 'none',
                  borderRadius: '12px',
                  color: 'white',
                  fontSize: '14px',
                  cursor: 'pointer'
                }}
              >
                ➕ Создать группу
              </button>
            </div>
          )}

          <div className="users-list">
            <div className="users-header">
              {activeTab === 'personal' ? 'ЛИЧНЫЕ ЧАТЫ' : 'ГРУППЫ'}
            </div>
            
            {(activeTab === 'personal' ? personalConversations : groupConversations).map(conv => (
              <div 
                key={conv.id} 
                className={`user-item ${selectedConversation?.id === conv.id ? 'selected' : ''}`}
                style={{ position: 'relative' }}
              >
                <div 
                  style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1, cursor: 'pointer' }}
                  onClick={() => {
                    setSelectedConversation(conv);
                    fetchMessages(conv.id);
                  }}
                >
                  <div className="user-avatar">
                    {getConversationAvatar(conv) ? (
                      <img src={getAvatarUrl(getConversationAvatar(conv))} alt={getConversationName(conv)} />
                    ) : (
                      getConversationName(conv)[0].toUpperCase()
                    )}
                  </div>
                  <div className="user-info">
                    <div className="user-name">
                      {getConversationName(conv)}
                    </div>
                    <div className="user-username">
                      {getLastMessageText(conv)}
                      <span style={{ marginLeft: '8px', fontSize: '11px', color: 'var(--text-muted)' }}>
                        {formatTime(conv.lastMessageTime || conv.updatedAt)}
                      </span>
                    </div>
                  </div>
                </div>
                
                {/* Кнопка удаления */}
                <button
                  onClick={() => setShowDeleteConfirm(conv.id)}
                  style={{
                    position: 'absolute',
                    right: '10px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'transparent',
                    border: 'none',
                    color: 'var(--text-secondary)',
                    fontSize: '18px',
                    cursor: 'pointer',
                    padding: '5px',
                    borderRadius: '5px'
                  }}
                  onMouseEnter={(e) => e.target.style.background = 'var(--bg-hover)'}
                  onMouseLeave={(e) => e.target.style.background = 'transparent'}
                >
                  ✕
                </button>
              </div>
            ))}
            
            {(activeTab === 'personal' ? personalConversations.length === 0 : groupConversations.length === 0) && (
              <div className="no-users">
                <div>😕</div>
                <div>
                  {activeTab === 'personal' 
                    ? 'Нет личных чатов' 
                    : 'Нет групп'}
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="chat-area">
          {selectedConversation ? (
            <>
              <div className="chat-header">
                <div 
                  className="chat-user-avatar" 
                  onClick={() => {
                    if (selectedConversation.type === 'personal') {
                      const otherUser = selectedConversation.participants?.find(p => p.id !== user.id);
                      if (otherUser) setViewedProfile(otherUser);
                    } else {
                      setShowGroupSettings(true);
                    }
                  }}
                  style={{ cursor: 'pointer' }}
                >
                  {getConversationAvatar(selectedConversation) ? (
                    <img src={getAvatarUrl(getConversationAvatar(selectedConversation))} alt={getConversationName(selectedConversation)} />
                  ) : (
                    getConversationName(selectedConversation)[0].toUpperCase()
                  )}
                </div>
                <div 
                  className="chat-user-info"
                  onClick={() => {
                    if (selectedConversation.type === 'personal') {
                      const otherUser = selectedConversation.participants?.find(p => p.id !== user.id);
                      if (otherUser) setViewedProfile(otherUser);
                    } else {
                      setShowGroupSettings(true);
                    }
                  }}
                  style={{ cursor: 'pointer' }}
                >
                  <div className="chat-user-name">
                    {getConversationName(selectedConversation)}
                  </div>
                  <div className="chat-user-username">
                    {selectedConversation.type === 'personal' ? (
                      <>
                        @{selectedConversation.participants?.find(p => p.id !== user.id)?.username}
                        {selectedConversation.participants?.find(p => p.id !== user.id)?.online && 
                          <span className="online-dot"> ● онлайн</span>
                        }
                      </>
                    ) : (
                      <>{selectedConversation.participants?.length} участников</>
                    )}
                  </div>
                </div>
              </div>

              <div className="messages-container">
                {messages.map(msg => {
                  const isOwn = msg.senderId === user.id;
                  const sender = selectedConversation.participants?.find(p => p.id === msg.senderId);
                  
                  return (
                    <div key={msg.id} className={`message ${isOwn ? 'own' : 'other'}`}>
                      <div className="message-bubble">
                        {!isOwn && selectedConversation.type !== 'personal' && (
                          <div style={{ 
                            fontSize: '12px', 
                            fontWeight: 'bold', 
                            marginBottom: '4px',
                            color: 'var(--accent-color)'
                          }}>
                            {sender?.displayName || 'Пользователь'}
                          </div>
                        )}
                        {renderMessage(msg)}
                        <div className="message-time">
                          {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </div>
                      </div>
                    </div>
                  );
                })}
                <div ref={messagesEndRef} />
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
              <div className="no-chat-text">
                {activeTab === 'personal' 
                  ? 'Начните общение с пользователем' 
                  : 'Создайте группу или выберите существующую'}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Модалка подтверждения удаления */}
      {showDeleteConfirm && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.8)',
          backdropFilter: 'blur(10px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }}>
          <div style={{
            width: '90%',
            maxWidth: '400px',
            background: '#2a2b2e',
            borderRadius: '20px',
            padding: '30px',
            textAlign: 'center'
          }}>
            <div style={{ fontSize: '48px', marginBottom: '20px' }}>🗑️</div>
            <h3 style={{ color: '#e4e6eb', marginBottom: '10px' }}>Удалить чат?</h3>
            <p style={{ color: '#9ca3af', marginBottom: '30px' }}>
              Все сообщения будут удалены без возможности восстановления.
            </p>
            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                onClick={() => setShowDeleteConfirm(null)}
                style={{
                  flex: 1,
                  padding: '12px',
                  background: 'transparent',
                  border: '1px solid #3a3b3e',
                  borderRadius: '10px',
                  color: '#e4e6eb',
                  cursor: 'pointer'
                }}
              >
                Отмена
              </button>
              <button
                onClick={() => deleteConversation(showDeleteConfirm)}
                style={{
                  flex: 1,
                  padding: '12px',
                  background: '#ff6b6b',
                  border: 'none',
                  borderRadius: '10px',
                  color: 'white',
                  cursor: 'pointer'
                }}
              >
                Удалить
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Модалка поиска пользователей */}
      {showUserSearch && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.8)',
          backdropFilter: 'blur(10px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }}>
          <div style={{
            width: '90%',
            maxWidth: '400px',
            background: '#2a2b2e',
            borderRadius: '20px',
            overflow: 'hidden',
            boxShadow: '0 20px 60px rgba(0,0,0,0.5)'
          }}>
            <div style={{
              padding: '20px',
              background: '#1e1f22',
              borderBottom: '1px solid #3a3b3e',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}>
              <h2 style={{ margin: 0, color: '#e4e6eb' }}>Новый диалог</h2>
              <button
                onClick={() => setShowUserSearch(false)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#9ca3af',
                  fontSize: '24px',
                  cursor: 'pointer'
                }}
              >
                ✕
              </button>
            </div>
            <div style={{ padding: '20px' }}>
              <input
                type="text"
                placeholder="🔍 Введите имя или username..."
                value={userSearchQuery}
                onChange={(e) => setUserSearchQuery(e.target.value)}
                style={{
                  width: '100%',
                  padding: '12px',
                  background: '#1e1f22',
                  border: '1px solid #3a3b3e',
                  borderRadius: '10px',
                  color: '#e4e6eb',
                  fontSize: '16px',
                  marginBottom: '20px',
                  boxSizing: 'border-box'
                }}
                autoFocus
              />
              <div style={{ maxHeight: '400px', overflow: 'auto' }}>
                {filteredUsers.map(otherUser => (
                  <div
                    key={otherUser.id}
                    onClick={() => startPersonalChat(otherUser.id)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '12px',
                      padding: '10px',
                      marginBottom: '5px',
                      borderRadius: '10px',
                      cursor: 'pointer'
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.background = '#333436'}
                    onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                  >
                    <div style={{
                      width: '40px',
                      height: '40px',
                      borderRadius: '50%',
                      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: 'white',
                      overflow: 'hidden'
                    }}>
                      {otherUser.avatar ? (
                        <img src={getAvatarUrl(otherUser.avatar)} alt={otherUser.displayName} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      ) : (
                        otherUser.displayName[0].toUpperCase()
                      )}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ color: '#e4e6eb', fontWeight: '500' }}>{otherUser.displayName}</div>
                      <div style={{ color: '#9ca3af', fontSize: '12px' }}>
                        @{otherUser.username}
                        {otherUser.online && <span style={{ marginLeft: '8px', color: '#4caf50' }}>● онлайн</span>}
                      </div>
                    </div>
                  </div>
                ))}
                {filteredUsers.length === 0 && (
                  <div style={{ textAlign: 'center', color: '#9ca3af', padding: '40px' }}>
                    Пользователи не найдены
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {showSettings && (
        <Settings 
          user={user} 
          onClose={() => setShowSettings(false)} 
          onUpdate={handleUpdateUser} 
          applyTheme={applyTheme}
          onLogout={handleLogout}
        />
      )}

      {viewedProfile && (
        <UserProfile 
          user={viewedProfile}
          currentUser={user}
          onClose={() => setViewedProfile(null)}
        />
      )}

      {showCreateGroup && (
        <CreateGroup
          user={user}
          onClose={() => setShowCreateGroup(false)}
          onGroupCreated={() => {
            fetchConversations();
            setShowCreateGroup(false);
          }}
        />
      )}

      {showGroupSettings && selectedConversation && selectedConversation.type !== 'personal' && (
        <GroupSettings
          conversation={selectedConversation}
          currentUser={user}
          onClose={() => setShowGroupSettings(false)}
          onUpdate={() => {
            fetchConversations();
            if (selectedConversation) fetchMessages(selectedConversation.id);
          }}
        />
      )}
    </>
  );
}

export default App;