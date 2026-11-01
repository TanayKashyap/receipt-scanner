import React, { useState, useRef, useEffect } from "react";
import { Camera, RefreshCw, Upload, Sparkles, AlertTriangle, Image as ImageIcon } from "lucide-react";

export default function CameraScanner({ onCapture, isProcessing }) {
  const [streamActive, setStreamActive] = useState(false);
  const [facingMode, setFacingMode] = useState("environment"); // default rear camera
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
      setCameraError("Camera API not supported in this browser. Please use photo upload.");
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
      setCameraError("Camera access permission denied or unavailable. Use photo upload below.");
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
    setFacingMode(prev => prev === "environment" ? "user" : "environment");
  };

  const capturePhoto = () => {
    if (!videoRef.current || !canvasRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;

    canvas.width = video.videoWidth || 1280;
    canvas.height = video.videoHeight || 720;

    const ctx = canvas.getContext("2d");
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    const base64Image = canvas.toDataURL("image/jpeg", 0.92);
    stopCamera();
    onCapture(base64Image, "image/jpeg");
  };

  const handleFileUpload = (e) => {
    const file = e.target.files && e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      stopCamera();
      onCapture(reader.result, file.type || "image/jpeg");
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="camera-scanner-container animate-fade-in">
      <div className="viewfinder-wrapper glass-panel">
        {/* Hidden Canvas for capture rendering */}
        <canvas ref={canvasRef} style={{ display: "none" }} />

        {/* Live Camera View */}
        <video 
          ref={videoRef} 
          playsInline 
          muted 
          className="viewfinder-video"
          style={{ display: streamActive ? "block" : "none" }}
        />

        {/* Viewfinder Target Framing & Scan Line */}
        {streamActive && !isProcessing && (
          <div className="receipt-target-frame">
            <span className="frame-corner frame-corner-tl" />
            <span className="frame-corner frame-corner-tr" />
            <span className="frame-corner frame-corner-bl" />
            <span className="frame-corner frame-corner-br" />
            <div className="laser-scan-line" />
            <div style={{ color: "rgba(255,255,255,0.7)", fontSize: "0.85rem", marginTop: "auto", marginBottom: "8px" }}>
              Align receipt within frame
            </div>
          </div>
        )}

        {/* Processing State Overlay */}
        {isProcessing && (
          <div style={{ 
            position: "absolute", 
            inset: 0, 
            background: "rgba(9, 13, 22, 0.85)", 
            display: "flex", 
            flexDirection: "column", 
            alignItems: "center", 
            justifyContent: "center",
            gap: "14px",
            zIndex: 10
          }}>
            <Sparkles size={36} color="#38bdf8" className="animate-spin" />
            <div style={{ fontWeight: 700, fontSize: "1.1rem", color: "#ffffff" }}>
              Gemini AI Analyzing Receipt...
            </div>
            <div style={{ color: "var(--text-muted)", fontSize: "0.85rem" }}>
              Extracting Store, Date & Total Amount
            </div>
          </div>
        )}

        {/* Fallback View if Camera Denied or Unavailable */}
        {!streamActive && !isProcessing && (
          <div style={{ 
            padding: "24px", 
            textAlign: "center", 
            display: "flex", 
            flexDirection: "column", 
            alignItems: "center", 
            gap: "14px" 
          }}>
            <div style={{
              width: 56,
              height: 56,
              borderRadius: "50%",
              background: "rgba(56, 189, 248, 0.1)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "var(--accent-cyan)"
            }}>
              <Camera size={28} />
            </div>
            <div style={{ fontWeight: 600, fontSize: "1.05rem" }}>Ready to Scan Receipt</div>
            {cameraError && (
              <div style={{ color: "var(--accent-amber)", fontSize: "0.825rem", maxWidth: "340px", display: "flex", alignItems: "center", gap: "6px" }}>
                <AlertTriangle size={16} />
                <span>{cameraError}</span>
              </div>
            )}
            <button className="btn btn-secondary" onClick={startCamera}>
              <RefreshCw size={15} />
              <span>Retry Camera</span>
            </button>
          </div>
        )}
      </div>

      {/* Control Buttons */}
      <div className="camera-controls-bar">
        {/* Flip camera */}
        <button 
          className="btn btn-secondary btn-icon" 
          onClick={flipCamera} 
          title="Switch Front/Rear Camera"
          disabled={!streamActive || isProcessing}
        >
          <RefreshCw size={18} />
        </button>

        {/* Shutter Button */}
        <button 
          className="shutter-btn" 
          onClick={capturePhoto}
          disabled={!streamActive || isProcessing}
          title="Capture Receipt Photo"
        >
          <div className="shutter-inner" />
        </button>

        {/* Upload from file / photo library */}
        <button 
          className="btn btn-secondary btn-icon" 
          onClick={() => fileInputRef.current && fileInputRef.current.click()}
          title="Upload receipt image from device"
          disabled={isProcessing}
        >
          <Upload size={18} />
        </button>
      </div>

      {/* Hidden File Input */}
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
