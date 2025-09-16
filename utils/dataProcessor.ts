
import { RawLead, ProcessedLead, RejectedLead, RejectionReason, LeadClassification, ClassifiedLeadData } from '../types';
import { parseCSV, normalizeHeaders } from './csvHelper';
import { createCategoryMap, findMatchingCategory } from './categoryHelper';
import { findAndCleanPhoneNumber } from './phoneHelper';
import { abbreviateState } from './stateHelper';
import { classifyLeads, QuotaExceededError } from '../services/geminiService';
import { createDedupeSets, checkForDuplicates } from './dedupeHelper';

const CHUNK_SIZE = 25; // Process leads in chunks to manage API calls

const GUMTREE_TO_HIP_MAP: { [key: string]: keyof Omit<ProcessedLead, 'id' | 'classification' | 'aiReason' | 'phone' | 'mobile_phone' | 'category' | 'sfdc_category' | 'name_and_suburb'> } = {
    title: 'company',
    description: 'description',
    poster_contact_name: 'first_name',
    region: 'city',
    state: 'state',
    suburb: 'suburb',
    slug: 'first_referrer_url',
    website: 'website',
    abn: 'abn',
    scrape_date: 'scrape_date',
};

const SELLING_KEYWORDS_REGEX = /\b(selling|sale)\b|for sale|on sale/i;
const SELLING_EXCEPTIONS_REGEX = /selling your (home|house)/i;

export const preProcessLeads = async (
    file: File,
    sfAccountFile: File | null,
    sfLeadsFile: File | null,
    onProgress: (message: string) => void,
    validCategoriesCSV: string,
    nonHipCategories: string[]
): Promise<{ 
    leadsForAI: ProcessedLead[], 
    rejectedLeads: RejectedLead[], 
    allNormalizedLeads: (RawLead & { id: string })[],
    invalidCategoriesFound: Set<string>
}> => {
    onProgress('Reading and parsing file...');
    const text = await file.text();
    const rawLeads = parseCSV(text);
    const normalizedLeads: (RawLead & { id: string })[] = rawLeads.map((lead, index) => ({
        ...normalizeHeaders(lead),
        id: `${file.name}-${index}`
    }));

    onProgress('Building deduplication sets from bible files...');
    const dedupeSets = await createDedupeSets(sfAccountFile, sfLeadsFile);

    const categoryMap = createCategoryMap(validCategoriesCSV);
    const nonHipCategorySet = new Set(nonHipCategories.map(c => c.toLowerCase().trim()));
    const invalidCategoriesFound = new Set<string>();
    
    // Sets for internal deduplication
    const seenDedupeKeys = new Set<string>();
    const seenPhoneNumbers = new Set<string>();
    const seenWebsites = new Set<string>();
    const seenABNs = new Set<string>();

    const leadsForAI: ProcessedLead[] = [];
    const rejectedLeads: RejectedLead[] = [];

    onProgress('Pre-validating and cleaning leads...');
    for (const lead of normalizedLeads) {
        // Rule: Filter out "WANTED" ads
        if (lead.ad_type?.toUpperCase() === 'WANTED') {
            rejectedLeads.push({ id: lead.id, originalData: lead, rejectionReason: RejectionReason.AdTypeWanted, rejectionDetail: `Ad type was 'WANTED'.` });
            continue;
        }

        const categoryToCheck = (lead.category || lead.category_name || '').trim();
        const normalizedCategoryToCheck = categoryToCheck.toLowerCase();
        
        // Rule: Filter out non-HIP categories
        if (nonHipCategorySet.has(normalizedCategoryToCheck)) {
            rejectedLeads.push({ id: lead.id, originalData: lead, rejectionReason: RejectionReason.NonHipCategory, rejectionDetail: `Category '${categoryToCheck}' is on the non-HIP list.` });
            continue;
        }

        // Rule: Filter out leads with selling keywords
        const contentForSellingCheck = `${lead.title || ''} ${lead.description || ''}`;
        if (SELLING_KEYWORDS_REGEX.test(contentForSellingCheck) && !SELLING_EXCEPTIONS_REGEX.test(contentForSellingCheck)) {
            rejectedLeads.push({ id: lead.id, originalData: lead, rejectionReason: RejectionReason.SellingKeyword, rejectionDetail: `Contains keywords like 'selling' or 'sale'.` });
            continue;
        }

        // Rule: Validate and clean phone number
        const cleanedPhone = findAndCleanPhoneNumber(lead.phone || '', lead.title || '', lead.description || '');
        if (!cleanedPhone) {
            rejectedLeads.push({ id: lead.id, originalData: lead, rejectionReason: RejectionReason.MissingPhone, rejectionDetail: 'No valid phone number found in record.' });
            continue;
        }

        // Rule: Validate category
        const matchedSfdcCategory = findMatchingCategory(normalizedCategoryToCheck, categoryMap);
        if (!matchedSfdcCategory) {
            if(categoryToCheck) invalidCategoriesFound.add(categoryToCheck);
            rejectedLeads.push({ id: lead.id, originalData: lead, rejectionReason: RejectionReason.InvalidCategory, rejectionDetail: `Category '${categoryToCheck}' not found.` });
            continue;
        }

        // Transformation Step: Create a new lead object with HIP fields
        const transformedLead: Partial<ProcessedLead> & { id: string } = { id: lead.id };

        for (const key in GUMTREE_TO_HIP_MAP) {
            if (lead[key] !== undefined && lead[key] !== null) {
                const hipKey = GUMTREE_TO_HIP_MAP[key as keyof typeof GUMTREE_TO_HIP_MAP];
                transformedLead[hipKey] = lead[key];
            }
        }
        
        transformedLead.category = categoryToCheck; // Keep original category
        transformedLead.sfdc_category = matchedSfdcCategory; // Add the matched SFDC category

        if (transformedLead.state) transformedLead.state = abbreviateState(transformedLead.state);
        if (transformedLead.city) transformedLead.city = transformedLead.city.substring(0, 40);

        transformedLead.phone = '';
        transformedLead.mobile_phone = '';
        if (cleanedPhone.startsWith('4') || cleanedPhone.startsWith('04')) {
            transformedLead.mobile_phone = cleanedPhone;
        } else {
            transformedLead.phone = cleanedPhone;
        }

        // Generate deduplication keys
        const companyPart = (transformedLead.company || '').substring(0, 14);
        const suburbPart = (transformedLead.suburb || '').substring(0, 8);
        transformedLead.name_and_suburb = `${companyPart}${suburbPart}`;
        const phoneToCheck = cleanedPhone;
        const websiteToCheck = (transformedLead.website || '').trim();
        const abnToCheck = (transformedLead.abn || '').trim();
        
        // Rule: Check for duplicates within the file itself using multiple fields
        const internalDedupeKey = transformedLead.name_and_suburb;
        if (internalDedupeKey.length >= 5 && seenDedupeKeys.has(internalDedupeKey)) {
             rejectedLeads.push({ id: lead.id, originalData: lead, rejectionReason: RejectionReason.InternalDuplicate, rejectionDetail: `Duplicate 'Name & Suburb' key found in this file.` });
             continue;
        }
        if (seenPhoneNumbers.has(phoneToCheck)) {
             rejectedLeads.push({ id: lead.id, originalData: lead, rejectionReason: RejectionReason.InternalDuplicate, rejectionDetail: `Duplicate phone number (${phoneToCheck}) found in this file.`});
             continue;
        }
        if (websiteToCheck && seenWebsites.has(websiteToCheck)) {
             rejectedLeads.push({ id: lead.id, originalData: lead, rejectionReason: RejectionReason.InternalDuplicate, rejectionDetail: `Duplicate website (${websiteToCheck}) found in this file.`});
             continue;
        }
        if (abnToCheck && seenABNs.has(abnToCheck)) {
             rejectedLeads.push({ id: lead.id, originalData: lead, rejectionReason: RejectionReason.InternalDuplicate, rejectionDetail: `Duplicate ABN (${abnToCheck}) found in this file.`});
             continue;
        }

        // Rule: Check for duplicates against SF Bible files
        const duplicateCheckResult = checkForDuplicates(transformedLead as ProcessedLead, dedupeSets);
        if (duplicateCheckResult.isDuplicate) {
            rejectedLeads.push({
                id: lead.id,
                originalData: lead,
                rejectionReason: RejectionReason.Duplicate,
                rejectionDetail: duplicateCheckResult.detail
            });
            continue;
        }

        // If no duplicates are found, record the values for future checks
        if (internalDedupeKey.length >= 5) seenDedupeKeys.add(internalDedupeKey);
        seenPhoneNumbers.add(phoneToCheck);
        if (websiteToCheck) seenWebsites.add(websiteToCheck);
        if (abnToCheck) seenABNs.add(abnToCheck);

        leadsForAI.push(transformedLead as ProcessedLead);
    }
    
    onProgress('Pre-processing complete.');
    return { leadsForAI, rejectedLeads, allNormalizedLeads: normalizedLeads, invalidCategoriesFound };
};

export const classifyAndFinalizeLeads = async (
    leadsForAI: ProcessedLead[],
    initialRejected: RejectedLead[],
    allNormalizedLeads: (RawLead & { id: string })[],
    onProgress: (message: string) => void
): Promise<{ processed: ProcessedLead[], rejected: RejectedLead[], quotaWasExceeded: boolean }> => {
    const processed: ProcessedLead[] = [];
    const rejected: RejectedLead[] = [...initialRejected];
    let quotaWasExceeded = false;
    
    const totalChunks = Math.ceil(leadsForAI.length / CHUNK_SIZE);
    for (let i = 0; i < leadsForAI.length; i += CHUNK_SIZE) {
        const chunkIndex = Math.floor(i / CHUNK_SIZE) + 1;
        onProgress(`Classifying leads... (Batch ${chunkIndex} of ${totalChunks})`);

        const chunk = leadsForAI.slice(i, i + CHUNK_SIZE);
        
        try {
            const classificationResults = await classifyLeads(chunk as RawLead[]);
            
            const resultsMap = new Map<string, ClassifiedLeadData>(
                classificationResults.map(res => [res.id, res])
            );

            for(const lead of chunk) {
                const result = resultsMap.get(lead.id!);
                const originalLead = allNormalizedLeads.find(l => l.id === lead.id)!;

                if (!result || result.classification === LeadClassification.Unclassified) {
                     rejected.push({ id: lead.id!, originalData: originalLead, rejectionReason: RejectionReason.ProcessingError, rejectionDetail: result?.reason || 'AI could not classify the lead.' });
                     continue;
                }

                if (result.classification === LeadClassification.LookingForWork) {
                    const finalLead: ProcessedLead = { ...lead, classification: result.classification, aiReason: result.reason };
                    processed.push(finalLead);
                } else {
                    const reason = result.classification === LeadClassification.SellingService ? RejectionReason.Selling : RejectionReason.Hiring;
                    rejected.push({ id: lead.id!, originalData: originalLead, rejectionReason: reason, rejectionDetail: result.reason });
                }
            }
        } catch (error) {
            if (error instanceof QuotaExceededError) {
                quotaWasExceeded = true;
                onProgress('API quota exceeded. Processing remaining leads without AI.');
                const remainingLeads = leadsForAI.slice(i);
                for (const lead of remainingLeads) {
                    const finalLead: ProcessedLead = { ...lead, classification: LeadClassification.LookingForWork, aiReason: 'AI classification skipped due to API quota.' };
                    processed.push(finalLead);
                }
                break; // Exit the loop entirely
            } else {
                console.error("An unexpected error occurred during batch classification:", error);
                for (const lead of chunk) {
                    const originalLead = allNormalizedLeads.find(l => l.id === lead.id)!;
                    rejected.push({ id: lead.id!, originalData: originalLead, rejectionReason: RejectionReason.ProcessingError, rejectionDetail: 'A batch processing error occurred.' });
                }
            }
        }
    }

    onProgress('Finalizing results...');
    return { processed, rejected, quotaWasExceeded };
};