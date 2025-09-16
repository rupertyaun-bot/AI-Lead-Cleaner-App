import React, { useState, useCallback, useEffect } from 'react';
import { RawLead, ProcessedLead, RejectedLead, Stats, RejectionReason, LeadClassification } from './types';
import { preProcessLeads, classifyAndFinalizeLeads } from './utils/dataProcessor';
import { convertToCSV, downloadCSV, convertSetToCsv } from './utils/csvHelper';
import { CATEGORY_CSV_DATA, NON_HIP_CATEGORIES as DEFAULT_NON_HIP_CATEGORIES } from './constants';
import Header from './components/Header';
import FileUploadContainer from './components/FileUploadContainer';
import Dashboard from './components/Dashboard';
import ResultsDisplay from './components/ResultsDisplay';
import Loader from './components/Loader';
import ActionPanel from './components/ActionPanel';
import CategoryManager from './components/CategoryManager';

type AppState = 'idle' | 'preprocessing' | 'paused' | 'ai_processing' | 'finished';

const App: React.FC = () => {
    const [stats, setStats] = useState<Stats | null>(null);
    const [processedLeads, setProcessedLeads] = useState<ProcessedLead[]>([]);
    const [rejectedLeads, setRejectedLeads] = useState<RejectedLead[]>([]);
    const [leadsForAI, setLeadsForAI] = useState<ProcessedLead[]>([]);
    const [allNormalizedLeads, setAllNormalizedLeads] = useState<(RawLead & { id: string })[]>([]);
    const [appState, setAppState] = useState<AppState>('idle');
    const [error, setError] = useState<string | null>(null);
    const [fileName, setFileName] = useState<string>('');
    const [progressMessage, setProgressMessage] = useState<string>('');
    const [showQuotaWarning, setShowQuotaWarning] = useState(false);
    const [showCategoryManager, setShowCategoryManager] = useState(false);
    const [invalidCategoriesFound, setInvalidCategoriesFound] = useState<Set<string>>(new Set());

    // Category lists state, initialized from localStorage or defaults
    const [validCategoriesCSV, setValidCategoriesCSV] = useState<string>(() => {
        return localStorage.getItem('validCategoriesCSV') || CATEGORY_CSV_DATA;
    });
    const [nonHipCategories, setNonHipCategories] = useState<string[]>(() => {
        const stored = localStorage.getItem('nonHipCategories');
        return stored ? JSON.parse(stored) : DEFAULT_NON_HIP_CATEGORIES;
    });
    
    // Persist category changes to localStorage
    useEffect(() => {
        localStorage.setItem('validCategoriesCSV', validCategoriesCSV);
    }, [validCategoriesCSV]);
    
    useEffect(() => {
        localStorage.setItem('nonHipCategories', JSON.stringify(nonHipCategories));
    }, [nonHipCategories]);

    const resetState = () => {
        setStats(null);
        setProcessedLeads([]);
        setRejectedLeads([]);
        setLeadsForAI([]);
        setAllNormalizedLeads([]);
        setError(null);
        setFileName('');
        setProgressMessage('');
        setShowQuotaWarning(false);
        setInvalidCategoriesFound(new Set());
        setAppState('idle');
    };

    const calculateStats = (processed: (ProcessedLead[] | ProcessedLead[]), rejected: RejectedLead[]) => {
        const reasonCounts = rejected.reduce((acc, lead) => {
            acc[lead.rejectionReason] = (acc[lead.rejectionReason] || 0) + 1;
            return acc;
        }, {} as Record<RejectionReason, number>);
        
        const allPossibleReasons = Object.fromEntries(
            Object.values(RejectionReason).map(reason => [reason, 0])
        ) as Record<RejectionReason, number>;
        
        const totalLeads = leadsForAI.length > 0 ? leadsForAI.length + rejected.length : processed.length + rejected.length;

        return {
            total: totalLeads,
            processed: processed.length,
            rejected: rejected.length,
            reasons: { ...allPossibleReasons, ...reasonCounts },
        };
    };

    const handlePreProcessing = useCallback(async (mainFile: File, sfAccountFile: File | null, sfLeadsFile: File | null) => {
        resetState();
        setAppState('preprocessing');
        setFileName(mainFile.name);
        setProgressMessage('Starting pre-processing...');

        const handleProgress = (message: string) => setProgressMessage(message);

        try {
            const { leadsForAI, rejectedLeads, allNormalizedLeads, invalidCategoriesFound } = await preProcessLeads(
                mainFile,
                sfAccountFile,
                sfLeadsFile, 
                handleProgress,
                validCategoriesCSV,
                nonHipCategories
            );
            setLeadsForAI(leadsForAI);
            setRejectedLeads(rejectedLeads);
            setAllNormalizedLeads(allNormalizedLeads);
            setInvalidCategoriesFound(invalidCategoriesFound);
            setStats(calculateStats(leadsForAI, rejectedLeads));
            setAppState('paused');
        } catch (err) {
            console.error(err);
            const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred during pre-processing.';
            setError(`Processing failed: ${errorMessage}.`);
            setAppState('idle');
        }
    }, [validCategoriesCSV, nonHipCategories]);

    const handleAIProcessing = useCallback(async () => {
        setAppState('ai_processing');
        setProgressMessage('Starting AI classification...');
        const handleProgress = (message: string) => setProgressMessage(message);

        try {
            const { processed, rejected, quotaWasExceeded } = await classifyAndFinalizeLeads(
                leadsForAI,
                rejectedLeads,
                allNormalizedLeads,
                handleProgress
            );

            setProcessedLeads(processed);
            setRejectedLeads(rejected);
            if (quotaWasExceeded) {
                setShowQuotaWarning(true);
            }
            setStats(calculateStats(processed, rejected));
        } catch (err) {
            console.error(err);
            const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred during AI processing.';
            setError(`AI Processing failed: ${errorMessage}.`);
        } finally {
            setAppState('finished');
        }
    }, [leadsForAI, rejectedLeads, allNormalizedLeads]);

    const handleDownloadPreprocessed = useCallback(() => {
        if (leadsForAI.length === 0) return;
        
        const downloadableData = leadsForAI.map(lead => ({
            ...lead,
            classification: LeadClassification.Unclassified,
            aiReason: 'Not processed by AI'
        }));
        
        const csvString = convertToCSV(downloadableData);
        downloadCSV(csvString, `preprocessed_${fileName}`);
    }, [leadsForAI, fileName]);
    
    const handleDownloadInvalidCategories = useCallback(() => {
        if (invalidCategoriesFound.size === 0) return;
        const csvString = convertSetToCsv(invalidCategoriesFound, "invalid_category_name");
        downloadCSV(csvString, `invalid_categories_${fileName.replace('.csv', '')}.csv`);
    }, [invalidCategoriesFound, fileName]);

    const handleSaveCategories = (valid: string, nonHip: string[]) => {
        setValidCategoriesCSV(valid);
        setNonHipCategories(nonHip);
    };

    const isLoading = appState === 'preprocessing' || appState === 'ai_processing';

    return (
        <div className="min-h-screen bg-gray-50 text-gray-800 font-sans">
            <Header onManageCategories={() => setShowCategoryManager(true)} />
             {showCategoryManager && (
                <CategoryManager
                    initialValidCategories={validCategoriesCSV}
                    initialNonHipCategories={nonHipCategories}
                    onSave={handleSaveCategories}
                    onClose={() => setShowCategoryManager(false)}
                />
            )}
            <main className="container mx-auto p-4 md:p-8">
                <div className="max-w-4xl mx-auto bg-white rounded-2xl shadow-lg p-6 md:p-8 border border-gray-200">
                    {appState === 'idle' && <FileUploadContainer onProcessFiles={handlePreProcessing} disabled={false} />}
                    {error && (
                         <div className="my-4 bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-lg" role="alert">
                            <strong className="font-bold">Error!</strong>
                            <span className="block sm:inline ml-2">{error}</span>
                        </div>
                    )}
                    {showQuotaWarning && (
                        <div className="my-4 bg-yellow-100 border border-yellow-400 text-yellow-800 px-4 py-3 rounded-lg" role="alert">
                            <strong className="font-bold">API Quota Reached</strong>
                            <span className="block mt-1">AI classification stopped because the daily limit was reached. The remaining leads were automatically processed without AI. You can try again tomorrow or upgrade your Google AI Studio account.</span>
                        </div>
                    )}
                    
                    {isLoading && <Loader message={progressMessage} />}
                    
                    {appState === 'paused' && stats && (
                        <div className="space-y-8">
                            <Dashboard 
                                stats={stats} 
                                fileName={fileName} 
                                stage="pre-ai"
                                invalidCategoriesFound={invalidCategoriesFound}
                                onDownloadInvalidCategories={handleDownloadInvalidCategories}
                            />
                            <ActionPanel
                                leadsForAICount={leadsForAI.length}
                                rejectedLeadsCount={rejectedLeads.length}
                                onContinue={handleAIProcessing}
                                onDownload={handleDownloadPreprocessed}
                                disabled={isLoading}
                            />
                            <div className="text-center pt-6 border-t border-gray-200">
                                <button
                                    onClick={resetState}
                                    className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                                >
                                    Process Another File
                                </button>
                            </div>
                        </div>
                    )}
                    
                    {appState === 'finished' && stats && (
                        <div className="mt-8 space-y-8">
                            <Dashboard 
                                stats={stats} 
                                fileName={fileName} 
                                stage="final"
                                invalidCategoriesFound={invalidCategoriesFound}
                                onDownloadInvalidCategories={handleDownloadInvalidCategories}
                             />
                             <div className="text-center pt-4">
                                <button
                                    onClick={resetState}
                                    className="inline-flex items-center px-6 py-3 border border-transparent shadow-sm text-base font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                                >
                                    Process Another File
                                </button>
                            </div>
                            <ResultsDisplay processedLeads={processedLeads} rejectedLeads={rejectedLeads} />
                        </div>
                    )}
                </div>
            </main>
            <footer className="text-center p-4 text-sm text-gray-500 mt-8">
                <p>&copy; {new Date().getFullYear()} AI Lead Cleaner. All rights reserved.</p>
            </footer>
        </div>
    );
};

export default App;
