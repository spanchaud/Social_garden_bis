import { GoogleGenAI } from "@google/genai";
import { SYSTEM_INSTRUCTION, CHECKIN_PROMPT, getContextPrompt, getFollowUpPrompt } from "../constants";
import { CheckInResponse, GardenResponse, UserProfile } from "../types";

// Using Gemini 2.5 Flash for robust multimodal (video/audio) handling and speed
const MODEL_NAME = "gemini-2.5-flash";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

// Helper to strip markdown code blocks if present
const cleanJson = (text: string): string => {
  if (!text) return "{}";
  let cleaned = text.replace(/```json/g, '').replace(/```/g, '');
  return cleaned.trim();
};

const getCompatibleMimeType = (originalType: string): string => {
    const type = originalType.split(';')[0].toLowerCase();
    const map: Record<string, string> = {
        'video/quicktime': 'video/mp4',
        'video/x-m4v': 'video/mp4',
        'video/x-matroska': 'video/webm',
        'application/x-matroska': 'video/webm'
    };
    return map[type] || type || 'video/webm';
};

// ... (fileToPart and blobToPart remain largely the same, optimized for reuse)
const fileToPart = async (file: File) => {
  if (file.size > 18 * 1024 * 1024) throw new Error("Fichier trop lourd (>18Mo).");
  return new Promise<{ inlineData: { data: string; mimeType: string } }>((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      if (typeof reader.result === 'string') {
        resolve({
          inlineData: {
            data: reader.result.split(',')[1],
            mimeType: getCompatibleMimeType(file.type),
          },
        });
      } else reject(new Error("Lecture échouée"));
    };
    reader.readAsDataURL(file);
  });
};

const blobToPart = async (blob: Blob, mimeType: string) => {
  return new Promise<{ inlineData: { data: string; mimeType: string } }>((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      if (typeof reader.result === 'string') {
        resolve({
          inlineData: {
            data: reader.result.split(',')[1],
            mimeType: mimeType.split(';')[0],
          },
        });
      } else reject(new Error("Failed to read blob"));
    };
    reader.readAsDataURL(blob);
  });
};

const handleServiceError = (error: unknown, context: string): never => {
  console.error(`Error in ${context}:`, error);
  let userMessage = "Une erreur inattendue est survenue.";
  if (error instanceof Error) {
      if (error.message.includes("429")) userMessage = "Trop de demandes. Pause café requise.";
      else if (error.message.includes("json")) userMessage = "L'IA a bafouillé (Erreur format). Réessayez.";
      else userMessage = error.message;
  }
  throw new Error(userMessage);
};

// --- API METHODS ---

export const analyzeCheckInAudio = async (audioBlob: Blob): Promise<CheckInResponse> => {
  try {
    const audioPart = await blobToPart(audioBlob, audioBlob.type || 'audio/webm');
    const response = await ai.models.generateContent({
      model: MODEL_NAME,
      contents: { parts: [audioPart, { text: CHECKIN_PROMPT }] },
      config: { systemInstruction: SYSTEM_INSTRUCTION, responseMimeType: "application/json" },
    });
    return JSON.parse(cleanJson(response.text || ""));
  } catch (error) {
    handleServiceError(error, "analyzeCheckInAudio");
  }
};

export const analyzeContext = async (
  mode: 'clinique' | 'serre',
  mediaFile: File | null,
  audioDraft: Blob | null,
  profile: UserProfile
): Promise<GardenResponse> => {
  try {
    const parts: any[] = [];
    
    const profileStr = `Pseudo: ${profile.pseudo}, Age: ${profile.ageRange}, Traits: ${profile.traits.join(', ')}, Sensibilités: ${profile.sensibilites.join(', ')}`;
    parts.push({ text: getContextPrompt(mode, profileStr) });

    if (mediaFile) parts.push(await fileToPart(mediaFile));
    if (audioDraft) parts.push(await blobToPart(audioDraft, audioDraft.type || 'audio/webm'));

    const response = await ai.models.generateContent({
      model: MODEL_NAME,
      contents: { parts: parts },
      config: { systemInstruction: SYSTEM_INSTRUCTION, responseMimeType: "application/json" },
    });
    return JSON.parse(cleanJson(response.text || ""));
  } catch (error) {
    handleServiceError(error, "analyzeContext");
  }
};

// NEW: Follow-up analysis
export const analyzeFollowUp = async (
  previousAdvice: string,
  userReactionText: string,
  userReactionAudio: Blob | null,
  profile: UserProfile
): Promise<GardenResponse> => {
    try {
        const parts: any[] = [];
        const profileStr = `Pseudo: ${profile.pseudo}, Age: ${profile.ageRange}, Traits: ${profile.traits.join(', ')}`;
        
        parts.push({ text: getFollowUpPrompt(previousAdvice, userReactionText, profileStr) });

        if (userReactionAudio) {
            parts.push(await blobToPart(userReactionAudio, userReactionAudio.type || 'audio/webm'));
        }

        const response = await ai.models.generateContent({
            model: MODEL_NAME,
            contents: { parts: parts },
            config: { systemInstruction: SYSTEM_INSTRUCTION, responseMimeType: "application/json" },
        });

        return JSON.parse(cleanJson(response.text || ""));
    } catch (error) {
        handleServiceError(error, "analyzeFollowUp");
    }
};