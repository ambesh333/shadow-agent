'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { API_URL } from '@/lib/config';
import { useAuth } from '@/components/AuthContext';
import { Package, Plus, ExternalLink, Image, Video, Loader2, Trash2, Copy, Check, X, AlertTriangle } from 'lucide-react';

interface Resource {
    id: string;
    title: string;
    description: string | null;
    type: 'IMAGE' | 'VIDEO' | 'LINK';
    price: number;
    url: string | null;
    network: 'MAINNET' | 'DEVNET';
    token: 'NATIVE' | 'USDC' | 'USDT';
    isActive: boolean;
    createdAt: string;
}

// Shimmer Skeleton Component
function ResourceSkeleton() {
    return (
        <div className="bg-[#000000] rounded-2xl border border-white/5 p-6 animate-pulse">
            <div className="flex justify-between mb-4">
                <div className="flex gap-3">
                    <div className="w-10 h-10 bg-white/5 rounded-lg" />
                    <div className="w-16 h-4 bg-white/5 rounded mt-3" />
                </div>
                <div className="flex flex-col gap-2 items-end">
                    <div className="w-12 h-4 bg-white/5 rounded-full" />
                    <div className="w-16 h-4 bg-white/5 rounded-full" />
                </div>
            </div>
            <div className="space-y-3 mb-6">
                <div className="w-3/4 h-6 bg-white/5 rounded" />
                <div className="w-full h-4 bg-white/5 rounded" />
                <div className="w-1/2 h-4 bg-white/5 rounded" />
            </div>
            <div className="h-10 bg-white/5 rounded border border-white/5 mb-6" />
            <div className="border-t border-white/5 pt-4 flex justify-between">
                <div className="w-24 h-8 bg-white/5 rounded" />
                <div className="w-8 h-8 bg-white/5 rounded" />
            </div>
        </div>
    );
}

// Confirmation Modal Component
function DeleteConfirmationModal({ isOpen, onClose, onConfirm, isDeleting }: { isOpen: boolean; onClose: () => void; onConfirm: () => void; isDeleting: boolean }) {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <div className="bg-[#000000] border border-white/10 rounded-2xl p-6 max-w-sm w-full shadow-2xl space-y-4 relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-[#FF8E40] to-[#FF5832]" />

                <div className="flex items-center gap-3 text-[#FF5832]">
                    <AlertTriangle size={24} />
                    <h3 className="text-xl font-bold text-[#F4F4F5]">Delete Resource?</h3>
                </div>

                <p className="text-gray-400 text-sm leading-relaxed">
                    This action cannot be undone. This resource will be permanently removed from your dashboard and gateway.
                </p>

                <div className="flex gap-3 pt-2">
                    <button
                        onClick={onClose}
                        disabled={isDeleting}
                        className="flex-1 px-4 py-2.5 bg-white/5 hover:bg-white/10 rounded-xl font-medium text-gray-400 transition-colors disabled:opacity-50"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={onConfirm}
                        disabled={isDeleting}
                        className="flex-1 px-4 py-2.5 bg-[#B31D00] hover:bg-[#B31D00]/80 rounded-xl font-bold text-white transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                    >
                        {isDeleting ? <Loader2 size={16} className="animate-spin" /> : <Trash2 size={16} />}
                        Delete
                    </button>
                </div>
            </div>
        </div>
    );
}

// Individual Resource Card Component
function ResourceCard({ resource, onDelete }: { resource: Resource; onDelete: (id: string) => void }) {
    const [copied, setCopied] = useState(false);

    const handleCopy = () => {
        const url = `http://localhost:3001/api/gateway/resource/${resource.id}`;
        navigator.clipboard.writeText(url);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const getTypeIcon = (type: string) => {
        switch (type) {
            case 'IMAGE': return <Image size={18} className="text-[#FFB657]" />;
            case 'VIDEO': return <Video size={18} className="text-[#FF8E40]" />;
            default: return <ExternalLink size={18} className="text-[#FF5832]" />;
        }
    };

    return (
        <div className="bg-[#000000] rounded-2xl border border-white/10 p-6 hover:border-[#FFB657]/50 transition-all duration-300 group shadow-xl shadow-black/50">
            <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-white/5 rounded-lg border border-white/5">
                        {getTypeIcon(resource.type)}
                    </div>
                    <span className="text-xs font-bold uppercase text-gray-500 tracking-wider">
                        {resource.type}
                    </span>
                </div>
                <div className="flex flex-col items-end gap-1">
                    <div className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${resource.network === 'MAINNET' ? 'bg-[#FFB657]/10 text-[#FFB657] border border-[#FFB657]/20' : 'bg-white/10 text-gray-400 border border-white/10'}`}>
                        {resource.network}
                    </div>
                    <div className={`text-xs px-2 py-0.5 rounded-full ${resource.isActive ? 'bg-[#FF8E40]/10 text-[#FF8E40]' : 'bg-gray-800 text-gray-500'}`}>
                        {resource.isActive ? 'Active' : 'Inactive'}
                    </div>
                </div>
            </div>

            <div className="mb-6">
                <h3 className="text-lg font-bold text-[#F4F4F5] mb-2 truncate">{resource.title}</h3>
                <p className="text-gray-500 text-sm line-clamp-2 h-10">
                    {resource.description || 'No description provided'}
                </p>
            </div>

            <div className="mb-6">
                <label className="text-[10px] uppercase font-bold text-gray-600 block mb-2 tracking-wider">Gateway URL</label>
                <div className="flex items-center gap-2 bg-white/5 p-2 rounded-lg border border-white/5 hover:border-white/10 transition-colors">
                    <code className="text-[10px] text-[#FFB657] truncate flex-1 font-mono">
                        {`http://localhost:3001/api/gateway/resource/${resource.id}`}
                    </code>
                    <button
                        onClick={handleCopy}
                        className={`p-1.5 rounded transition-colors ${copied ? 'text-green-500 bg-green-500/10' : 'text-gray-500 hover:text-[#F4F4F5] hover:bg-white/10'}`}
                        title="Copy URL"
                    >
                        {copied ? <Check size={12} /> : <Copy size={12} />}
                    </button>
                    <Link
                        href={`/dashboard/demo?url=${encodeURIComponent(`http://localhost:3001/api/gateway/resource/${resource.id}`)}`}
                        className="p-1.5 text-gray-500 hover:text-[#FF8E40] hover:bg-white/10 rounded transition-colors"
                        title="Open Simulator"
                    >
                        <ExternalLink size={12} />
                    </Link>
                </div>
            </div>

            <div className="flex items-center justify-between pt-4 border-t border-white/5">
                <div className="flex flex-col">
                    <span className="text-2xl font-bold text-[#F4F4F5] tracking-tight">
                        {resource.price.toFixed(resource.token === 'NATIVE' ? 5 : 4)}
                        <span className="ml-1 text-sm font-medium text-gray-500">{resource.token === 'NATIVE' ? 'SOL' : resource.token}</span>
                    </span>
                </div>
                <button
                    onClick={() => onDelete(resource.id)}
                    className="p-2.5 text-gray-500 hover:text-[#B31D00] hover:bg-[#B31D00]/10 rounded-xl transition-all opacity-0 group-hover:opacity-100"
                    title="Delete Resource"
                >
                    <Trash2 size={16} />
                </button>
            </div>
        </div>
    );
}

export default function ResourcesPage() {
    const { isAuthenticated } = useAuth();
    const [resources, setResources] = useState<Resource[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [deleteId, setDeleteId] = useState<string | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);

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

    const confirmDelete = async () => {
        if (!deleteId) return;
        setIsDeleting(true);

        try {
            const res = await fetch(`${API_URL}/resources/${deleteId}`, {
                method: 'DELETE',
                credentials: 'include'
            });

            if (!res.ok) throw new Error('Failed to delete resource');

            setResources(prev => prev.filter(r => r.id !== deleteId));
            setDeleteId(null);
        } catch (e: any) {
            alert(e.message);
        } finally {
            setIsDeleting(false);
        }
    };

    if (!isAuthenticated) {
        return null;
    }

    return (
        <div>
            <div className="flex justify-between items-center mb-8">
                <div className="flex items-center gap-3">
                    <div className="p-3 bg-white/5 rounded-xl border border-white/5">
                        <Package className="text-[#FFB657]" size={24} />
                    </div>
                    <div>
                        <h2 className="text-3xl font-bold text-[#F4F4F5]">My Resources</h2>
                        <p className="text-gray-400 text-sm">Manage your premium data assets</p>
                    </div>
                </div>

                <Link
                    href="/dashboard/resources/new"
                    className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-[#FF8E40] to-[#FF5832] hover:opacity-90 rounded-xl font-bold text-sm text-black transition-all shadow-lg shadow-orange-500/20"
                >
                    <Plus size={18} /> Add Resource
                </Link>
            </div>

            {error && (
                <div className="bg-[#B31D00]/10 border border-[#B31D00]/30 text-[#FF5832] p-4 rounded-xl mb-6">
                    {error}
                </div>
            )}

            {isLoading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {[1, 2, 3, 4, 5, 6].map((i) => (
                        <ResourceSkeleton key={i} />
                    ))}
                </div>
            ) : resources.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-24 bg-[#000000] rounded-2xl border border-white/5">
                    <div className="p-4 bg-white/5 rounded-full mb-4">
                        <Package size={32} className="text-gray-600" />
                    </div>
                    <p className="text-gray-400 mb-6 font-medium">No resources yet</p>
                    <Link
                        href="/dashboard/resources/new"
                        className="flex items-center gap-2 px-6 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-full font-bold text-sm text-[#F4F4F5] transition-all"
                    >
                        <Plus size={16} /> Create Your First Resource
                    </Link>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {resources.map((resource) => (
                        <ResourceCard
                            key={resource.id}
                            resource={resource}
                            onDelete={(id) => setDeleteId(id)}
                        />
                    ))}
                </div>
            )}

            <DeleteConfirmationModal
                isOpen={!!deleteId}
                onClose={() => setDeleteId(null)}
                onConfirm={confirmDelete}
                isDeleting={isDeleting}
            />
        </div>
    );
}
