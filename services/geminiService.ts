
import { GoogleGenAI, Type, GenerateContentResponse, GenerateContentParameters } from "@google/genai";
import { RawLead, LeadClassification, ClassifiedLeadData } from '../types';

if (!process.env.API_KEY) {
    throw new Error("API_KEY environment variable not set");
}

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export class QuotaExceededError extends Error {
    constructor(message: string) {
        super(message);
        this.name = 'QuotaExceededError';
    }
}

const classificationSchema = {
    type: Type.OBJECT,
    properties: {
        classification: {
            type: Type.STRING,
            description: "The classification of the lead. Must be one of: 'LOOKING_FOR_WORK', 'SELLING_SERVICE', 'HIRING'.",
            enum: ['LOOKING_FOR_WORK', 'SELLING_SERVICE', 'HIRING']
        },
        reason: {
            type: Type.STRING,
            description: "A brief, 2-5 word explanation for the classification. For example: 'Requesting plumber', 'Advertising cleaning', 'Hiring a painter'."
        }
    },
    required: ["classification", "reason"]
};

const generateContentWithRetry = async (
    params: GenerateContentParameters,
    retries: number = 3
): Promise<GenerateContentResponse> => {
    let lastError: Error | null = null;
    for (let i = 0; i < retries; i++) {
        try {
            const response = await ai.models.generateContent(params);
            return response;
        } catch (error) {
            lastError = error as Error;
            if (error instanceof Error && /quota exceeded/i.test(error.message)) {
                throw new QuotaExceededError('Gemini API quota exceeded. Please try again later or upgrade your plan.');
            }
            console.warn(`AI call attempt ${i + 1} of ${retries} failed. Retrying...`, error);
            if (i < retries - 1) {
                await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1)));
            }
        }
    }
    throw new Error(`AI call failed after ${retries} attempts: ${lastError?.message}`);
};

const getPromptForLead = (lead: RawLead): string => {
    const title = lead.company || '';
    const description = lead.description || '';

    return `
      Analyze the following lead and classify its intent. The goal is to identify leads from people who genuinely need a service ('LOOKING_FOR_WORK'). Filter out leads who are advertising their own services ('SELLING_SERVICE') or trying to hire employees ('HIRING').

      Lead Data:
      - Title/Company Name: "${title}"
      - Description: "${description}"

      Determine if this lead represents someone:
      1. LOOKING_FOR_WORK: They need a job done (e.g., "Need a plumber for a leaky tap", "Quote for backyard landscaping").
      2. SELLING_SERVICE: They are advertising their skills or business (e.g., "Affordable and reliable plumbing services", "Call us for a free quote on painting").
      3. HIRING: They are posting a job offer to find an employee (e.g., "Hiring a full-time plumber", "Join our team of expert electricians").

      Your response MUST be in JSON format matching the provided schema.
    `;
};

export const classifyLeads = async (leads: RawLead[]): Promise<ClassifiedLeadData[]> => {
    const classificationPromises = leads.map(async (lead) => {
        try {
            const prompt = getPromptForLead(lead);
            const response = await generateContentWithRetry({
                model: "gemini-2.5-flash",
                contents: prompt,
                config: {
                    responseMimeType: "application/json",
                    responseSchema: classificationSchema,
                },
            });

            const jsonString = response.text.trim();
            const parsed = JSON.parse(jsonString);

            return {
                id: lead.id, // Assuming ID is pre-assigned
                classification: parsed.classification as LeadClassification,
                reason: parsed.reason,
            };
        } catch (error) {
            if (error instanceof QuotaExceededError) {
                throw error; // Re-throw to be caught by Promise.all
            }
            console.error(`Failed to classify lead ${lead.id} after all retries:`, error);
            return {
                id: lead.id,
                classification: LeadClassification.Unclassified,
                reason: 'AI analysis failed for this lead.',
            };
        }
    });

    try {
        return await Promise.all(classificationPromises);
    } catch (error) {
        if (error instanceof QuotaExceededError) {
            throw error; // Propagate the quota error to the data processor
        }
        // Fallback for other unexpected errors during Promise.all
        console.error("An unexpected batch error occurred during classification:", error);
        throw new Error('A non-quota error stopped the classification batch.');
    }
};