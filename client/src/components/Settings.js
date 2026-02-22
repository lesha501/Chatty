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
    bio: user.bio || ''
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
      
      if (applyTheme) {
        applyTheme(settings.theme);
      }
      
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
    <div className="settings-modal">
      <div className="settings-content">
        <div className="settings-header">
          <h2>Настройки</h2>
          <button onClick={onClose} className="close-button">✕</button>
        </div>

        <div className="settings-tabs">
          <button
            onClick={() => setActiveTab('profile')}
            className={`settings-tab ${activeTab === 'profile' ? 'active' : ''}`}
          >
            👤 Профиль
          </button>
          <button
            onClick={() => setActiveTab('settings')}
            className={`settings-tab ${activeTab === 'settings' ? 'active' : ''}`}
          >
            ⚙️ Настройки
          </button>
        </div>

        <div className="settings-body">
          {error && (
            <div className="error-message">
              ❌ {error}
            </div>
          )}

          {success && (
            <div className="success-message">
              ✓ {success}
            </div>
          )}

          {activeTab === 'profile' && (
            <div>
              <div className="avatar-section">
                <div 
                  className="avatar-upload" 
                  onClick={() => document.getElementById('avatar-input').click()}
                >
                  {avatarPreview ? (
                    <img src={avatarPreview} alt="avatar" />
                  ) : (
                    <div className="avatar-placeholder">
                      {user.displayName[0].toUpperCase()}
                    </div>
                  )}
                  <input
                    id="avatar-input"
                    type="file"
                    accept="image/*"
                    onChange={handleAvatarChange}
                    style={{ display: 'none' }}
                  />
                </div>
                <p>Нажмите на аватарку, чтобы изменить</p>
              </div>

              <div className="form-group">
                <label>Имя</label>
                <input
                  type="text"
                  value={profile.displayName}
                  onChange={(e) => setProfile({...profile, displayName: e.target.value})}
                />
              </div>

              <div className="form-group">
                <label>Username</label>
                <input
                  type="text"
                  value={profile.username}
                  onChange={(e) => setProfile({...profile, username: e.target.value})}
                />
                <small>Только латиница и цифры</small>
              </div>

              <div className="form-group">
                <label>Email</label>
                <input
                  type="email"
                  value={profile.email}
                  onChange={(e) => setProfile({...profile, email: e.target.value})}
                />
              </div>

              <div className="form-group">
                <label>Телефон</label>
                <input
                  type="tel"
                  value={profile.phone || ''}
                  onChange={(e) => setProfile({...profile, phone: e.target.value})}
                />
                <small>Необязательно</small>
              </div>

              <div className="form-group">
                <label>О себе</label>
                <textarea
                  value={profile.bio || ''}
                  onChange={(e) => setProfile({...profile, bio: e.target.value})}
                  rows="4"
                  placeholder="Расскажите немного о себе..."
                />
              </div>
            </div>
          )}

          {activeTab === 'settings' && (
            <div>
              <div className="settings-section">
                <h3>Внешний вид</h3>
                
                <div className="form-group">
                  <label>Тема оформления</label>
                  <select
                    value={settings.theme}
                    onChange={(e) => setSettings({...settings, theme: e.target.value})}
                  >
                    <option value="dark">🌙 Тёмная</option>
                    <option value="light">☀️ Светлая</option>
                    <option value="purple">💜 Фиолетовая</option>
                  </select>
                </div>
              </div>

              <div className="settings-section">
                <h3>Уведомления</h3>
                
                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    checked={settings.notifications}
                    onChange={(e) => setSettings({...settings, notifications: e.target.checked})}
                  />
                  <span>Включить уведомления</span>
                </label>

                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    checked={settings.soundEnabled}
                    onChange={(e) => setSettings({...settings, soundEnabled: e.target.checked})}
                  />
                  <span>Звук сообщений</span>
                </label>
              </div>

              {/* КНОПКА ВЫХОДА */}
              <div className="settings-section" style={{ borderBottom: 'none' }}>
                <h3 style={{ color: '#ff6b6b' }}>Опасная зона</h3>
                <button 
                  onClick={handleLogout}
                  className="logout-button"
                  style={{
                    width: '100%',
                    padding: '12px',
                    background: 'transparent',
                    border: '1px solid #ff6b6b',
                    borderRadius: '10px',
                    color: '#ff6b6b',
                    fontSize: '16px',
                    cursor: 'pointer',
                    transition: 'all 0.3s',
                    marginTop: '10px'
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
          )}
        </div>

        <div className="settings-footer">
          <button onClick={onClose} className="cancel-button">
            Отмена
          </button>
          <button
            onClick={activeTab === 'profile' ? handleSaveProfile : handleSaveSettings}
            disabled={loading}
            className="save-button"
          >
            {loading ? 'Сохранение...' : 'Сохранить'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default Settings;