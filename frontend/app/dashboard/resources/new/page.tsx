'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { API_URL } from '@/lib/config';
import { useAuth } from '@/components/AuthContext';
import { ArrowLeft, Upload, Image, Video, Link as LinkIcon, Loader2 } from 'lucide-react';
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
            const res = await fetch(`${API_URL}/resources`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
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
        <div className="max-w-2xl mx-auto">
            <Link
                href="/dashboard/resources"
                className="inline-flex items-center gap-2 text-gray-400 hover:text-white mb-6 transition-colors"
            >
                <ArrowLeft size={18} /> Back to Resources
            </Link>

            <div className="bg-gray-800 rounded-xl border border-gray-700 p-8">
                <h2 className="text-2xl font-bold text-white mb-6">Add New Resource</h2>

                <form onSubmit={handleSubmit} className="space-y-6">
                    {/* Type Selector */}
                    <div>
                        <label className="block text-sm font-medium text-gray-400 mb-3">Resource Type</label>
                        <div className="grid grid-cols-3 gap-3">
                            {[
                                { value: 'IMAGE', icon: Image, label: 'Image' },
                                { value: 'VIDEO', icon: Video, label: 'Video' },
                                { value: 'LINK', icon: LinkIcon, label: 'Link' },
                            ].map(({ value, icon: Icon, label }) => (
                                <button
                                    key={value}
                                    type="button"
                                    onClick={() => setType(value as ResourceType)}
                                    className={`flex flex-col items-center gap-2 p-4 rounded-lg border transition-all ${type === value
                                        ? 'bg-blue-600/20 border-blue-500 text-blue-400'
                                        : 'bg-gray-900 border-gray-700 text-gray-400 hover:border-gray-600'
                                        }`}
                                >
                                    <Icon size={24} />
                                    <span className="text-sm font-medium">{label}</span>
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Title */}
                    <div>
                        <label className="block text-sm font-medium text-gray-400 mb-2">Title *</label>
                        <input
                            type="text"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            placeholder="e.g., Premium AI Model Access"
                            className="w-full px-4 py-3 bg-gray-900 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 transition-colors"
                        />
                    </div>

                    {/* Description */}
                    <div>
                        <label className="block text-sm font-medium text-gray-400 mb-2">Description</label>
                        <textarea
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            placeholder="Describe your resource..."
                            rows={3}
                            className="w-full px-4 py-3 bg-gray-900 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 transition-colors resize-none"
                        />
                    </div>

                    {/* Network Selector */}
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-400 mb-2">Network</label>
                            <select
                                value={network}
                                onChange={(e) => {
                                    const val = e.target.value as 'MAINNET' | 'DEVNET';
                                    setNetwork(val);
                                    if (val === 'DEVNET') setToken('NATIVE');
                                }}
                                className="w-full px-4 py-3 bg-gray-900 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-blue-500 transition-colors"
                            >
                                <option value="MAINNET">Solana Mainnet</option>
                                <option value="DEVNET">Solana Devnet</option>
                            </select>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-400 mb-2">Token</label>
                            <select
                                value={token}
                                onChange={(e) => setToken(e.target.value as any)}
                                className="w-full px-4 py-3 bg-gray-900 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-blue-500 transition-colors"
                            >
                                <option value="NATIVE">SOL (Native)</option>
                                {network === 'MAINNET' && (
                                    <>
                                        <option value="USDC">USDC</option>
                                        <option value="USDT">USDT</option>
                                    </>
                                )}
                            </select>
                        </div>
                    </div>

                    {/* Mint Address (if SPL) */}
                    {token !== 'NATIVE' && (
                        <div>
                            <label className="block text-sm font-medium text-gray-400 mb-2">SPL Token Mint Address (Optional)</label>
                            <input
                                type="text"
                                value={mintAddress}
                                onChange={(e) => setMintAddress(e.target.value)}
                                placeholder="Auto-fills for USDC/USDT if left blank"
                                className="w-full px-4 py-3 bg-gray-900 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 transition-colors"
                            />
                        </div>
                    )}

                    {/* Price */}
                    <div>
                        <label className="block text-sm font-medium text-gray-400 mb-2">
                            Price ({token === 'NATIVE' ? 'SOL' : token})
                        </label>
                        <input
                            type="number"
                            value={price}
                            onChange={(e) => setPrice(e.target.value)}
                            min="0"
                            step="0.001"
                            className="w-full px-4 py-3 bg-gray-900 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 transition-colors"
                        />
                    </div>

                    {/* Auto-Approval Time */}
                    <div>
                        <label className="block text-sm font-medium text-gray-400 mb-2">
                            Auto-Approval Time (minutes)
                        </label>
                        <input
                            type="number"
                            value={autoApprovalMinutes}
                            onChange={(e) => setAutoApprovalMinutes(e.target.value)}
                            min="1"
                            step="1"
                            className="w-full px-4 py-3 bg-gray-900 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 transition-colors"
                        />
                        <p className="text-xs text-gray-500 mt-1">
                            Time before automatic payment to merchant if buyer doesn&apos;t confirm or dispute
                        </p>
                    </div>

                    {/* Image Upload (for IMAGE type) */}
                    {type === 'IMAGE' && (
                        <div>
                            <label className="block text-sm font-medium text-gray-400 mb-2">Upload Image *</label>
                            <div className="border-2 border-dashed border-gray-700 rounded-lg p-6 text-center hover:border-gray-600 transition-colors">
                                {imagePreview ? (
                                    <div className="relative">
                                        <img src={imagePreview} alt="Preview" className="max-h-48 mx-auto rounded-lg" />
                                        <button
                                            type="button"
                                            onClick={() => { setImagePreview(null); setImageData(null); }}
                                            className="absolute top-2 right-2 p-1 bg-red-600 rounded-full hover:bg-red-500"
                                        >
                                            ✕
                                        </button>
                                    </div>
                                ) : (
                                    <label className="cursor-pointer">
                                        <Upload size={32} className="mx-auto text-gray-500 mb-2" />
                                        <p className="text-gray-400 text-sm">Click to upload or drag and drop</p>
                                        <p className="text-gray-500 text-xs mt-1">PNG, JPG up to 5MB</p>
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
                            <label className="block text-sm font-medium text-gray-400 mb-2">
                                {type === 'VIDEO' ? 'Video URL *' : 'Link URL *'}
                            </label>
                            <input
                                type="url"
                                value={url}
                                onChange={(e) => setUrl(e.target.value)}
                                placeholder={type === 'VIDEO' ? 'https://youtube.com/watch?v=...' : 'https://...'}
                                className="w-full px-4 py-3 bg-gray-900 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 transition-colors"
                            />
                        </div>
                    )}

                    {/* Error */}
                    {error && (
                        <div className="bg-red-500/10 border border-red-500/30 text-red-400 p-3 rounded-lg text-sm">
                            {error}
                        </div>
                    )}

                    {/* Submit */}
                    <button
                        type="submit"
                        disabled={isSubmitting}
                        className="w-full py-3 bg-blue-600 hover:bg-blue-500 rounded-lg font-bold text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    >
                        {isSubmitting ? (
                            <>
                                <Loader2 size={18} className="animate-spin" /> Creating...
                            </>
                        ) : (
                            <>
                                <Upload size={18} /> Create Resource
                            </>
                        )}
                    </button>
                </form>
            </div>
        </div>
    );
}
