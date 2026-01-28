import { GoogleGenAI, Type, Modality } from "@google/genai";
import { QuizQuestion } from "../types";

/* ================= SAFE AI INIT ================= */
const getAI = () => {
  const apiKey = import.meta.env.VITE_GEMINI_API_KEY || 'FAKE_API_KEY_FOR_DEVELOPMENT';
  if (!apiKey) {
    throw new Error("Gemini API key missing");
  }
  return new GoogleGenAI({ apiKey });
};

/* ================= FALLBACK (SAFETY) ================= */
const FALLBACK_QUIZ: QuizQuestion[] = [
  {
    id: "fallback-1",
    question: "What should you do if you receive a suspicious email?",
    options: [
      "Click links immediately",
      "Reply with personal info",
      "Ignore or report it",
      "Forward to friends"
    ],
    correctAnswer: "Ignore or report it",
    explanation: "Suspicious emails are usually phishing attempts."
  },
  {
    id: "fallback-2",
    question: "Why are software updates important?",
    options: [
      "They add viruses",
      "They waste data",
      "They fix security issues",
      "They slow devices"
    ],
    correctAnswer: "They fix security issues",
    explanation: "Updates patch vulnerabilities attackers exploit."
  }
];

/* ================= SERVICE ================= */
export const geminiService = {
  async generateQuiz(difficulty: 'easy' | 'hard' = 'easy'): Promise<QuizQuestion[]> {
    try {
      const ai = getAI();

      const difficultyPrompt =
        difficulty === 'hard'
          ? `
Create ADVANCED cybersecurity MCQs.
Topics: SQL Injection, OAuth2, Zero Trust, Cryptography, APTs.
Use technical language.
`
          : `
Create SIMPLE cybersecurity MCQs.
Topics: phishing, passwords, public Wi-Fi, device locking.
Use very easy language.
`;

      const response = await ai.models.generateContent({
        model: "gemini-3-pro-preview",
        contents: `
${difficultyPrompt}

STRICT RULES:
- EXACTLY 5 questions
- 4 options per question
- correctAnswer MUST exactly match one option
- NO markdown
- NO extra text

Return ONLY a JSON array like this:
[
  {
    "id": "string",
    "question": "string",
    "options": ["A","B","C","D"],
    "correctAnswer": "A",
    "explanation": "string"
  }
]
        `,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                id: { type: Type.STRING },
                question: { type: Type.STRING },
                options: { type: Type.ARRAY, items: { type: Type.STRING } },
                correctAnswer: { type: Type.STRING },
                explanation: { type: Type.STRING }
              },
              required: ["id", "question", "options", "correctAnswer", "explanation"]
            }
          }
        }
      });

      const quiz = JSON.parse(response.text) as QuizQuestion[];

      if (!Array.isArray(quiz) || quiz.length === 0) {
        throw new Error("Invalid quiz data");
      }

      return quiz;
    } catch (error) {
      console.error("Gemini quiz failed, using fallback:", error);
      return FALLBACK_QUIZ;
    }
  }
};
