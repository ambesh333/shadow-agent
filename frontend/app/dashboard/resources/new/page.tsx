'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { getApiUrl } from '@/lib/config';
import { useAuth } from '@/components/AuthContext';
import { ArrowLeft, Upload, Image, Video, Link as LinkIcon, Loader2, Check } from 'lucide-react';
import Link from 'next/link';

type ResourceType = 'IMAGE' | 'VIDEO' | 'LINK';

export default function NewResourcePage() {
    const router = useRouter();
    const { isAuthenticated } = useAuth();

    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [type, setType] = useState<ResourceType>('IMAGE');
    const [price, setPrice] = useState('0');
    const [url, setUrl] = useState('');
    const [imagePreview, setImagePreview] = useState<string | null>(null);
    const [imageData, setImageData] = useState<string | null>(null);
    const [network, setNetwork] = useState<'MAINNET' | 'DEVNET'>('MAINNET');
    const [token, setToken] = useState<'NATIVE' | 'USDC' | 'USDT'>('NATIVE');
    const [mintAddress, setMintAddress] = useState('');
    const [autoApprovalMinutes, setAutoApprovalMinutes] = useState('60');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        if (file.size > 5 * 1024 * 1024) {
            setError('Image must be less than 5MB');
            return;
        }

        const reader = new FileReader();
        reader.onloadend = () => {
            const base64 = reader.result as string;
            setImagePreview(base64);
            setImageData(base64);
            setError(null);
        };
        reader.readAsDataURL(file);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);

        if (!title.trim()) {
            setError('Title is required');
            return;
        }

        if (type === 'IMAGE' && !imageData) {
            setError('Please upload an image');
            return;
        }

        if ((type === 'VIDEO' || type === 'LINK') && !url.trim()) {
            setError('URL is required for this type');
            return;
        }

        setIsSubmitting(true);

        try {
            const API_URL = getApiUrl();
            const res = await fetch(`${API_URL}/resources`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    ...(localStorage.getItem('auth_token') ? { 'Authorization': `Bearer ${localStorage.getItem('auth_token')}` } : {})
                },
                credentials: 'include',
                body: JSON.stringify({
                    title: title.trim(),
                    description: description.trim() || undefined,
                    type,
                    price: parseFloat(price) || 0,
                    network,
                    token,
                    mintAddress: token === 'NATIVE' ? undefined : mintAddress.trim(),
                    imageData: type === 'IMAGE' ? imageData : undefined,
                    url: type !== 'IMAGE' ? url.trim() : undefined,
                    autoApprovalMinutes: parseInt(autoApprovalMinutes) || 60,
                })
            });

            if (!res.ok) {
                const data = await res.json();
                throw new Error(data.error || 'Failed to create resource');
            }

            router.push('/dashboard/resources');
        } catch (e: any) {
            setError(e.message);
        } finally {
            setIsSubmitting(false);
        }
    };

    if (!isAuthenticated) {
        return null;
    }

    return (
        <div className="max-w-3xl mx-auto relative">
            {/* Background Glow Effect */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-full bg-[#FFB657]/5 blur-[120px] rounded-full pointer-events-none -z-10" />

            <Link
                href="/dashboard/resources"
                className="inline-flex items-center gap-2 text-gray-500 hover:text-[#FFB657] mb-8 transition-colors text-sm font-medium"
            >
                <ArrowLeft size={16} /> Back to Resources
            </Link>

            <div className="bg-black/60 backdrop-blur-2xl rounded-3xl border border-white/10 p-8 md:p-10 shadow-2xl relative overflow-hidden">
                {/* Decorative top reflection */}
                <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent" />

                <h2 className="text-3xl font-bold text-[#F4F4F5] mb-2 text-center">Add Resource</h2>
                <p className="text-gray-500 text-center mb-10">Create a new premium data asset to monetize</p>

                <form onSubmit={handleSubmit} className="space-y-8">
                    {/* Type Selector */}
                    <div>
                        <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-4 text-center">Select Resource Type</label>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            {[
                                { value: 'IMAGE', icon: Image, label: 'Image', desc: 'Sell digital art or photos' },
                                { value: 'VIDEO', icon: Video, label: 'Video', desc: 'Monetize video content' },
                                { value: 'LINK', icon: LinkIcon, label: 'Link', desc: 'Paywall any URL' },
                            ].map(({ value, icon: Icon, label, desc }) => (
                                <button
                                    key={value}
                                    type="button"
                                    onClick={() => setType(value as ResourceType)}
                                    className={`relative flex flex-col items-center gap-3 p-6 rounded-2xl border transition-all duration-300 group ${type === value
                                        ? 'bg-white/10 border-[#FFB657] shadow-[0_0_30px_-10px_rgba(255,182,87,0.3)]'
                                        : 'bg-white/5 border-white/5 hover:bg-white/10 hover:border-white/10'
                                        }`}
                                >
                                    {type === value && (
                                        <div className="absolute top-3 right-3 text-[#FFB657]">
                                            <Check size={16} strokeWidth={3} />
                                        </div>
                                    )}
                                    <div className={`p-3 rounded-xl transition-colors ${type === value ? 'bg-[#FFB657] text-[#000000]' : 'bg-black/50 text-gray-400 group-hover:text-[#F4F4F5]'}`}>
                                        <Icon size={24} />
                                    </div>
                                    <div className="text-center">
                                        <span className={`block font-bold mb-1 ${type === value ? 'text-[#F4F4F5]' : 'text-gray-400'}`}>{label}</span>
                                        <span className="text-[10px] text-gray-500 font-medium">{desc}</span>
                                    </div>
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="space-y-6 bg-black/20 p-6 rounded-2xl border border-white/5">
                        {/* Title */}
                        <div>
                            <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-2 ml-1">Title *</label>
                            <input
                                type="text"
                                value={title}
                                onChange={(e) => setTitle(e.target.value)}
                                placeholder="e.g., Exclusive Dataset 2024"
                                className="w-full px-5 py-4 bg-black/50 border border-white/10 rounded-xl text-[#F4F4F5] placeholder-gray-600 focus:outline-none focus:border-[#FFB657] focus:ring-1 focus:ring-[#FFB657] transition-all"
                            />
                        </div>

                        {/* Description */}
                        <div>
                            <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-2 ml-1">Description</label>
                            <textarea
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                                placeholder="Detailed description of your resource..."
                                rows={3}
                                className="w-full px-5 py-4 bg-black/50 border border-white/10 rounded-xl text-[#F4F4F5] placeholder-gray-600 focus:outline-none focus:border-[#FFB657] focus:ring-1 focus:ring-[#FFB657] transition-all resize-none"
                            />
                        </div>

                        {/* Network Selector */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                                <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-2 ml-1">Network</label>
                                <div className="relative">
                                    <select
                                        value={network}
                                        onChange={(e) => {
                                            const val = e.target.value as 'MAINNET' | 'DEVNET';
                                            setNetwork(val);
                                            if (val === 'DEVNET') setToken('NATIVE');
                                        }}
                                        className="w-full px-5 py-4 bg-black/50 border border-white/10 rounded-xl text-[#F4F4F5] appearance-none focus:outline-none focus:border-[#FFB657] transition-all"
                                    >
                                        <option value="MAINNET">Solana Mainnet</option>
                                        <option value="DEVNET">Solana Devnet</option>
                                    </select>
                                    <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-gray-500">
                                        ▼
                                    </div>
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-2 ml-1">Token</label>
                                <div className="relative">
                                    <select
                                        value={token}
                                        onChange={(e) => setToken(e.target.value as any)}
                                        className="w-full px-5 py-4 bg-black/50 border border-white/10 rounded-xl text-[#F4F4F5] appearance-none focus:outline-none focus:border-[#FFB657] transition-all"
                                    >
                                        <option value="NATIVE">SOL (Native)</option>
                                        {network === 'MAINNET' && (
                                            <>
                                                <option value="USDC">USDC</option>
                                                <option value="USDT">USDT</option>
                                            </>
                                        )}
                                    </select>
                                    <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-gray-500">
                                        ▼
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Mint Address (if SPL) */}
                        {token !== 'NATIVE' && (
                            <div>
                                <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-2 ml-1">SPL Token Mint Address</label>
                                <input
                                    type="text"
                                    value={mintAddress}
                                    onChange={(e) => setMintAddress(e.target.value)}
                                    placeholder="Leave empty for standard USDC/USDT"
                                    className="w-full px-5 py-4 bg-black/50 border border-white/10 rounded-xl text-[#F4F4F5] placeholder-gray-600 focus:outline-none focus:border-[#FFB657] transition-all"
                                />
                            </div>
                        )}

                        {/* Price */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                                <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-2 ml-1">
                                    Price ({token === 'NATIVE' ? 'SOL' : token})
                                </label>
                                <input
                                    type="number"
                                    value={price}
                                    onChange={(e) => setPrice(e.target.value)}
                                    min="0"
                                    step="0.001"
                                    className="w-full px-5 py-4 bg-black/50 border border-white/10 rounded-xl text-[#F4F4F5] placeholder-gray-600 focus:outline-none focus:border-[#FFB657] transition-all font-mono"
                                />
                            </div>

                            {/* Auto-Approval Time */}
                            <div>
                                <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-2 ml-1">
                                    Auto-Approval (Minutes)
                                </label>
                                <input
                                    type="number"
                                    value={autoApprovalMinutes}
                                    onChange={(e) => setAutoApprovalMinutes(e.target.value)}
                                    min="1"
                                    step="1"
                                    className="w-full px-5 py-4 bg-black/50 border border-white/10 rounded-xl text-[#F4F4F5] placeholder-gray-600 focus:outline-none focus:border-[#FFB657] transition-all"
                                />
                            </div>
                        </div>

                        {/* Image Upload (for IMAGE type) */}
                        {type === 'IMAGE' && (
                            <div>
                                <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-2 ml-1">Upload Asset</label>
                                <div className="border border-dashed border-white/20 rounded-2xl p-8 text-center hover:border-[#FFB657]/50 hover:bg-white/5 transition-all group cursor-pointer relative overflow-hidden">
                                    {imagePreview ? (
                                        <div className="relative inline-block">
                                            <img src={imagePreview} alt="Preview" className="max-h-64 rounded-xl shadow-lg" />
                                            <button
                                                type="button"
                                                onClick={() => { setImagePreview(null); setImageData(null); }}
                                                className="absolute -top-3 -right-3 p-2 bg-[#B31D00] text-white rounded-full hover:scale-110 transition-transform shadow-lg"
                                            >
                                                ✕
                                            </button>
                                        </div>
                                    ) : (
                                        <label className="cursor-pointer block">
                                            <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform">
                                                <Upload size={32} className="text-gray-400 group-hover:text-[#FFB657] transition-colors" />
                                            </div>
                                            <p className="text-[#F4F4F5] font-medium mb-1">Click to upload or drag and drop</p>
                                            <p className="text-gray-500 text-xs">PNG, JPG up to 5MB</p>
                                            <input
                                                type="file"
                                                accept="image/*"
                                                onChange={handleImageChange}
                                                className="hidden"
                                            />
                                        </label>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* URL Input (for VIDEO/LINK type) */}
                        {type !== 'IMAGE' && (
                            <div>
                                <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-2 ml-1">
                                    {type === 'VIDEO' ? 'Video URL *' : 'Destination URL *'}
                                </label>
                                <input
                                    type="url"
                                    value={url}
                                    onChange={(e) => setUrl(e.target.value)}
                                    placeholder={type === 'VIDEO' ? 'https://youtube.com/watch?v=...' : 'https://...'}
                                    className="w-full px-5 py-4 bg-black/50 border border-white/10 rounded-xl text-[#F4F4F5] placeholder-gray-600 focus:outline-none focus:border-[#FFB657] transition-all"
                                />
                            </div>
                        )}
                    </div>

                    {/* Error */}
                    {error && (
                        <div className="bg-[#B31D00]/10 border border-[#B31D00]/30 text-[#FF5832] p-4 rounded-xl text-sm flex items-center gap-2">
                            Alert: {error}
                        </div>
                    )}

                    {/* Submit */}
                    <button
                        type="submit"
                        disabled={isSubmitting}
                        className="w-full py-4 bg-gradient-to-r from-[#FF8E40] to-[#FF5832] hover:opacity-90 rounded-xl font-bold text-black text-lg shadow-lg shadow-orange-500/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 group"
                    >
                        {isSubmitting ? (
                            <>
                                <Loader2 size={24} className="animate-spin" /> Creating...
                            </>
                        ) : (
                            <>
                                <Upload size={20} className="group-hover:-translate-y-0.5 transition-transform" /> Create Resource
                            </>
                        )}
                    </button>
                </form>
            </div>
        </div>
    );
}
