import React, { useState } from 'react';
import { UserProfile } from '../types';

interface ProfileEditorProps {
  profile: UserProfile;
  onSave: (p: UserProfile) => void;
  onClose: () => void;
  isInitial?: boolean;
}

const TRAITS_SUGGESTIONS = [
  "Direct", "Empathique", "Cynique", "Anxieux", "Optimiste", 
  "Pragmatique", "Sensible", "Introverti", "Extraverti", "Impatient"
];

export const ProfileEditor: React.FC<ProfileEditorProps> = ({ profile, onSave, onClose, isInitial }) => {
  const [localProfile, setLocalProfile] = useState<UserProfile>(profile);
  const [newTrait, setNewTrait] = useState("");

  const handleAddTrait = () => {
    if (newTrait && !localProfile.traits.includes(newTrait)) {
      setLocalProfile(p => ({ ...p, traits: [...p.traits, newTrait] }));
      setNewTrait("");
    }
  };

  const toggleTrait = (trait: string) => {
    if (localProfile.traits.includes(trait)) {
      setLocalProfile(p => ({ ...p, traits: p.traits.filter(t => t !== trait) }));
    } else {
      setLocalProfile(p => ({ ...p, traits: [...p.traits, trait] }));
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-3xl w-full max-w-md overflow-hidden shadow-2xl animate-grow flex flex-col max-h-[90vh]">
        <div className="bg-sage-600 p-6 text-white">
          <h2 className="text-2xl font-bold">👤 {isInitial ? "Créons ton Jardinier" : "Mon Profil"}</h2>
          <p className="text-sage-100 text-sm mt-1">
            L'IA adaptera son ton (dur, doux, drôle) selon ce profil.
          </p>
        </div>
        
        <div className="p-6 space-y-5 overflow-y-auto">
          {/* Pseudo & Age */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-sage-600 uppercase mb-1">Pseudo</label>
              <input 
                type="text" 
                value={localProfile.pseudo}
                onChange={e => setLocalProfile({...localProfile, pseudo: e.target.value})}
                className="w-full p-2 border-b-2 border-sage-200 focus:border-sage-500 outline-none bg-transparent"
                placeholder="Ex: Alex"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-sage-600 uppercase mb-1">Âge approx.</label>
              <select 
                value={localProfile.ageRange}
                onChange={e => setLocalProfile({...localProfile, ageRange: e.target.value})}
                className="w-full p-2 border-b-2 border-sage-200 focus:border-sage-500 outline-none bg-transparent"
              >
                <option value="18-25">18-25 ans</option>
                <option value="26-35">26-35 ans</option>
                <option value="36-50">36-50 ans</option>
                <option value="50+">50+ ans</option>
              </select>
            </div>
          </div>

          {/* Traits */}
          <div>
            <label className="block text-xs font-bold text-sage-600 uppercase mb-2">Traits de caractère</label>
            <div className="flex flex-wrap gap-2 mb-3">
              {TRAITS_SUGGESTIONS.map(trait => (
                <button
                  key={trait}
                  onClick={() => toggleTrait(trait)}
                  className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                    localProfile.traits.includes(trait) 
                      ? 'bg-sage-500 text-white' 
                      : 'bg-sage-100 text-sage-600 hover:bg-sage-200'
                  }`}
                >
                  {trait}
                </button>
              ))}
            </div>
            <div className="flex space-x-2">
                <input 
                    type="text" 
                    value={newTrait}
                    onChange={e => setNewTrait(e.target.value)}
                    placeholder="Autre (ex: Susceptible)"
                    className="flex-1 p-2 bg-sage-50 rounded-lg text-sm"
                />
                <button onClick={handleAddTrait} className="px-3 bg-sage-200 rounded-lg text-sage-700">+</button>
            </div>
          </div>
        </div>

        <div className="p-4 bg-gray-50 border-t border-gray-100">
          <button 
            onClick={() => onSave(localProfile)}
            className="w-full py-3 bg-sage-600 text-white rounded-xl font-bold shadow-lg hover:bg-sage-700 transform active:scale-95 transition-all"
          >
            {isInitial ? "Commencer" : "Enregistrer"}
          </button>
          {!isInitial && (
              <button onClick={onClose} className="w-full mt-2 py-2 text-sage-500 text-sm hover:underline">Annuler</button>
          )}
        </div>
      </div>
    </div>
  );
};