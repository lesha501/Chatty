import React, { useState } from 'react';
import axios from 'axios';

function ChatList({ 
  conversations, 
  currentUser, 
  selectedConversation, 
  onSelectConversation, 
  onLogout,
  onProfileClick 
}) {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);

  const handleSearch = async (query) => {
    setSearchQuery(query);
    if (query.length < 2) {
      setSearchResults([]);
      return;
    }
    
    setSearching(true);
    try {
      const res = await axios.get(`/api/search?query=${query}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      setSearchResults(res.data);
    } catch (error) {
      console.error('Ошибка поиска:', error);
    } finally {
      setSearching(false);
    }
  };

  const startConversation = async (userId) => {
    try {
      const res = await axios.post('/api/conversations', 
        { userId },
        { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } }
      );
      // Обновляем список чатов
      window.location.reload();
    } catch (error) {
      console.error('Ошибка создания чата:', error);
    }
  };

  const formatTime = (date) => {
    if (!date) return '';
    const d = new Date(date);
    const now = new Date();
    const diff = now - d;
    
    // Сегодня
    if (diff < 24 * 60 * 60 * 1000 && d.getDate() === now.getDate()) {
      return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }
    // Вчера
    if (diff < 48 * 60 * 60 * 1000 && d.getDate() === now.getDate() - 1) {
      return 'Вчера';
    }
    // Старше
    return d.toLocaleDateString();
  };

  const getLastMessageText = (conversation) => {
    if (!conversation.lastMessage) return 'Нет сообщений';
    if (conversation.lastMessage.sender === currentUser.id) {
      return `Вы: ${conversation.lastMessage.text}`;
    }
    return conversation.lastMessage.text;
  };

  return (
    <div className="w-80 bg-white border-r flex flex-col h-full">
      {/* Header с профилем */}
      <div className="p-4 border-b">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-full bg-blue-500 overflow-hidden cursor-pointer" onClick={onProfileClick}>
              {currentUser?.avatar ? (
                <img src={currentUser.avatar} alt={currentUser.displayName} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-white font-bold">
                  {currentUser?.displayName?.[0] || 'U'}
                </div>
              )}
            </div>
            <div>
              <h3 className="font-semibold">{currentUser?.displayName}</h3>
              <p className="text-xs text-gray-500">@{currentUser?.username}</p>
            </div>
          </div>
          <button
            onClick={onLogout}
            className="text-gray-500 hover:text-red-600"
            title="Выйти"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
          </button>
        </div>

        {/* Поиск */}
        <div className="mt-4">
          <input
            type="text"
            placeholder="Поиск по username или имени..."
            value={searchQuery}
            onChange={(e) => handleSearch(e.target.value)}
            className="w-full p-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* Результаты поиска */}
        {searchResults.length > 0 && (
          <div className="mt-2 border rounded-lg max-h-60 overflow-y-auto">
            {searchResults.map(user => (
              <div
                key={user._id}
                onClick={() => startConversation(user._id)}
                className="p-2 hover:bg-gray-100 cursor-pointer flex items-center space-x-2"
              >
                <div className="w-8 h-8 rounded-full bg-gray-300 overflow-hidden">
                  {user.avatar ? (
                    <img src={user.avatar} alt={user.displayName} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-gray-400 text-white text-sm">
                      {user.displayName?.[0] || 'U'}
                    </div>
                  )}
                </div>
                <div>
                  <p className="font-medium">{user.displayName}</p>
                  <p className="text-xs text-gray-500">@{user.username}</p>
                </div>
              </div>
            ))}
          </div>
        )}
        {searching && <p className="text-sm text-gray-500 mt-2">Поиск...</p>}
      </div>

      {/* Список чатов */}
      <div className="flex-1 overflow-y-auto">
        {conversations.length === 0 ? (
          <div className="p-4 text-center text-gray-500">
            <p>У вас пока нет чатов</p>
            <p className="text-sm mt-2">Найдите пользователя через поиск</p>
          </div>
        ) : (
          conversations.map(conv => {
            const otherUser = conv.participants?.find(p => p._id !== currentUser.id);
            if (!otherUser) return null;
            
            return (
              <div
                key={conv._id}
                onClick={() => onSelectConversation(conv)}
                className={`p-3 hover:bg-gray-100 cursor-pointer border-b ${
                  selectedConversation?._id === conv._id ? 'bg-blue-50' : ''
                }`}
              >
                <div className="flex items-center space-x-3">
                  <div className="relative">
                    <div className="w-12 h-12 rounded-full bg-gray-300 overflow-hidden">
                      {otherUser.avatar ? (
                        <img src={otherUser.avatar} alt={otherUser.displayName} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-blue-500 text-white font-bold">
                          {otherUser.displayName?.[0] || '?'}
                        </div>
                      )}
                    </div>
                    {otherUser.online && (
                      <span className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-white rounded-full"></span>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-baseline">
                      <h4 className="font-semibold truncate">{otherUser.displayName}</h4>
                      <span className="text-xs text-gray-500">
                        {formatTime(conv.updatedAt)}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600 truncate">
                      {getLastMessageText(conv)}
                    </p>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

export default ChatList;