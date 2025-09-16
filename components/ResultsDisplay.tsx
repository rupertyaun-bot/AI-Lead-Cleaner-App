
import React, { useState } from 'react';
import { ProcessedLead, RejectedLead } from '../types';

const ProcessedTable: React.FC<{ leads: ProcessedLead[] }> = ({ leads }) => (
    <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
                <tr>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name & Suburb</th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Company</th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Category</th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">SFDC Category</th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Contact Number</th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">AI Note</th>
                </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
                {leads.map(lead => (
                    <tr key={lead.id}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{lead.name_and_suburb}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{lead.company || 'N/A'}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{lead.category}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{lead.sfdc_category}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{lead.mobile_phone || lead.phone}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{lead.aiReason}</td>
                    </tr>
                ))}
            </tbody>
        </table>
    </div>
);

const RejectedTable: React.FC<{ leads: RejectedLead[] }> = ({ leads }) => (
     <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
                <tr>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Title</th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Rejection Reason</th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Details</th>
                </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
                {leads.map(lead => (
                    <tr key={lead.id}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{lead.originalData.title || 'N/A'}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-red-100 text-red-800">
                                {lead.rejectionReason}
                            </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{lead.rejectionDetail}</td>
                    </tr>
                ))}
            </tbody>
        </table>
    </div>
);

const ResultsDisplay: React.FC<{ processedLeads: ProcessedLead[], rejectedLeads: RejectedLead[] }> = ({ processedLeads, rejectedLeads }) => {
    const [activeTab, setActiveTab] = useState('processed');

    const tabs = [
        { id: 'processed', name: 'Qualified Leads', count: processedLeads.length, condition: processedLeads.length > 0 },
        { id: 'rejected', name: 'Rejected Leads', count: rejectedLeads.length, condition: rejectedLeads.length > 0 },
    ].filter(tab => tab.condition);

    if (tabs.length === 0) return null;

    return (
        <div>
            <div className="sm:hidden">
                <label htmlFor="tabs" className="sr-only">Select a tab</label>
                <select
                    id="tabs"
                    name="tabs"
                    className="block w-full focus:ring-indigo-500 focus:border-indigo-500 border-gray-300 rounded-md"
                    onChange={(e) => setActiveTab(e.target.value)}
                    value={activeTab}
                >
                    {tabs.map((tab) => (
                        <option key={tab.id}>{tab.name} ({tab.count})</option>
                    ))}
                </select>
            </div>
            <div className="hidden sm:block">
                <div className="border-b border-gray-200">
                    <nav className="-mb-px flex space-x-8" aria-label="Tabs">
                        {tabs.map((tab) => (
                            <button
                                key={tab.name}
                                onClick={() => setActiveTab(tab.id)}
                                className={`${
                                    activeTab === tab.id
                                        ? 'border-indigo-500 text-indigo-600'
                                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                                } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
                            >
                                {tab.name} <span className="bg-gray-100 text-gray-600 ml-2 py-0.5 px-2.5 rounded-full text-xs font-medium">{tab.count}</span>
                            </button>
                        ))}
                    </nav>
                </div>
            </div>

            <div className="mt-6">
                {activeTab === 'processed' && <ProcessedTable leads={processedLeads} />}
                {activeTab === 'rejected' && <RejectedTable leads={rejectedLeads} />}
            </div>
        </div>
    );
};

export default ResultsDisplay;