import React, { useState, useRef, useCallback, useEffect } from 'react';
import PropTypes from 'prop-types';
import Webcam from 'react-webcam';
import { GoX, GoCheck, GoSync, GoDeviceCamera } from "react-icons/go";
import './CameraCapture.css';

const FILTERS = [
  { name: 'Normal', filter: '' },
  { name: 'Grayscale', filter: 'grayscale(1)' },
  { name: 'Sepia', filter: 'sepia(0.8)' },
  { name: 'Warm', filter: 'saturate(1.5) hue-rotate(10deg)' },
  { name: 'Cool', filter: 'saturate(1.2) hue-rotate(-10deg)' },
  { name: 'Bright', filter: 'brightness(1.2) contrast(1.1)' },
  { name: 'Vintage', filter: 'sepia(0.3) contrast(1.1) brightness(1.1)' },
  { name: 'Fade', filter: 'brightness(1.1) contrast(0.9) saturate(0.8)' }
];

const STICKERS = [
  { id: 'time', type: 'time', content: '🕐', label: 'Time' },
  { id: 'smile', type: 'emoji', content: '😊', label: 'Smile' },
  { id: 'love', type: 'emoji', content: '❤️', label: 'Love' },
  { id: 'cool', type: 'emoji', content: '😎', label: 'Cool' },
  { id: 'party', type: 'emoji', content: '🎉', label: 'Party' },
  { id: 'star', type: 'emoji', content: '⭐', label: 'Star' },
  { id: 'fire', type: 'emoji', content: '🔥', label: 'Fire' },
  { id: 'crown', type: 'emoji', content: '👑', label: 'Crown' },
  { id: 'sparkles', type: 'emoji', content: '✨', label: 'Sparkles' }
];

const CameraCapture = ({ onCapture, onClose }) => {
  const webcamRef = useRef(null);
  const [imgSrc, setImgSrc] = useState(null);
  const [facingMode, setFacingMode] = useState("user");
  const [isCapturing, setIsCapturing] = useState(true);
  const [cameraError, setCameraError] = useState(null);
  const [activeFilter, setActiveFilter] = useState(FILTERS[0]);
  const [activeStickers, setActiveStickers] = useState([]);
  const [currentTime, setCurrentTime] = useState(new Date().toLocaleTimeString());
  const [draggedSticker, setDraggedSticker] = useState(null);
  const [videoConstraints, setVideoConstraints] = useState({
    width: { ideal: 4096 },
    height: { ideal: 4096 },
    facingMode: "user",
    aspectRatio: 1,
    frameRate: { ideal: 30, max: 60 }
  });

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date().toLocaleTimeString());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const setupCamera = async () => {
      try {
        const devices = await navigator.mediaDevices.enumerateDevices();
        const videoDevices = devices.filter(device => device.kind === 'videoinput');
        
        if (videoDevices.length > 0) {
          const stream = await navigator.mediaDevices.getUserMedia({ video: true });
          const track = stream.getVideoTracks()[0];
          const capabilities = track.getCapabilities();
          
          const maxSize = Math.min(capabilities.width?.max || 4096, capabilities.height?.max || 4096);
          setVideoConstraints(prev => ({
            ...prev,
            width: { ideal: maxSize },
            height: { ideal: maxSize },
            facingMode
          }));

          stream.getTracks().forEach(track => track.stop());
        }
      } catch (error) {
        console.error('Error getting camera capabilities:', error);
        handleCameraError(error);
      }
    };

    setupCamera();
  }, [facingMode]);

  const capture = useCallback(() => {
    if (webcamRef.current) {
      const imageSrc = webcamRef.current.getScreenshot({
        width: videoConstraints.width.ideal,
        height: videoConstraints.height.ideal
      });
      setImgSrc(imageSrc);
      setIsCapturing(false);
    }
  }, [webcamRef, videoConstraints]);

  const retake = () => {
    setImgSrc(null);
    setIsCapturing(true);
    setActiveStickers([]);
  };

  const flipCamera = () => {
    setFacingMode(prevMode => prevMode === "user" ? "environment" : "user");
  };

  const mergeImageWithStickers = () => {
    return new Promise((resolve) => {
      const canvas = document.createElement('canvas');
      const img = new Image();
      
      img.onload = () => {
        // Set canvas size to match the image
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');

        // Get preview container dimensions for scaling
        const previewContainer = document.querySelector('.preview-container');
        const previewRect = previewContainer.getBoundingClientRect();

        // Draw the base image with filter
        ctx.filter = activeFilter.filter;
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        ctx.filter = 'none';

        // Calculate scaling factors
        const scaleX = canvas.width / previewRect.width;
        const scaleY = canvas.height / previewRect.height;

        // Draw stickers
        activeStickers.forEach(sticker => {
          const content = sticker.type === 'time' ? currentTime : sticker.content;
          const scale = sticker.scale || 1;
          const rotation = sticker.rotation || 0;
          
          // Calculate scaled positions
          const x = (sticker.position?.x || 0) * scaleX;
          const y = (sticker.position?.y || 0) * scaleY;
          
          // Calculate base font size and scale it
          const baseFontSize = 32 * scaleX;
          const scaledFontSize = Math.round(baseFontSize * scale);
          
          ctx.save();
          
          // Position at the sticker's center point and apply rotation
          ctx.translate(x, y);
          ctx.rotate(rotation * Math.PI / 180);
          
          // Set text styles
          ctx.font = `${scaledFontSize}px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`;
          ctx.textBaseline = 'middle';
          ctx.textAlign = 'center';

          // Add text shadow scaled to image size
          ctx.shadowColor = 'rgba(0, 0, 0, 0.3)';
          ctx.shadowBlur = 4 * scaleX;
          ctx.shadowOffsetX = 2 * scaleX;
          ctx.shadowOffsetY = 2 * scaleY;
          
          // Draw the text/emoji
          ctx.fillStyle = 'white';
          ctx.fillText(content, 0, 0);
          
          ctx.restore();
        });

        resolve(canvas.toDataURL('image/jpeg', 0.95));
      };

      img.src = imgSrc;
    });
  };

  const confirmImage = async () => {
    const finalImage = await mergeImageWithStickers();
    onCapture(finalImage);
    onClose();
  };

  const handleCameraError = (error) => {
    console.error('Camera error:', error);
    setCameraError('Could not access camera. Please check permissions and try again.');
  };

  const addSticker = (sticker) => {
    const newSticker = {
      ...sticker,
      id: `${sticker.id}-${Date.now()}`,
      position: { x: 50, y: 50 },
      scale: 1,
      rotation: 0
    };
    setActiveStickers([...activeStickers, newSticker]);
  };

  const removeSticker = (stickerId) => {
    setActiveStickers(activeStickers.filter(s => s.id !== stickerId));
  };

  const handleMouseDown = (e, sticker) => {
    e.preventDefault();
    const container = document.querySelector('.preview-container');
    const rect = container.getBoundingClientRect();
    const target = e.target;
    
    if (target.classList.contains('rotate-handle')) {
      const stickerElement = target.closest('.sticker-item');
      const stickerRect = stickerElement.getBoundingClientRect();
      const centerX = stickerRect.left + stickerRect.width / 2;
      const centerY = stickerRect.top + stickerRect.height / 2;
      
      setDraggedSticker({
        id: sticker.id,
        type: 'rotate',
        centerX,
        centerY,
        startAngle: sticker.rotation || 0,
        startMouseAngle: Math.atan2(e.clientY - centerY, e.clientX - centerX),
        containerRect: rect
      });
    } else if (target.classList.contains('resize-handle')) {
      setDraggedSticker({
        id: sticker.id,
        type: 'resize',
        startX: e.clientX,
        startY: e.clientY,
        startScale: sticker.scale || 1,
        containerRect: rect
      });
    } else {
      setDraggedSticker({
        id: sticker.id,
        type: 'move',
        startX: e.clientX - (sticker.position?.x || 0),
        startY: e.clientY - (sticker.position?.y || 0),
        containerRect: rect
      });
    }
  };

  const handleTouchStart = (e, sticker) => {
    e.preventDefault();
    const touch = e.touches[0];
    const container = document.querySelector('.preview-container');
    const rect = container.getBoundingClientRect();
    const target = e.target;
    
    if (target.classList.contains('rotate-handle')) {
      const stickerElement = target.closest('.sticker-item');
      const stickerRect = stickerElement.getBoundingClientRect();
      const centerX = stickerRect.left + stickerRect.width / 2;
      const centerY = stickerRect.top + stickerRect.height / 2;
      
      setDraggedSticker({
        id: sticker.id,
        type: 'rotate',
        centerX,
        centerY,
        startAngle: sticker.rotation || 0,
        startMouseAngle: Math.atan2(touch.clientY - centerY, touch.clientX - centerX),
        containerRect: rect
      });
    } else if (target.classList.contains('resize-handle')) {
      setDraggedSticker({
        id: sticker.id,
        type: 'resize',
        startX: touch.clientX,
        startY: touch.clientY,
        startScale: sticker.scale || 1,
        containerRect: rect
      });
    } else {
      setDraggedSticker({
        id: sticker.id,
        type: 'move',
        startX: touch.clientX - (sticker.position?.x || 0),
        startY: touch.clientY - (sticker.position?.y || 0),
        containerRect: rect
      });
    }
  };

  const handleMouseMove = (e) => {
    if (draggedSticker) {
      e.preventDefault();
      const { containerRect, type } = draggedSticker;

      if (type === 'rotate') {
        const currentAngle = Math.atan2(e.clientY - draggedSticker.centerY, e.clientX - draggedSticker.centerX);
        const angleDiff = currentAngle - draggedSticker.startMouseAngle;
        const newRotation = (draggedSticker.startAngle + angleDiff * (180 / Math.PI)) % 360;

        setActiveStickers(stickers =>
          stickers.map(s =>
            s.id === draggedSticker.id
              ? { ...s, rotation: newRotation }
              : s
          )
        );
      } else if (type === 'resize') {
        const dx = e.clientX - draggedSticker.startX;
        const dy = e.clientY - draggedSticker.startY;
        const distance = Math.sqrt(dx * dx + dy * dy);
        const scaleChange = distance / 100;
        const newScale = Math.max(0.5, Math.min(3, draggedSticker.startScale + (dx > 0 ? scaleChange : -scaleChange)));

        setActiveStickers(stickers =>
          stickers.map(s =>
            s.id === draggedSticker.id
              ? { ...s, scale: newScale }
              : s
          )
        );
      } else {
        const x = Math.max(0, Math.min(e.clientX - draggedSticker.startX - containerRect.left, containerRect.width - 50));
        const y = Math.max(0, Math.min(e.clientY - draggedSticker.startY - containerRect.top, containerRect.height - 50));

        setActiveStickers(stickers =>
          stickers.map(s =>
            s.id === draggedSticker.id
              ? { ...s, position: { x, y } }
              : s
          )
        );
      }
    }
  };

  const handleTouchMove = (e) => {
    if (draggedSticker) {
      e.preventDefault();
      const touch = e.touches[0];
      const { containerRect, type } = draggedSticker;

      if (type === 'rotate') {
        const currentAngle = Math.atan2(touch.clientY - draggedSticker.centerY, touch.clientX - draggedSticker.centerX);
        const angleDiff = currentAngle - draggedSticker.startMouseAngle;
        const newRotation = (draggedSticker.startAngle + angleDiff * (180 / Math.PI)) % 360;

        setActiveStickers(stickers =>
          stickers.map(s =>
            s.id === draggedSticker.id
              ? { ...s, rotation: newRotation }
              : s
          )
        );
      } else if (type === 'resize') {
        const dx = touch.clientX - draggedSticker.startX;
        const dy = touch.clientY - draggedSticker.startY;
        const distance = Math.sqrt(dx * dx + dy * dy);
        const scaleChange = distance / 100;
        const newScale = Math.max(0.5, Math.min(3, draggedSticker.startScale + (dx > 0 ? scaleChange : -scaleChange)));

        setActiveStickers(stickers =>
          stickers.map(s =>
            s.id === draggedSticker.id
              ? { ...s, scale: newScale }
              : s
          )
        );
      } else {
        const x = Math.max(0, Math.min(touch.clientX - draggedSticker.startX - containerRect.left, containerRect.width - 50));
        const y = Math.max(0, Math.min(touch.clientY - draggedSticker.startY - containerRect.top, containerRect.height - 50));

        setActiveStickers(stickers =>
          stickers.map(s =>
            s.id === draggedSticker.id
              ? { ...s, position: { x, y } }
              : s
          )
        );
      }
    }
  };

  const handleMouseUp = () => {
    setDraggedSticker(null);
  };

  const handleTouchEnd = () => {
    setDraggedSticker(null);
  };

  const renderSticker = (sticker) => {
    const content = sticker.type === 'time' ? currentTime : sticker.content;
    const scale = sticker.scale || 1;
    const rotation = sticker.rotation || 0;
    
    return (
      <div
        key={sticker.id}
        className="sticker-item"
        style={{
          transform: `translate(${sticker.position?.x || 0}px, ${sticker.position?.y || 0}px)`,
        }}
        onMouseDown={(e) => handleMouseDown(e, sticker)}
        onTouchStart={(e) => handleTouchStart(e, sticker)}
      >
        <div 
          className="sticker-content"
          style={{
            transform: `scale(${scale}) rotate(${rotation}deg)`,
            transformOrigin: 'center'
          }}
        >
          {content}
        </div>
        <button 
          className="sticker-remove" 
          onClick={() => removeSticker(sticker.id)}
        >
          ×
        </button>
        <div className="resize-handle"></div>
        <div className="rotate-handle"></div>
      </div>
    );
  };

  return (
    <div className="camera-capture-container">
      <div className="camera-header">
        <button className="close-button" onClick={onClose}>×</button>
      </div>
      
      <div className="camera-body">
        {cameraError ? (
          <div className="camera-error">
            <p>{cameraError}</p>
            <button className="cancel-button" onClick={onClose}>Close</button>
          </div>
        ) : isCapturing ? (
          <>
            <div className="camera-view-container">
              <Webcam
                audio={false}
                ref={webcamRef}
                screenshotFormat="image/jpeg"
                videoConstraints={videoConstraints}
                className="webcam"
                style={{ filter: activeFilter.filter }}
                onUserMediaError={handleCameraError}
              />
            </div>
            <div className="filters-roll">
              {FILTERS.map((filter) => (
                <button
                  key={filter.name}
                  className={`filter-option ${filter.name === activeFilter.name ? 'active' : ''}`}
                  onClick={() => setActiveFilter(filter)}
                >
                  <div className="filter-preview" style={{ filter: filter.filter }}></div>
                  <span>{filter.name}</span>
                </button>
              ))}
            </div>
            <div className="camera-controls">
              <div className="spacer"></div>
              <button className="capture-btn" onClick={capture}>
                <GoDeviceCamera size={32} />
              </button>
              <button className="flip-camera" onClick={flipCamera}>
                <GoSync size={24} />
              </button>
            </div>
          </>
        ) : (
          <>
            <div 
              className="preview-container"
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onMouseLeave={handleMouseUp}
              onTouchMove={handleTouchMove}
              onTouchEnd={handleTouchEnd}
            >
              <img 
                src={imgSrc} 
                alt="Captured" 
                className="captured-image" 
                style={{ filter: activeFilter.filter }}
              />
              <div className="stickers-layer">
                {activeStickers.map(renderSticker)}
              </div>
            </div>
            <div className="stickers-roll">
              {STICKERS.map((sticker) => (
                <button
                  key={sticker.id}
                  className="sticker-option"
                  onClick={() => addSticker(sticker)}
                >
                  <div className="sticker-preview">
                    {sticker.content}
                  </div>
                  <span>{sticker.label}</span>
                </button>
              ))}
            </div>
            <div className="camera-controls">
              <button className="retake-btn" onClick={retake}>
                <GoX size={24} />
              </button>
              <button className="confirm-btn" onClick={confirmImage}>
                <GoCheck size={24} />
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

CameraCapture.propTypes = {
  onCapture: PropTypes.func.isRequired,
  onClose: PropTypes.func.isRequired
};

export default CameraCapture; 