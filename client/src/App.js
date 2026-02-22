import React, { useState } from 'react';
import Settings from './components/Settings';
import './index.css';

function App() {
  const [showSettings, setShowSettings] = useState(false);

  // Тестовый пользователь
  const user = {
    id: 1,
    displayName: 'Тест',
    username: 'test',
    avatar: '',
    theme: 'dark',
    notifications: 1,
    soundEnabled: 1
  };

  console.log('Рендер App, showSettings =', showSettings);

  return (
    <div style={{ padding: '50px' }}>
      <h1>Chatty (тестовая версия)</h1>
      <button 
        onClick={() => {
          console.log('Кнопка нажата!');
          setShowSettings(true);
        }}
        style={{
          padding: '10px 20px',
          fontSize: '16px',
          background: 'blue',
          color: 'white',
          border: 'none',
          borderRadius: '5px',
          cursor: 'pointer'
        }}
      >
        Открыть настройки
      </button>

      {showSettings && (
        <Settings 
          user={user}
          onClose={() => {
            console.log('Закрытие настроек');
            setShowSettings(false);
          }}
          onUpdate={(u) => console.log('Обновление:', u)}
          applyTheme={(t) => console.log('Тема:', t)}
        />
      )}
    </div>
  );
}

export default App;