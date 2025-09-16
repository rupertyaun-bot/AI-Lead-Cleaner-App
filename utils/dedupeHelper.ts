
import { ProcessedLead, RawLead } from '../types';
import { parseCSV, normalizeHeaders } from './csvHelper';
import { cleanPhoneNumber } from './phoneHelper';

export interface DedupeSets {
    account: {
        nameAndSuburb: Set<string>;
        abn: Set<string>;
        phones: Set<string>;
        websites: Set<string>;
    },
    lead: {
        nameAndSuburb: Set<string>;
        abn: Set<string>;
        phones: Set<string>;
        websites: Set<string>;
    }
}

const createEmptySets = (): DedupeSets => ({
    account: { nameAndSuburb: new Set(), abn: new Set(), phones: new Set(), websites: new Set() },
    lead: { nameAndSuburb: new Set(), abn: new Set(), phones: new Set(), websites: new Set() }
});

const populateAccountSets = (records: RawLead[], sets: DedupeSets['account']) => {
    const accountPhoneFields = ['phone', 'mobile', 'phone_2', 'phone_3'];
    for (const record of records) {
        const nameAndSuburb = record.name_and_suburb;
        if (nameAndSuburb) sets.nameAndSuburb.add(nameAndSuburb);

        const abn = record.abn;
        if (abn) sets.abn.add(abn);

        const website = record.website;
        if (website) sets.websites.add(website.trim());
        
        accountPhoneFields.forEach(field => {
            const phone = cleanPhoneNumber(record[field]);
            if (phone) sets.phones.add(phone);
        });
    }
};

const populateLeadSets = (records: RawLead[], sets: DedupeSets['lead']) => {
    const leadPhoneFields = ['account:_phone', 'admin_owner_mobile', 'phone', 'mobile'];
     for (const record of records) {
        const nameAndSuburb = record.name_and_suburb;
        if (nameAndSuburb) sets.nameAndSuburb.add(nameAndSuburb);

        const abn = record.abn;
        if (abn) sets.abn.add(abn);

        const website = record.website;
        if (website) sets.websites.add(website.trim());

        leadPhoneFields.forEach(field => {
            const phone = cleanPhoneNumber(record[field]);
            if (phone) sets.phones.add(phone);
        });
    }
};

export const createDedupeSets = async (accountFile: File | null, leadFile: File | null): Promise<DedupeSets> => {
    const sets = createEmptySets();

    if (accountFile) {
        const text = await accountFile.text();
        const records = parseCSV(text).map(normalizeHeaders);
        populateAccountSets(records, sets.account);
    }

    if (leadFile) {
        const text = await leadFile.text();
        const records = parseCSV(text).map(normalizeHeaders);
        populateLeadSets(records, sets.lead);
    }

    return sets;
};

export const checkForDuplicates = (lead: ProcessedLead, sets: DedupeSets): { isDuplicate: boolean, detail: string } => {
    const nameAndSuburb = lead.name_and_suburb;
    const abn = (lead.abn || '').trim();
    const phone = lead.phone;
    const mobilePhone = lead.mobile_phone;
    const website = (lead.website || '').trim();

    // Check against Account Bible
    if (nameAndSuburb.length >= 5 && sets.account.nameAndSuburb.has(nameAndSuburb)) return { isDuplicate: true, detail: 'Duplicate found in SF Account Bible (Name & Suburb Match)' };
    if (abn && sets.account.abn.has(abn)) return { isDuplicate: true, detail: 'Duplicate found in SF Account Bible (ABN Match)' };
    if (phone && sets.account.phones.has(phone)) return { isDuplicate: true, detail: 'Duplicate found in SF Account Bible (Phone Match)' };
    if (mobilePhone && sets.account.phones.has(mobilePhone)) return { isDuplicate: true, detail: 'Duplicate found in SF Account Bible (Mobile Match)' };
    if (website && sets.account.websites.has(website)) return { isDuplicate: true, detail: 'Duplicate found in SF Account Bible (Website Match)' };

    // Check against Lead Bible
    if (nameAndSuburb.length >= 5 && sets.lead.nameAndSuburb.has(nameAndSuburb)) return { isDuplicate: true, detail: 'Duplicate found in SF Leads Bible (Name & Suburb Match)' };
    if (abn && sets.lead.abn.has(abn)) return { isDuplicate: true, detail: 'Duplicate found in SF Leads Bible (ABN Match)' };
    if (phone && sets.lead.phones.has(phone)) return { isDuplicate: true, detail: 'Duplicate found in SF Leads Bible (Phone Match)' };
    if (mobilePhone && sets.lead.phones.has(mobilePhone)) return { isDuplicate: true, detail: 'Duplicate found in SF Leads Bible (Mobile Match)' };
    if (website && sets.lead.websites.has(website)) return { isDuplicate: true, detail: 'Duplicate found in SF Leads Bible (Website Match)' };
    
    return { isDuplicate: false, detail: '' };
};
