import React, { useState } from 'react';
import { LabelTemplate } from '../types';
import { PREMIUM_TEMPLATES, downloadTemplatePack, uploadTemplatePack, filterTemplates } from '../services/templateService';
import { Layout, Download, Upload, Search, Tag, Star, CheckCircle } from 'lucide-react';

interface TemplateGalleryProps {
    onSelectTemplate: (template: LabelTemplate) => void;
    currentTemplateId?: string;
}

const TemplateGallery: React.FC<TemplateGalleryProps> = ({ onSelectTemplate, currentTemplateId }) => {
    const [templates, setTemplates] = useState<LabelTemplate[]>(PREMIUM_TEMPLATES);
    const [category, setCategory] = useState<string>('all');
    const [search, setSearch] = useState('');

    const filteredTemplates = filterTemplates(templates, {
        category: category === 'all' ? undefined : category as any,
        search: search || undefined
    });

    const handleImport = async () => {
        try {
            const imported = await uploadTemplatePack();
            setTemplates(prev => [...prev, ...imported]);
            alert(`Imported ${imported.length} templates!`);
        } catch (e) {
            console.error(e);
            alert('Failed to import templates');
        }
    };

    const handleExport = () => {
        downloadTemplatePack(templates, 'my-collection', {
            author: 'User',
            description: 'My exported templates',
            tags: ['export']
        });
    };

    const categories = ['all', 'minimal', 'detailed', 'brand', 'grid', 'custom'];

    return (
        <div className="space-y-6">
            {/* Header & Actions */}
            <div className="flex flex-col md:flex-row gap-4 justify-between items-start md:items-center bg-gray-900 p-4 rounded-xl border border-gray-800">
                <div>
                    <h2 className="text-lg font-bold text-white flex items-center gap-2">
                        <Layout className="text-purple-400" /> Template Gallery
                    </h2>
                    <p className="text-xs text-gray-400">Select a layout for your labels</p>
                </div>
                <div className="flex gap-2 w-full md:w-auto">
                    <button
                        onClick={handleImport}
                        className="flex-1 md:flex-none px-3 py-2 bg-gray-800 hover:bg-gray-700 rounded-lg text-xs font-bold text-gray-300 flex items-center justify-center gap-2 transition-colors border border-gray-700"
                    >
                        <Upload size={14} /> Import
                    </button>
                    <button
                        onClick={handleExport}
                        className="flex-1 md:flex-none px-3 py-2 bg-gray-800 hover:bg-gray-700 rounded-lg text-xs font-bold text-gray-300 flex items-center justify-center gap-2 transition-colors border border-gray-700"
                    >
                        <Download size={14} /> Export
                    </button>
                </div>
            </div>

            {/* Filters */}
            <div className="flex flex-col gap-4">
                {/* Search */}
                <div className="relative">
                    <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
                    <input
                        type="text"
                        placeholder="Search templates..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="w-full bg-gray-900 border border-gray-800 rounded-lg py-2 pl-9 pr-4 text-sm text-white focus:border-purple-500 outline-none"
                    />
                </div>

                {/* Categories */}
                <div className="flex gap-2 overflow-x-auto pb-2 custom-scrollbar">
                    {categories.map(cat => (
                        <button
                            key={cat}
                            onClick={() => setCategory(cat)}
                            className={`px-3 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-colors border
                ${category === cat
                                    ? 'bg-purple-600 border-purple-500 text-white'
                                    : 'bg-gray-900 border-gray-800 text-gray-400 hover:bg-gray-800'}
              `}
                        >
                            {cat.charAt(0).toUpperCase() + cat.slice(1)}
                        </button>
                    ))}
                </div>
            </div>

            {/* Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredTemplates.map(template => (
                    <div
                        key={template.id}
                        onClick={() => onSelectTemplate(template)}
                        className={`group relative p-4 rounded-xl border cursor-pointer transition-all hover:scale-[1.02]
              ${currentTemplateId === template.id
                                ? 'bg-purple-900/20 border-purple-500 ring-1 ring-purple-500'
                                : 'bg-gray-900 border-gray-800 hover:border-purple-500/50'}
            `}
                    >
                        {currentTemplateId === template.id && (
                            <div className="absolute top-3 right-3 text-purple-400">
                                <CheckCircle size={18} fill="currentColor" className="text-black" />
                            </div>
                        )}

                        <div className="flex items-start justify-between mb-2">
                            <div className="p-2 rounded-lg bg-gray-800 text-purple-400 group-hover:bg-purple-900/30 transition-colors">
                                <Layout size={20} />
                            </div>
                            {template.isFavorite && <Star size={14} className="text-yellow-400 fill-yellow-400" />}
                        </div>

                        <h3 className="font-bold text-white mb-1">{template.name}</h3>
                        <p className="text-xs text-gray-400 mb-3 line-clamp-2">{template.description}</p>

                        <div className="flex flex-wrap gap-1.5 mb-3">
                            {template.tags.slice(0, 3).map(tag => (
                                <span key={tag} className="px-1.5 py-0.5 rounded bg-gray-800 text-[10px] text-gray-400 flex items-center gap-1">
                                    <Tag size={8} /> {tag}
                                </span>
                            ))}
                        </div>

                        <div className="flex items-center justify-between text-[10px] text-gray-500 border-t border-gray-800 pt-3 mt-auto">
                            <span>By {template.author}</span>
                            <span>{template.supportedSizes.length} sizes</span>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default TemplateGallery;
