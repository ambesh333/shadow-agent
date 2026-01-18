'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { API_URL } from '@/lib/config';
import { useAuth } from '@/components/AuthContext';
import { Package, Plus, ExternalLink, Image, Video, Loader2, Trash2 } from 'lucide-react';

interface Resource {
    id: string;
    title: string;
    description: string | null;
    type: 'IMAGE' | 'VIDEO' | 'LINK';
    price: number;
    url: string | null;
    isActive: boolean;
    createdAt: string;
}

export default function ResourcesPage() {
    const { isAuthenticated } = useAuth();
    const [resources, setResources] = useState<Resource[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (isAuthenticated) {
            fetchResources();
        }
    }, [isAuthenticated]);

    const fetchResources = async () => {
        try {
            setIsLoading(true);
            const res = await fetch(`${API_URL}/resources`, {
                credentials: 'include'
            });

            if (!res.ok) throw new Error('Failed to fetch resources');

            const data = await res.json();
            setResources(data.resources);
        } catch (e: any) {
            setError(e.message);
        } finally {
            setIsLoading(false);
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Are you sure you want to delete this resource?')) return;

        try {
            const res = await fetch(`${API_URL}/resources/${id}`, {
                method: 'DELETE',
                credentials: 'include'
            });

            if (!res.ok) throw new Error('Failed to delete resource');

            setResources(prev => prev.filter(r => r.id !== id));
        } catch (e: any) {
            alert(e.message);
        }
    };

    const getTypeIcon = (type: string) => {
        switch (type) {
            case 'IMAGE': return <Image size={18} className="text-blue-400" />;
            case 'VIDEO': return <Video size={18} className="text-purple-400" />;
            default: return <ExternalLink size={18} className="text-green-400" />;
        }
    };

    if (!isAuthenticated) {
        return null; // Layout handles auth gate
    }

    return (
        <div>
            <div className="flex justify-between items-center mb-8">
                <div className="flex items-center gap-3">
                    <Package className="text-blue-400" size={32} />
                    <div>
                        <h2 className="text-3xl font-bold text-white">My Resources</h2>
                        <p className="text-gray-400 text-sm">Manage your premium data assets</p>
                    </div>
                </div>

                <Link
                    href="/dashboard/resources/new"
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 rounded-lg font-bold text-sm transition-colors"
                >
                    <Plus size={18} /> Add Resource
                </Link>
            </div>

            {isLoading && (
                <div className="flex items-center justify-center py-20">
                    <Loader2 size={32} className="animate-spin text-gray-500" />
                </div>
            )}

            {error && (
                <div className="bg-red-500/10 border border-red-500/30 text-red-400 p-4 rounded-lg">
                    {error}
                </div>
            )}

            {!isLoading && resources.length === 0 && (
                <div className="flex flex-col items-center justify-center py-20 bg-gray-800/50 rounded-xl border border-dashed border-gray-700">
                    <Package size={48} className="text-gray-600 mb-4" />
                    <p className="text-gray-400 mb-4">No resources yet</p>
                    <Link
                        href="/dashboard/resources/new"
                        className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 rounded-lg font-bold text-sm"
                    >
                        <Plus size={16} /> Add Your First Resource
                    </Link>
                </div>
            )}

            {!isLoading && resources.length > 0 && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {resources.map((resource) => (
                        <div
                            key={resource.id}
                            className="bg-gray-800 rounded-xl border border-gray-700 p-5 hover:border-gray-600 transition-colors group"
                        >
                            <div className="flex items-start justify-between mb-3">
                                <div className="flex items-center gap-2">
                                    {getTypeIcon(resource.type)}
                                    <span className="text-xs font-bold uppercase text-gray-500 tracking-wider">
                                        {resource.type}
                                    </span>
                                </div>
                                <div className={`text-xs px-2 py-0.5 rounded ${resource.isActive ? 'bg-green-500/20 text-green-400' : 'bg-gray-600 text-gray-400'}`}>
                                    {resource.isActive ? 'Active' : 'Inactive'}
                                </div>
                            </div>

                            <h3 className="text-lg font-bold text-white mb-1 truncate">{resource.title}</h3>
                            <p className="text-gray-400 text-sm mb-4 line-clamp-2">
                                {resource.description || 'No description'}
                            </p>

                            <div className="flex items-center justify-between pt-3 border-t border-gray-700">
                                <span className="text-lg font-bold text-green-400">${resource.price.toFixed(4)}</span>
                                <button
                                    onClick={() => handleDelete(resource.id)}
                                    className="p-2 text-gray-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
                                >
                                    <Trash2 size={16} />
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
