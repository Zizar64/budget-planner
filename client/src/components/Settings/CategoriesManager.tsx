import { useState, FormEvent } from 'react';
import { useBudget } from '../../context/BudgetContext';
import { Plus, Trash2, Edit2, Home, ShoppingCart, Car, Gamepad2, Banknote, MoreHorizontal, Coffee, Briefcase, Gift, Heart, Music, Zap, LucideIcon } from 'lucide-react';
import { Category } from '../../types';

const ICON_MAP: Record<string, LucideIcon> = {
    Home, ShoppingCart, Car, Gamepad2, Banknote, MoreHorizontal, Coffee, Briefcase, Gift, Heart, Music, Zap
};

const COLORS = [
    '#EF4444', '#F97316', '#F59E0B', '#10B981', '#06B6D4', '#3B82F6', '#6366F1', '#8B5CF6', '#EC4899', '#6B7280'
];

export default function CategoriesManager() {
    const { categories, addCategory, updateCategory, deleteCategory } = useBudget();
    const [isAdding, setIsAdding] = useState(false);
    const [editingId, setEditingId] = useState<number | string | null>(null);
    const [formData, setFormData] = useState({ label: '', type: 'expense', color: '#3B82F6', icon: 'MoreHorizontal' });

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();
        if (editingId) {
            await updateCategory(editingId, formData as Partial<Category>);
            setEditingId(null);
        } else {
            await addCategory(formData as Partial<Category>);
        }
        setFormData({ label: '', type: 'expense', color: '#3B82F6', icon: 'MoreHorizontal' });
        setIsAdding(false);
    };

    const handleEdit = (cat: Category) => {
        setFormData({ label: cat.label, type: cat.type, color: cat.color, icon: cat.icon });
        setEditingId(cat.id);
        setIsAdding(true);
    };

    const handleDelete = async (id: number | string) => {
        if (confirm('Êtes-vous sûr de vouloir supprimer cette catégorie ?')) {
            await deleteCategory(id);
        }
    };

    const cancelEdit = () => {
        setIsAdding(false);
        setEditingId(null);
        setFormData({ label: '', type: 'expense', color: '#3B82F6', icon: 'MoreHorizontal' });
    };

    const IconComponent = ({ name, size = 18 }: { name: string, size?: number }) => {
        const Icon = ICON_MAP[name] || MoreHorizontal;
        return <Icon size={size} />;
    };

    return (
        <div className="glass-panel p-8 max-w-xl mt-8">
            <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3 text-indigo-400">
                    <Briefcase size={24} />
                    <h2 className="text-xl font-semibold">Gérer les Catégories</h2>
                </div>
                {!isAdding && (
                    <button
                        onClick={() => setIsAdding(true)}
                        className="p-2 bg-indigo-600/20 text-indigo-400 rounded hover:bg-indigo-600 hover:text-white transition-colors"
                    >
                        <Plus size={20} />
                    </button>
                )}
            </div>

            {isAdding && (
                <form onSubmit={handleSubmit} className="mb-6 p-4 bg-slate-800/50 rounded border border-slate-700">
                    <h3 className="text-sm font-semibold text-gray-300 mb-4">
                        {editingId ? 'Modifier la catégorie' : 'Nouvelle catégorie'}
                    </h3>
                    <div className="grid grid-cols-2 gap-4 mb-4">
                        <div>
                            <label className="text-xs text-gray-400 block mb-1">Nom</label>
                            <input
                                type="text"
                                required
                                value={formData.label}
                                onChange={e => setFormData({ ...formData, label: e.target.value })}
                                className="w-full bg-slate-900 border border-slate-700 rounded p-2 text-sm text-white focus:border-indigo-500 outline-none"
                            />
                        </div>
                        <div>
                            <label className="text-xs text-gray-400 block mb-1">Type</label>
                            <select
                                value={formData.type}
                                onChange={e => setFormData({ ...formData, type: e.target.value })}
                                className="w-full bg-slate-900 border border-slate-700 rounded p-2 text-sm text-white focus:border-indigo-500 outline-none"
                            >
                                <option value="expense">Dépense (Expense)</option>
                                <option value="income">Revenu (Income)</option>
                            </select>
                        </div>
                    </div>

                    <div className="mb-4">
                        <label className="text-xs text-gray-400 block mb-2">Couleur</label>
                        <div className="flex flex-wrap gap-2">
                            {COLORS.map(c => (
                                <button
                                    key={c}
                                    type="button"
                                    onClick={() => setFormData({ ...formData, color: c })}
                                    className={`w - 6 h - 6 rounded - full border - 2 ${formData.color === c ? 'border-white' : 'border-transparent'} `}
                                    style={{ backgroundColor: c }}
                                />
                            ))}
                        </div>
                    </div>

                    <div className="mb-4">
                        <label className="text-xs text-gray-400 block mb-2">Icône</label>
                        <div className="flex flex-wrap gap-2">
                            {Object.keys(ICON_MAP).map(iconName => (
                                <button
                                    key={iconName}
                                    type="button"
                                    onClick={() => setFormData({ ...formData, icon: iconName })}
                                    className={`p - 2 rounded ${formData.icon === iconName ? 'bg-indigo-600 text-white' : 'bg-slate-700 text-gray-400'} `}
                                >
                                    <IconComponent name={iconName} />
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="flex justify-end gap-2">
                        <button
                            type="button"
                            onClick={cancelEdit}
                            className="px-3 py-1 text-sm text-gray-400 hover:text-white"
                        >
                            Annuler
                        </button>
                        <button
                            type="submit"
                            className="px-3 py-1 bg-indigo-600 text-white rounded text-sm hover:bg-indigo-700"
                        >
                            {editingId ? 'Mettre à jour' : 'Ajouter'}
                        </button>
                    </div>
                </form>
            )}

            <div className="space-y-2">
                {categories.map(cat => (
                    <div key={cat.id} className="flex items-center justify-between p-3 bg-slate-800/30 rounded border border-slate-700 group">
                        <div className="flex items-center gap-3">
                            <div
                                className="w-8 h-8 rounded-full flex items-center justify-center text-white"
                                style={{ backgroundColor: cat.color }}
                            >
                                <IconComponent name={cat.icon} size={16} />
                            </div>
                            <div>
                                <div className="font-medium text-white">{cat.label}</div>
                                <div className="text-xs text-gray-500 uppercase">{cat.type === 'expense' ? 'Dépense' : 'Revenu'}</div>
                            </div>
                        </div>
                        <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button
                                onClick={() => handleEdit(cat)}
                                className="text-gray-500 hover:text-indigo-400 transition-colors"
                            >
                                <Edit2 size={16} />
                            </button>
                            <button
                                onClick={() => handleDelete(cat.id)}
                                className="text-gray-500 hover:text-red-400 transition-colors"
                            >
                                <Trash2 size={16} />
                            </button>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
