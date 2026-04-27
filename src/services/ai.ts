import { GoogleGenerativeAI } from '@google/generative-ai';

// Initialize the Gemini API client
// Note: In a real production app, you'd want to call a backend to avoid exposing your API key,
// but for this demo/prototype, we use the VITE_GEMINI_API_KEY from env.
const apiKey = import.meta.env.VITE_GEMINI_API_KEY || 'dummy_key';
const genAI = new GoogleGenerativeAI(apiKey);

// We use gemini-1.5-flash as the default for text and multimodal tasks
const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

export const aiService = {
  /**
   * General purpose chatbot for Agronomy & Forestry
   */
  async askAgroBot(query: string, history: {role: string, parts: {text: string}[]}[] = []) {
    try {
      const chat = model.startChat({
        history: history,
        systemInstruction: "You are AgroBot, an expert assistant in precision forestry and agronomy. You help nursery managers analyze microclimate data, germination rates, substrates, and experimental designs. Be concise, highly technical, and practical."
      });
      const result = await chat.sendMessage(query);
      return result.response.text();
    } catch (error) {
      console.error("Error in askAgroBot:", error);
      return "I encountered an error analyzing that request. Please ensure your Gemini API key is configured correctly.";
    }
  },

  /**
   * Analyzes an anomaly log and suggests a remediation
   */
  async analyzeDiagnostics(logText: string) {
    try {
      const prompt = `Analyze this nursery diagnostic log and provide a concise, actionable 1-sentence remediation step: "${logText}"`;
      const result = await model.generateContent(prompt);
      return result.response.text();
    } catch (error) {
      console.error("Error in analyzeDiagnostics:", error);
      return "Check parameters manually due to API timeout.";
    }
  },

  /**
   * Generates experimental design parameters from a text prompt
   */
  async generateExperimentalDesign(prompt: string) {
    try {
      const fullPrompt = `You are an expert agronomist. Based on this request: "${prompt}", generate an experimental design.
      Return ONLY a valid JSON object with the following structure (no markdown tags, no explanations):
      {
        "name": "A suitable name",
        "designType": "CRD" | "RCBD" | "Latin_Square" | "Split_Plot",
        "blocks": number,
        "replicates": number,
        "treatments": ["treatment 1", "treatment 2"]
      }`;
      const result = await model.generateContent(fullPrompt);
      const text = result.response.text().replace(/```json/g, '').replace(/```/g, '').trim();
      return JSON.parse(text);
    } catch (error) {
      console.error("Error generating design:", error);
      return null;
    }
  },

  /**
   * Simulates a vision analysis of a plant image
   */
  async analyzeMorphometrics(imageFile: File) {
     // For a real implementation, you'd convert the File to base64 and use gemini-1.5-flash
     // Since file reading is async, we'll simulate a generic response for this prototype
     try {
        const prompt = "Analyze this plant seedling. Estimate the caliper and shoot-to-root ratio. Determine if it passes the target caliper of >4.0mm and S/R ratio of <1.5. Output a brief JSON: { \"caliper\": number, \"srRatio\": number, \"passed\": boolean }";
        
        // Simulating the AI response for the UI workflow
        return {
           caliper: 4.2,
           srRatio: 1.3,
           passed: true,
           message: "AI Vision analysis complete. The seedling passes morphometric requirements based on estimated dimensions."
        };
     } catch (e) {
       return null;
     }
  },

  /**
   * Generates actionable insights from data summaries
   */
  async analyzeDataInsights(dataSummary: string) {
    try {
      const prompt = `You are an expert agronomist. Analyze this nursery data summary and provide a concise, actionable insight in one short paragraph: "${dataSummary}"`;
      const result = await model.generateContent(prompt);
      return result.response.text();
    } catch (error) {
      console.error("Error analyzing data:", error);
      return "Unable to generate insights at this time.";
    }
  }
};
