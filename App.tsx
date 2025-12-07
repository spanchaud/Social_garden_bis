import React, { useState, useEffect } from 'react';
import { AppMode, GardenMode, GardenResponse, GardenState, UserProfile } from './types';
import { analyzeCheckInAudio, analyzeContext, analyzeFollowUp } from './services/geminiService';
import { GardenVisualizer } from './components/GardenVisualizer';
import { AudioRecorder } from './components/AudioRecorder';
import { ScreenRecorder } from './components/ScreenRecorder';
import { ProfileEditor } from './components/ProfileEditor';

// Simple predefined missions for immediate positive action
const MISSIONS_SOCIALES = [
    "Envoie un message vocal de gratitude à une personne à qui tu n'as pas parlé depuis 3 mois.",
    "Laisse un commentaire sincère et encourageant sur le travail de quelqu'un (LinkedIn, Insta...).",
    "Complimente un collègue ou un proche sur une qualité qu'on ignore souvent.",
    "Propose ton aide à quelqu'un qui semble débordé aujourd'hui.",
    "Partage une ressource inspirante (livre, podcast) avec un ami qui en a besoin.",
    "Écris un avis positif pour ton café ou commerce de quartier préféré."
];

const DEFAULT_PROFILE: UserProfile = {
    pseudo: "",
    ageRange: "26-35",
    traits: [],
    sensibilites: []
};

const App: React.FC = () => {
  // State Machine
  const [appMode, setAppMode] = useState<AppMode>('intro');
  
  // Data
  const [gardenMode, setGardenMode] = useState<GardenMode | null>(null);
  const [gardenState, setGardenState] = useState<GardenState>({
    meteo: 'soleil',
    plantes: [],
    mauvaises_herbes_compostees: false
  });
  const [analysisResult, setAnalysisResult] = useState<GardenResponse | null>(null);
  const [currentMission, setCurrentMission] = useState<string | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile>(DEFAULT_PROFILE);
  
  // Inputs
  const [contextMedia, setContextMedia] = useState<File | null>(null);
  const [contextAudio, setContextAudio] = useState<Blob | null>(null);
  
  // UI State
  const [inputType, setInputType] = useState<'upload' | 'record' | 'audio' | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [showProfile, setShowProfile] = useState(false);
  
  // Follow-up State
  const [followUpText, setFollowUpText] = useState("");
  const [followUpAudio, setFollowUpAudio] = useState<Blob | null>(null);

  // Initial Check for profile
  const isProfileSet = userProfile.pseudo !== "";

  // --- Helpers ---

  const updateUserProfile = (newProfile: UserProfile) => {
      setUserProfile(newProfile);
      setShowProfile(false);
  };

  const handleSmartProfileUpdate = (newTraits: string[]) => {
      if (!newTraits || newTraits.length === 0) return;
      
      setUserProfile(prev => {
          const uniqueTraits = new Set([...prev.traits, ...newTraits]);
          return { ...prev, traits: Array.from(uniqueTraits) };
      });
      // Optional: Toast notification here "Profil enrichi !"
  };

  // --- Main Flows ---

  const handleCheckIn = async (audioBlob: Blob) => {
    setErrorMsg(null);
    setAppMode('processing_checkin');
    
    try {
      const response = await analyzeCheckInAudio(audioBlob);
      setGardenMode(response.mode);
      setAppMode('mode_selection');
      
      if (response.mode === 'serre') {
          setCurrentMission(null);
      }
    } catch (error: any) {
      setAppMode('intro');
      setErrorMsg(error.message || "Une erreur est survenue lors de l'analyse.");
    }
  };

  const generateMission = () => {
      const random = MISSIONS_SOCIALES[Math.floor(Math.random() * MISSIONS_SOCIALES.length)];
      setCurrentMission(random);
  };

  const handleScreenRecordingComplete = (file: File) => {
    setContextMedia(file);
    setContextAudio(null); 
  };

  const handleContextAnalysis = async () => {
    if (!gardenMode) return;
    setErrorMsg(null);
    setAppMode('analyzing_content');
    
    try {
      const result = await analyzeContext(gardenMode, contextMedia, contextAudio, userProfile);
      
      setAnalysisResult(result);
      setGardenState(result.etat_jardin_visuel);
      if (result.nouveaux_traits_detectes) handleSmartProfileUpdate(result.nouveaux_traits_detectes);
      
      setAppMode('result');
    } catch (error: any) {
      setAppMode('mode_selection');
      setErrorMsg(error.message || "L'analyse a échoué. Veuillez réessayer.");
    }
  };

  // --- Follow Up Flow ---
  
  const handleFollowUpSubmit = async () => {
    if (!analysisResult) return;
    if (!followUpText && !followUpAudio) return;

    setErrorMsg(null);
    const oldLabel = analysisResult.conseil_textuel; // Keep context
    setAnalysisResult(prev => prev ? {...prev, conseil_textuel: "Réflexion en cours..."} : null); // Optimistic UI

    try {
        const result = await analyzeFollowUp(oldLabel, followUpText, followUpAudio, userProfile);
        
        setAnalysisResult(result);
        setGardenState(result.etat_jardin_visuel);
        if (result.nouveaux_traits_detectes) handleSmartProfileUpdate(result.nouveaux_traits_detectes);
        
        // Reset inputs
        setFollowUpText("");
        setFollowUpAudio(null);

    } catch (error: any) {
        setErrorMsg("Impossible de continuer la discussion : " + error.message);
    }
  };


  const handleReset = () => {
    setAppMode('intro');
    setGardenMode(null);
    setContextMedia(null);
    setContextAudio(null);
    setAnalysisResult(null);
    setInputType(null);
    setErrorMsg(null);
    setCurrentMission(null);
    setFollowUpText("");
    setFollowUpAudio(null);
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    alert("Copié dans le presse-papier !");
  };

  // --- Render Steps ---

  const renderIntro = () => (
    <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-8 animate-grow">
      <div className="text-center">
        <h1 className="text-3xl font-medium text-sage-800 leading-relaxed mb-2">
            Bonjour {userProfile.pseudo || "Jardinier"},<br/>
            <span className="text-sm text-sage-500 font-normal">
                {userProfile.traits.length > 0 ? `(Mode: ${userProfile.traits.slice(0,2).join(', ')})` : "(Profil neutre)"}
            </span>
        </h1>
        <h2 className="text-xl text-sage-600">
            Quelle est ta <span className="text-terra-600 font-bold">météo intérieure</span> ?
        </h2>
      </div>
      
      <AudioRecorder 
        onRecordingComplete={handleCheckIn} 
        isProcessing={appMode === 'processing_checkin'}
        pulsing={true}
      />
      <p className="text-sage-500 text-sm">Appuie pour parler</p>

      <button onClick={() => setShowProfile(true)} className="text-xs text-sage-400 underline hover:text-sage-600 mt-8">
          Modifier mon profil
      </button>
    </div>
  );

  const renderModeSelection = () => {
    const isClinical = gardenMode === 'clinique';
    const isProcessing = appMode === 'analyzing_content';
    const hasContent = !!contextMedia || !!contextAudio;

    return (
      <div className="flex flex-col space-y-6 w-full max-w-md animate-grow pb-10">
        <div className={`p-6 rounded-3xl ${isClinical ? 'bg-terra-50' : 'bg-sage-50'} border-2 ${isClinical ? 'border-terra-100' : 'border-sage-200'}`}>
          <div className="flex items-center space-x-3 mb-6">
            <span className="text-2xl">{isClinical ? '🩹' : '🌱'}</span>
            <h2 className={`text-xl font-semibold ${isClinical ? 'text-terra-800' : 'text-sage-800'}`}>
              {isClinical ? 'Zone de Soin' : 'Zone de Croissance'}
            </h2>
          </div>

          <div className="space-y-6">
            {!isClinical && (
                <div className="bg-white p-4 rounded-2xl border border-sage-100 shadow-sm">
                    {!currentMission ? (
                        <div className="text-center py-4">
                            <p className="text-sage-600 mb-4">Ton énergie est positive ! Utilisons-la pour faire fleurir ton entourage.</p>
                            <button 
                                onClick={generateMission}
                                className="px-6 py-3 bg-sage-500 text-white rounded-full font-bold shadow hover:bg-sage-600 transition-transform active:scale-95 flex items-center justify-center mx-auto space-x-2"
                            >
                                <span>🎲</span>
                                <span>Générer une mission sociale</span>
                            </button>
                        </div>
                    ) : (
                        <div className="animate-grow">
                             <div className="flex justify-between items-start mb-2">
                                <h3 className="text-xs font-bold text-sage-400 uppercase tracking-wider">Mission du jour</h3>
                                <button onClick={generateMission} className="text-xl hover:rotate-90 transition-transform" title="Nouvelle mission">🎲</button>
                             </div>
                             <p className="text-lg font-medium text-sage-800 mb-4 italic">"{currentMission}"</p>
                             <div className="h-px bg-sage-100 w-full mb-4"></div>
                             <p className="text-xs text-center text-sage-500">Une fois réalisée, tu peux uploader une preuve.</p>
                        </div>
                    )}
                </div>
            )}
            
            {(isClinical || currentMission) && (
              <>
                {!inputType && (
                  <div className="flex flex-col space-y-3">
                    <button onClick={() => setInputType('record')} className="flex items-center p-4 bg-white rounded-xl shadow-sm border border-sage-100 hover:border-sage-300 transition-all text-left">
                      <span className="text-2xl mr-4">📹</span>
                      <div><span className="block text-sm font-bold text-sage-700">Enregistrer l'écran</span></div>
                    </button>
                    <button onClick={() => setInputType('audio')} className="flex items-center p-4 bg-white rounded-xl shadow-sm border border-sage-100 hover:border-sage-300 transition-all text-left">
                      <span className="text-2xl mr-4">🎙️</span>
                      <div><span className="block text-sm font-bold text-sage-700">Message Audio</span></div>
                    </button>
                    <button onClick={() => setInputType('upload')} className="flex items-center p-4 bg-white rounded-xl shadow-sm border border-sage-100 hover:border-sage-300 transition-all text-left">
                      <span className="text-2xl mr-4">📁</span>
                      <div><span className="block text-sm font-bold text-sage-700">Uploader un fichier</span></div>
                    </button>
                  </div>
                )}

                {inputType === 'record' && (
                  <div className="animate-grow">
                    {!contextMedia ? (
                      <>
                        <div className="flex justify-between items-center mb-2">
                            <label className="text-sm font-medium text-sage-700">Capture ton écran et commente</label>
                            <button onClick={() => setInputType(null)} className="text-xs text-sage-400 underline">Changer</button>
                        </div>
                        <ScreenRecorder onRecordingComplete={handleScreenRecordingComplete} isProcessing={isProcessing} />
                      </>
                    ) : (
                        <div className="bg-sage-100 p-4 rounded-xl flex items-center justify-between">
                          <div className="flex items-center space-x-2">
                            <span className="text-xl">✅</span>
                            <span className="text-sm font-bold text-sage-800">Vidéo enregistrée</span>
                          </div>
                          <button onClick={() => { setContextMedia(null); }} className="text-xs text-red-500 font-medium">Refaire</button>
                        </div>
                    )}
                  </div>
                )}

                {inputType === 'audio' && (
                  <div className="animate-grow flex flex-col items-center space-y-4">
                    <div className="flex w-full justify-between items-center mb-2">
                        <label className="text-sm font-medium text-sage-700">Raconte-nous</label>
                        <button onClick={() => { setInputType(null); setContextAudio(null); }} className="text-xs text-sage-400 underline">Changer</button>
                    </div>
                    <AudioRecorder onRecordingComplete={setContextAudio} isProcessing={false} label="Enregistrer" pulsing={true}/>
                    {contextAudio && <div className="text-sm font-medium text-sage-600">✅ Audio enregistré</div>}
                  </div>
                )}

                {inputType === 'upload' && (
                  <div className="animate-grow space-y-4">
                    <div className="flex justify-between items-center">
                        <label className="text-sm font-medium text-sage-700">Preuve</label>
                        <button onClick={() => { setInputType(null); setContextMedia(null); setContextAudio(null); }} className="text-xs text-sage-400 underline">Changer</button>
                    </div>
                    <div className="relative border-2 border-dashed border-sage-300 rounded-xl p-4 text-center hover:bg-white transition-colors">
                        <input type="file" accept="image/*,video/*" onChange={(e) => setContextMedia(e.target.files?.[0] || null)} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"/>
                        <div className="text-sage-800 font-medium truncate">{contextMedia ? contextMedia.name : "Tap pour sélectionner"}</div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-sage-700 mb-2">Ajouter un commentaire audio (Optionnel)</label>
                      <div className="flex justify-center"><AudioRecorder onRecordingComplete={setContextAudio} isProcessing={false} /></div>
                    </div>
                  </div>
                )}
                
                <button 
                  onClick={handleContextAnalysis}
                  disabled={isProcessing || !hasContent}
                  className={`w-full py-4 rounded-xl font-bold text-white shadow-md transition-transform active:scale-95
                    ${isClinical ? 'bg-terra-500 hover:bg-terra-600' : 'bg-sage-500 hover:bg-sage-600'}
                    ${(isProcessing || !hasContent) ? 'opacity-50 cursor-not-allowed' : ''}
                  `}
                >
                  {isProcessing ? 'Analyse en cours...' : isClinical ? 'Analyser & Apaiser' : 'Valider ma mission'}
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    );
  };

  const renderResult = () => {
    if (!analysisResult) return null;

    return (
      <div className="w-full max-w-md space-y-6 animate-grow pb-10">
        <div className="bg-white p-6 rounded-3xl shadow-sm border border-sage-100 relative">
          <div className="absolute -top-4 left-6 text-6xl text-terra-200 font-serif leading-none">“</div>
          
          <h3 className="text-lg font-semibold text-sage-800 mb-2 pt-2">
             {analysisResult.mode_actif === 'clinique' ? 'Conseil du Jardinier' : 'Jardin Cultivé !'}
          </h3>
          <p className="text-sage-600 leading-relaxed mb-4 whitespace-pre-wrap">
            {analysisResult.conseil_textuel}
          </p>
          
          {analysisResult.action_suggeree && (
            <div className="bg-sage-50 p-4 rounded-xl border border-sage-200">
              <p className="text-sm font-mono text-sage-700 mb-2 italic">
                {analysisResult.mode_actif === 'clinique' ? 'Suggestion de réponse :' : 'Réflexion :'}
              </p>
              <p className="text-sage-800 mb-3">{analysisResult.action_suggeree}</p>
              <button onClick={() => copyToClipboard(analysisResult.action_suggeree || "")} className="text-xs bg-white border border-sage-300 px-3 py-1 rounded-full text-sage-600 hover:bg-sage-100 font-medium">Copier</button>
            </div>
          )}
        </div>

        {/* --- FOLLOW UP SECTION --- */}
        <div className="bg-cream/50 p-4 rounded-2xl border border-sage-100">
            <h4 className="text-sm font-bold text-sage-700 mb-3">Besoin d'aller plus loin ?</h4>
            <div className="flex flex-col space-y-3">
                <textarea 
                    value={followUpText}
                    onChange={(e) => setFollowUpText(e.target.value)}
                    placeholder="Posez une question ou dites ce que vous ressentez..."
                    className="w-full p-3 rounded-xl bg-white border border-sage-200 text-sm focus:border-sage-400 outline-none resize-none h-20"
                />
                <div className="flex items-center justify-between">
                     <div className="flex items-center space-x-2">
                        <AudioRecorder onRecordingComplete={setFollowUpAudio} isProcessing={false} label=" " />
                        {followUpAudio && <span className="text-xs text-sage-500">Audio joint ✅</span>}
                     </div>
                     <button 
                        onClick={handleFollowUpSubmit}
                        disabled={!followUpText && !followUpAudio}
                        className={`px-4 py-2 rounded-lg font-bold text-white text-sm transition-all
                            ${(!followUpText && !followUpAudio) ? 'bg-sage-300 cursor-not-allowed' : 'bg-sage-600 hover:bg-sage-700 shadow'}
                        `}
                     >
                        Répondre au Jardinier
                     </button>
                </div>
            </div>
        </div>

        <button onClick={handleReset} className="w-full text-sage-500 hover:text-sage-700 text-sm font-medium py-2">
          Terminer la session
        </button>
      </div>
    );
  };

  const renderError = () => {
    if (!errorMsg) return null;
    return (
      <div className="fixed top-24 left-1/2 transform -translate-x-1/2 z-50 w-full max-w-sm px-4">
        <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-xl shadow-lg animate-pulse-slow flex flex-col items-center space-y-2 text-center">
          <div className="flex items-center space-x-2"><span className="text-xl">⚠️</span><span className="font-medium">Oups !</span></div>
          <p className="text-sm">{errorMsg}</p>
          <button onClick={() => setErrorMsg(null)} className="text-xs bg-red-100 hover:bg-red-200 text-red-800 font-bold px-4 py-1 rounded-full transition-colors mt-2">Fermer</button>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-cream font-sans text-sage-900 flex flex-col items-center relative overflow-x-hidden">
      
      {/* Background Decor */}
      <div className="fixed top-0 left-0 w-64 h-64 bg-sage-100 rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2 pointer-events-none"></div>
      <div className="fixed bottom-0 right-0 w-80 h-80 bg-terra-100 rounded-full blur-3xl translate-x-1/3 translate-y-1/3 pointer-events-none"></div>

      <header className="w-full p-6 flex justify-between items-center z-10">
        <div className="flex items-center space-x-2">
           <span className="text-2xl">🪴</span>
           <span className="font-bold text-sage-800 tracking-tight">Social Garden</span>
        </div>
        {!isProfileSet && appMode !== 'intro' && (
             <button onClick={() => setShowProfile(true)} className="text-sm bg-white/50 px-3 py-1 rounded-full border border-sage-200">
                👤 Profil
             </button>
        )}
      </header>

      {renderError()}

      {(!isProfileSet || showProfile) && (
        <ProfileEditor 
            profile={userProfile} 
            onSave={updateUserProfile} 
            onClose={() => setShowProfile(false)}
            isInitial={!isProfileSet}
        />
      )}

      <main className="flex-1 w-full max-w-2xl px-6 flex flex-col items-center z-10">
        <div className="w-full mb-8"><GardenVisualizer state={gardenState} /></div>
        {isProfileSet && !showProfile && (
            <>
                {appMode === 'intro' || appMode === 'processing_checkin' ? renderIntro() : null}
                {appMode === 'mode_selection' || appMode === 'analyzing_content' ? renderModeSelection() : null}
                {appMode === 'result' ? renderResult() : null}
            </>
        )}
      </main>

      <footer className="w-full p-4 text-center text-xs text-sage-400 z-10">
        <p>Analyse confidentielle par IA - Aucune donnée conservée</p>
      </footer>
    </div>
  );
};

export default App;