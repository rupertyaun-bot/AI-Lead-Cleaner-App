export interface RawLead {
  [key: string]: any; // Allow for flexible raw data
}

export enum LeadClassification {
  LookingForWork = 'LOOKING_FOR_WORK',
  SellingService = 'SELLING_SERVICE',
  Hiring = 'HIRING',
  Unclassified = 'UNCLASSIFIED'
}

export enum RejectionReason {
  Selling = 'Selling a Service',
  Hiring = 'Hiring an Employee',
  InvalidCategory = 'Invalid Category',
  MissingPhone = 'Missing Phone Number',
  ProcessingError = 'AI Processing Error',
  AdTypeWanted = 'Ad Type is "WANTED"',
  SellingKeyword = 'Contains Selling Keywords',
  NonHipCategory = 'Non-HIP Category',
  InternalDuplicate = 'Duplicate within File',
  Duplicate = 'Duplicate Record',
}

export interface ProcessedLead {
  id: string;
  classification: LeadClassification;
  aiReason: string;

  // Mapped and cleaned HIP fields
  company: string;
  description: string;
  category: string; // This will now hold the ORIGINAL category
  sfdc_category: string; // This will hold the matched SFDC category
  phone: string;
  mobile_phone: string;
  first_name: string;
  city: string;
  state: string;
  suburb: string;
  first_referrer_url: string;
  website: string;
  abn: string;
  scrape_date: string;
  name_and_suburb: string;
}

export interface RejectedLead {
  originalData: RawLead;
  id: string;
  rejectionReason: RejectionReason;
  rejectionDetail: string;
}

export interface Stats {
  total: number;
  processed: number;
  rejected: number;
  reasons: Record<RejectionReason, number>;
}

export interface ClassifiedLeadData {
  id: string;
  classification: LeadClassification;
  reason: string;
}
