import React, { useState, useRef, useEffect } from 'react';

interface ScreenRecorderProps {
  onRecordingComplete: (file: File) => void;
  isProcessing: boolean;
}

export const ScreenRecorder: React.FC<ScreenRecorderProps> = ({ 
  onRecordingComplete, 
  isProcessing 
}) => {
  const [isRecording, setIsRecording] = useState(false);
  const [streamReady, setStreamReady] = useState(false); // New state: Stream acquired but not recording
  const [isPreparing, setIsPreparing] = useState(false);
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const videoPreviewRef = useRef<HTMLVideoElement | null>(null);
  const chunksRef = useRef<BlobPart[]>([]);

  // Helper to find a supported mime type for this browser
  // FIX: Prioritize MP4 for better Gemini compatibility on Mac/Safari
  const getSupportedMimeType = () => {
    const types = [
      'video/mp4', // Safari & Modern Chrome preferred
      'video/webm;codecs=vp9,opus', // High quality WebM
      'video/webm;codecs=vp8,opus', // Standard WebM
      'video/webm;codecs=h264', // Alternative
      'video/webm', // Fallback
    ];
    for (const type of types) {
      if (MediaRecorder.isTypeSupported(type)) {
        console.log(`Using MIME type: ${type}`);
        return type;
      }
    }
    return ''; // Let browser decide default
  };

  // Step 1: Select Screen and Setup Preview
  const prepareRecording = async () => {
    setIsPreparing(true);
    let screenStream: MediaStream | null = null;
    let micStream: MediaStream | null = null;

    try {
      if (!navigator.mediaDevices?.getDisplayMedia) {
        throw new Error("L'enregistrement d'écran n'est pas supporté.");
      }

      // 1. Get Screen
      try {
        screenStream = await navigator.mediaDevices.getDisplayMedia({ 
          video: true, 
          audio: false
        });
      } catch (err: any) {
        console.error("Screen share cancelled:", err);
        setIsPreparing(false);
        return; 
      }

      // 2. Get Mic (Optional)
      try {
        micStream = await navigator.mediaDevices.getUserMedia({ audio: true });
      } catch (err) {
        console.warn("No mic access:", err);
      }

      // 3. Combine tracks
      const tracks = [
        ...screenStream.getVideoTracks(),
        ...(micStream ? micStream.getAudioTracks() : [])
      ];

      const combinedStream = new MediaStream(tracks);
      streamRef.current = combinedStream;

      // Handle "Stop Sharing" from browser UI
      screenStream.getVideoTracks()[0].onended = () => {
        // If we were recording, stop it properly
        if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
            stopRecording();
        } else {
            // Cancel setup
            cancelSetup();
        }
      };

      // Set Preview
      if (videoPreviewRef.current) {
        videoPreviewRef.current.srcObject = combinedStream;
      }

      setStreamReady(true);
      setIsPreparing(false);

    } catch (err: any) {
      console.error("Setup error:", err);
      if (screenStream) screenStream.getTracks().forEach(track => track.stop());
      if (micStream) micStream.getTracks().forEach(track => track.stop());
      setIsPreparing(false);
      alert(`Erreur: ${err.message}`);
    }
  };

  // Step 2: Actually Start Recording
  const startRecording = () => {
    if (!streamRef.current) return;

    const mimeType = getSupportedMimeType();
    const options = mimeType ? { mimeType } : undefined;

    try {
        const mediaRecorder = new MediaRecorder(streamRef.current, options);
        mediaRecorderRef.current = mediaRecorder;
        chunksRef.current = [];

        mediaRecorder.ondataavailable = (e) => {
            if (e.data.size > 0) {
            chunksRef.current.push(e.data);
            }
        };

        mediaRecorder.onstop = () => {
            const type = mimeType || 'video/webm';
            const blob = new Blob(chunksRef.current, { type });
            
            if (blob.size === 0) {
                console.warn("Empty recording");
                cancelSetup();
                return;
            }

            // Determine extension based on actual type
            const ext = type.includes('mp4') ? 'mp4' : 'webm';
            const file = new File([blob], `screen-recording.${ext}`, { type });
            
            onRecordingComplete(file);
            cleanup();
        };

        mediaRecorder.start();
        setIsRecording(true);
    } catch (e: any) {
        alert("Erreur technique au démarrage: " + e.message);
        cancelSetup();
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop();
    }
  };

  const cancelSetup = () => {
    cleanup();
  };

  const cleanup = () => {
    if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
    }
    streamRef.current = null;
    if (videoPreviewRef.current) {
        videoPreviewRef.current.srcObject = null;
    }
    setIsRecording(false);
    setStreamReady(false);
    setIsPreparing(false);
  };

  // --- RENDER ---

  if (isRecording) {
    return (
      <div className="w-full space-y-4">
          <div className="relative w-full aspect-video bg-black rounded-xl overflow-hidden shadow-inner border border-red-500">
             <video ref={videoPreviewRef} autoPlay muted className="w-full h-full object-cover opacity-70" />
             <div className="absolute inset-0 flex items-center justify-center">
                 <span className="animate-pulse text-red-500 font-bold text-4xl">● REC</span>
             </div>
          </div>
          <button
            onClick={stopRecording}
            className="w-full flex items-center justify-center space-x-2 p-4 rounded-xl bg-red-500 text-white shadow-lg hover:bg-red-600 transition-colors font-bold"
          >
            <div className="w-4 h-4 bg-white rounded-sm"></div>
            <span>Arrêter l'enregistrement</span>
          </button>
      </div>
    );
  }

  if (streamReady) {
      return (
        <div className="w-full space-y-4 animate-grow">
            <div className="w-full aspect-video bg-black rounded-xl overflow-hidden shadow-lg relative">
                <video ref={videoPreviewRef} autoPlay muted className="w-full h-full object-contain" />
                <div className="absolute top-2 right-2 bg-black/50 text-white text-xs px-2 py-1 rounded">Aperçu</div>
            </div>
            
            <div className="flex space-x-3">
                <button 
                    onClick={cancelSetup}
                    className="flex-1 py-3 bg-gray-100 text-gray-700 rounded-xl font-medium hover:bg-gray-200"
                >
                    Annuler
                </button>
                <button
                    onClick={startRecording}
                    className="flex-1 py-3 bg-red-500 text-white rounded-xl font-bold hover:bg-red-600 shadow-md flex items-center justify-center space-x-2"
                >
                   <span className="w-3 h-3 bg-white rounded-full"></span>
                   <span>Démarrer</span>
                </button>
            </div>
        </div>
      );
  }

  if (isPreparing) {
    return (
      <button disabled className="w-full flex flex-col items-center justify-center p-8 border-2 border-terra-200 rounded-xl bg-terra-50 cursor-wait">
        <svg className="animate-spin h-8 w-8 text-terra-500 mb-2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
        <span className="font-bold text-terra-800">Sélection de l'écran...</span>
      </button>
    );
  }

  return (
    <div className="w-full">
      <button
        onClick={prepareRecording}
        disabled={isProcessing}
        className={`w-full group relative flex flex-col items-center justify-center p-8 border-2 border-dashed border-terra-300 rounded-xl bg-terra-50 hover:bg-terra-100 transition-all
          ${isProcessing ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
        `}
      >
        <div className="w-14 h-14 mb-3 rounded-full bg-terra-200 flex items-center justify-center group-hover:scale-110 transition-transform">
          <span className="text-3xl">🖥️</span>
        </div>
        <span className="font-bold text-terra-800">1. Choisir l'écran</span>
        <span className="text-xs text-terra-600 mt-1">Vous pourrez prévisualiser avant d'enregistrer</span>
      </button>
    </div>
  );
};