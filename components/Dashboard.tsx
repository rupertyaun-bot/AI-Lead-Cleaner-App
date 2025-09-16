
import React from 'react';
import { Stats, RejectionReason } from '../types';

interface DashboardProps {
  stats: Stats;
  fileName: string;
  stage: 'pre-ai' | 'final';
  invalidCategoriesFound: Set<string>;
  onDownloadInvalidCategories: () => void;
}

// FIX: Changed JSX.Element to React.ReactElement to resolve namespace 'JSX' not found error.
const StatCard: React.FC<{ title: string; value: number; icon: React.ReactElement; color: string; }> = ({ title, value, icon, color }) => (
    <div className="bg-white p-6 rounded-xl shadow-md border flex items-start space-x-4">
        <div className={`p-3 rounded-full ${color}`}>
            {icon}
        </div>
        <div>
            <p className="text-sm font-medium text-gray-500">{title}</p>
            <p className="text-3xl font-bold text-gray-800">{value}</p>
        </div>
    </div>
);

const Dashboard: React.FC<DashboardProps> = ({ stats, fileName, stage, invalidCategoriesFound, onDownloadInvalidCategories }) => {
    const qualifiedTitle = stage === 'pre-ai' ? 'Leads Ready for AI' : 'Qualified Leads';
    const mainTitle = stage === 'pre-ai' ? 'Pre-processing Summary' : 'Processing Results';
    const showDownloadInvalidButton = stage === 'pre-ai' && invalidCategoriesFound.size > 0;

    return (
        <div>
             <div className="pb-5 border-b border-gray-200 mb-6">
                <div className="flex items-center justify-between">
                    <div>
                        <h3 className="text-2xl font-semibold leading-6 text-gray-900">{mainTitle}</h3>
                        <p className="mt-2 max-w-4xl text-sm text-gray-500">Summary for file: <span className="font-medium text-gray-700">{fileName}</span></p>
                    </div>
                    {showDownloadInvalidButton && (
                         <button
                            onClick={onDownloadInvalidCategories}
                            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                        >
                            Download Invalid Categories
                        </button>
                    )}
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <StatCard title="Total Leads Analyzed" value={stats.total} color="bg-blue-100 text-blue-600" icon={
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" /></svg>
                } />
                <StatCard title={qualifiedTitle} value={stats.processed} color="bg-green-100 text-green-600" icon={
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                } />
                <StatCard title="Rejected Leads" value={stats.rejected} color="bg-red-100 text-red-600" icon={
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" /></svg>
                } />
            </div>

            {stats.rejected > 0 && (
                 <div className="mt-8">
                    <h4 className="text-lg font-medium text-gray-700 mb-4">Rejection Breakdown</h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                        {/* FIX: Cast count to number to resolve '> cannot be applied to unknown' error. */}
                        {Object.entries(stats.reasons).map(([reason, count]) => (count as number) > 0 && (
                            <div key={reason} className="bg-gray-50 p-4 rounded-lg border flex justify-between items-center">
                                <p className="text-sm font-medium text-gray-600">{reason as RejectionReason}</p>
                                <p className="text-lg font-semibold text-gray-800">{count}</p>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};

export default Dashboard;
