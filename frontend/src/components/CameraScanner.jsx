import React, { useState, useRef, useEffect } from "react";
import { Camera, RefreshCw, Upload, Sparkles, AlertTriangle } from "lucide-react";
import { compressReceiptImage } from "../services/imageUtils";

export default function CameraScanner({ onCapture, isProcessing }) {
  const [streamActive, setStreamActive] = useState(false);
  const [facingMode, setFacingMode] = useState("environment");
  const [cameraError, setCameraError] = useState(null);
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const fileInputRef = useRef(null);

  useEffect(() => {
    startCamera();
    return () => {
      stopCamera();
    };
  }, [facingMode]);

  const startCamera = async () => {
    setCameraError(null);
    stopCamera();

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setCameraError("Camera API not supported in this browser. Please use photo upload below.");
      return;
    }

    try {
      const constraints = {
        video: {
          facingMode: { ideal: facingMode },
          width: { ideal: 1920 },
          height: { ideal: 1080 }
        },
        audio: false
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play().catch(e => console.warn("Video play error:", e));
        setStreamActive(true);
      }
    } catch (err) {
      console.warn("Unable to access camera:", err);
      setCameraError("Camera permission denied or camera in use. Please use photo upload.");
      setStreamActive(false);
    }
  };

  const stopCamera = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      const tracks = videoRef.current.srcObject.getTracks();
      tracks.forEach(track => track.stop());
      videoRef.current.srcObject = null;
    }
    setStreamActive(false);
  };

  const flipCamera = () => {
    setFacingMode(prev => (prev === "environment" ? "user" : "environment"));
  };

  const capturePhoto = async () => {
    if (!videoRef.current || !canvasRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;

    canvas.width = video.videoWidth || 1280;
    canvas.height = video.videoHeight || 720;

    const ctx = canvas.getContext("2d");
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    const base64Image = canvas.toDataURL("image/jpeg", 0.9);
    stopCamera();

    try {
      const compressed = await compressReceiptImage(base64Image, 1600, 0.85);
      onCapture(compressed, "image/jpeg");
    } catch (err) {
      console.warn("Compression fallback:", err);
      onCapture(base64Image, "image/jpeg");
    }
  };

  const handleFileUpload = (e) => {
    const file = e.target.files && e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async () => {
      stopCamera();
      try {
        const compressed = await compressReceiptImage(reader.result, 1600, 0.85);
        onCapture(compressed, "image/jpeg");
      } catch (err) {
        console.warn("Upload compression fallback:", err);
        onCapture(reader.result, file.type || "image/jpeg");
      }
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="scanner-card animate-fade-in">
      <div className="scanner-viewfinder">
        <canvas ref={canvasRef} style={{ display: "none" }} />

        {/* Live Camera View */}
        <video 
          ref={videoRef} 
          playsInline 
          muted 
          className="scanner-video"
          style={{ display: streamActive ? "block" : "none" }}
        />

        {/* Framing corners */}
        {streamActive && !isProcessing && (
          <div className="verify-reticle" style={{ top: "8%", bottom: "8%", left: "10%", right: "10%" }}>
            <span className="verify-corner verify-corner-tl" />
            <span className="verify-corner verify-corner-tr" />
            <span className="verify-corner verify-corner-bl" />
            <span className="verify-corner verify-corner-br" />
          </div>
        )}

        {/* Processing State */}
        {isProcessing && (
          <div style={{ 
            position: "absolute", 
            inset: 0, 
            background: "rgba(15, 39, 68, 0.88)", 
            display: "flex", 
            flexDirection: "column", 
            alignItems: "center", 
            justifyContent: "center",
            gap: "12px",
            color: "#ffffff",
            zIndex: 10
          }}>
            <Sparkles size={36} className="animate-spin" color="#137333" />
            <div style={{ fontWeight: 700, fontSize: "1.1rem" }}>
              Analyzing Receipt (CAD)...
            </div>
            <div style={{ fontSize: "0.85rem", opacity: 0.8 }}>
              Extracting Store, Date & CAD Amount
            </div>
          </div>
        )}

        {/* Fallback View if Camera Denied */}
        {!streamActive && !isProcessing && (
          <div style={{ padding: "24px", textAlign: "center", color: "#ffffff", display: "flex", flexDirection: "column", alignItems: "center", gap: "10px" }}>
            <Camera size={36} color="rgba(255,255,255,0.7)" />
            <div style={{ fontWeight: 600 }}>Ready to Scan Receipt</div>
            {cameraError && (
              <div style={{ color: "#fca5a5", fontSize: "0.8rem", maxWidth: "280px" }}>
                {cameraError}
              </div>
            )}
            <button className="btn btn-outline" onClick={startCamera} style={{ marginTop: "4px", padding: "8px 16px" }}>
              <RefreshCw size={14} />
              <span>Retry Camera</span>
            </button>
          </div>
        )}
      </div>

      {/* Control Buttons */}
      <div className="scanner-controls">
        <button 
          className="btn btn-outline btn-icon" 
          onClick={flipCamera} 
          title="Flip Camera"
          disabled={!streamActive || isProcessing}
        >
          <RefreshCw size={18} />
        </button>

        {/* Shutter Button */}
        <button 
          className="shutter-circle-btn" 
          onClick={capturePhoto}
          disabled={!streamActive || isProcessing}
          title="Capture Photo"
        >
          <div className="shutter-circle-inner" />
        </button>

        {/* File Upload Button */}
        <button 
          className="btn btn-outline btn-icon" 
          onClick={() => fileInputRef.current && fileInputRef.current.click()}
          title="Upload from Photo Library"
          disabled={isProcessing}
        >
          <Upload size={18} />
        </button>
      </div>

      <input 
        ref={fileInputRef} 
        type="file" 
        accept="image/*" 
        capture="environment"
        style={{ display: "none" }} 
        onChange={handleFileUpload}
      />
    </div>
  );
}
