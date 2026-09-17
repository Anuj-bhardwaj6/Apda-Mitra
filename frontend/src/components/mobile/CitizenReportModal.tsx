'use client';

import React, { useState, useRef, useEffect } from 'react';
import {
  Camera,
  MapPin,
  CheckCircle2,
  Upload,
  AlertTriangle,
  X,
  ShieldCheck,
  Sparkles,
  Mountain,
  Waves,
  Trees,
  Car,
  RefreshCw,
  Video
} from 'lucide-react';
import { fetchApi, ImageAnalysisResult } from '@/lib/api';

interface CitizenReportProps {
  currentLat: number;
  currentLon: number;
  locationName: string;
  onClose: () => void;
  onSubmitReport: (category: string, description: string, photoUrl: string) => void;
  lang?: 'en' | 'hi';
}

export const CitizenReportModal: React.FC<CitizenReportProps> = ({
  currentLat,
  currentLon,
  locationName,
  onClose,
  onSubmitReport,
  lang = 'en',
}) => {
  const [photoCaptured, setPhotoCaptured] = useState(false);
  const [photoUrl, setPhotoUrl] = useState(
    'https://images.unsplash.com/photo-1547683905-f686c993aae5?w=600&q=80'
  );
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [category, setCategory] = useState('Landslide');
  const [description, setDescription] = useState('');
  const [aiAnalysis, setAiAnalysis] = useState<ImageAnalysisResult | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submittedSuccess, setSubmittedSuccess] = useState(false);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const categories = [
    { name: 'Landslide', label: lang === 'hi' ? 'भूस्खलन' : 'Landslide', icon: Mountain },
    { name: 'Rockfall', label: lang === 'hi' ? 'चट्टान गिरना' : 'Rockfall', icon: AlertTriangle },
    { name: 'Tree Fall', label: lang === 'hi' ? 'पेड़ गिरना' : 'Tree Fall', icon: Trees },
    { name: 'Road Block', label: lang === 'hi' ? 'सड़क अवरोध' : 'Road Block', icon: Car },
    { name: 'Flood', label: lang === 'hi' ? 'जलभराव / बाढ़' : 'Flood', icon: Waves },
    { name: 'Other', label: lang === 'hi' ? 'अन्य खतरा' : 'Other Danger', icon: AlertTriangle },
  ];

  // Start real browser camera stream
  const startCamera = async () => {
    setIsCameraActive(true);
    try {
      if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'environment' },
          audio: false
        });
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      }
    } catch (err) {
      console.log('Camera device skipped or not permitted, using photo upload/sample mode.');
    }
  };

  // Capture snapshot from real video stream or sample
  const takeSnapshot = async () => {
    let capturedBase64 = photoUrl;
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      canvas.width = video.videoWidth || 640;
      canvas.height = video.videoHeight || 480;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        capturedBase64 = canvas.toDataURL('image/jpeg', 0.8);
      }
      // Stop video track
      const stream = video.srcObject as MediaStream;
      if (stream) {
        stream.getTracks().forEach((track) => track.stop());
      }
    }

    setPhotoUrl(capturedBase64);
    setPhotoCaptured(true);
    setIsCameraActive(false);

    // Call Backend Gemini Vision Analysis
    setIsAnalyzing(true);
    try {
      const res = await fetchApi<{ success: boolean; data: ImageAnalysisResult }>('/reports/analyze-image', {
        method: 'POST',
        body: JSON.stringify({ image_base64: capturedBase64, mime_type: 'image/jpeg' })
      });
      if (res && res.data) {
        setAiAnalysis(res.data);
        if (res.data.category) {
          setCategory(res.data.category);
        }
        if (res.data.description && !description) {
          setDescription(res.data.description);
        }
      }
    } catch (err) {
      console.warn('Vision analysis failed:', err);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    setTimeout(() => {
      onSubmitReport(category, description || 'Field hazard observed by citizen.', photoUrl);
      setIsSubmitting(false);
      setSubmittedSuccess(true);
    }, 600);
  };

  return (
    <div className="app-modal-overlay fixed inset-0 z-[1000] bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 overflow-y-auto" style={{ zIndex: 1000 }}>
      <div className="bg-white border border-[#CBD5E1] w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden p-5 sm:p-6 space-y-4 relative animate-in fade-in zoom-in-95 my-auto">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-[#6B7280] hover:text-[#1F2937] p-1.5 rounded-full hover:bg-slate-100 cursor-pointer"
          aria-label="Close modal"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-2xl bg-[#EBF3FA] flex items-center justify-center text-[#0F4C81]">
            <Camera className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base sm:text-lg font-bold text-[#1F2937]">
              {lang === 'hi' ? 'नागरिक आपदा रिपोर्ट भेजें' : 'Report Citizen Hazard Incident'}
            </h2>
            <p className="text-xs text-[#6B7280]">
              {lang === 'hi' ? 'लाइव कैमरा एवं एआई वर्गीकरण' : 'Live Camera Snapshot & Gemini Vision Hazard Classifier'}
            </p>
          </div>
        </div>

        {submittedSuccess ? (
          <div className="py-8 text-center space-y-3.5 animate-in fade-in">
            <div className="w-16 h-16 rounded-full bg-[#E8F5E9] text-[#2E7D32] flex items-center justify-center mx-auto border-2 border-[#A5D6A7] shadow-sm">
              <CheckCircle2 className="w-9 h-9" />
            </div>
            <h3 className="text-lg font-bold text-[#1F2937]">
              {lang === 'hi' ? 'रिपोर्ट सफलतापूर्वक दर्ज की गई' : 'Incident Dispatched to District EOC'}
            </h3>
            <p className="text-xs text-[#4B5563] max-w-xs mx-auto leading-relaxed">
              {lang === 'hi'
                ? 'आपकी रिपोर्ट जिला आपदा नियंत्रण कक्ष को भेज दी गई है।'
                : 'Geo-tagged report has entered the officer verification queue via WebSocket.'}
            </p>
            <button
              onClick={onClose}
              className="apda-btn-primary px-8 py-2.5 text-xs font-bold rounded-xl cursor-pointer"
            >
              {lang === 'hi' ? 'समाप्त' : 'Return to Home'}
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4 pt-1">
            {/* Step 1: Real Browser Camera Capture */}
            <div className="p-3.5 bg-[#F8FAFC] border-2 border-dashed border-[#CBD5E1] rounded-2xl text-center space-y-2">
              <canvas ref={canvasRef} className="hidden" />

              {isCameraActive ? (
                <div className="space-y-2">
                  <div className="relative rounded-xl overflow-hidden h-48 bg-black">
                    <video ref={videoRef} autoPlay playsInline className="w-full h-full object-cover" />
                  </div>
                  <button
                    type="button"
                    onClick={takeSnapshot}
                    className="apda-btn-primary w-full text-xs py-2.5 font-bold cursor-pointer"
                  >
                    <Camera className="w-4 h-4" />
                    <span>Capture Snapshot</span>
                  </button>
                </div>
              ) : photoCaptured ? (
                <div className="space-y-2">
                  <div className="relative rounded-xl overflow-hidden h-40 bg-black shadow-inner">
                    <img src={photoUrl} alt="Captured hazard" className="w-full h-full object-cover" />
                    <div className="absolute top-2 right-2 bg-[#2E7D32] text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow-xs flex items-center space-x-1">
                      <CheckCircle2 className="w-3 h-3" />
                      <span>GPS Geo-tagged</span>
                    </div>
                  </div>
                  {isAnalyzing ? (
                    <div className="p-2 bg-[#EBF3FA] rounded-xl text-xs text-[#0F4C81] flex items-center justify-center space-x-2">
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Gemini Vision analyzing hazard features...</span>
                    </div>
                  ) : aiAnalysis ? (
                    <div className="p-2.5 bg-[#E8F5E9] border border-[#A5D6A7] rounded-xl text-xs text-left text-[#1F2937] space-y-1">
                      <div className="flex items-center justify-between text-[#2E7D32] font-bold">
                        <span className="flex items-center space-x-1">
                          <Sparkles className="w-3.5 h-3.5 text-[#D97706]" />
                          <span>AI Detected: {aiAnalysis.category} ({aiAnalysis.severity} Severity)</span>
                        </span>
                        <span className="text-[10px] bg-white px-2 py-0.5 rounded-full border">
                          {Math.round(aiAnalysis.confidence * 100)}% Conf
                        </span>
                      </div>
                      <p className="text-[11px] text-[#4B5563]">{aiAnalysis.description}</p>
                    </div>
                  ) : null}
                </div>
              ) : (
                <div className="py-5 flex flex-col items-center justify-center space-y-2">
                  <div className="w-12 h-12 rounded-full bg-[#EBF3FA] flex items-center justify-center text-[#0F4C81]">
                    <Camera className="w-6 h-6" />
                  </div>
                  <p className="text-xs font-medium text-[#4B5563]">
                    {lang === 'hi' ? 'लाइव कैमरा से फोटो लें' : 'Activate live device camera to take hazard snapshot'}
                  </p>
                  <div className="flex items-center space-x-2">
                    <button
                      type="button"
                      onClick={startCamera}
                      className="apda-btn-primary text-xs py-2 px-4 min-h-[38px] font-bold cursor-pointer"
                    >
                      <Video className="w-3.5 h-3.5" />
                      <span>Start Live Camera</span>
                    </button>
                    <button
                      type="button"
                      onClick={takeSnapshot}
                      className="apda-btn-secondary text-xs py-2 px-3 min-h-[38px] cursor-pointer"
                    >
                      Use Sample
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Step 2: Auto-tagged GPS location */}
            <div className="p-3 bg-[#EBF3FA] rounded-xl border border-[#D0E2F2] flex items-center space-x-2.5 text-xs">
              <MapPin className="w-4 h-4 text-[#0F4C81] shrink-0" />
              <div className="truncate">
                <span className="text-[10px] uppercase font-bold text-[#0F4C81] block">
                  {lang === 'hi' ? 'सत्यापित जीपीएस निर्देशांक' : 'Verified GPS Location'}
                </span>
                <span className="font-bold text-[#1F2937] truncate block">
                  {locationName} ({currentLat.toFixed(4)}°N, {currentLon.toFixed(4)}°E)
                </span>
              </div>
            </div>

            {/* Step 3: Hazard Category Chips */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold uppercase tracking-wider text-[#6B7280] block">
                {lang === 'hi' ? 'खतरे का प्रकार चुनें' : 'Select Hazard Category (AI Pre-Selected)'}
              </label>
              <div className="grid grid-cols-3 gap-2">
                {categories.map((cat) => {
                  const Icon = cat.icon;
                  const isSelected = category.toLowerCase() === cat.name.toLowerCase();
                  return (
                    <button
                      key={cat.name}
                      type="button"
                      onClick={() => setCategory(cat.name)}
                      className={`p-2.5 rounded-xl border text-xs font-bold transition-all flex flex-col items-center justify-center space-y-1 cursor-pointer ${
                        isSelected
                          ? 'bg-[#0F4C81] text-white border-[#0F4C81] shadow-xs'
                          : 'bg-[#F8FAFC] text-[#4B5563] border-[#CBD5E1] hover:bg-slate-100'
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                      <span className="text-[11px]">{cat.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Step 4: Remarks */}
            <div>
              <textarea
                placeholder={
                  lang === 'hi'
                    ? 'अतिरिक्त विवरण (उदा. सड़क का बायां लेन अवरुद्ध है...)'
                    : 'Additional notes (e.g. Mudslide covering left lane, traffic halted...)'
                }
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={2}
                className="w-full bg-[#F8FAFC] text-[#1F2937] text-xs p-3 rounded-xl border border-[#CBD5E1] focus:outline-none focus:border-[#0F4C81]"
              />
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isSubmitting}
              className="apda-btn-primary w-full py-3 text-xs sm:text-sm font-bold shadow-md cursor-pointer flex items-center justify-center space-x-2"
            >
              <Upload className="w-4 h-4" />
              <span>
                {isSubmitting
                  ? (lang === 'hi' ? 'नियंत्रण कक्ष में भेजा जा रहा है...' : 'Dispatching via WebSocket...')
                  : (lang === 'hi' ? 'आपदा रिपोर्ट पुष्टि करें और भेजें' : 'Confirm & Submit Incident Report')}
              </span>
            </button>
          </form>
        )}
      </div>
    </div>
  );
};
