import express from "express";
import path from "path";
import dotenv from "dotenv";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type, Modality } from "@google/genai";
import { INITIAL_ENTRIES } from "./src/data.ts";
import { DictionaryEntry, ExampleItem, RelatedTermItem } from "./src/types.ts";
import { initializeApp, getApps, applicationDefault } from "firebase-admin/app";
import { getFirestore, Firestore } from "firebase-admin/firestore";

dotenv.config();

const app = express();
const PORT = Number(process.env.PORT || 3000);

app.use(express.json({ limit: "50mb" }));

import fs from "fs";

// Persistent JSON file path so dictionary data survives server reloads
const STORE_PATH = path.resolve(process.cwd(), "src/dictionary_store.json");
const CLASSES_STORE_PATH = path.resolve(process.cwd(), "src/classes_store.json");

let dictionaryStore: DictionaryEntry[] = [];
let classesStore: any[] = [];

// Initialize Firebase Admin SDK. In Cloud Run this uses Application Default Credentials
// from the service account; locally it can use GOOGLE_APPLICATION_CREDENTIALS or gcloud ADC.
const firebaseConfigPath = path.resolve(process.cwd(), "firebase-applet-config.json");
let db: Firestore | null = null;

if (fs.existsSync(firebaseConfigPath)) {
  try {
    const firebaseConfig = JSON.parse(fs.readFileSync(firebaseConfigPath, "utf-8"));
    const firebaseApp = getApps().length === 0
      ? initializeApp({
          projectId: firebaseConfig.projectId,
          storageBucket: firebaseConfig.storageBucket,
          credential: applicationDefault(),
        })
      : getApps()[0];

    db = getFirestore(firebaseApp, firebaseConfig.firestoreDatabaseId);
    console.log("Firebase Admin Firestore initialized successfully with database ID:", firebaseConfig.firestoreDatabaseId);
  } catch (err: any) {
    console.error("Failed to initialize Firebase Admin Firestore:", err.message);
  }
} else {
  console.warn("No firebase-applet-config.json found. Firebase Firestore cannot be initialized.");
}

async function initFirestoreStore() {
  if (!db) {
    console.warn("Firestore not available. Falling back to local file stores.");
    loadFallbackLocalStores();
    return;
  }

  try {
    // 1. Initialize Dictionary Entries
    console.log("Initializing dictionary entries from Firestore...");
    const entriesSnapshot = await db.collection("entries").get();
    
    if (entriesSnapshot.empty) {
      console.log("Firestore 'entries' collection is empty. Seeding from local data...");
      let initialData: DictionaryEntry[] = [];
      if (fs.existsSync(STORE_PATH)) {
        try {
          initialData = JSON.parse(fs.readFileSync(STORE_PATH, "utf-8"));
        } catch (e) {
          initialData = [...INITIAL_ENTRIES];
        }
      } else {
        initialData = [...INITIAL_ENTRIES];
      }

      // Seed entries
      for (const entry of initialData) {
        await db.collection("entries").doc(entry.id).set(entry);
      }
      console.log(`Successfully seeded ${initialData.length} entries to Firestore.`);
      dictionaryStore = initialData;
    } else {
      const loadedEntries: DictionaryEntry[] = [];
      entriesSnapshot.forEach((docSnap) => {
        loadedEntries.push(docSnap.data() as DictionaryEntry);
      });
      dictionaryStore = loadedEntries;
      console.log(`Loaded ${dictionaryStore.length} entries from Firestore.`);
    }

    // 2. Initialize Classes
    console.log("Initializing classes from Firestore...");
    const classesSnapshot = await db.collection("classes").get();

    if (classesSnapshot.empty) {
      console.log("Firestore 'classes' collection is empty. Seeding from local data...");
      let initialClasses: any[] = [];
      if (fs.existsSync(CLASSES_STORE_PATH)) {
        try {
          initialClasses = JSON.parse(fs.readFileSync(CLASSES_STORE_PATH, "utf-8"));
        } catch (e) {
          initialClasses = [];
        }
      }

      // Seed classes
      for (const cls of initialClasses) {
        await db.collection("classes").doc(cls.id).set(cls);
      }
      console.log(`Successfully seeded ${initialClasses.length} classes to Firestore.`);
      classesStore = initialClasses;
    } else {
      const loadedClasses: any[] = [];
      classesSnapshot.forEach((docSnap) => {
        loadedClasses.push(docSnap.data());
      });
      classesStore = loadedClasses;
      console.log(`Loaded ${classesStore.length} classes from Firestore.`);
    }

  } catch (err: any) {
    console.error("Error during Firestore initialization:", err.message);
    loadFallbackLocalStores();
  }
}

function loadFallbackLocalStores() {
  try {
    if (fs.existsSync(STORE_PATH)) {
      console.log("Loading fallback dictionary from persistent file:", STORE_PATH);
      dictionaryStore = JSON.parse(fs.readFileSync(STORE_PATH, "utf-8"));
    } else {
      dictionaryStore = [...INITIAL_ENTRIES];
    }
  } catch (e: any) {
    dictionaryStore = [...INITIAL_ENTRIES];
  }

  try {
    if (fs.existsSync(CLASSES_STORE_PATH)) {
      console.log("Loading fallback classes from persistent file:", CLASSES_STORE_PATH);
      classesStore = JSON.parse(fs.readFileSync(CLASSES_STORE_PATH, "utf-8"));
    } else {
      classesStore = [];
    }
  } catch (e: any) {
    classesStore = [];
  }
}

// Call the async initialization
initFirestoreStore();

// Update/Save helpers for Firestore
async function saveEntryToFirestore(entry: DictionaryEntry) {
  if (db) {
    try {
      await db.collection("entries").doc(entry.id).set(entry);
      console.log(`Saved entry "${entry.en}" to Firestore.`);
    } catch (err: any) {
      console.error(`Failed to save entry "${entry.en}" to Firestore:`, err.message);
    }
  }
}

async function deleteEntryFromFirestore(id: string) {
  if (db) {
    try {
      await db.collection("entries").doc(id).delete();
      console.log(`Deleted entry "${id}" from Firestore.`);
    } catch (err: any) {
      console.error(`Failed to delete entry "${id}" from Firestore:`, err.message);
    }
  }
}

async function saveClassToFirestore(classroom: any) {
  if (db) {
    try {
      await db.collection("classes").doc(classroom.id).set(classroom);
      console.log(`Saved class "${classroom.name}" to Firestore.`);
    } catch (err: any) {
      console.error(`Failed to save class "${classroom.name}" to Firestore:`, err.message);
    }
  }
}

async function deleteClassFromFirestore(id: string) {
  if (db) {
    try {
      await db.collection("classes").doc(id).delete();
      console.log(`Deleted class "${id}" from Firestore.`);
    } catch (err: any) {
      console.error(`Failed to delete class "${id}" from Firestore:`, err.message);
    }
  }
}

// Initialize Gemini SDK lazily to prevent crashing if GEMINI_API_KEY is not defined
let aiClient: GoogleGenAI | null = null;

function getAiClient(): GoogleGenAI {
  if (!aiClient) {
    const key = process.env.GEMINI_API_KEY;
    if (!key || key === "MY_GEMINI_API_KEY") {
      throw new Error("GEMINI_API_KEY is not configured or left as default in Settings/Environments.");
    }
    aiClient = new GoogleGenAI({
      apiKey: key,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build",
        },
      },
    });
  }
  return aiClient;
}

// Resilient wrapper with automatic retries and model fallback mechanism
async function generateContentWithFallback(
  client: GoogleGenAI,
  params: {
    contents: any;
    config?: any;
    primaryModel?: string;
  }
) {
  const primaryModel = params.primaryModel || "gemini-3.5-flash";
  const modelsToTry = [
    primaryModel,
    "gemini-flash-latest",
    "gemini-3.1-flash-lite"
  ];
  
  // Deduplicate list of models
  const uniqueModels = Array.from(new Set(modelsToTry));

  let lastError: any = null;

  for (const model of uniqueModels) {
    const maxRetries = 2;
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        console.log(`[Gemini SDK] Attempting generation with model: ${model} (attempt ${attempt}/${maxRetries})`);
        const response = await client.models.generateContent({
          model: model,
          contents: params.contents,
          config: params.config
        });
        if (response && response.text) {
          return response;
        }
        throw new Error("Response was empty or lacked text content.");
      } catch (err: any) {
        lastError = err;
        console.warn(`[Gemini SDK] Error with model ${model} during attempt ${attempt}:`, err.message || err);
        
        // If it's a 429 or 503, wait briefly before retrying or switching models.
        const isNetworkOrQuota = err.message?.includes("503") || err.message?.includes("429") || err.status === 429 || err.status === 503;
        if (isNetworkOrQuota && attempt < maxRetries) {
          const delay = attempt * 1000;
          await new Promise((resolve) => setTimeout(resolve, delay));
        }
      }
    }
  }

  throw lastError || new Error("All Gemini model attempts failed.");
}

async function generateWith9Router(
  endpoint: string,
  apiKey: string,
  model: string,
  prompt: string,
  useJson = true
) {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (apiKey) {
    headers["Authorization"] = `Bearer ${apiKey}`;
  }
  
  const url = `${endpoint.replace(/\/+$/, '')}/chat/completions`;
  console.log(`[9Router LLM] Proxying prompt to: ${url} using model: ${model}`);
  
  const body: any = {
    model,
    messages: [
      {
        role: "system",
        content: "You are a professional dictionary assistant. You must return your response in the requested format."
      },
      {
        role: "user",
        content: prompt
      }
    ]
  };

  if (useJson) {
    body.response_format = { type: "json_object" };
  }

  const response = await fetch(url, {
    method: "POST",
    headers,
    body: JSON.stringify(body)
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`9Router Error (${response.status}): ${errorText}`);
  }

  const result = await response.json();
  const choiceText = result?.choices?.[0]?.message?.content;
  if (!choiceText) {
    throw new Error("Invalid or empty response from 9Router chat completions");
  }

  return choiceText;
}

function cleanJsonResponse(text: string): string {
  let cleaned = text.trim();
  if (cleaned.startsWith("```")) {
    const lines = cleaned.split("\n");
    if (lines[0].startsWith("```")) {
      lines.shift();
    }
    if (lines[lines.length - 1].startsWith("```")) {
      lines.pop();
    }
    cleaned = lines.join("\n").trim();
  }
  return cleaned;
}

// ==========================================
// OFFLINE LOCAL FALLBACK GENERATORS
// ==========================================

// Resilient substring segmenter to match dictionary terms in text case-insensitively
function localSegment(sentence: string, store: DictionaryEntry[]) {
  // Sort entries by headword length descending to match longest possible chunks first
  const sortedEntries = [...store]
    .filter(e => e.en && e.en.trim().length > 0)
    .sort((a, b) => b.en.length - a.en.length);

  interface ActiveMatch {
    start: number;
    end: number;
    text: string;
    entry: DictionaryEntry;
  }

  const matches: ActiveMatch[] = [];

  // Find all non-overlapping matches
  for (const entry of sortedEntries) {
    const term = entry.en.trim().toLowerCase();
    const regexStr = term.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
    // Using word boundary if it's alphanumeric, otherwise match raw
    const regex = /^[a-zA-Z0-9]/.test(term) && /[a-zA-Z0-9]$/.test(term)
      ? new RegExp(`\\b${regexStr}\\b`, 'gi')
      : new RegExp(regexStr, 'gi');

    let match;
    while ((match = regex.exec(sentence)) !== null) {
      const start = match.index;
      const end = start + match[0].length;
      
      // Check if this overlaps with any existing captured match
      const isOverlapping = matches.some(m => 
        (start >= m.start && start < m.end) || 
        (end > m.start && end <= m.end) ||
        (m.start >= start && m.start < end)
      );

      if (!isOverlapping) {
        matches.push({
          start,
          end,
          text: match[0],
          entry
        });
      }
    }
  }

  // Sort matched segments by start position
  matches.sort((a, b) => a.start - b.start);

  const chunks: Array<{
    text: string;
    color: string | null;
    translation?: string;
    explanation?: string;
    entry_id?: string;
  }> = [];

  let lastIndex = 0;
  for (const match of matches) {
    // Add the un-matched segment preceding this match
    if (match.start > lastIndex) {
      chunks.push({
        text: sentence.substring(lastIndex, match.start),
        color: null
      });
    }

    // Add the matched segment
    chunks.push({
      text: sentence.substring(match.start, match.end),
      color: match.entry.color || "pink",
      translation: match.entry.vn,
      explanation: match.entry.definition || `Cụm từ '${match.entry.en}' hữu dụng.`,
      entry_id: match.entry.id
    });

    lastIndex = match.end;
  }

  // Add any trailing unmatched segment
  if (lastIndex < sentence.length) {
    chunks.push({
      text: sentence.substring(lastIndex),
      color: null
    });
  }

  // If no chunks are matched, we just return the full sentence as one blue chunk
  if (chunks.length === 0 || (chunks.length === 1 && chunks[0].color === null)) {
    return {
      sentence,
      chunks: [
        { 
          text: sentence, 
          color: "blue", 
          translation: "Phân tích ngữ nghĩa câu hoàn chỉnh", 
          explanation: "Tính năng bóc tách Chunks thông minh đã kích hoạt chế độ ngoại tuyến an toàn vì Gemini đang bận rộn. Bạn vẫn có thể nghe đọc câu bằng loa bên dưới!" 
        }
      ]
    };
  }

  return {
    sentence,
    chunks
  };
}

// Generate fallback examples using offline stored equivalents or synthetic templates
function localGenerateExamples(en: string, vn: string, pos: string, color: string) {
  const match = dictionaryStore.find(e => e.en.toLowerCase().trim() === en.toLowerCase().trim());
  if (match && match.examples && match.examples.length > 0) {
    console.log(`[Offline Fallback] Matching static examples found for "${en}"`);
    return match.examples.map(ex => ({
      text_en: ex.text_en,
      text_vn: ex.text_vn
    }));
  }

  return [
    {
      text_en: `I always try to use "${en}" when communicating or writing.`,
      text_vn: `Tôi luôn cố gắng sử dụng lọc lựa cụm "${vn || en}" khi giao tiếp hoặc viết lách.`
    },
    {
      text_en: `She explained that understanding "${en}" makes our conversation sound much more authentic.`,
      text_vn: `Cô ấy giải thích rằng việc nắm vững "${vn || en}" giúp cuộc hội thoại của chúng ta nghe tự nhiên hơn nhiều.`
    },
    {
      text_en: `Bear in mind that repeating "${en}" over and over is an excellent practice.`,
      text_vn: `Hãy nhớ rằng việc lặp đi lặp lại "${vn || en}" là một phương pháp cực kỳ tốt để luyện tập.`
    }
  ];
}

// Generate fallback codemix phrases in case of offline availability
function localGenerateCodemix(en: string, vn: string) {
  const match = dictionaryStore.find(e => e.en.toLowerCase().trim() === en.toLowerCase().trim());
  if (match && match.examples) {
    const codemixList = match.examples.filter(ex => ex.type === "codemix");
    if (codemixList.length > 0) {
      console.log(`[Offline Fallback] Matching codemix examples found for "${en}"`);
      return codemixList.map(ex => ({
        text_en: ex.text_en,
        text_vn: ex.text_vn
      }));
    }
  }

  return [
    {
      text_en: `Trong cuộc sống hàng ngày, sử dụng '${en}' giúp diễn đạt ý rất tự nhiên.`,
      text_vn: `In daily life, utilizing '${en}' (meaning: ${vn || 'this'}) helps express ideas very naturally.`
    },
    {
      text_en: `Hôm nay tui vừa học được cụm từ '${en}', công nhận áp dụng vào giao tiếp đỉnh thật!`,
      text_vn: `Today I just learned the phrase '${en}', I must admit applying it to communication is truly amazing!`
    },
    {
      text_en: `Mọi người nhớ '${en}' khi làm bài tập tiếng Anh nhé, cực kỳ hữu ích luôn.`,
      text_vn: `Everyone remember '${en}' when doing English exercises, it is extremely useful.`
    }
  ];
}

// Global cached TTS records to avoid repeatedly billing for the same text
const ttsCache: { [key: string]: string } = {};

// ==========================================
// API ROUTES
// ==========================================

const dictionaryRouter = express.Router();
const teacherRouter = express.Router();

app.use("/api", dictionaryRouter);
app.use("/api", teacherRouter);

// Get all classes
teacherRouter.get("/classes", (req, res) => {
  try {
    res.json(classesStore);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Create a new class
teacherRouter.post("/classes", async (req, res) => {
  try {
    const { name, description } = req.body;
    if (!name) return res.status(400).json({ error: "Missing class name" });

    const newClass = {
      id: "class-" + Date.now(),
      name,
      description: description || "",
      studentCount: 0,
      assignedChunks: [],
      announcements: []
    };

    classesStore.push(newClass);
    await saveClassToFirestore(newClass);
    res.json(newClass);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Update a class
teacherRouter.put("/classes/:id", async (req, res) => {
  try {
    const id = req.params.id;
    const updates = req.body;
    const index = classesStore.findIndex(c => c.id === id);
    if (index === -1) return res.status(404).json({ error: "Class not found" });

    classesStore[index] = { ...classesStore[index], ...updates };
    await saveClassToFirestore(classesStore[index]);
    res.json(classesStore[index]);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Delete a class
teacherRouter.delete("/classes/:id", async (req, res) => {
  try {
    const id = req.params.id;
    classesStore = classesStore.filter(c => c.id !== id);
    await deleteClassFromFirestore(id);
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Get all entries
dictionaryRouter.get("/entries", (req, res) => {
  try {
    res.json(dictionaryStore);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Search vocabulary
dictionaryRouter.get("/search", (req, res) => {
  try {
    const query = (req.query.q as string || "").toLowerCase().trim();
    const color = req.query.color as string || "";

    let results = dictionaryStore;

    if (color) {
      results = results.filter(e => e.color === color);
    }

    if (query) {
      results = results.filter(e => 
        e.vn.toLowerCase().includes(query) || 
        e.en.toLowerCase().includes(query) ||
        (e.tags && e.tags.some(t => t.toLowerCase().includes(query)))
      );
    }

    res.json(results);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Create/Update a word entry (Teacher dashboard write and compile)
teacherRouter.post("/entries", async (req, res) => {
  try {
    const entryData: DictionaryEntry = req.body;
    if (!entryData.en || !entryData.vn) {
      return res.status(400).json({ error: "Missing headwords for either English (en) or Vietnamese (vn)" });
    }

    const existingIndex = dictionaryStore.findIndex(e => e.id === entryData.id);
    const updatedEntry: DictionaryEntry = {
      ...entryData,
      id: entryData.id || entryData.en.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
      updated_at: new Date().toISOString(),
    };

    if (existingIndex >= 0) {
      dictionaryStore[existingIndex] = updatedEntry;
    } else {
      dictionaryStore.push(updatedEntry);
    }

    await saveEntryToFirestore(updatedEntry);

    res.json({ success: true, entry: updatedEntry });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Update recommended vocabulary flags
teacherRouter.post("/entries/recommendations", async (req, res) => {
  try {
    const { recommendedIds } = req.body;
    if (!Array.isArray(recommendedIds)) {
      return res.status(400).json({ error: "recommendedIds must be an array of strings" });
    }
    
    const savePromises: Promise<any>[] = [];
    dictionaryStore = dictionaryStore.map(entry => {
      const isRec = recommendedIds.includes(entry.id);
      if (entry.isRecommended !== isRec) {
        const updated = { ...entry, isRecommended: isRec };
        savePromises.push(saveEntryToFirestore(updated));
        return updated;
      }
      return entry;
    });

    await Promise.all(savePromises);
    res.json({ success: true, count: recommendedIds.length });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Bulk Import multiple dict entries
teacherRouter.post("/entries/bulk", async (req, res) => {
  try {
    const entriesList: DictionaryEntry[] = req.body;
    if (!Array.isArray(entriesList)) {
      return res.status(400).json({ error: "Payload must be an array of dictionary entries" });
    }

    const importedResult: DictionaryEntry[] = [];
    let addedCount = 0;
    let updatedCount = 0;
    const savePromises: Promise<any>[] = [];

    for (const entryData of entriesList) {
      if (!entryData.en || !entryData.vn) continue;

      const cleanId = entryData.id?.trim() || entryData.en.toLowerCase().replace(/[^a-z0-9]+/g, "-");
      const existingIndex = dictionaryStore.findIndex(e => e.id === cleanId);

      const updatedEntry: DictionaryEntry = {
        color: "pink", // fallback default
        pos: "phrase",
        ipa: "",
        definition: "",
        examples: [],
        related_terms: [],
        teacher_audios: [],
        status: "draft",
        id: cleanId,
        ...entryData,
        updated_at: new Date().toISOString()
      };

      if (existingIndex >= 0) {
        // Merge or replace
        dictionaryStore[existingIndex] = {
          ...dictionaryStore[existingIndex],
          ...updatedEntry
        };
        updatedCount++;
      } else {
        dictionaryStore.push(updatedEntry);
        addedCount++;
      }
      importedResult.push(updatedEntry);
      savePromises.push(saveEntryToFirestore(dictionaryStore[existingIndex >= 0 ? existingIndex : dictionaryStore.length - 1]));
    }

    await Promise.all(savePromises);

    res.json({
      success: true,
      added: addedCount,
      updated: updatedCount,
      total_processed: importedResult.length
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Delete an entry
teacherRouter.delete("/entries/:id", async (req, res) => {
  try {
    const id = req.params.id;
    dictionaryStore = dictionaryStore.filter(e => e.id !== id);
    await deleteEntryFromFirestore(id);
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Proxy route to import Google Sheet values securely
teacherRouter.post("/sheets/import", async (req, res) => {
  try {
    const { spreadsheetId, gid, range, token } = req.body;
    if (!spreadsheetId) {
      return res.status(400).json({ error: "Spreadsheet ID is required" });
    }

    let csvText = "";
    const isPublishedToWeb = spreadsheetId.startsWith("2PACX-") || (spreadsheetId.length > 50 && spreadsheetId.includes("2PACX-"));

    // Respect Authorization header if supplied by client
    const authHeader = req.headers.authorization || (token ? `Bearer ${token}` : null);

    let fetchSuccess = false;

    if (authHeader && !isPublishedToWeb) {
      try {
        // Authenticated Mode: Fetch via Official Google Sheets API
        const targetRange = range || "Sheet1!A:K";
        const apiUrl = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(targetRange)}`;
        console.log(`[Google Sheets] Proxying private fetch directly to: ${apiUrl}`);

        const apiResponse = await fetch(apiUrl, {
          headers: {
            Authorization: authHeader,
            Accept: "application/json",
          },
        });

        if (apiResponse.ok) {
          const data: any = await apiResponse.json();
          if (data.values && Array.isArray(data.values)) {
            // Format cells to standard CSV structure for our parsing engine
            csvText = data.values.map((row: any[]) => {
              return row.map(val => {
                const stringVal = String(val || "").replace(/"/g, '""');
                return stringVal.includes(",") || stringVal.includes("\n") || stringVal.includes('"')
                  ? `"${stringVal}"`
                  : stringVal;
              }).join(",");
            }).join("\n");
            
            fetchSuccess = true;
          }
        } else {
          console.warn(`[Google Sheets] Authenticated API call failed with status ${apiResponse.status}. Attempting public fallback export...`);
        }
      } catch (authErr: any) {
        console.warn(`[Google Sheets] Authenticated fetch failed: ${authErr.message}. Attempting public fallback export...`);
      }
    }

    if (!fetchSuccess) {
      // Public Export Mode: Fetch CSV export directly without authorization (highly fast!)
      let exportUrl = `https://docs.google.com/spreadsheets/d/${spreadsheetId}/export?format=csv&gid=${gid || 0}`;
      if (isPublishedToWeb) {
        exportUrl = `https://docs.google.com/spreadsheets/d/e/${spreadsheetId}/pub?output=csv&gid=${gid || 0}`;
      }
      console.log(`[Google Sheets] Proxying public CSV export fetch directly to: ${exportUrl}`);

      const exportResponse = await fetch(exportUrl);
      if (!exportResponse.ok) {
        throw new Error("Không thể xuất Google Sheet dưới dạng CSV. Hãy đảm bảo tệp đã chia sẻ dạng 'Bất kỳ ai có đường liên kết đều có thể xem', hoặc Đăng nhập Google để truy cập tệp riêng tư.");
      }
      csvText = await exportResponse.text();

      // Detection for redirected private sheet login page returned as HTML status 200
      const trimmedCsv = csvText.trim().toLowerCase();
      if (trimmedCsv.startsWith("<!doctype html") || trimmedCsv.startsWith("<html") || trimmedCsv.includes("<body") || trimmedCsv.includes("google loginservice")) {
        throw new Error("Google Sheet này chưa được mở khóa công khai. Vui lòng chia sẻ tệp với quyền 'Bất kỳ ai có đường liên kết đều có thể xem', hoặc sử dụng nút Đăng nhập tài khoản Google phía trên để cấp quyền truy cập.");
      }
    }

    res.json({ success: true, csvText });
  } catch (error: any) {
    console.error("Google Sheets import exception:", error);
    res.status(500).json({ error: error.message || "Failed to parse Google Sheets request." });
  }
});

// AI Example Generator using Gemini 3.5 Flash
teacherRouter.post("/ai/examples", async (req, res) => {
  const { vn, en, color, pos, count = 3, type = "full_english", ninerouter_url, ninerouter_key, ninerouter_llm_model } = req.body;
  if (!en) {
    return res.status(400).json({ error: "English word/phrase 'en' is required for AI generation" });
  }

  try {
    let typeInstructions = "";
    if (type === "code_mixing") {
      typeInstructions = "Generate code-mixing examples (Vietnamese sentences inserting English terms naturally like Vietnamese Gen Z/office workers do).";
    } else if (type === "both") {
      typeInstructions = "Generate a mix of pure English sentences and code-mixing sentences.";
    } else {
      typeInstructions = "Generate pure full English sentences.";
    }

    const prompt = `Act as an expert English trainer and bilingual dictionary writer. 
Generate ${count} highly natural, authentic example sentences for this dictionary entry:
English Chunk/Word: "${en}"
Part of Speech: "${pos || 'phrase'}"
Vietnamese translation: "${vn}"
Color-coded category is "${color}" (where 'green' is gap filler, 'blue' is sentence frame, 'red' is idiom, 'pink' is key term).

Instructions:
${typeInstructions}
Format each example to use "${en}" perfectly in actual conversation.

Return the output in clean, parseable JSON representing an array of objects. Do not wrap in markdown blocks, except for standard json.
Example schema output format:
[
  { "text_en": "I was late, but to cut a long story short, we got the plane.", "text_vn": "Tôi đã bị trễ, nhưng nói ngắn gọn thì chúng tôi vẫn bắt kịp máy bay." }
]`;

    if (ninerouter_url && ninerouter_llm_model) {
      console.log(`[9Router] Calling custom LLM model ${ninerouter_llm_model} on custom url ${ninerouter_url} for exemples generation`);
      const responseText = await generateWith9Router(ninerouter_url, ninerouter_key || "", ninerouter_llm_model, prompt, true);
      const jsonText = cleanJsonResponse(responseText);
      const parsed = JSON.parse(jsonText.trim());
      return res.json(parsed);
    }

    const client = getAiClient();

    const response = await generateContentWithFallback(client, {
      primaryModel: "gemini-3.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              text_en: { type: Type.STRING },
              text_vn: { type: Type.STRING }
            },
            required: ["text_en", "text_vn"]
          }
        }
      }
    });

    const jsonText = response.text || "[]";
    const parsed = JSON.parse(jsonText.trim());
    res.json(parsed);
  } catch (error: any) {
    console.warn("[Gemini API Warning] Failed to generate examples with Gemini, activating offline local fallback:", error.message || error);
    try {
      const fallbackResult = localGenerateExamples(en, vn, pos, color);
      res.json(fallbackResult);
    } catch (fallbackErr: any) {
      res.status(500).json({ error: "Failed to load offline or synthetic fallback examples." });
    }
  }
});

// AI Code-Mixing Bilingual Examples Generator
teacherRouter.post("/ai/codemix", async (req, res) => {
  const { vn, en, color, definition, ninerouter_url, ninerouter_key, ninerouter_llm_model } = req.body;
  if (!en) {
    return res.status(400).json({ error: "English word/phrase is required" });
  }

  try {
    const prompt = `Act as a bilingual language trainer. 
Create 3 code-mixing examples where the English chunk "${en}" (meaning "${vn}") is integrated into an otherwise Vietnamese conversational sentence.
Bilingual speakers in Vietnam frequently mix terms like: "Bạn nhớ mang theo 'flip-flop' khi đi biển cho tiện."
For each example, provide:
1. "text_en": The code-mixed Vietnamese sentence containing the exact English phrase '${en}'
2. "text_vn": The translation/explanation of the complete sentence in regular English

Return output as a strict JSON array.
Example output:
[
  { "text_en": "Hôm nay trời nóng quá, chắc tui phải mang 'flip-flop' cho mát.", "text_vn": "Today is so hot, I'd better wear flip-flops to cool down." }
]`;

    if (ninerouter_url && ninerouter_llm_model) {
      console.log(`[9Router] Calling custom LLM model ${ninerouter_llm_model} on custom url ${ninerouter_url} for codemix generation`);
      const responseText = await generateWith9Router(ninerouter_url, ninerouter_key || "", ninerouter_llm_model, prompt, true);
      const jsonText = cleanJsonResponse(responseText);
      const parsed = JSON.parse(jsonText.trim());
      return res.json(parsed);
    }

    const client = getAiClient();

    const response = await generateContentWithFallback(client, {
      primaryModel: "gemini-3.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              text_en: { type: Type.STRING },
              text_vn: { type: Type.STRING }
            },
            required: ["text_en", "text_vn"]
          }
        }
      }
    });

    const jsonText = response.text || "[]";
    const parsed = JSON.parse(jsonText.trim());
    res.json(parsed);
  } catch (error: any) {
    console.warn("[Gemini API Warning] Failed to generate codemix with Gemini, activating offline local fallback:", error.message || error);
    try {
      const fallbackResult = localGenerateCodemix(en, vn);
      res.json(fallbackResult);
    } catch (fallbackErr: any) {
      res.status(500).json({ error: "Failed to load offline or synthetic fallback codemix phrases." });
    }
  }
});

// AI Sentence Segmentation & Parsing Endpoint
dictionaryRouter.post("/segment", async (req, res) => {
  const { sentence, ninerouter_url, ninerouter_key, ninerouter_llm_model } = req.body;
  if (!sentence || !sentence.trim()) {
    return res.status(400).json({ error: "Sentence text is required" });
  }

  try {
    const prompt = `You are a Senior Linguistic Analyst. Break down the user's sentence into sequential, meaningful "chunks" (tách câu thành các cụm từ ý nghĩa).
For each chunk, identify if it falls into one of our dictionary color categories:
- 'green' (Gap Fillers / Từ lấp khoảng trống, từ nối câu)
- 'blue' (Sentence Frames / Khung cấu trúc câu, cú pháp định hướng)
- 'red' (Idioms & Nuance / Thành ngữ, quán ngữ, sắc thái ngôn ngữ)
- 'pink' (Key Terms / Từ khóa chính của câu, từ vựng trọng tâm)
- null (for linking words, prepositions, or blocks that have no special category)

And provide a short Vietnamese translation and friendly explanation for any color-categorized chunk.
Try to map chunks to these known dictionary IDs if relevant:
known ids: 'to-be-honest' (for 'to be honest with you'), 'no-free-lunch' (for 'no such thing as a free lunch' or 'free lunch'), 'dep-lao' ('flip-flops'), 'cut-story-short' ('to cut a long story short'), 'in-the-long-run', 'off-the-top-head', 'bear-in-mind', 'goes-without-saying', 'actually', 'you-know'.

The chunks MUST be in chronological order so that joining them reconstructs the original sentence ("${sentence}").
Provide strict JSON return.

Return Schema Format Example:
{
  "sentence": "To be honest with you, I think there's no such thing as a free lunch in this business.",
  "chunks": [
    { "text": "To be honest with you", "color": "blue", "translation": "Thành thật mà nói với bạn", "explanation": "Khung câu mào đầu chân thật", "entry_id": "to-be-honest" },
    { "text": ", I think there's ", "color": null },
    { "text": "no such thing as a free lunch", "color": "red", "translation": "không có gì là miễn phí cả", "explanation": "Thành ngữ chỉ mọi thứ đều có giá của nó", "entry_id": "no-free-lunch" },
    { "text": " in this business.", "color": null }
  ]
}`;

    if (ninerouter_url && ninerouter_llm_model) {
      console.log(`[9Router] Calling custom LLM model ${ninerouter_llm_model} on custom url ${ninerouter_url} for sentence segmentation`);
      const responseText = await generateWith9Router(ninerouter_url, ninerouter_key || "", ninerouter_llm_model, prompt, true);
      const jsonText = cleanJsonResponse(responseText);
      const parsed = JSON.parse(jsonText.trim());
      return res.json(parsed);
    }

    const client = getAiClient();

    const response = await generateContentWithFallback(client, {
      primaryModel: "gemini-3.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            sentence: { type: Type.STRING },
            chunks: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  text: { type: Type.STRING },
                  color: { type: Type.STRING, description: "green, blue, red, pink, or null" },
                  translation: { type: Type.STRING },
                  explanation: { type: Type.STRING },
                  entry_id: { type: Type.STRING }
                },
                required: ["text"]
              }
            }
          },
          required: ["sentence", "chunks"]
        }
      }
    });

    const jsonText = response.text || "{}";
    const parsed = JSON.parse(jsonText.trim());
    res.json(parsed);
  } catch (error: any) {
    console.warn("[Gemini API Warning] Failed to segment sentence with Gemini, activating offline local parser:", error.message || error);
    try {
      const fallbackResult = localSegment(sentence, dictionaryStore);
      res.json(fallbackResult);
    } catch (fallbackErr: any) {
      res.status(500).json({ error: "Failed to complete offline segments parser." });
    }
  }
});

// Actual TTS Route using Gemini TTS Modality with cache
dictionaryRouter.post("/tts", async (req, res) => {
  try {
    const { text } = req.body;
    if (!text || !text.trim()) {
      return res.status(400).json({ error: "Text is empty" });
    }

    const cleanText = text.trim();
    if (ttsCache[cleanText]) {
      return res.json({ audio: ttsCache[cleanText] });
    }

    // Check if custom 9Router config is provided in headers
    const nrUrl = req.headers["x-ninerouter-url"] as string;
    const nrKey = req.headers["x-ninerouter-key"] as string;
    const nrModel = req.headers["x-ninerouter-tts-model"] as string;

    if (nrUrl && nrModel) {
      console.log(`Routing TTS to 9Router at ${nrUrl} with model: ${nrModel}`);
      try {
        const headers: Record<string, string> = { "Content-Type": "application/json" };
        if (nrKey) {
          headers["Authorization"] = `Bearer ${nrKey}`;
        }
        
        const nrResponse = await fetch(`${nrUrl}/v1/audio/speech?response_format=json`, {
          method: "POST",
          headers,
          body: JSON.stringify({
            model: nrModel,
            input: cleanText
          })
        });

        if (!nrResponse.ok) {
          const errMsg = await nrResponse.text();
          throw new Error(`9Router TTS returned status ${nrResponse.status}: ${errMsg}`);
        }

        const data: any = await nrResponse.json();
        if (data && data.audio) {
          ttsCache[cleanText] = data.audio;
          return res.json({ audio: data.audio });
        } else {
          throw new Error("No audio property in 9Router response");
        }
      } catch (e: any) {
        console.error("9Router TTS routing failed, trying fallback to Gemini:", e.message);
      }
    }

    const client = getAiClient();
    console.log(`Generating TTS audio for text: "${cleanText}"`);

    const response = await client.models.generateContent({
      model: "gemini-3.1-flash-tts-preview",
      contents: [{ parts: [{ text: `Read clearly: ${cleanText}` }] }],
      config: {
        responseModalities: [Modality.AUDIO],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName: "Kore" }, // Core clean standard voice config
          },
        },
      },
    });

    const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
    if (base64Audio) {
      ttsCache[cleanText] = base64Audio;
      res.json({ audio: base64Audio });
    } else {
      res.status(500).json({ error: "TTS generation failed to return audio stream." });
    }
  } catch (error: any) {
    console.warn("Server TTS generation warning (likely unconfigured key or model limitation), falling back to client-side synthesis:", error.message);
    res.status(422).json({ error: error.message, isFallback: true });
  }
});

// Handle simple audio upload simulation or voice-transcription (STT fallback on server)
dictionaryRouter.post("/voice-search", async (req, res) => {
  try {
    const { audioBase64 } = req.body;
    if (!audioBase64) {
      return res.status(400).json({ error: "Missing transcript or audio parameter" });
    }

    // Check if custom 9Router config is provided in headers
    const nrUrl = req.headers["x-ninerouter-url"] as string;
    const nrKey = req.headers["x-ninerouter-key"] as string;
    const nrModel = req.headers["x-ninerouter-stt-model"] as string;

    let transcript = "";

    if (nrUrl && nrModel) {
      console.log(`Routing Voice Search STT to 9Router at ${nrUrl} with model: ${nrModel}`);
      try {
        const audioBuffer = Buffer.from(audioBase64, "base64");
        const blob = new Blob([audioBuffer], { type: "audio/webm" });
        
        const formData = new FormData();
        formData.append("model", nrModel);
        formData.append("file", blob, "audio.webm");

        const headers: Record<string, string> = {};
        if (nrKey) {
          headers["Authorization"] = `Bearer ${nrKey}`;
        }

        const nrResponse = await fetch(`${nrUrl}/v1/audio/transcriptions`, {
          method: "POST",
          headers,
          body: formData
        });

        if (!nrResponse.ok) {
          const errMsg = await nrResponse.text();
          throw new Error(`9Router STT returned status ${nrResponse.status}: ${errMsg}`);
        }

        const data: any = await nrResponse.json();
        transcript = (data.text || "").trim().replace(/[.,/#!$%^&*;:{}=\-_`~()]/g,"");
      } catch (e: any) {
        console.error("9Router STT failed, falling back to Gemini:", e.message);
      }
    }

    if (!transcript) {
      try {
        // A gorgeous full-stack integration fallback to Gemini:
        const client = getAiClient();
        const response = await generateContentWithFallback(client, {
          primaryModel: "gemini-3.5-flash",
          contents: [
            {
              inlineData: {
                data: audioBase64,
                mimeType: "audio/webm",
              },
            },
            {
              text: "Transcribe exactly what is spoken in this audio. If it corresponds to an English or Vietnamese phrase from our vocabulary (e.g. dép lào, flip-flops, bear in mind, to be honest), return the matching canonical text. Answer ONLY with the parsed transcription plain text.",
            }
          ],
        });

        transcript = (response.text || "").trim().replace(/[.,/#!$%^&*;:{}=\-_`~()]/g,"");
      } catch (sttErr: any) {
        console.warn("[Gemini API Warning] Voice recognition failed or rate limited, falling back to empty text:", sttErr.message);
        transcript = "";
      }
    }

    console.log("Voice Search STT Transcription result:", transcript);

    // Perform query matching
    const results = dictionaryStore.filter(e => 
      e.en.toLowerCase().includes(transcript.toLowerCase()) || 
      e.vn.toLowerCase().includes(transcript.toLowerCase())
    );

    res.json({
      transcript,
      results
    });
  } catch (error: any) {
    console.error("Voice search error:", error);
    res.status(500).json({ error: error.message || "Failed to process voice search transcription on server." });
  }
});

// ==========================================
// 9ROUTER PROXY ENDPOINTS
// ==========================================

// Discover models through 9router
teacherRouter.get("/9router/models", async (req, res) => {
  try {
    const { endpoint, apiKey, kind } = req.query;
    if (!endpoint) {
      return res.status(400).json({ error: "Missing endpoint parameter" });
    }
    const headers: Record<string, string> = {};
    if (apiKey) {
      headers["Authorization"] = `Bearer ${apiKey}`;
    }
    const response = await fetch(`${endpoint}/v1/models/${kind || "stt"}`, {
      method: "GET",
      headers
    });
    if (!response.ok) {
      const errText = await response.text();
      return res.status(response.status).json({ error: errText });
    }
    const data = await response.json();
    res.json(data);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Test TTS on 9router
teacherRouter.post("/9router/test-tts", async (req, res) => {
  try {
    const { endpoint, apiKey, model, text } = req.body;
    if (!endpoint || !model || !text) {
      return res.status(400).json({ error: "Missing required params: endpoint, model, or text" });
    }
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    if (apiKey) {
      headers["Authorization"] = `Bearer ${apiKey}`;
    }
    const response = await fetch(`${endpoint}/v1/audio/speech?response_format=json`, {
      method: "POST",
      headers,
      body: JSON.stringify({ model, input: text })
    });
    if (!response.ok) {
      const errText = await response.text();
      return res.status(response.status).json({ error: errText });
    }
    const data = await response.json();
    res.json(data);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Test STT on 9router
teacherRouter.post("/9router/test-stt", async (req, res) => {
  try {
    const { endpoint, apiKey, model, audioBase64 } = req.body;
    if (!endpoint || !model || !audioBase64) {
      return res.status(400).json({ error: "Missing required params: endpoint, model, or audioBase64" });
    }
    const audioBuffer = Buffer.from(audioBase64, "base64");
    const blob = new Blob([audioBuffer], { type: "audio/webm" });
    
    const formData = new FormData();
    formData.append("model", model);
    formData.append("file", blob, "audio.webm");

    const headers: Record<string, string> = {};
    if (apiKey) {
      headers["Authorization"] = `Bearer ${apiKey}`;
    }

    const response = await fetch(`${endpoint}/v1/audio/transcriptions`, {
      method: "POST",
      headers,
      body: formData
    });
    if (!response.ok) {
      const errText = await response.text();
      return res.status(response.status).json({ error: errText });
    }
    const data = await response.json();
    res.json(data);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});


// ==========================================
// CHUNKS CVR & BATCH M2M PROXIES
// ==========================================
const CHUNKS_CVR_API_BASE = "https://chunks-cvr-api-781691010426.asia-southeast1.run.app";

dictionaryRouter.post("/measure-cvr", async (req, res) => {
  try {
    const apiKey = (req.headers["x-api-key"] as string) || process.env.M2M_API_KEY || "m2m_CHUNK_ANALYZER_SECURE_2026";
    const response = await fetch(`${CHUNKS_CVR_API_BASE}/api/measure-cvr`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-API-Key": apiKey,
        "X-Requested-With": "XMLHttpRequest"
      },
      body: JSON.stringify(req.body)
    });

    if (!response.ok) {
      const errText = await response.text();
      return res.status(response.status).json({ error: errText || "Error calling CVR measure API" });
    }

    const data = await response.json();
    res.json(data);
  } catch (error: any) {
    console.error("[CVR Proxy Error] Failed in measure-cvr:", error.message);
    res.status(500).json({ error: error.message || "Failed to contact external CVR scoring service." });
  }
});

dictionaryRouter.post("/chunk-generate", async (req, res) => {
  try {
    const apiKey = (req.headers["x-api-key"] as string) || process.env.M2M_API_KEY || "m2m_CHUNK_ANALYZER_SECURE_2026";
    const response = await fetch(`${CHUNKS_CVR_API_BASE}/api/chunk-generate`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-API-Key": apiKey,
        "X-Requested-With": "XMLHttpRequest"
      },
      body: JSON.stringify(req.body)
    });

    if (!response.ok) {
      const errText = await response.text();
      return res.status(response.status).json({ error: errText || "Error calling chunk-generate" });
    }

    const data = await response.json();
    res.json(data);
  } catch (error: any) {
    console.error("[CVR Proxy Error] Failed in chunk-generate:", error.message);
    res.status(500).json({ error: error.message || "Failed to contact chunk generation service." });
  }
});

dictionaryRouter.post("/chunk-generate/batch", async (req, res) => {
  try {
    const apiKey = (req.headers["x-api-key"] as string) || process.env.M2M_API_KEY || "m2m_CHUNK_ANALYZER_SECURE_2026";
    const response = await fetch(`${CHUNKS_CVR_API_BASE}/api/chunk-generate/batch`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-API-Key": apiKey,
        "X-Requested-With": "XMLHttpRequest"
      },
      body: JSON.stringify(req.body)
    });

    if (!response.ok) {
      const errText = await response.text();
      return res.status(response.status).json({ error: errText || "Error calling batch generator" });
    }

    const data = await response.json();
    res.json(data);
  } catch (error: any) {
    console.error("[CVR Proxy Error] Failed in chunk-generate/batch:", error.message);
    res.status(500).json({ error: error.message || "Failed to contact batch chunk generation service." });
  }
});


// ==========================================
// VITE SETUP & STATIC SERVING
// ==========================================

const startServer = async () => {
  // Statically serve the physical workspace assets directory
  app.use("/assets", express.static(path.join(process.cwd(), "assets")));

  if (process.env.NODE_ENV !== "production") {
    console.log("Initializing Vite developer experience middleware...");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
    
    // Explicit HTML routing fallback for Vite in dev mode
    app.get(["/admin-teacher", "/teacher", "/setting", "/settings", "/saved", "/classroom", "/segment", "/entry/*", "/main"], async (req, res, next) => {
      try {
        const fs = await import("fs");
        const transformedHtml = await vite.transformIndexHtml(
          req.originalUrl,
          fs.readFileSync(path.resolve(process.cwd(), "index.html"), "utf-8")
        );
        res.status(200).set({ "Content-Type": "text/html" }).end(transformedHtml);
      } catch (err) {
        next(err);
      }
    });
  } else {
    console.log("Running in Production context, serving public build assets...");
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`\n===========================================`);
    console.log(`🚀 CHUNKS Dictionary full-stack server running on:`);
    console.log(`👉 http://localhost:${PORT}`);
    console.log(`===========================================\n`);
  });
};

startServer().catch(err => {
  console.error("Startup error:", err);
  process.exit(1);
});
