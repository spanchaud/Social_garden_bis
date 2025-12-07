export type AppMode = 'intro' | 'processing_checkin' | 'mode_selection' | 'analyzing_content' | 'result';
export type GardenMode = 'clinique' | 'serre';

export interface UserProfile {
  pseudo: string;
  ageRange: string;
  traits: string[]; // ex: "Direct", "Anxieux", "Cynique", "Bienveillant"
  sensibilites: string[]; // ex: "Déteste l'ironie", "Besoin de faits"
}

export interface GardenState {
  meteo: 'soleil' | 'pluie' | 'nuages' | 'orage';
  plantes: string[];
  mauvaises_herbes_compostees: boolean;
}

export interface GardenResponse {
  mode_actif: GardenMode;
  analyse_emotion: string;
  conseil_textuel: string;
  action_suggeree?: string;
  etat_jardin_visuel: GardenState;
  // New: AI can suggest updates to the profile based on interaction
  nouveaux_traits_detectes?: string[]; 
}

export interface CheckInResponse {
  mode: GardenMode;
  sentiment: string;
}