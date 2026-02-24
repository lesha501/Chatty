import React, { useState, useEffect } from 'react';
import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

function CreateGroup({ user, onClose, onGroupCreated }) {
  const [step, setStep] = useState(1); // 1: информация, 2: выбор участников
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [users, setUsers] = useState([]);
  const [selectedUsers, setSelectedUsers] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  
  const [groupInfo, setGroupInfo] = useState({
    name: '',
    description: ''
  });

  // Загружаем всех пользователей
  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      const res = await axios.get(`${API_URL}/api/users/${user.id}`);
      setUsers(res.data);
    } catch (err) {
      console.error('Ошибка загрузки пользователей:', err);
    }
  };

  const filteredUsers = users.filter(u => 
    u.displayName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    u.username.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const toggleUser = (userId) => {
    setSelectedUsers(prev => {
      if (prev.includes(userId)) {
        return prev.filter(id => id !== userId);
      } else {
        return [...prev, userId];
      }
    });
  };

  const handleCreateGroup = async () => {
    if (!groupInfo.name.trim()) {
      setError('Введите название группы');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const token = localStorage.getItem('token');
      const res = await axios.post(`${API_URL}/api/groups`, {
        name: groupInfo.name,
        description: groupInfo.description,
        members: selectedUsers
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });

      onGroupCreated(res.data);
    } catch (err) {
      setError(err.response?.data?.error || 'Ошибка создания группы');
    } finally {
      setLoading(false);
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
        maxWidth: '500px',
        background: '#2a2b2e',
        borderRadius: '20px',
        overflow: 'hidden',
        boxShadow: '0 20px 60px rgba(0,0,0,0.5)'
      }}>
        {/* Шапка */}
        <div style={{
          padding: '20px',
          background: '#1e1f22',
          borderBottom: '1px solid #3a3b3e',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <h2 style={{ margin: 0, color: '#e4e6eb' }}>
            {step === 1 ? 'Создать группу' : 'Добавить участников'}
          </h2>
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

        {/* Контент */}
        <div style={{ padding: '20px', maxHeight: '60vh', overflow: 'auto' }}>
          {error && (
            <div style={{
              background: '#442222',
              color: '#ff6b6b',
              padding: '12px',
              borderRadius: '10px',
              marginBottom: '20px'
            }}>
              ❌ {error}
            </div>
          )}

          {step === 1 ? (
            // Шаг 1: информация о группе
            <div>
              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', marginBottom: '8px', color: '#9ca3af' }}>
                  Название группы *
                </label>
                <input
                  type="text"
                  value={groupInfo.name}
                  onChange={(e) => setGroupInfo({...groupInfo, name: e.target.value})}
                  placeholder="Например: Друзья, Работа, Семья"
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
                <label style={{ display: 'block', marginBottom: '8px', color: '#9ca3af' }}>
                  Описание (необязательно)
                </label>
                <textarea
                  value={groupInfo.description}
                  onChange={(e) => setGroupInfo({...groupInfo, description: e.target.value})}
                  placeholder="Опишите цель группы..."
                  rows="4"
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
          ) : (
            // Шаг 2: выбор участников
            <div>
              <div style={{ marginBottom: '20px' }}>
                <input
                  type="text"
                  placeholder="🔍 Поиск пользователей..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '12px',
                    background: '#1e1f22',
                    border: '1px solid #3a3b3e',
                    borderRadius: '10px',
                    color: '#e4e6eb',
                    fontSize: '14px',
                    outline: 'none',
                    boxSizing: 'border-box'
                  }}
                />
              </div>

              <div style={{ marginBottom: '15px', color: '#9ca3af', fontSize: '14px' }}>
                Выбрано: {selectedUsers.length}
              </div>

              {filteredUsers.map(otherUser => (
                <div
                  key={otherUser.id}
                  onClick={() => toggleUser(otherUser.id)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    padding: '10px',
                    marginBottom: '5px',
                    background: selectedUsers.includes(otherUser.id) ? '#3a3b3e' : 'transparent',
                    borderRadius: '10px',
                    cursor: 'pointer',
                    transition: 'background 0.2s'
                  }}
                  onMouseEnter={(e) => {
                    if (!selectedUsers.includes(otherUser.id)) {
                      e.currentTarget.style.background = '#333436';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!selectedUsers.includes(otherUser.id)) {
                      e.currentTarget.style.background = 'transparent';
                    }
                  }}
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
                    fontSize: '16px',
                    overflow: 'hidden'
                  }}>
                    {otherUser.avatar ? (
                      <img src={`${API_URL}${otherUser.avatar}`} alt={otherUser.displayName} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    ) : (
                      otherUser.displayName[0].toUpperCase()
                    )}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ color: '#e4e6eb', fontWeight: '500' }}>{otherUser.displayName}</div>
                    <div style={{ color: '#9ca3af', fontSize: '12px' }}>@{otherUser.username}</div>
                  </div>
                  {selectedUsers.includes(otherUser.id) && (
                    <span style={{ color: '#667eea', fontSize: '20px' }}>✓</span>
                  )}
                </div>
              ))}

              {filteredUsers.length === 0 && (
                <div style={{ textAlign: 'center', color: '#9ca3af', padding: '40px' }}>
                  Пользователи не найдены
                </div>
              )}
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
          {step === 2 && (
            <button
              onClick={() => setStep(1)}
              style={{
                padding: '12px 24px',
                background: 'transparent',
                border: '1px solid #3a3b3e',
                borderRadius: '10px',
                color: '#e4e6eb',
                cursor: 'pointer',
                fontSize: '16px'
              }}
            >
              Назад
            </button>
          )}
          <button
            onClick={() => {
              if (step === 1) {
                if (!groupInfo.name.trim()) {
                  setError('Введите название группы');
                  return;
                }
                setStep(2);
              } else {
                handleCreateGroup();
              }
            }}
            disabled={loading}
            style={{
              padding: '12px 24px',
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              border: 'none',
              borderRadius: '10px',
              color: 'white',
              cursor: loading ? 'not-allowed' : 'pointer',
              fontSize: '16px',
              opacity: loading ? 0.7 : 1
            }}
          >
            {loading ? 'Создание...' : step === 1 ? 'Далее' : 'Создать группу'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default CreateGroup;