
import { parseCSV } from './csvHelper';

type CategoryMap = Map<string, { sfdcCategory: string; id: string }>;

export const createCategoryMap = (csvData: string): CategoryMap => {
    const map: CategoryMap = new Map();
    if (!csvData) return map;

    const categories = parseCSV(csvData);

    for (const cat of categories) {
        const name = cat.category_name?.trim().toLowerCase();
        if (name) {
            map.set(name, {
                sfdcCategory: cat['SFDC Category']?.trim() || '',
                id: cat.ID?.trim() || ''
            });
        }
    }
    return map;
};

export const findMatchingCategory = (leadCategory: string, map: CategoryMap): string | null => {
    if (!leadCategory) return null;
    const normalizedCategory = leadCategory.trim().toLowerCase();
    const match = map.get(normalizedCategory);
    return match ? (match.sfdcCategory || leadCategory) : null;
};
