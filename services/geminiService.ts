import { GoogleGenAI, Type } from "@google/genai";
import { ImportResult } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export const extractSongData = async (
  fileBase64: string | null,
  mimeType: string | null,
  textInput: string | null
): Promise<ImportResult> => {
  if (!process.env.API_KEY) throw new Error("API Key is missing.");

  // Use gemini-3-flash-preview for both text and multimodal tasks
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
    Return JSON.
  `;

  parts.push({ text: prompt });
  if (textInput) parts.push({ text: `Additional Text: ${textInput}` });

  return callGemini(model, parts, true); // true = strict JSON schema
};

export const findSong = async (query: string): Promise<ImportResult> => {
  if (!process.env.API_KEY) throw new Error("API Key is missing.");
  
  // We use Google Search grounding to find "existing" songs rather than generating new ones.
  const prompt = `
    Search the web for the official lyrics and guitar chords for the song: "${query}".
    Focus on finding accurate versions from reputable chord sites for artists like Elevation Worship, Hillsong, Phil Wickham, Matt Redman, Sovereign Grace, or Jesus Culture.
    
    Output the result as a valid JSON object string (do not use Markdown code blocks) with the following structure:
    {
      "title": "Exact Song Title",
      "artist": "Artist Name",
      "content": "The full lyrics with chords. Use ChordPro format (e.g. [Am] Amazing [G] Grace) if found, otherwise keep chords above lyrics."
    }
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: { parts: [{ text: prompt }] },
      config: {
        tools: [{ googleSearch: {} }], // Enable Web Search
        // We do NOT use responseMimeType: "application/json" here because Grounding responses can be unpredictable with schema.
        // We will parse the JSON manually.
      }
    });

    const text = response.text;
    if (!text) throw new Error("No response from AI");
    
    // Extract JSON from the text (it might contain grounding metadata text around it)
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
        return JSON.parse(jsonMatch[0]) as ImportResult;
    }
    throw new Error("Could not parse song data from search result.");

  } catch (error) {
    console.error("Gemini Search Error:", error);
    throw new Error("Failed to find song on the web.");
  }
};

const callGemini = async (model: string, parts: any[], useSchema: boolean): Promise<ImportResult> => {
  try {
    const config: any = {};
    if (useSchema) {
        config.responseMimeType = "application/json";
        config.responseSchema = {
          type: Type.OBJECT,
          properties: {
            title: { type: Type.STRING },
            artist: { type: Type.STRING },
            content: { type: Type.STRING, description: "Song body with chords/lyrics" }
          },
          required: ["title", "artist", "content"]
        };
    }

    const response = await ai.models.generateContent({
      model: model,
      contents: { parts },
      config: config
    });

    const text = response.text;
    if (!text) throw new Error("No response from AI");
    return JSON.parse(text) as ImportResult;
  } catch (error) {
    console.error("Gemini Error:", error);
    throw new Error("Failed to process request.");
  }
};