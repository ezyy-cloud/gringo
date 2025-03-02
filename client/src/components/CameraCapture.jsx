import React, { useState, useRef, useCallback } from 'react';
import PropTypes from 'prop-types';
import Webcam from 'react-webcam';
import { GoSync, GoDeviceCameraVideo, GoCheck, GoX } from "react-icons/go";
import './CameraCapture.css';

const CameraCapture = ({ onCapture, onClose }) => {
  const webcamRef = useRef(null);
  const [imgSrc, setImgSrc] = useState(null);
  const [facingMode, setFacingMode] = useState("user");
  const [isCapturing, setIsCapturing] = useState(true);
  const [cameraError, setCameraError] = useState(null);

  const capture = useCallback(() => {
    if (webcamRef.current) {
      const imageSrc = webcamRef.current.getScreenshot();
      setImgSrc(imageSrc);
      setIsCapturing(false);
    }
  }, [webcamRef]);

  const retake = () => {
    setImgSrc(null);
    setIsCapturing(true);
  };

  const flipCamera = () => {
    setFacingMode(prevMode => prevMode === "user" ? "environment" : "user");
  };

  const confirmImage = () => {
    onCapture(imgSrc);
    onClose();
  };

  const handleCameraError = (error) => {
    console.error('Camera error:', error);
    setCameraError('Could not access camera. Please check permissions and try again.');
  };

  const videoConstraints = {
    width: 500,
    height: 500,
    facingMode: facingMode
  };

  return (
    <div className="camera-capture-container">
      <div className="camera-header">
        <h3>Take Photo</h3>
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
            <Webcam
              audio={false}
              ref={webcamRef}
              screenshotFormat="image/jpeg"
              videoConstraints={videoConstraints}
              className="webcam"
              onUserMediaError={handleCameraError}
            />
            <div className="camera-controls">
              <button className="flip-camera" onClick={flipCamera}>
                <GoSync size={20} />
              </button>
              <button className="capture-btn" onClick={capture}>
                <GoDeviceCameraVideo size={24} />
              </button>
            </div>
          </>
        ) : (
          <>
            <div className="preview-container">
              <img src={imgSrc} alt="Captured" className="captured-image" />
            </div>
            <div className="camera-controls">
              <button className="retake-btn" onClick={retake}>
                <GoX size={20} />
                <span>Retake</span>
              </button>
              <button className="confirm-btn" onClick={confirmImage}>
                <GoCheck size={20} />
                <span>Use Photo</span>
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