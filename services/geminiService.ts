import { GoogleGenAI, Type } from "@google/genai";
import { ImportResult, SongSearchResult } from "../types";

// Helper to get AI instance safely
const getAi = () => {
  // The API key must be obtained exclusively from the environment variable process.env.API_KEY.
  // We assume this variable is pre-configured by the build tool (Vite define plugin).
  const key = process.env.API_KEY;

  if (!key) {
    throw new Error("API Key is missing. Go to Settings -> Environment Variables and ensure 'API_KEY' is set.");
  }
  
  return new GoogleGenAI({ apiKey: key });
};

// Helper to safely parse JSON from AI response (which might contain Markdown)
const parseJson = (text: string | undefined): any => {
  if (!text) throw new Error("No response from AI");
  
  // Remove markdown code blocks (```json ... ```)
  const cleaned = text.replace(/```json/g, '').replace(/```/g, '');
  
  // Find the first '{' or '[' and the last '}' or ']'
  const firstOpen = cleaned.search(/(\{|\[)/);
  const lastClose = cleaned.search(/(\}|\])[^}\]]*$/); // simplistic find last

  if (firstOpen !== -1 && lastClose !== -1) {
     const jsonStr = cleaned.substring(firstOpen, lastClose + 1);
     try {
       return JSON.parse(jsonStr);
     } catch (e) {
       console.error("JSON Parse failed", e);
       throw new Error("AI returned invalid JSON format");
     }
  }
  throw new Error("Could not find structured data in AI response");
};

// 1. File Import (No Search Tool) -> Safe to use Strict Schema
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

  // Schema is allowed here because we are NOT using tools
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
  } catch (error: any) {
    console.error("Gemini Extract Error:", error);
    throw new Error(error.message || "Failed to process file.");
  }
};

// 2. Search Songs (Uses Google Search) -> DO NOT use Strict Schema (per guidelines)
export const searchSongs = async (query: string): Promise<SongSearchResult[]> => {
  const ai = getAi();
  
  const prompt = `
    Search the web for the song: "${query}".
    Find up to 3 distinct matching songs (or popular versions).
    
    RETURN JSON ONLY.
    Output a JSON array of objects with these properties:
    - title: string
    - artist: string
    - snippet: string (short description, e.g. "Key: G")
    
    Example: [{"title": "A", "artist": "B", "snippet": "C"}]
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: { parts: [{ text: prompt }] },
      config: {
        tools: [{ googleSearch: {} }] 
        // Note: responseMimeType/Schema removed to prevent conflicts with Search Tool
      }
    });

    return parseJson(response.text) as SongSearchResult[];
  } catch (error: any) {
    console.error("Gemini Search Error:", error);
    throw new Error(error.message || "Failed to search for songs.");
  }
};

// 3. Get Full Content (Uses Google Search) -> DO NOT use Strict Schema
export const getSongContent = async (title: string, artist: string): Promise<ImportResult> => {
  const ai = getAi();
  
  const prompt = `
    Find the official lyrics and guitar chords for "${title}" by "${artist}".
    
    RETURN JSON ONLY.
    Output a JSON object with:
    - title: string
    - artist: string
    - content: string (Full lyrics with chords. Prefer ChordPro format [Am] if found.)
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: { parts: [{ text: prompt }] },
      config: {
        tools: [{ googleSearch: {} }]
      }
    });

    return parseJson(response.text) as ImportResult;
  } catch (error: any) {
    console.error("Gemini Content Fetch Error:", error);
    throw new Error(error.message || "Failed to get song content.");
  }
};