import { GoogleGenAI, Type, Schema } from "@google/genai";
import { TriviaQuestion, NodeType, Difficulty, Language } from '../types';

const getClient = () => {
  const apiKey = process.env.API_KEY;
  if (!apiKey) return null;
  return new GoogleGenAI({ apiKey });
};

const QuestionSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    question: {
      type: Type.STRING,
      description: "The trivia question.",
    },
    options: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
      description: "4 options.",
    },
    correctIndex: {
      type: Type.INTEGER,
      description: "Index 0-3.",
    },
    explanation: {
      type: Type.STRING,
      description: "Brief explanation.",
    },
    category: {
      type: Type.STRING,
      description: "Category (History, Geography, Culture, etc).",
    },
  },
  required: ["question", "options", "correctIndex", "explanation"],
};

const FALLBACK_QUESTIONS: TriviaQuestion[] = [
  // HISTORY
  {
    question: "Apa warna bendera Indonesia?",
    options: ["Merah Putih", "Putih Merah", "Merah Biru", "Kuning Hijau"],
    correctIndex: 0,
    explanation: "Bendera Indonesia adalah Sang Saka Merah Putih.",
    difficulty: 1,
    category: "History"
  },
  {
    question: "Siapakah presiden pertama Indonesia?",
    options: ["Soeharto", "B.J. Habibie", "Ir. Soekarno", "Jokowi"],
    correctIndex: 2,
    explanation: "Ir. Soekarno adalah proklamator dan presiden pertama RI.",
    difficulty: 1,
    category: "History"
  },
  {
    question: "Kapan Indonesia merdeka?",
    options: ["17 Agustus 1945", "28 Oktober 1928", "1 Juni 1945", "20 Mei 1908"],
    correctIndex: 0,
    explanation: "Indonesia memproklamasikan kemerdekaan pada 17 Agustus 1945.",
    difficulty: 1,
    category: "History"
  },
  {
    question: "Kerajaan Hindu tertua di Indonesia adalah?",
    options: ["Majapahit", "Kutai", "Sriwijaya", "Tarumanegara"],
    correctIndex: 1,
    explanation: "Kerajaan Kutai Martadipura di Kalimantan Timur adalah kerajaan Hindu tertua.",
    difficulty: 2,
    category: "History"
  },
  {
    question: "Pahlawan wanita dari Aceh yang melawan Belanda?",
    options: ["R.A. Kartini", "Cut Nyak Dien", "Dewi Sartika", "Martha Christina Tiahahu"],
    correctIndex: 1,
    explanation: "Cut Nyak Dien adalah pahlawan nasional dari Aceh.",
    difficulty: 2,
    category: "History"
  },
  {
    question: "Peristiwa Rengasdengklok terjadi pada tanggal?",
    options: ["16 Agustus 1945", "17 Agustus 1945", "14 Agustus 1945", "15 Agustus 1945"],
    correctIndex: 0,
    explanation: "Penculikan Soekarno-Hatta terjadi sehari sebelum proklamasi.",
    difficulty: 2,
    category: "History"
  },
  {
    question: "Siapa nama Patih Gajah Mada yang terkenal dengan Sumpah Palapa?",
    options: ["Hayam Wuruk", "Gajah Mada", "Raden Wijaya", "Kertanegara"],
    correctIndex: 1,
    explanation: "Gajah Mada adalah mahapatih Majapahit yang mengucapkan Sumpah Palapa.",
    difficulty: 1,
    category: "History"
  },

  // GEOGRAPHY
  {
    question: "Apa ibu kota Indonesia (sebelum IKN)?",
    options: ["Bandung", "Surabaya", "Jakarta", "Medan"],
    correctIndex: 2,
    explanation: "Jakarta adalah ibu kota negara Indonesia.",
    difficulty: 1,
    category: "Geography"
  },
  {
    question: "Gunung tertinggi di Indonesia adalah?",
    options: ["Gunung Rinjani", "Gunung Semeru", "Puncak Jaya", "Gunung Kerinci"],
    correctIndex: 2,
    explanation: "Puncak Jaya (Carstensz Pyramid) di Papua adalah yang tertinggi.",
    difficulty: 2,
    category: "Geography"
  },
  {
    question: "Danau terbesar di Indonesia adalah?",
    options: ["Danau Toba", "Danau Singkarak", "Danau Poso", "Danau Maninjau"],
    correctIndex: 0,
    explanation: "Danau Toba di Sumatera Utara adalah danau vulkanik terbesar.",
    difficulty: 1,
    category: "Geography"
  },
  {
    question: "Provinsi paling barat di Indonesia adalah?",
    options: ["Sumatera Utara", "Aceh", "Sumatera Barat", "Riau"],
    correctIndex: 1,
    explanation: "Aceh adalah provinsi yang terletak paling barat.",
    difficulty: 1,
    category: "Geography"
  },
  {
    question: "Selat yang memisahkan Pulau Jawa dan Sumatera?",
    options: ["Selat Sunda", "Selat Bali", "Selat Malaka", "Selat Makassar"],
    correctIndex: 0,
    explanation: "Selat Sunda terletak di antara Jawa dan Sumatera.",
    difficulty: 2,
    category: "Geography"
  },
  {
    question: "Pulau Dewata adalah julukan untuk pulau?",
    options: ["Lombok", "Bali", "Jawa", "Sumatera"],
    correctIndex: 1,
    explanation: "Bali dikenal dunia sebagai Pulau Dewata.",
    difficulty: 1,
    category: "Geography"
  },

  // FAUNA & FLORA
  {
    question: "Hewan endemik dari Nusa Tenggara Timur adalah?",
    options: ["Harimau", "Komodo", "Gajah", "Orangutan"],
    correctIndex: 1,
    explanation: "Komodo adalah kadal terbesar di dunia yang asli dari pulau Komodo.",
    difficulty: 2,
    category: "Fauna"
  },
  {
    question: "Bunga nasional Indonesia yang dijuluki Puspa Langka?",
    options: ["Melati", "Anggrek Bulan", "Rafflesia Arnoldii", "Mawar"],
    correctIndex: 2,
    explanation: "Padma Raksasa (Rafflesia Arnoldii) adalah Puspa Langka.",
    difficulty: 2,
    category: "Flora"
  },
  {
    question: "Hewan bercula satu yang dilindungi di Ujung Kulon?",
    options: ["Badak Jawa", "Gajah Sumatera", "Banteng", "Anoa"],
    correctIndex: 0,
    explanation: "Badak Jawa (Rhinoceros sondaicus) berhabitat di Ujung Kulon.",
    difficulty: 2,
    category: "Fauna"
  },

  // CUISINE
  {
    question: "Makanan khas Sumatera Barat yang mendunia adalah?",
    options: ["Gudeg", "Rendang", "Soto", "Bakso"],
    correctIndex: 1,
    explanation: "Rendang dinobatkan sebagai salah satu makanan terenak di dunia.",
    difficulty: 1,
    category: "Cuisine"
  },
  {
    question: "Makanan khas Yogyakarta yang manis adalah?",
    options: ["Pempek", "Gudeg", "Rawon", "Coto"],
    correctIndex: 1,
    explanation: "Gudeg adalah sayur nangka muda khas Jogja yang manis.",
    difficulty: 1,
    category: "Cuisine"
  },
  {
    question: "Soto Banjar berasal dari provinsi?",
    options: ["Kalimantan Selatan", "Jawa Timur", "Sulawesi Selatan", "Sumatera Utara"],
    correctIndex: 0,
    explanation: "Soto Banjar adalah makanan khas suku Banjar, Kalimantan Selatan.",
    difficulty: 2,
    category: "Cuisine"
  },

  // CULTURE
  {
    question: "Rumah adat dari Sumatera Barat disebut?",
    options: ["Rumah Gadang", "Joglo", "Tongkonan", "Honai"],
    correctIndex: 0,
    explanation: "Rumah Gadang dengan atap gonjong adalah khas Minangkabau.",
    difficulty: 1,
    category: "Culture"
  },
  {
    question: "Alat musik sasando berasal dari?",
    options: ["Jawa Barat", "Nusa Tenggara Timur", "Papua", "Maluku"],
    correctIndex: 1,
    explanation: "Sasando adalah alat musik petik dari Pulau Rote, NTT.",
    difficulty: 2,
    category: "Culture"
  },
  {
    question: "Tari Kecak berasal dari?",
    options: ["Jawa Tengah", "Bali", "Aceh", "Sumatera Barat"],
    correctIndex: 1,
    explanation: "Tari Kecak adalah pertunjukan seni khas Bali.",
    difficulty: 1,
    category: "Culture"
  },
  {
    question: "Senjata tradisional khas Jawa Barat?",
    options: ["Keris", "Kujang", "Rencong", "Mandau"],
    correctIndex: 1,
    explanation: "Kujang adalah senjata pusaka tradisional masyarakat Sunda.",
    difficulty: 2,
    category: "Culture"
  }
];

export const generateQuestion = async (
  difficultyLevel: Difficulty,
  layer: number,
  nodeType: NodeType,
  language: Language,
  usedQuestions: string[] = []
): Promise<TriviaQuestion> => {
  const ai = getClient();
  
  // Use fallback if no API key
  if (!ai) return getFallbackQuestion(difficultyLevel, usedQuestions);

  try {
    // Reduced timeout to 1.5s for faster fallback
    const timeoutPromise = new Promise<null>((resolve) => setTimeout(() => resolve(null), 1500));
    
    const apiPromise = (async () => {
        let difficultyPrompt = "Easy (Elementary level)";
        if (difficultyLevel === Difficulty.MEDIUM) difficultyPrompt = "Medium (General Knowledge)";
        if (difficultyLevel === Difficulty.HARD) difficultyPrompt = "Hard (Specific/Rare Trivia)";

        const langPrompt = language === Language.INDONESIAN ? "Bahasa Indonesia" : "English";
        
        const systemInstruction = `Generate a unique trivia question about Indonesia.
        Topics: History, Geography, Culture, National Figures, Cuisine, Fauna.
        Difficulty: ${difficultyPrompt}.
        Language: ${langPrompt}.
        Keep it concise.
        Return JSON.`;
        
        console.log(`[Gemini] Requesting question with Lang: ${langPrompt}`);

        const response = await ai.models.generateContent({
          model: 'gemini-3-flash-preview',
          contents: "Generate one Indonesian trivia question.",
          config: {
            systemInstruction,
            responseMimeType: "application/json",
            responseSchema: QuestionSchema,
          }
        });
        const text = response.text;
        console.log(`[Gemini] Raw Response:`, text);
        if (!text) throw new Error("No text");
        return JSON.parse(text) as TriviaQuestion;
    })();

    const result = await Promise.race([apiPromise, timeoutPromise]);
    if (result) return result;
    
    // Timeout hit
    return getFallbackQuestion(difficultyLevel, usedQuestions);

  } catch (error) {
    console.error("Gemini Error:", error);
    return getFallbackQuestion(difficultyLevel, usedQuestions);
  }
};

const getFallbackQuestion = (difficulty: Difficulty, usedQuestions: string[]): TriviaQuestion => {
  // Filter out used questions
  const available = FALLBACK_QUESTIONS.filter(q => !usedQuestions.includes(q.question));
  
  if (available.length === 0) {
      // If all used, reset pool (or just pick random)
      return FALLBACK_QUESTIONS[Math.floor(Math.random() * FALLBACK_QUESTIONS.length)];
  }

  // Simple random fallback from available
  const q = available[Math.floor(Math.random() * available.length)];
  return q;
};
