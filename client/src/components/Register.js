import React, { useState } from 'react';
import axios from 'axios';

function Register({ onRegister }) {
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    displayName: '',
    username: '',
    phone: ''
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    
    try {
      const res = await axios.post('/api/register', formData);
      onRegister(res.data.user, res.data.token);
    } catch (err) {
      setError(err.response?.data?.error || 'Ошибка регистрации');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white p-6 rounded-lg shadow-md">
      <h2 className="text-2xl font-semibold mb-4">Регистрация</h2>
      
      {error && (
        <div className="bg-red-100 text-red-700 p-3 rounded mb-4">
          {error}
        </div>
      )}
      
      <form onSubmit={handleSubmit}>
        <div className="mb-4">
          <label className="block text-sm font-medium mb-1">Email *</label>
          <input
            type="email"
            required
            className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500"
            value={formData.email}
            onChange={(e) => setFormData({...formData, email: e.target.value})}
          />
        </div>
        
        <div className="mb-4">
          <label className="block text-sm font-medium mb-1">Пароль *</label>
          <input
            type="password"
            required
            minLength="6"
            className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500"
            value={formData.password}
            onChange={(e) => setFormData({...formData, password: e.target.value})}
          />
        </div>
        
        <div className="mb-4">
          <label className="block text-sm font-medium mb-1">Имя (отображается) *</label>
          <input
            type="text"
            required
            className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500"
            value={formData.displayName}
            onChange={(e) => setFormData({...formData, displayName: e.target.value})}
          />
        </div>
        
        <div className="mb-4">
          <label className="block text-sm font-medium mb-1">Username (уникальный) *</label>
          <input
            type="text"
            required
            className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500"
            value={formData.username}
            onChange={(e) => setFormData({...formData, username: e.target.value})}
          />
          <p className="text-xs text-gray-500 mt-1">Только латиница и цифры</p>
        </div>
        
        <div className="mb-6">
          <label className="block text-sm font-medium mb-1">Телефон (необязательно)</label>
          <input
            type="tel"
            className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500"
            value={formData.phone}
            onChange={(e) => setFormData({...formData, phone: e.target.value})}
          />
        </div>
        
        <button
          type="submit"
          disabled={loading}
          className="w-full bg-green-600 text-white py-2 rounded hover:bg-green-700 disabled:opacity-50"
        >
          {loading ? 'Загрузка...' : 'Зарегистрироваться'}
        </button>
      </form>
    </div>
  );
}

export default Register;