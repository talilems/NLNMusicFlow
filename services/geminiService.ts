import { GoogleGenAI, Type } from "@google/genai";
import { ImportResult, SongSearchResult } from "../types";

// Helper to get AI instance safely
const getAi = () => {
  const key = process.env.API_KEY;
  if (!key) throw new Error("API Key is missing. Please check your Vercel Environment Variables.");
  return new GoogleGenAI({ apiKey: key });
};

export const extractSongData = async (
  fileBase64: string | null,
  mimeType: string | null,
  textInput: string | null
): Promise<ImportResult> => {
  const ai = getAi();
  const model = 'gemini-3-flash-preview';
  const parts: any[] = [];

  if (fileBase64 && mimeType) {
    parts.push({
      inlineData: { data: fileBase64, mimeType: mimeType },
    });
  }

  const prompt = `
    You are an expert music transcriber. 
    Analyze the provided content. Extract the song Title, Artist, and the Lyrics with Chords.
    Format in "ChordPro" style (chords in brackets [C]) OR standard chords-over-lyrics.
    Preserve line breaks.
  `;

  parts.push({ text: prompt });
  if (textInput) parts.push({ text: `Additional Text: ${textInput}` });

  // Define schema for strict JSON output
  const responseSchema = {
    type: Type.OBJECT,
    properties: {
      title: { type: Type.STRING },
      artist: { type: Type.STRING },
      content: { type: Type.STRING, description: "Song body with chords/lyrics" }
    },
    required: ["title", "artist", "content"]
  };

  try {
    const response = await ai.models.generateContent({
      model: model,
      contents: { parts },
      config: {
        responseMimeType: "application/json",
        responseSchema: responseSchema
      }
    });

    return JSON.parse(response.text!) as ImportResult;
  } catch (error) {
    console.error("Gemini Extract Error:", error);
    throw new Error("Failed to process file.");
  }
};

/**
 * Step 1: Search for song options
 */
export const searchSongs = async (query: string): Promise<SongSearchResult[]> => {
  const ai = getAi();
  
  const prompt = `
    Search the web for the song: "${query}".
    Find up to 3 distinct matching songs (or popular versions).
    Return a list containing the Title, Artist, and a very short snippet (e.g. "Key: G, from Album X").
  `;

  const responseSchema = {
    type: Type.ARRAY,
    items: {
      type: Type.OBJECT,
      properties: {
        title: { type: Type.STRING },
        artist: { type: Type.STRING },
        snippet: { type: Type.STRING }
      },
      required: ["title", "artist", "snippet"]
    }
  };

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: { parts: [{ text: prompt }] },
      config: {
        tools: [{ googleSearch: {} }],
        responseMimeType: "application/json",
        responseSchema: responseSchema
      }
    });

    return JSON.parse(response.text!) as SongSearchResult[];
  } catch (error) {
    console.error("Gemini Search Error:", error);
    throw new Error("Failed to search for songs.");
  }
};

/**
 * Step 2: Get full content for selected song
 */
export const getSongContent = async (title: string, artist: string): Promise<ImportResult> => {
  const ai = getAi();
  
  const prompt = `
    Find the official lyrics and guitar chords for "${title}" by "${artist}".
    Return the full content formatted with chords.
    Prefer ChordPro format (e.g. [Am] Amazing [G] Grace) if available, otherwise Chords over lyrics.
  `;

  const responseSchema = {
    type: Type.OBJECT,
    properties: {
      title: { type: Type.STRING },
      artist: { type: Type.STRING },
      content: { type: Type.STRING, description: "Full lyrics and chords" }
    },
    required: ["title", "artist", "content"]
  };

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: { parts: [{ text: prompt }] },
      config: {
        tools: [{ googleSearch: {} }],
        responseMimeType: "application/json",
        responseSchema: responseSchema
      }
    });

    return JSON.parse(response.text!) as ImportResult;
  } catch (error) {
    console.error("Gemini Content Fetch Error:", error);
    throw new Error("Failed to get song content.");
  }
};