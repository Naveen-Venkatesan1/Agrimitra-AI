import React, { useState, useRef, useEffect } from 'react';
import { X, ZoomIn, ZoomOut, RotateCcw, Check, Upload, AlertCircle } from 'lucide-react';
import Button from './Button';

export const ProfileCropModal = ({ isOpen, imageSrc, onClose, onConfirm }) => {
  const [zoom, setZoom] = useState(1);
  const [offsetX, setOffsetX] = useState(0);
  const [offsetY, setOffsetY] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [saving, setSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const canvasRef = useRef(null);
  const imageRef = useRef(null);

  // Reset controls when new image is provided
  useEffect(() => {
    if (isOpen) {
      setZoom(1);
      setOffsetX(0);
      setOffsetY(0);
      setSaving(false);
      setErrorMessage('');
    }
  }, [isOpen, imageSrc]);

  if (!isOpen || !imageSrc) return null;

  const handleMouseDown = (e) => {
    setIsDragging(true);
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    setDragStart({ x: clientX - offsetX, y: clientY - offsetY });
  };

  const handleMouseMove = (e) => {
    if (!isDragging) return;
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    setOffsetX(clientX - dragStart.x);
    setOffsetY(clientY - dragStart.y);
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleReset = () => {
    setZoom(1);
    setOffsetX(0);
    setOffsetY(0);
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      setErrorMessage('');

      const img = imageRef.current;
      if (!img) throw new Error("Image element unavailable");

      const canvas = document.createElement('canvas');
      const size = 400; // Output high-def 400x400 circle
      canvas.width = size;
      canvas.height = size;
      const ctx = canvas.getContext('2d');

      // Fill white background
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(0, 0, size, size);

      // Create Circular Clipping Path
      ctx.beginPath();
      ctx.arc(size / 2, size / 2, size / 2, 0, Math.PI * 2, true);
      ctx.closePath();
      ctx.clip();

      // Compute transform scaling
      const previewSize = 224; // 56 * 4 = 224px viewport
      const scaleFactor = size / previewSize;

      // Draw transformed image
      const drawWidth = img.naturalWidth * zoom * (previewSize / img.naturalWidth) * scaleFactor;
      const drawHeight = img.naturalHeight * zoom * (previewSize / img.naturalHeight) * scaleFactor;

      const drawX = (size - drawWidth) / 2 + offsetX * scaleFactor;
      const drawY = (size - drawHeight) / 2 + offsetY * scaleFactor;

      ctx.drawImage(img, drawX, drawY, drawWidth, drawHeight);

      // Convert Canvas to JPEG Blob with async Promise
      const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/jpeg', 0.92));
      if (!blob) {
        throw new Error("Failed to process cropped photo.");
      }

      const croppedFile = new File([blob], `avatar_${Date.now()}.jpg`, { type: 'image/jpeg' });
      await onConfirm(croppedFile);
      onClose();
    } catch (err) {
      setErrorMessage(err.message || "Failed to upload cropped photo.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
      <div className="bg-white rounded-3xl p-6 shadow-2xl max-w-md w-full space-y-5 border border-gray-100 relative">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-100 pb-3">
          <div>
            <h3 className="text-lg font-extrabold text-agri-dark">Adjust Profile Photo</h3>
            <p className="text-xs text-gray-500">Drag to reposition, use slider to zoom</p>
          </div>
          <button
            onClick={onClose}
            disabled={saving}
            className="p-1.5 rounded-full text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Error Alert */}
        {errorMessage && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-xs font-semibold flex items-center gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Circular Preview Box */}
        <div className="flex justify-center my-2">
          <div
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
            onTouchStart={handleMouseDown}
            onTouchMove={handleMouseMove}
            onTouchEnd={handleMouseUp}
            className="w-56 h-56 rounded-full border-4 border-agri-primary shadow-lg overflow-hidden relative bg-gray-900 cursor-move select-none flex items-center justify-center"
          >
            <img
              ref={imageRef}
              src={imageSrc}
              alt="Crop Preview"
              style={{
                transform: `translate(${offsetX}px, ${offsetY}px) scale(${zoom})`,
                transition: isDragging ? 'none' : 'transform 0.1s ease-out',
                maxWidth: '100%',
                maxHeight: '100%',
                objectFit: 'cover'
              }}
              draggable={false}
              className="pointer-events-none"
            />
            <div className="absolute inset-0 rounded-full border-2 border-white/40 pointer-events-none" />
          </div>
        </div>

        {/* Zoom & Reset Controls */}
        <div className="space-y-3 pt-2">
          <div className="flex items-center gap-3 bg-gray-50 p-3 rounded-2xl border border-gray-100">
            <ZoomOut className="w-4 h-4 text-gray-500 flex-shrink-0" />
            <input
              type="range"
              min="1"
              max="3"
              step="0.05"
              value={zoom}
              onChange={(e) => setZoom(parseFloat(e.target.value))}
              className="w-full accent-agri-primary h-1.5 bg-gray-200 rounded-lg appearance-none cursor-pointer"
            />
            <ZoomIn className="w-4 h-4 text-gray-500 flex-shrink-0" />
            <span className="text-xs font-bold text-agri-dark w-10 text-right">{Math.round(zoom * 100)}%</span>
          </div>

          <div className="flex justify-end">
            <button
              onClick={handleReset}
              className="text-xs font-bold text-agri-primary hover:underline flex items-center gap-1"
            >
              <RotateCcw className="w-3.5 h-3.5" /> Reset View
            </button>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-3 pt-3 border-t border-gray-100">
          <Button
            onClick={onClose}
            disabled={saving}
            variant="outline"
            size="md"
          >
            Cancel
          </Button>

          <Button
            onClick={handleSave}
            disabled={saving}
            variant="primary"
            size="md"
            icon={Check}
          >
            {saving ? 'Saving Photo...' : 'Save Profile Photo'}
          </Button>
        </div>

      </div>
    </div>
  );
};

export default ProfileCropModal;
