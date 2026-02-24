import React, { useState } from 'react';
import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

function Settings({ user, onClose, onUpdate, applyTheme, onLogout }) {
  const [activeTab, setActiveTab] = useState('profile');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  
  const [profile, setProfile] = useState({
    displayName: user.displayName || '',
    username: user.username || '',
    email: user.email || '',
    phone: user.phone || '',
    bio: user.bio || '',
    birthDate: user.birthDate || ''  // <- добавили birthDate
  });

  const [settings, setSettings] = useState({
    theme: user.theme || 'dark',
    notifications: user.notifications === 1,
    soundEnabled: user.soundEnabled === 1
  });

  const [avatarFile, setAvatarFile] = useState(null);
  const [avatarPreview, setAvatarPreview] = useState(user.avatar ? 
    (user.avatar.startsWith('http') ? user.avatar : `${API_URL}${user.avatar}`) : null);

  const handleAvatarChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setAvatarFile(file);
      setAvatarPreview(URL.createObjectURL(file));
    }
  };

  const uploadAvatar = async () => {
    if (!avatarFile) return null;
    
    const formData = new FormData();
    formData.append('avatar', avatarFile);
    
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('Токен не найден');
      }
      
      const res = await axios.post(`${API_URL}/api/upload-avatar`, formData, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'multipart/form-data'
        }
      });
      return res.data.avatar;
    } catch (err) {
      console.error('Ошибка загрузки аватарки:', err);
      throw err;
    }
  };

  const handleSaveProfile = async () => {
    setLoading(true);
    setError('');
    setSuccess('');
    
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('Токен не найден');
      }
      
      let avatarUrl = user.avatar;
      if (avatarFile) {
        avatarUrl = await uploadAvatar();
      }
      
      console.log('Сохраняем профиль:', profile); // для отладки
      
      const res = await axios.put(`${API_URL}/api/profile`, profile, {
        headers: { 
          'Authorization': `Bearer ${token}` 
        }
      });
      
      const updatedUser = { ...res.data, avatar: avatarUrl };
      localStorage.setItem('user', JSON.stringify(updatedUser));
      onUpdate(updatedUser);
      setSuccess('Профиль обновлён! ✨');
    } catch (err) {
      console.error('Ошибка:', err);
      setError(err.response?.data?.error || err.message || 'Ошибка обновления');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveSettings = async () => {
    setLoading(true);
    setError('');
    setSuccess('');
    
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('Токен не найден');
      }
      
      const res = await axios.put(`${API_URL}/api/settings`, settings, {
        headers: { 
          'Authorization': `Bearer ${token}` 
        }
      });
      
      const updatedUser = { ...user, ...res.data };
      localStorage.setItem('user', JSON.stringify(updatedUser));
      onUpdate(updatedUser);
      
      applyTheme(settings.theme);
      
      setSuccess('Настройки сохранены! ⚙️');
      
    } catch (err) {
      console.error('Ошибка:', err);
      setError(err.response?.data?.error || err.message || 'Ошибка сохранения');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    if (onLogout) {
      onLogout();
      onClose();
    }
  };

  return (
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
        maxWidth: '600px',
        background: '#2a2b2e',
        borderRadius: '20px',
        overflow: 'hidden',
        boxShadow: '0 20px 60px rgba(0,0,0,0.5)'
      }}>
        {/* Заголовок */}
        <div style={{
          padding: '20px',
          background: '#1e1f22',
          borderBottom: '1px solid #3a3b3e',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <h2 style={{ margin: 0, color: '#e4e6eb' }}>Настройки</h2>
          <button
            onClick={onClose}
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

        {/* Табы */}
        <div style={{
          display: 'flex',
          borderBottom: '1px solid #3a3b3e',
          padding: '0 20px'
        }}>
          <button
            onClick={() => setActiveTab('profile')}
            style={{
              padding: '15px 20px',
              background: 'none',
              border: 'none',
              color: activeTab === 'profile' ? '#667eea' : '#9ca3af',
              borderBottom: activeTab === 'profile' ? '2px solid #667eea' : '2px solid transparent',
              cursor: 'pointer',
              fontSize: '16px',
              fontWeight: activeTab === 'profile' ? '600' : '400'
            }}
          >
            👤 Профиль
          </button>
          <button
            onClick={() => setActiveTab('settings')}
            style={{
              padding: '15px 20px',
              background: 'none',
              border: 'none',
              color: activeTab === 'settings' ? '#667eea' : '#9ca3af',
              borderBottom: activeTab === 'settings' ? '2px solid #667eea' : '2px solid transparent',
              cursor: 'pointer',
              fontSize: '16px',
              fontWeight: activeTab === 'settings' ? '600' : '400'
            }}
          >
            ⚙️ Настройки
          </button>
        </div>

        {/* Контент */}
        <div style={{ padding: '20px', maxHeight: '60vh', overflow: 'auto' }}>
          {error && (
            <div style={{
              background: '#442222',
              color: '#ff6b6b',
              padding: '12px',
              borderRadius: '10px',
              marginBottom: '20px',
              fontSize: '14px'
            }}>
              ❌ {error}
            </div>
          )}

          {success && (
            <div style={{
              background: '#224422',
              color: '#6bff6b',
              padding: '12px',
              borderRadius: '10px',
              marginBottom: '20px'
            }}>
              ✓ {success}
            </div>
          )}

          {activeTab === 'profile' && (
            <div>
              {/* Аватарка */}
              <div style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                marginBottom: '30px'
              }}>
                <div style={{
                  width: '120px',
                  height: '120px',
                  borderRadius: '50%',
                  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                  marginBottom: '15px',
                  overflow: 'hidden',
                  cursor: 'pointer',
                  position: 'relative'
                }}>
                  {avatarPreview ? (
                    <img 
                      src={avatarPreview} 
                      alt="avatar" 
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    />
                  ) : (
                    <div style={{
                      width: '100%',
                      height: '100%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '40px',
                      color: 'white'
                    }}>
                      {user.displayName[0].toUpperCase()}
                    </div>
                  )}
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleAvatarChange}
                    style={{
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      width: '100%',
                      height: '100%',
                      opacity: 0,
                      cursor: 'pointer'
                    }}
                  />
                </div>
                <p style={{ color: '#9ca3af', fontSize: '14px', margin: 0 }}>
                  Нажмите на аватарку, чтобы изменить
                </p>
              </div>

              {/* Поля профиля */}
              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', marginBottom: '8px', color: '#9ca3af', fontSize: '14px' }}>
                  Имя
                </label>
                <input
                  type="text"
                  value={profile.displayName}
                  onChange={(e) => setProfile({...profile, displayName: e.target.value})}
                  style={{
                    width: '100%',
                    padding: '12px',
                    background: '#1e1f22',
                    border: '1px solid #3a3b3e',
                    borderRadius: '10px',
                    color: '#e4e6eb',
                    fontSize: '16px',
                    boxSizing: 'border-box'
                  }}
                />
              </div>

              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', marginBottom: '8px', color: '#9ca3af', fontSize: '14px' }}>
                  Username
                </label>
                <input
                  type="text"
                  value={profile.username}
                  onChange={(e) => setProfile({...profile, username: e.target.value})}
                  style={{
                    width: '100%',
                    padding: '12px',
                    background: '#1e1f22',
                    border: '1px solid #3a3b3e',
                    borderRadius: '10px',
                    color: '#e4e6eb',
                    fontSize: '16px',
                    boxSizing: 'border-box'
                  }}
                />
                <small style={{ color: '#9ca3af', fontSize: '12px' }}>Только латиница и цифры</small>
              </div>

              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', marginBottom: '8px', color: '#9ca3af', fontSize: '14px' }}>
                  Email
                </label>
                <input
                  type="email"
                  value={profile.email}
                  onChange={(e) => setProfile({...profile, email: e.target.value})}
                  style={{
                    width: '100%',
                    padding: '12px',
                    background: '#1e1f22',
                    border: '1px solid #3a3b3e',
                    borderRadius: '10px',
                    color: '#e4e6eb',
                    fontSize: '16px',
                    boxSizing: 'border-box'
                  }}
                />
              </div>

              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', marginBottom: '8px', color: '#9ca3af', fontSize: '14px' }}>
                  Телефон
                </label>
                <input
                  type="tel"
                  value={profile.phone || ''}
                  onChange={(e) => setProfile({...profile, phone: e.target.value})}
                  style={{
                    width: '100%',
                    padding: '12px',
                    background: '#1e1f22',
                    border: '1px solid #3a3b3e',
                    borderRadius: '10px',
                    color: '#e4e6eb',
                    fontSize: '16px',
                    boxSizing: 'border-box'
                  }}
                />
              </div>

              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', marginBottom: '8px', color: '#9ca3af', fontSize: '14px' }}>
                  Дата рождения
                </label>
                <input
                  type="date"
                  value={profile.birthDate || ''}
                  onChange={(e) => setProfile({...profile, birthDate: e.target.value})}
                  style={{
                    width: '100%',
                    padding: '12px',
                    background: '#1e1f22',
                    border: '1px solid #3a3b3e',
                    borderRadius: '10px',
                    color: '#e4e6eb',
                    fontSize: '16px',
                    boxSizing: 'border-box'
                  }}
                />
              </div>

              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', marginBottom: '8px', color: '#9ca3af', fontSize: '14px' }}>
                  О себе
                </label>
                <textarea
                  value={profile.bio || ''}
                  onChange={(e) => setProfile({...profile, bio: e.target.value})}
                  rows="4"
                  placeholder="Расскажите немного о себе..."
                  style={{
                    width: '100%',
                    padding: '12px',
                    background: '#1e1f22',
                    border: '1px solid #3a3b3e',
                    borderRadius: '10px',
                    color: '#e4e6eb',
                    fontSize: '16px',
                    boxSizing: 'border-box',
                    resize: 'vertical'
                  }}
                />
              </div>
            </div>
          )}

          {activeTab === 'settings' && (
            <div>
              <div style={{ marginBottom: '25px' }}>
                <h3 style={{ color: '#e4e6eb', margin: '0 0 15px 0', fontSize: '18px' }}>Внешний вид</h3>
                
                <div style={{ marginBottom: '15px' }}>
                  <label style={{ display: 'block', marginBottom: '8px', color: '#9ca3af', fontSize: '14px' }}>
                    Тема оформления
                  </label>
                  <select
                    value={settings.theme}
                    onChange={(e) => setSettings({...settings, theme: e.target.value})}
                    style={{
                      width: '100%',
                      padding: '12px',
                      background: '#1e1f22',
                      border: '1px solid #3a3b3e',
                      borderRadius: '10px',
                      color: '#e4e6eb',
                      fontSize: '16px'
                    }}
                  >
                    <option value="dark">🌙 Тёмная</option>
                    <option value="light">☀️ Светлая</option>
                    <option value="purple">💜 Фиолетовая</option>
                  </select>
                </div>
              </div>

              <div style={{ marginBottom: '25px' }}>
                <h3 style={{ color: '#e4e6eb', margin: '0 0 15px 0', fontSize: '18px' }}>Уведомления</h3>
                
                <div style={{ marginBottom: '15px' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={settings.notifications}
                      onChange={(e) => setSettings({...settings, notifications: e.target.checked})}
                      style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                    />
                    <span style={{ color: '#e4e6eb' }}>Включить уведомления</span>
                  </label>
                </div>

                <div style={{ marginBottom: '15px' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={settings.soundEnabled}
                      onChange={(e) => setSettings({...settings, soundEnabled: e.target.checked})}
                      style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                    />
                    <span style={{ color: '#e4e6eb' }}>Звук сообщений</span>
                  </label>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Кнопки действий */}
        <div style={{
          padding: '20px',
          borderTop: '1px solid #3a3b3e',
          display: 'flex',
          justifyContent: 'flex-end',
          gap: '10px'
        }}>
          <button
            onClick={onClose}
            style={{
              padding: '12px 24px',
              background: 'transparent',
              border: '1px solid #3a3b3e',
              borderRadius: '10px',
              color: '#e4e6eb',
              cursor: 'pointer',
              fontSize: '16px',
              transition: 'all 0.3s'
            }}
            onMouseEnter={(e) => {
              e.target.style.background = '#3a3b3e';
            }}
            onMouseLeave={(e) => {
              e.target.style.background = 'transparent';
            }}
          >
            Отмена
          </button>
          <button
            onClick={activeTab === 'profile' ? handleSaveProfile : handleSaveSettings}
            disabled={loading}
            style={{
              padding: '12px 24px',
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              border: 'none',
              borderRadius: '10px',
              color: 'white',
              cursor: loading ? 'not-allowed' : 'pointer',
              fontSize: '16px',
              opacity: loading ? 0.7 : 1,
              transition: 'all 0.3s'
            }}
            onMouseEnter={(e) => {
              if (!loading) {
                e.target.style.transform = 'translateY(-2px)';
                e.target.style.boxShadow = '0 10px 20px rgba(102, 126, 234, 0.4)';
              }
            }}
            onMouseLeave={(e) => {
              if (!loading) {
                e.target.style.transform = 'translateY(0)';
                e.target.style.boxShadow = 'none';
              }
            }}
          >
            {loading ? 'Сохранение...' : 'Сохранить'}
          </button>
        </div>

        {/* Кнопка выхода отдельно снизу */}
        <div style={{
          padding: '0 20px 20px 20px',
          borderTop: '1px solid #3a3b3e',
          marginTop: '10px'
        }}>
          <button
            onClick={handleLogout}
            style={{
              width: '100%',
              padding: '14px',
              background: 'transparent',
              border: '2px solid #ff6b6b',
              borderRadius: '10px',
              color: '#ff6b6b',
              fontSize: '16px',
              fontWeight: '600',
              cursor: 'pointer',
              transition: 'all 0.3s'
            }}
            onMouseEnter={(e) => {
              e.target.style.background = '#ff6b6b';
              e.target.style.color = 'white';
            }}
            onMouseLeave={(e) => {
              e.target.style.background = 'transparent';
              e.target.style.color = '#ff6b6b';
            }}
          >
            🚪 Выйти из аккаунта
          </button>
        </div>
      </div>
    </div>
  );
}

export default Settings;