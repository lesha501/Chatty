import React, { useState } from 'react';
import axios from 'axios';

function Profile({ user, token, onClose, onUpdate }) {
  const [formData, setFormData] = useState({
    displayName: user.displayName || '',
    username: user.username || '',
    phone: user.phone || '',
    bio: user.bio || ''
  });
  const [avatar, setAvatar] = useState(null);
  const [preview, setPreview] = useState(user.avatar);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleAvatarChange = (e) => {
    const file = e.target.files[0];
    setAvatar(file);
    setPreview(URL.createObjectURL(file));
  };

  const uploadAvatar = async () => {
    if (!avatar) return;
    
    const formData = new FormData();
    formData.append('avatar', avatar);
    
    try {
      const res = await axios.post('/api/upload-avatar', formData, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'multipart/form-data'
        }
      });
      return res.data.avatar;
    } catch (err) {
      throw err;
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');
    
    try {
      let avatarUrl = user.avatar;
      if (avatar) {
        avatarUrl = await uploadAvatar();
      }
      
      const res = await axios.put('/api/profile', formData, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      const updatedUser = { ...res.data, avatar: avatarUrl };
      localStorage.setItem('user', JSON.stringify(updatedUser));
      onUpdate(updatedUser);
      setSuccess('Профиль обновлен');
    } catch (err) {
      setError(err.response?.data?.error || 'Ошибка обновления');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 py-8">
      <div className="max-w-2xl mx-auto bg-white rounded-lg shadow-md p-6">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold">Настройки профиля</h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700"
          >
            ✕
          </button>
        </div>
        
        {error && (
          <div className="bg-red-100 text-red-700 p-3 rounded mb-4">
            {error}
          </div>
        )}
        
        {success && (
          <div className="bg-green-100 text-green-700 p-3 rounded mb-4">
            {success}
          </div>
        )}
        
        <form onSubmit={handleSubmit}>
          <div className="mb-6 flex flex-col items-center">
            <div className="w-32 h-32 rounded-full overflow-hidden bg-gray-200 mb-4">
              {preview ? (
                <img src={preview} alt="Avatar" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-gray-400">
                  Нет фото
                </div>
              )}
            </div>
            <input
              type="file"
              accept="image/*"
              onChange={handleAvatarChange}
              className="text-sm"
            />
          </div>
          
          <div className="mb-4">
            <label className="block text-sm font-medium mb-1">Имя</label>
            <input
              type="text"
              className="w-full p-2 border rounded"
              value={formData.displayName}
              onChange={(e) => setFormData({...formData, displayName: e.target.value})}
            />
          </div>
          
          <div className="mb-4">
            <label className="block text-sm font-medium mb-1">Username</label>
            <input
              type="text"
              className="w-full p-2 border rounded"
              value={formData.username}
              onChange={(e) => setFormData({...formData, username: e.target.value})}
            />
          </div>
          
          <div className="mb-4">
            <label className="block text-sm font-medium mb-1">Телефон</label>
            <input
              type="tel"
              className="w-full p-2 border rounded"
              value={formData.phone}
              onChange={(e) => setFormData({...formData, phone: e.target.value})}
            />
          </div>
          
          <div className="mb-6">
            <label className="block text-sm font-medium mb-1">О себе</label>
            <textarea
              className="w-full p-2 border rounded"
              rows="3"
              value={formData.bio}
              onChange={(e) => setFormData({...formData, bio: e.target.value})}
            />
          </div>
          
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? 'Сохранение...' : 'Сохранить'}
          </button>
        </form>
      </div>
    </div>
  );
}

export default Profile;