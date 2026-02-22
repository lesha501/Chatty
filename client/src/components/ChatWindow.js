import React, { useState, useRef, useEffect } from 'react';

function ChatWindow({ conversation, messages, currentUser, onSendMessage, onTyping }) {
  const [newMessage, setNewMessage] = useState('');
  const [typingTimeout, setTypingTimeout] = useState(null);
  const [isOtherTyping, setIsOtherTyping] = useState(false);
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    // Слушаем событие печатания
    const handleTyping = (data) => {
      if (data.userId !== currentUser.id) {
        setIsOtherTyping(true);
        setTimeout(() => setIsOtherTyping(false), 1500);
      }
    };

    window.addEventListener('typing', handleTyping);
    return () => window.removeEventListener('typing', handleTyping);
  }, [currentUser.id]);

  if (!conversation) {
    return (
      <div className="flex-1 flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <p className="text-gray-500 mb-2">Выберите чат, чтобы начать общение</p>
          <p className="text-sm text-gray-400">Или найдите пользователя через поиск</p>
        </div>
      </div>
    );
  }

  const otherUser = conversation.participants?.find(p => p._id !== currentUser.id);

  const handleSend = (e) => {
    e.preventDefault();
    if (newMessage.trim()) {
      onSendMessage(newMessage);
      setNewMessage('');
    }
  };

  const handleKeyPress = () => {
    onTyping(true);
    
    if (typingTimeout) clearTimeout(typingTimeout);
    
    setTypingTimeout(setTimeout(() => {
      onTyping(false);
    }, 1000));
  };

  const formatTime = (date) => {
    if (!date) return '';
    const d = new Date(date);
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-gray-100">
      {/* Header чата */}
      <div className="bg-white border-b p-4 flex items-center shadow-sm">
        <div className="w-10 h-10 rounded-full bg-gradient-to-r from-blue-500 to-blue-600 mr-3 overflow-hidden flex-shrink-0">
          {otherUser?.avatar ? (
            <img src={otherUser.avatar} alt={otherUser.displayName} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-white font-bold text-lg">
              {otherUser?.displayName?.[0] || '?'}
            </div>
          )}
        </div>
        <div className="flex-1">
          <h3 className="font-semibold text-gray-800">{otherUser?.displayName}</h3>
          <p className="text-xs">
            {otherUser?.online ? (
              <span className="text-green-600">в сети</span>
            ) : otherUser?.lastSeen ? (
              <span className="text-gray-500">
                был(а) {new Date(otherUser.lastSeen).toLocaleString()}
              </span>
            ) : (
              <span className="text-gray-500">не в сети</span>
            )}
          </p>
        </div>
      </div>

      {/* Сообщения */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {messages.map((msg, index) => {
          const isMe = msg.sender?._id === currentUser.id;
          
          return (
            <div
              key={index}
              className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-xs lg:max-w-md xl:max-w-lg rounded-2xl px-4 py-2 ${
                  isMe
                    ? 'bg-blue-600 text-white rounded-br-none'
                    : 'bg-white text-gray-800 rounded-bl-none shadow-sm'
                }`}
              >
                {!isMe && (
                  <p className="text-xs font-semibold text-blue-600 mb-1">
                    {msg.sender?.displayName}
                  </p>
                )}
                <p className="text-sm break-words">{msg.text}</p>
                <div className={`flex items-center justify-end space-x-1 mt-1 ${
                  isMe ? 'text-blue-200' : 'text-gray-400'
                }`}>
                  <span className="text-xs">
                    {formatTime(msg.createdAt)}
                  </span>
                  {isMe && (
                    <span className="text-xs">
                      {msg.read ? '✓✓' : '✓'}
                    </span>
                  )}
                </div>
              </div>
            </div>
          );
        })}
        
        {isOtherTyping && (
          <div className="flex justify-start">
            <div className="bg-white rounded-2xl rounded-bl-none px-4 py-2 shadow-sm">
              <div className="flex space-x-1">
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
              </div>
            </div>
          </div>
        )}
        
        <div ref={messagesEndRef} />
      </div>

      {/* Поле ввода */}
      <form onSubmit={handleSend} className="bg-white border-t p-4">
        <div className="flex items-center space-x-2">
          <input
            type="text"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            onKeyDown={handleKeyPress}
            placeholder="Напишите сообщение..."
            className="flex-1 p-3 border rounded-full focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
          <button
            type="submit"
            disabled={!newMessage.trim()}
            className="bg-blue-600 text-white p-3 rounded-full hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors w-12 h-12 flex items-center justify-center"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
            </svg>
          </button>
        </div>
      </form>
    </div>
  );
}

export default ChatWindow;