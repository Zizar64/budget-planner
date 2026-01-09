import { useState, FormEvent, ChangeEvent } from 'react';
import { Lock, Save, AlertCircle, Check } from 'lucide-react';
import CategoriesManager from './CategoriesManager';

export default function Settings() {
    const [oldPassword, setOldPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();
        setError('');
        setSuccess('');

        if (newPassword !== confirmPassword) {
            setError("Les nouveaux mots de passe ne correspondent pas.");
            return;
        }

        setIsLoading(true);

        try {
            const res = await fetch('/api/auth/password', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ oldPassword, newPassword })
            });

            if (!res.ok) {
                const data = await res.json();
                throw new Error(data.error || 'Erreur lors du changement de mot de passe');
            }

            setSuccess('Mot de passe mis à jour avec succès !');
            setOldPassword('');
            setNewPassword('');
            setConfirmPassword('');
        } catch (err: any) {
            setError(err.message);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="grid-layout">
            <h1 className="text-3xl font-bold title-gradient mb-8">Paramètres</h1>

            <div className="glass-panel p-8 max-w-xl">
                <div className="flex items-center gap-3 mb-6 text-indigo-400">
                    <Lock size={24} />
                    <h2 className="text-xl font-semibold">Changer le mot de passe</h2>
                </div>

                <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                    <div>
                        <label className="text-sm text-gray-400 mb-1 block">Ancien mot de passe</label>
                        <input
                            type="password"
                            required
                            value={oldPassword}
                            onChange={e => setOldPassword(e.target.value)}
                            className="w-full bg-slate-900 border border-slate-700 rounded p-3 text-white focus:border-indigo-500 focus:outline-none transition-colors"
                        />
                    </div>

                    <div>
                        <label className="text-sm text-gray-400 mb-1 block">Nouveau mot de passe</label>
                        <input
                            type="password"
                            required
                            minLength={4}
                            value={newPassword}
                            onChange={e => setNewPassword(e.target.value)}
                            className="w-full bg-slate-900 border border-slate-700 rounded p-3 text-white focus:border-indigo-500 focus:outline-none transition-colors"
                        />
                    </div>

                    <div>
                        <label className="text-sm text-gray-400 mb-1 block">Confirmer le nouveau mot de passe</label>
                        <input
                            type="password"
                            required
                            minLength={4}
                            value={confirmPassword}
                            onChange={e => setConfirmPassword(e.target.value)}
                            className="w-full bg-slate-900 border border-slate-700 rounded p-3 text-white focus:border-indigo-500 focus:outline-none transition-colors"
                        />
                    </div>

                    {error && (
                        <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-3 rounded flex items-center gap-2">
                            <AlertCircle size={18} />
                            <span>{error}</span>
                        </div>
                    )}

                    {success && (
                        <div className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 p-3 rounded flex items-center gap-2">
                            <Check size={18} />
                            <span>{success}</span>
                        </div>
                    )}

                    <button
                        type="submit"
                        disabled={isLoading}
                        className="mt-4 bg-indigo-600 hover:bg-indigo-700 text-white py-3 rounded font-medium flex items-center justify-center gap-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {isLoading ? (
                            <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        ) : (
                            <>
                                <Save size={18} />
                                <span className="text-white">Enregistrer</span>
                            </>
                        )}
                    </button>
                </form>
            </div>

            <CategoriesManager />

            {/* Backup & Restore Section */}
            <div className="glass-panel p-8 max-w-xl">
                <div className="flex items-center gap-3 mb-6 text-indigo-400">
                    <Save size={24} />
                    <h2 className="text-xl font-semibold">Sauvegarde & Restauration</h2>
                </div>

                <p className="text-gray-400 mb-6 text-sm">
                    Téléchargez une copie sécurisée de vos données ou restaurez une sauvegarde existante.
                    Les fichiers sont chiffrés et ne peuvent être lus que par cette application.
                </p>

                <div className="flex flex-col gap-4">
                    <button
                        onClick={() => window.open('/api/backup', '_blank')}
                        className="btn-primary flex items-center justify-center gap-2 w-full"
                    >
                        <Save size={18} />
                        Télécharger une sauvegarde (.budget)
                    </button>

                    <div className="relative">
                        <input
                            type="file"
                            accept=".budget"
                            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                            onChange={async (e: ChangeEvent<HTMLInputElement>) => {
                                const file = e.target.files?.[0];
                                if (!file) return;

                                if (!confirm("ATTENTION : Cette action écrasera toutes les données actuelles par celles de la sauvegarde. Voulez-vous continuer ?")) {
                                    e.target.value = '';
                                    return;
                                }

                                const reader = new FileReader();
                                reader.onload = async (event: ProgressEvent<FileReader>) => {
                                    const base64Data = event.target?.result as string;
                                    try {
                                        const res = await fetch('/api/restore', {
                                            method: 'POST',
                                            headers: { 'Content-Type': 'application/json' },
                                            body: JSON.stringify({ data: base64Data })
                                        });
                                        const result = await res.json();
                                        if (result.success) {
                                            alert("Restauration réussie ! La page va se recharger.");
                                            window.location.reload();
                                        } else {
                                            alert("Erreur de restauration: " + result.error);
                                        }
                                    } catch (err: any) {
                                        alert("Erreur réseau: " + err.message);
                                    }
                                };
                                reader.readAsDataURL(file);
                            }}
                        />
                        <button className="w-full bg-slate-800 hover:bg-slate-700 text-indigo-400 border border-indigo-500/30 py-3 rounded font-medium flex items-center justify-center gap-2 transition-colors">
                            <Check size={18} />
                            Restaurer depuis un fichier
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
