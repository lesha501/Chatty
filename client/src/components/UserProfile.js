import React, { useState, useEffect } from 'react';
import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

function UserProfile({ user, currentUser, onClose, onTogglePin }) {
  const [showEmail, setShowEmail] = useState(false);
  const [isPinned, setIsPinned] = useState(false);
  const isCurrentUser = user.id === currentUser.id;

  // Проверяем, закреплён ли пользователь при загрузке
  useEffect(() => {
    const pinnedUsers = JSON.parse(localStorage.getItem('pinnedUsers') || '[]');
    setIsPinned(pinnedUsers.includes(user.id));
  }, [user.id]);

  const handleTogglePin = () => {
    const pinnedUsers = JSON.parse(localStorage.getItem('pinnedUsers') || '[]');
    let newPinned;
    
    if (isPinned) {
      newPinned = pinnedUsers.filter(id => id !== user.id);
    } else {
      newPinned = [...pinnedUsers, user.id];
    }
    
    localStorage.setItem('pinnedUsers', JSON.stringify(newPinned));
    setIsPinned(!isPinned);
    
    // Вызываем колбэк для обновления списка в App.js
    if (onTogglePin) {
      onTogglePin();
    }
  };

  const getAvatarUrl = (avatarPath) => {
    if (!avatarPath) return null;
    if (avatarPath.startsWith('http')) return avatarPath;
    return `${API_URL}${avatarPath}`;
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'не указана';
    const date = new Date(dateString);
    return date.toLocaleDateString('ru-RU', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });
  };

  const calculateAge = (birthDate) => {
    if (!birthDate) return null;
    const today = new Date();
    const birth = new Date(birthDate);
    let age = today.getFullYear() - birth.getFullYear();
    const m = today.getMonth() - birth.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) {
      age--;
    }
    return age;
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
        maxWidth: '400px',
        background: 'var(--bg-secondary)',
        borderRadius: '20px',
        overflow: 'hidden',
        boxShadow: '0 20px 60px rgba(0,0,0,0.5)'
      }}>
        {/* Шапка */}
        <div style={{
          padding: '20px',
          background: 'var(--bg-tertiary)',
          borderBottom: '1px solid var(--border-color)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <h2 style={{ margin: 0, color: 'var(--text-primary)' }}>
            {isCurrentUser ? 'Мой профиль' : 'Профиль'}
          </h2>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--text-secondary)',
              fontSize: '24px',
              cursor: 'pointer'
            }}
          >
            ✕
          </button>
        </div>

        {/* Контент */}
        <div style={{ padding: '30px 20px' }}>
          {/* Аватарка и основная информация */}
          <div style={{ display: 'flex', gap: '20px', marginBottom: '30px' }}>
            {/* Аватарка слева */}
            <div style={{
              width: '100px',
              height: '100px',
              borderRadius: '50%',
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              overflow: 'hidden',
              border: '3px solid var(--accent-color)',
              flexShrink: 0
            }}>
              {user.avatar ? (
                <img 
                  src={getAvatarUrl(user.avatar)} 
                  alt={user.displayName}
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
            </div>

            {/* Имя и статус справа */}
            <div style={{ flex: 1 }}>
              <h2 style={{ 
                color: 'var(--text-primary)', 
                margin: '0 0 5px 0',
                fontSize: '24px'
              }}>
                {user.displayName}
              </h2>
              <p style={{ 
                color: 'var(--text-secondary)', 
                margin: '0 0 10px 0',
                fontSize: '16px'
              }}>
                @{user.username}
              </p>
              <div style={{
                display: 'inline-block',
                padding: '4px 12px',
                borderRadius: '20px',
                background: user.online ? 'rgba(76, 175, 80, 0.2)' : 'rgba(158, 158, 158, 0.2)',
                color: user.online ? '#4caf50' : '#9e9e9e',
                fontSize: '14px'
              }}>
                {user.online ? '🟢 В сети' : '⚫ Не в сети'}
              </div>
            </div>
          </div>

          {/* Информационные блоки */}
          <div style={{
            background: 'var(--bg-tertiary)',
            borderRadius: '10px',
            padding: '15px',
            marginBottom: '20px'
          }}>
            {/* О себе */}
            <div style={{ marginBottom: '20px' }}>
              <div style={{ 
                color: 'var(--text-secondary)', 
                fontSize: '12px', 
                marginBottom: '5px',
                textTransform: 'uppercase',
                letterSpacing: '0.5px'
              }}>
                О себе
              </div>
              <div style={{ 
                color: 'var(--text-primary)',
                fontSize: '15px',
                lineHeight: '1.5'
              }}>
                {user.bio || 'Пользователь ничего не рассказал о себе'}
              </div>
            </div>

            {/* Дата рождения и возраст */}
            <div style={{ marginBottom: '20px' }}>
              <div style={{ 
                color: 'var(--text-secondary)', 
                fontSize: '12px', 
                marginBottom: '5px',
                textTransform: 'uppercase',
                letterSpacing: '0.5px'
              }}>
                Дата рождения
              </div>
              <div style={{ 
                color: 'var(--text-primary)',
                fontSize: '15px'
              }}>
                {user.birthDate ? (
                  <>
                    {formatDate(user.birthDate)}
                    {!isCurrentUser && calculateAge(user.birthDate) && (
                      <span style={{ 
                        color: 'var(--text-secondary)', 
                        marginLeft: '10px',
                        fontSize: '14px'
                      }}>
                        ({calculateAge(user.birthDate)} лет)
                      </span>
                    )}
                  </>
                ) : 'не указана'}
              </div>
            </div>

            {/* Email (скрыт по умолчанию для чужих, для себя показываем сразу) */}
            <div>
              <div style={{ 
                color: 'var(--text-secondary)', 
                fontSize: '12px', 
                marginBottom: '5px',
                textTransform: 'uppercase',
                letterSpacing: '0.5px'
              }}>
                Контактный email
              </div>
              {isCurrentUser ? (
                <div style={{ 
                  color: 'var(--text-primary)',
                  fontSize: '15px'
                }}>
                  {user.email}
                </div>
              ) : showEmail ? (
                <div style={{ 
                  color: 'var(--text-primary)',
                  fontSize: '15px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center'
                }}>
                  <span>{user.email}</span>
                  <button
                    onClick={() => setShowEmail(false)}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: 'var(--text-secondary)',
                      fontSize: '14px',
                      cursor: 'pointer',
                      textDecoration: 'underline'
                    }}
                  >
                    скрыть
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setShowEmail(true)}
                  style={{
                    background: 'none',
                    border: '1px solid var(--border-color)',
                    borderRadius: '8px',
                    padding: '8px 12px',
                    color: 'var(--text-secondary)',
                    fontSize: '14px',
                    cursor: 'pointer',
                    width: '100%',
                    textAlign: 'left'
                  }}
                  onMouseEnter={(e) => {
                    e.target.style.background = 'var(--bg-hover)';
                  }}
                  onMouseLeave={(e) => {
                    e.target.style.background = 'none';
                  }}
                >
                  👁️ Показать email
                </button>
              )}
            </div>
          </div>

          {/* Кнопки действий */}
          <div style={{ display: 'flex', gap: '10px', marginBottom: '10px' }}>
            {/* Кнопка закрепления (только для чужих профилей) */}
            {!isCurrentUser && (
              <button
                onClick={handleTogglePin}
                style={{
                  flex: 1,
                  padding: '12px',
                  background: isPinned ? 'rgba(255, 193, 7, 0.2)' : 'transparent',
                  border: `2px solid ${isPinned ? '#ffc107' : 'var(--border-color)'}`,
                  borderRadius: '10px',
                  color: isPinned ? '#ffc107' : 'var(--text-primary)',
                  fontSize: '16px',
                  cursor: 'pointer',
                  transition: 'all 0.3s',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px'
                }}
                onMouseEnter={(e) => {
                  if (!isPinned) {
                    e.target.style.background = 'var(--bg-hover)';
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isPinned) {
                    e.target.style.background = 'transparent';
                  }
                }}
              >
                📌 {isPinned ? 'Открепить' : 'Закрепить'}
              </button>
            )}
            
            {/* Кнопка закрытия */}
            <button
              onClick={onClose}
              style={{
                flex: isCurrentUser ? 1 : '0 0 auto',
                padding: isCurrentUser ? '12px' : '12px 24px',
                background: 'transparent',
                border: '1px solid var(--border-color)',
                borderRadius: '10px',
                color: 'var(--text-primary)',
                fontSize: '16px',
                cursor: 'pointer',
                transition: 'all 0.3s'
              }}
              onMouseEnter={(e) => {
                e.target.style.background = 'var(--bg-hover)';
              }}
              onMouseLeave={(e) => {
                e.target.style.background = 'transparent';
              }}
            >
              Закрыть
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default UserProfile;