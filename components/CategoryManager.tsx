
import React, { useState } from 'react';

interface CategoryManagerProps {
  initialValidCategories: string;
  initialNonHipCategories: string[];
  onSave: (valid: string, nonHip: string[]) => void;
  onClose: () => void;
}

const CategoryManager: React.FC<CategoryManagerProps> = ({
  initialValidCategories,
  initialNonHipCategories,
  onSave,
  onClose,
}) => {
  const [validCategories, setValidCategories] = useState(initialValidCategories);
  const [nonHipCategories, setNonHipCategories] = useState(initialNonHipCategories.join('\n'));

  const handleSave = () => {
    const nonHipArray = nonHipCategories.split('\n').map(s => s.trim()).filter(Boolean);
    onSave(validCategories, nonHipArray);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-75 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-3xl max-h-full overflow-y-auto flex flex-col">
        <div className="p-6 border-b">
          <h2 className="text-xl font-bold text-gray-800">Manage Categories</h2>
          <p className="text-sm text-gray-500 mt-1">Changes are saved to your browser and will persist across sessions.</p>
        </div>
        <div className="p-6 space-y-6 flex-grow overflow-y-auto">
          <div>
            <label htmlFor="valid-categories" className="block text-sm font-medium text-gray-700 mb-1">
              Valid HIP Categories (CSV Format)
            </label>
            <textarea
              id="valid-categories"
              rows={10}
              className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 text-sm font-mono"
              value={validCategories}
              onChange={(e) => setValidCategories(e.target.value)}
            />
          </div>
          <div>
            <label htmlFor="nonhip-categories" className="block text-sm font-medium text-gray-700 mb-1">
              Non-HIP Categories (One per line)
            </label>
            <textarea
              id="nonhip-categories"
              rows={10}
              className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 text-sm font-mono"
              value={nonHipCategories}
              onChange={(e) => setNonHipCategories(e.target.value)}
            />
          </div>
        </div>
        <div className="px-6 py-4 bg-gray-50 flex justify-end space-x-3 border-t">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
          >
            Save Changes
          </button>
        </div>
      </div>
    </div>
  );
};

export default CategoryManager;
