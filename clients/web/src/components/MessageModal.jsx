import { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import { GoArrowRight, GoPaperAirplane, GoDeviceCameraVideo, GoTrash, GoLocation } from "react-icons/go";
import CameraCapture from './CameraCapture';
import axios from 'axios';
import './MessageModal.css';

const MessageModal = ({ isOpen, onClose, onShareUpdate, placeholder, disabled, isDarkMode }) => {
  const [message, setMessage] = useState('');
  const [image, setImage] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [showCamera, setShowCamera] = useState(false);
  const [fuzzyLocation, setFuzzyLocation] = useState(true); // Default to true for privacy
  const maxCharacters = 60;
  const remainingChars = maxCharacters - message.length;

  const handleSubmit = async (e) => {
    e.preventDefault();
    const trimmedMessage = message.trim();
    
    if (trimmedMessage && image) {
      try {
        setIsUploading(true);
        
        // Create a FormData object to send image to the server
        const formData = new FormData();
        
        // Convert base64 to blob if the image is a base64 string (from camera)
        if (typeof image === 'string' && image.startsWith('data:image')) {
          try {
            // Extract content type and base64 data using regex
            const matches = image.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
            
            if (matches && matches.length === 3) {
              const contentType = matches[1];
              const base64Data = matches[2];
              
              // Convert base64 to binary
              const byteCharacters = atob(base64Data);
              const byteArrays = [];
              
              // Process in chunks to avoid memory issues with large images
              for (let i = 0; i < byteCharacters.length; i += 1024) {
                const slice = byteCharacters.slice(i, i + 1024);
                const byteNumbers = new Array(slice.length);
                
                for (let j = 0; j < slice.length; j++) {
                  byteNumbers[j] = slice.charCodeAt(j);
                }
                
                const byteArray = new Uint8Array(byteNumbers);
                byteArrays.push(byteArray);
              }
              
              // Create blob with proper content type
              const blob = new Blob(byteArrays, { type: contentType });
              formData.append('image', blob, `image.${contentType.split('/')[1] || 'jpg'}`);
              console.log(`Created blob from base64 image with content type: ${contentType}`);
            } else {
              // Fallback to simpler method if regex doesn't match
              console.log('Regex matching failed, using fetch API for blob conversion');
              const response = await fetch(image);
              const blob = await response.blob();
              formData.append('image', blob, 'camera-image.jpg');
            }
          } catch (conversionError) {
            console.error('Error converting base64 to blob:', conversionError);
            alert('There was a problem processing the image. Please try again or use a different image.');
            setIsUploading(false);
            return;
          }
        } else {
          // If it's a File object
          if (image instanceof File) {
            // Validate image file type
            if (!image.type.startsWith('image/')) {
              alert('The selected file is not a valid image.');
              setIsUploading(false);
              return;
            }
            
            // Check file size (max 5MB)
            if (image.size > 5 * 1024 * 1024) {
              alert('Image size must be less than 5MB.');
              setIsUploading(false);
              return;
            }
            
            formData.append('image', image);
            console.log(`Added file image with type: ${image.type}`);
          } else {
            // Unknown image format
            console.error('Unknown image format:', typeof image);
            alert('Unsupported image format. Please try again with a different image.');
            setIsUploading(false);
            return;
          }
        }
        
        formData.append('message', trimmedMessage);
        formData.append('fuzzyLocation', fuzzyLocation.toString());
        
        // Send to the server
        onShareUpdate(trimmedMessage, formData);
        
        // Reset state
        setMessage('');
        setImage(null);
        onClose(); // Close the modal after sending
      } catch (error) {
        console.error('Error uploading image:', error);
        alert('Failed to upload the image. Please try again.');
      } finally {
        setIsUploading(false);
      }
    }
  };

  // Handle camera capture
  const handleCapture = (imageSrc) => {
    setImage(imageSrc);
    setShowCamera(false);
  };

  // Open camera interface
  const openCamera = () => {
    setShowCamera(true);
  };

  // Remove captured image
  const removeImage = () => {
    setImage(null);
  };

  // Reset message and image when modal closes and reopens
  useEffect(() => {
    if (isOpen) {
      setMessage('');
      setImage(null);
      setShowCamera(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  // If camera is active, show the camera component
  if (showCamera) {
    return (
      <div className="message-modal-overlay">
        <CameraCapture onCapture={handleCapture} onClose={() => setShowCamera(false)} />
      </div>
    );
  }

  return (
    <div className="message-modal-overlay" onClick={onClose}>
      <div className={`message-modal ${isDarkMode ? 'dark-mode' : ''}`} onClick={e => e.stopPropagation()}>
        <div className="message-modal-header">
          <h3>Share Update</h3>
          <button className="close-button" onClick={onClose}>×</button>
        </div>
        <form className="message-modal-form" onSubmit={handleSubmit}>
          {image ? (
            <div className="image-preview-container">
              <img src={image} alt="Message preview" className="image-preview" />
              <button 
                type="button"
                className="remove-image-btn"
                onClick={removeImage}
                aria-label="Remove image"
              >
                <GoTrash size={18} />
              </button>
            </div>
          ) : (
            <div className="camera-button-container">
              <button
                type="button"
                className="camera-button"
                onClick={openCamera}
                aria-label="Take photo"
              >
                <GoDeviceCameraVideo size={24} />
                <span>Take Photo</span>
              </button>
            </div>
          )}
          
          <div className="message-input-container">
            <textarea
              className="message-modal-input"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder={placeholder}
              autoComplete="off"
              disabled={disabled}
              rows={3}
              autoFocus
              maxLength={maxCharacters}
            />
            <div className={`char-counter ${remainingChars <= 10 ? 'warning' : ''} ${remainingChars <= 5 ? 'danger' : ''}`}>
              {remainingChars}
            </div>
          </div>
          
          <div className="location-option">
            <label className={`location-option-label ${isDarkMode ? 'dark-mode' : ''}`}>
              <input 
                type="checkbox" 
                checked={fuzzyLocation} 
                onChange={(e) => setFuzzyLocation(e.target.checked)} 
              />
              <GoLocation size={16} className="location-icon" />
              <span>Use approximate location for privacy</span>
            </label>
          </div>
          
          <div className="message-modal-footer">
            <button 
              type="button" 
              className="cancel-button"
              onClick={onClose}
            >
              Cancel
            </button>
            <button 
              type="submit" 
              className={`send-button-round ${!message.trim() || !image || disabled || isUploading ? 'disabled' : ''}`}
              disabled={!message.trim() || !image || disabled || isUploading}
              aria-label="Share update"
            >
              <GoPaperAirplane size={18} />
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

MessageModal.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  onShareUpdate: PropTypes.func.isRequired,
  placeholder: PropTypes.string,
  disabled: PropTypes.bool,
  isDarkMode: PropTypes.bool
};

MessageModal.defaultProps = {
  placeholder: 'What\'s happening?',
  disabled: false,
  isDarkMode: false
};

export default MessageModal; 