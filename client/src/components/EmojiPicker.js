import React, { useState, useEffect, useRef } from 'react';
import EmojiPicker from 'emoji-picker-react';

const EmojiPickerComponent = ({ onEmojiSelect }) => {
  const [showPicker, setShowPicker] = useState(false);
  const pickerRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (pickerRef.current && !pickerRef.current.contains(event.target)) {
        setShowPicker(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  return (
    <div style={{ position: 'relative', display: 'inline-block' }} ref={pickerRef}>
      <button
        onClick={() => setShowPicker(!showPicker)}
        style={{
          background: 'transparent',
          border: 'none',
          fontSize: '24px',
          cursor: 'pointer',
          padding: '8px',
          color: 'var(--text-secondary)'
        }}
        title="Добавить эмодзи"
      >
        😊
      </button>
      
      {showPicker && (
        <div style={{
          position: 'absolute',
          bottom: '100%',
          left: '0',
          zIndex: 1000,
          marginBottom: '10px'
        }}>
          <EmojiPicker
            onEmojiClick={(emojiData) => {
              if (emojiData && emojiData.emoji) {
                onEmojiSelect(emojiData.emoji);
                setShowPicker(false);
              }
            }}
            width={300}
            height={400}
          />
        </div>
      )}
    </div>
  );
};

export default EmojiPickerComponent;