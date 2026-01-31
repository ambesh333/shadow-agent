'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { ExternalLink, Image, Video, Link2, Sparkles, ArrowRight, Shield } from 'lucide-react';
import { getApiUrl } from '@/lib/config';

interface Resource {
    id: string;
    title: string;
    description: string;
    type: string;
    price: number;
    network: string;
    token: string;
    isActive: boolean;
    createdAt: string;
    trustScore: number;
    trustLabel: string;
}

// Get color based on score
const getScoreColor = (score: number): string => {
    if (score >= 85) return '#22c55e';  // green
    if (score >= 70) return '#84cc16';  // lime
    if (score >= 55) return '#eab308';  // yellow
    if (score >= 40) return '#f97316';  // orange
    return '#ef4444';                   // red
};

export default function ExplorePage() {
    const [resources, setResources] = useState<Resource[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedResource, setSelectedResource] = useState<Resource | null>(null);

    useEffect(() => {
        fetchResources();
    }, []);

    const fetchResources = async () => {
        try {
            const res = await fetch(`${getApiUrl()}/explore`);
            const data = await res.json();
            setResources(data.resources || []);
        } catch (error) {
            console.error('Failed to fetch resources:', error);
        } finally {
            setLoading(false);
        }
    };

    const getTypeIcon = (type: string) => {
        switch (type) {
            case 'IMAGE': return <Image size={16} className="text-blue-400" />;
            case 'VIDEO': return <Video size={16} className="text-purple-400" />;
            case 'LINK': return <Link2 size={16} className="text-green-400" />;
            default: return null;
        }
    };

    const topResource = resources[0];

    return (
        <div className="text-white">
            <main className="max-w-6xl mx-auto">
                {/* Page Title */}
                <div className="mb-12">
                    <h1 className="text-4xl font-bold mb-4">
                        Explore <span className="text-[#FF8E40]">Resources</span>
                    </h1>
                    <p className="text-gray-400 text-lg">
                        Browse all available resources for AI agents. Use the API to access programmatically.
                    </p>
                </div>

                {loading ? (
                    <div className="flex items-center justify-center py-20">
                        <div className="w-8 h-8 border-2 border-[#FF8E40] border-t-transparent rounded-full animate-spin" />
                    </div>
                ) : (
                    <>
                        {/* Featured Resource */}
                        {topResource && (
                            <div className="mb-12">
                                <h2 className="text-sm font-medium text-gray-500 uppercase tracking-wider mb-4 flex items-center gap-2">
                                    <Sparkles size={14} className="text-[#FF8E40]" />
                                    Most Trusted
                                </h2>
                                <div
                                    onClick={() => setSelectedResource(topResource)}
                                    className="bg-gradient-to-br from-[#FF8E40]/10 to-transparent rounded-2xl border border-[#FF8E40]/20 p-6 cursor-pointer hover:border-[#FF8E40]/40 transition-colors"
                                >
                                    <div className="flex items-start justify-between">
                                        <div className="flex-1">
                                            <div className="flex items-center gap-2 mb-2">
                                                {getTypeIcon(topResource.type)}
                                                <span className="text-xs text-gray-500">{topResource.type}</span>
                                                <div className="ml-auto flex items-center gap-1.5 px-2 py-1 rounded-full"
                                                    style={{ backgroundColor: `${getScoreColor(topResource.trustScore)}20` }}>
                                                    <Shield size={12} style={{ color: getScoreColor(topResource.trustScore) }} />
                                                    <span className="text-xs font-bold" style={{ color: getScoreColor(topResource.trustScore) }}>
                                                        {topResource.trustScore}
                                                    </span>
                                                </div>
                                            </div>
                                            <h3 className="text-2xl font-bold text-white mb-2">{topResource.title}</h3>
                                            <p className="text-gray-400 mb-4 line-clamp-2">{topResource.description}</p>
                                            <span className="text-[#FF8E40] font-bold text-lg">
                                                {topResource.price} {topResource.token === 'NATIVE' ? 'SOL' : topResource.token}
                                            </span>
                                        </div>
                                        <ArrowRight className="text-[#FF8E40] shrink-0 ml-4" />
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Resources Table */}
                        <div>
                            <h2 className="text-sm font-medium text-gray-500 uppercase tracking-wider mb-4">
                                All Resources ({resources.length})
                            </h2>

                            <div className="bg-[#111] rounded-2xl border border-white/10 overflow-hidden">
                                {/* Table Header */}
                                <div className="grid grid-cols-12 gap-4 px-6 py-4 border-b border-white/10 text-xs text-gray-500 uppercase tracking-wider">
                                    <div className="col-span-5">Resource</div>
                                    <div className="col-span-2">Type</div>
                                    <div className="col-span-2">Price</div>
                                    <div className="col-span-2">Trust Score</div>
                                    <div className="col-span-1">Network</div>
                                </div>

                                {/* Table Rows */}
                                {resources.length === 0 ? (
                                    <div className="px-6 py-12 text-center text-gray-500">
                                        No resources available yet.
                                    </div>
                                ) : (
                                    resources.map((resource) => (
                                        <div
                                            key={resource.id}
                                            onClick={() => setSelectedResource(resource)}
                                            className="grid grid-cols-12 gap-4 px-6 py-4 border-b border-white/5 hover:bg-white/5 cursor-pointer transition-colors"
                                        >
                                            <div className="col-span-5">
                                                <p className="text-white font-medium truncate">{resource.title}</p>
                                                <p className="text-gray-500 text-sm truncate">{resource.description}</p>
                                            </div>
                                            <div className="col-span-2 flex items-center gap-2">
                                                {getTypeIcon(resource.type)}
                                                <span className="text-gray-400 text-sm">{resource.type}</span>
                                            </div>
                                            <div className="col-span-2">
                                                <span className="text-[#FF8E40] font-medium">
                                                    {resource.price} {resource.token === 'NATIVE' ? 'SOL' : resource.token}
                                                </span>
                                            </div>
                                            <div className="col-span-2">
                                                <div className="flex items-center gap-2">
                                                    <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold"
                                                        style={{
                                                            backgroundColor: `${getScoreColor(resource.trustScore)}20`,
                                                            color: getScoreColor(resource.trustScore)
                                                        }}>
                                                        {resource.trustScore}
                                                    </div>
                                                    <span className="text-xs text-gray-500">{resource.trustLabel}</span>
                                                </div>
                                            </div>
                                            <div className="col-span-1">
                                                <span className={`text-xs px-2 py-1 rounded-full ${resource.network === 'MAINNET'
                                                    ? 'bg-green-500/20 text-green-400'
                                                    : 'bg-yellow-500/20 text-yellow-400'
                                                    }`}>
                                                    {resource.network}
                                                </span>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>

                    </>
                )}
            </main>

            {/* Resource Detail Modal */}
            {selectedResource && (
                <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4" onClick={() => setSelectedResource(null)}>
                    <div className="bg-[#111] rounded-2xl border border-white/10 max-w-lg w-full p-6" onClick={e => e.stopPropagation()}>
                        <div className="flex items-center gap-2 mb-4">
                            {getTypeIcon(selectedResource.type)}
                            <span className="text-xs text-gray-500">{selectedResource.type}</span>
                            <div className="ml-auto flex items-center gap-2">
                                <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full"
                                    style={{ backgroundColor: `${getScoreColor(selectedResource.trustScore)}20` }}>
                                    <Shield size={14} style={{ color: getScoreColor(selectedResource.trustScore) }} />
                                    <span className="text-sm font-bold" style={{ color: getScoreColor(selectedResource.trustScore) }}>
                                        {selectedResource.trustScore}
                                    </span>
                                    <span className="text-xs" style={{ color: getScoreColor(selectedResource.trustScore) }}>
                                        {selectedResource.trustLabel}
                                    </span>
                                </div>
                                <span className={`text-xs px-2 py-1 rounded-full ${selectedResource.network === 'MAINNET'
                                    ? 'bg-green-500/20 text-green-400'
                                    : 'bg-yellow-500/20 text-yellow-400'
                                    }`}>
                                    {selectedResource.network}
                                </span>
                            </div>
                        </div>

                        <h2 className="text-2xl font-bold text-white mb-2">{selectedResource.title}</h2>
                        <p className="text-gray-400 mb-6">{selectedResource.description}</p>

                        <div className="space-y-3 mb-6">
                            <div className="flex justify-between">
                                <span className="text-gray-500">Price</span>
                                <span className="text-[#FF8E40] font-bold">
                                    {selectedResource.price} {selectedResource.token === 'NATIVE' ? 'SOL' : selectedResource.token}
                                </span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-gray-500">Resource ID</span>
                                <span className="text-gray-400 font-mono text-sm">{selectedResource.id}</span>
                            </div>
                        </div>

                        <div className="bg-black rounded-xl p-4 mb-6">
                            <p className="text-xs text-gray-500 mb-2">Access Endpoint (for AI Agents)</p>
                            <code className="text-[#FF8E40] text-sm break-all">
                                {getApiUrl()}/gateway/resource/{selectedResource.id}
                            </code>
                        </div>

                        <button
                            onClick={() => setSelectedResource(null)}
                            className="w-full py-3 bg-white/10 hover:bg-white/20 text-white rounded-xl transition-colors"
                        >
                            Close
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
