import React, { useState, useEffect } from 'react';
import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

function GroupSettings({ conversation, currentUser, onClose, onUpdate }) {
  const [activeTab, setActiveTab] = useState('info');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [members, setMembers] = useState([]);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isCreator, setIsCreator] = useState(false);
  
  const [groupInfo, setGroupInfo] = useState({
    name: conversation.name || '',
    description: conversation.description || '',
    avatar: conversation.avatar || ''
  });

  const [avatarFile, setAvatarFile] = useState(null);
  const [avatarPreview, setAvatarPreview] = useState(conversation.avatar ? 
    (conversation.avatar.startsWith('http') ? conversation.avatar : `${API_URL}${conversation.avatar}`) : null);

  const [newMemberSearch, setNewMemberSearch] = useState('');
  const [searchResults, setSearchResults] = useState([]);

  useEffect(() => {
    fetchMembers();
    checkPermissions();
  }, []);

  const checkPermissions = () => {
    setIsAdmin(members.some(m => m.id === currentUser.id && m.isAdmin));
    setIsCreator(conversation.createdBy === currentUser.id);
  };

  const fetchMembers = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get(`${API_URL}/api/groups/${conversation.id}/members`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setMembers(res.data);
    } catch (err) {
      console.error('Ошибка загрузки участников:', err);
    }
  };

  const searchUsers = async (query) => {
    if (query.length < 2) {
      setSearchResults([]);
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const res = await axios.get(`${API_URL}/api/search?query=${query}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      const memberIds = members.map(m => m.id);
      const filtered = res.data.filter(u => !memberIds.includes(u.id));
      setSearchResults(filtered);
    } catch (err) {
      console.error('Ошибка поиска:', err);
    }
  };

  const addMember = async (userId) => {
    try {
      const token = localStorage.getItem('token');
      await axios.post(`${API_URL}/api/groups/${conversation.id}/members`, 
        { userId },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      fetchMembers();
      setSearchResults([]);
      setNewMemberSearch('');
    } catch (err) {
      setError(err.response?.data?.error || 'Ошибка добавления участника');
    }
  };

  const removeMember = async (userId) => {
    if (!window.confirm('Удалить участника из группы?')) return;

    try {
      const token = localStorage.getItem('token');
      await axios.delete(`${API_URL}/api/groups/${conversation.id}/members/${userId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      fetchMembers();
    } catch (err) {
      setError(err.response?.data?.error || 'Ошибка удаления участника');
    }
  };

  const toggleAdmin = async (userId, isCurrentlyAdmin) => {
    try {
      const token = localStorage.getItem('token');
      if (isCurrentlyAdmin) {
        await axios.delete(`${API_URL}/api/groups/${conversation.id}/admins/${userId}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
      } else {
        await axios.post(`${API_URL}/api/groups/${conversation.id}/admins`, 
          { userId },
          { headers: { Authorization: `Bearer ${token}` } }
        );
      }
      fetchMembers();
    } catch (err) {
      setError(err.response?.data?.error || 'Ошибка изменения прав');
    }
  };

  const uploadAvatar = async () => {
    if (!avatarFile) return null;
    
    const formData = new FormData();
    formData.append('avatar', avatarFile);
    
    try {
      const token = localStorage.getItem('token');
      const res = await axios.post(`${API_URL}/api/groups/${conversation.id}/avatar`, formData, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'multipart/form-data'
        }
      });
      return res.data.avatar;
    } catch (err) {
      console.error('Ошибка загрузки аватарки группы:', err);
      throw err;
    }
  };

  const updateGroupInfo = async () => {
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const token = localStorage.getItem('token');
      
      let avatarUrl = groupInfo.avatar;
      if (avatarFile) {
        avatarUrl = await uploadAvatar();
      }
      
      await axios.put(`${API_URL}/api/groups/${conversation.id}`, 
        { ...groupInfo, avatar: avatarUrl },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setSuccess('Информация обновлена');
      onUpdate();
    } catch (err) {
      setError(err.response?.data?.error || 'Ошибка обновления');
    } finally {
      setLoading(false);
    }
  };

  const handleAvatarChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setAvatarFile(file);
      setAvatarPreview(URL.createObjectURL(file));
    }
  };

  const getAvatarUrl = (avatarPath) => {
    if (!avatarPath) return null;
    if (avatarPath.startsWith('http')) return avatarPath;
    return `${API_URL}${avatarPath}`;
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
        {/* Шапка */}
        <div style={{
          padding: '20px',
          background: '#1e1f22',
          borderBottom: '1px solid #3a3b3e',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <h2 style={{ margin: 0, color: '#e4e6eb' }}>Управление группой</h2>
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
            onClick={() => setActiveTab('info')}
            style={{
              padding: '15px 20px',
              background: 'none',
              border: 'none',
              color: activeTab === 'info' ? '#667eea' : '#9ca3af',
              borderBottom: activeTab === 'info' ? '2px solid #667eea' : '2px solid transparent',
              cursor: 'pointer',
              fontSize: '16px'
            }}
          >
            Информация
          </button>
          <button
            onClick={() => setActiveTab('members')}
            style={{
              padding: '15px 20px',
              background: 'none',
              border: 'none',
              color: activeTab === 'members' ? '#667eea' : '#9ca3af',
              borderBottom: activeTab === 'members' ? '2px solid #667eea' : '2px solid transparent',
              cursor: 'pointer',
              fontSize: '16px'
            }}
          >
            Участники ({members.length})
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

          {activeTab === 'info' && (
            <div>
              {/* Аватарка группы */}
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
                  overflow: 'hidden',
                  marginBottom: '15px',
                  cursor: isAdmin ? 'pointer' : 'default',
                  position: 'relative'
                }}>
                  {avatarPreview ? (
                    <img 
                      src={avatarPreview} 
                      alt="group avatar" 
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    />
                  ) : (
                    <div style={{
                      width: '100%',
                      height: '100%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '48px',
                      color: 'white'
                    }}>
                      {groupInfo.name[0]?.toUpperCase()}
                    </div>
                  )}
                  {isAdmin && (
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
                  )}
                </div>
                {isAdmin && (
                  <p style={{ color: '#9ca3af', fontSize: '14px', margin: 0 }}>
                    Нажмите на аватарку, чтобы изменить
                  </p>
                )}
              </div>

              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', marginBottom: '8px', color: '#9ca3af' }}>
                  Название группы
                </label>
                <input
                  type="text"
                  value={groupInfo.name}
                  onChange={(e) => setGroupInfo({...groupInfo, name: e.target.value})}
                  disabled={!isAdmin}
                  style={{
                    width: '100%',
                    padding: '12px',
                    background: isAdmin ? '#1e1f22' : '#2a2b2e',
                    border: '1px solid #3a3b3e',
                    borderRadius: '10px',
                    color: '#e4e6eb',
                    fontSize: '16px',
                    boxSizing: 'border-box',
                    opacity: isAdmin ? 1 : 0.7
                  }}
                />
              </div>

              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', marginBottom: '8px', color: '#9ca3af' }}>
                  Описание
                </label>
                <textarea
                  value={groupInfo.description}
                  onChange={(e) => setGroupInfo({...groupInfo, description: e.target.value})}
                  disabled={!isAdmin}
                  rows="4"
                  style={{
                    width: '100%',
                    padding: '12px',
                    background: isAdmin ? '#1e1f22' : '#2a2b2e',
                    border: '1px solid #3a3b3e',
                    borderRadius: '10px',
                    color: '#e4e6eb',
                    fontSize: '16px',
                    boxSizing: 'border-box',
                    resize: 'vertical',
                    opacity: isAdmin ? 1 : 0.7
                  }}
                />
              </div>

              {isAdmin && (
                <button
                  onClick={updateGroupInfo}
                  disabled={loading}
                  style={{
                    width: '100%',
                    padding: '12px',
                    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                    border: 'none',
                    borderRadius: '10px',
                    color: 'white',
                    fontSize: '16px',
                    cursor: loading ? 'not-allowed' : 'pointer',
                    opacity: loading ? 0.7 : 1
                  }}
                >
                  {loading ? 'Сохранение...' : 'Сохранить изменения'}
                </button>
              )}
            </div>
          )}

          {activeTab === 'members' && (
            <div>
              {/* Добавление новых участников (только для админов) */}
              {isAdmin && (
                <div style={{ marginBottom: '30px' }}>
                  <h3 style={{ color: '#e4e6eb', margin: '0 0 15px 0' }}>Добавить участника</h3>
                  <input
                    type="text"
                    placeholder="🔍 Поиск пользователей..."
                    value={newMemberSearch}
                    onChange={(e) => {
                      setNewMemberSearch(e.target.value);
                      searchUsers(e.target.value);
                    }}
                    style={{
                      width: '100%',
                      padding: '12px',
                      background: '#1e1f22',
                      border: '1px solid #3a3b3e',
                      borderRadius: '10px',
                      color: '#e4e6eb',
                      fontSize: '14px',
                      boxSizing: 'border-box'
                    }}
                  />

                  {searchResults.length > 0 && (
                    <div style={{
                      marginTop: '10px',
                      background: '#1e1f22',
                      borderRadius: '10px',
                      padding: '10px'
                    }}>
                      {searchResults.map(user => (
                        <div
                          key={user.id}
                          onClick={() => addMember(user.id)}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '10px',
                            padding: '8px',
                            cursor: 'pointer',
                            borderRadius: '8px'
                          }}
                          onMouseEnter={(e) => e.currentTarget.style.background = '#333436'}
                          onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                        >
                          <div style={{
                            width: '32px',
                            height: '32px',
                            borderRadius: '50%',
                            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: 'white',
                            overflow: 'hidden'
                          }}>
                            {user.avatar ? (
                              <img src={`${API_URL}${user.avatar}`} alt={user.displayName} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                            ) : (
                              user.displayName[0].toUpperCase()
                            )}
                          </div>
                          <div style={{ flex: 1 }}>
                            <div style={{ color: '#e4e6eb' }}>{user.displayName}</div>
                            <div style={{ color: '#9ca3af', fontSize: '12px' }}>@{user.username}</div>
                          </div>
                          <span style={{ color: '#667eea' }}>➕</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Список участников */}
              <h3 style={{ color: '#e4e6eb', margin: '0 0 15px 0' }}>Участники</h3>
              {members.map(member => (
                <div
                  key={member.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    padding: '10px',
                    marginBottom: '5px',
                    background: '#1e1f22',
                    borderRadius: '10px'
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
                    overflow: 'hidden'
                  }}>
                    {member.avatar ? (
                      <img src={`${API_URL}${member.avatar}`} alt={member.displayName} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    ) : (
                      member.displayName[0].toUpperCase()
                    )}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ color: '#e4e6eb', fontWeight: '500' }}>
                      {member.displayName}
                      {member.id === conversation.createdBy && (
                        <span style={{ marginLeft: '8px', color: '#ffc107', fontSize: '12px' }}>👑 создатель</span>
                      )}
                      {member.isAdmin && member.id !== conversation.createdBy && (
                        <span style={{ marginLeft: '8px', color: '#667eea', fontSize: '12px' }}>🛡️ админ</span>
                      )}
                    </div>
                    <div style={{ color: '#9ca3af', fontSize: '12px' }}>
                      @{member.username}
                      {member.online && <span style={{ marginLeft: '8px', color: '#4caf50' }}>● онлайн</span>}
                    </div>
                  </div>

                  {/* Кнопки действий для админов */}
                  {isAdmin && member.id !== currentUser.id && member.id !== conversation.createdBy && (
                    <div style={{ display: 'flex', gap: '5px' }}>
                      <button
                        onClick={() => toggleAdmin(member.id, member.isAdmin)}
                        style={{
                          padding: '5px 10px',
                          background: 'transparent',
                          border: '1px solid #667eea',
                          borderRadius: '5px',
                          color: '#667eea',
                          fontSize: '12px',
                          cursor: 'pointer'
                        }}
                      >
                        {member.isAdmin ? 'Снять админа' : 'Сделать админом'}
                      </button>
                      <button
                        onClick={() => removeMember(member.id)}
                        style={{
                          padding: '5px 10px',
                          background: 'transparent',
                          border: '1px solid #ff6b6b',
                          borderRadius: '5px',
                          color: '#ff6b6b',
                          fontSize: '12px',
                          cursor: 'pointer'
                        }}
                      >
                        Удалить
                      </button>
                    </div>
                  )}

                  {/* Для создателя показываем только удаление других админов */}
                  {isCreator && member.isAdmin && member.id !== currentUser.id && (
                    <button
                      onClick={() => toggleAdmin(member.id, true)}
                      style={{
                        padding: '5px 10px',
                        background: 'transparent',
                        border: '1px solid #ff6b6b',
                        borderRadius: '5px',
                        color: '#ff6b6b',
                        fontSize: '12px',
                        cursor: 'pointer'
                      }}
                    >
                      Снять админа
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default GroupSettings;