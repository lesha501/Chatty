import React, { useRef } from 'react';
import axios from 'axios';

function ImageUpload({ onImageSelect }) {
  const fileInputRef = useRef(null);

  const handleImageClick = () => {
    fileInputRef.current.click();
  };

  const handleImageChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Превью для локального отображения
    const previewUrl = URL.createObjectURL(file);
    
    // Отправляем на сервер
    const formData = new FormData();
    formData.append('image', file);

    try {
      const token = localStorage.getItem('token');
      const res = await axios.post('http://localhost:5000/api/upload-image', formData, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'multipart/form-data'
        }
      });
      
      // Вызываем колбэк с URL картинки
      onImageSelect(res.data.imageUrl);
    } catch (err) {
      console.error('Ошибка загрузки изображения:', err);
    }
  };

  return (
    <>
      <button
        onClick={handleImageClick}
        style={{
          background: 'transparent',
          border: 'none',
          fontSize: '24px',
          cursor: 'pointer',
          padding: '8px'
        }}
      >
        📷
      </button>
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleImageChange}
        accept="image/*"
        style={{ display: 'none' }}
      />
    </>
  );
}

export default ImageUpload;