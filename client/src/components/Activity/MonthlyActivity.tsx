import { useState, FormEvent } from 'react';
import { useBudget } from '../../context/BudgetContext';
import { format, addMonths, subMonths } from 'date-fns';
import { fr } from 'date-fns/locale';
import { ChevronLeft, ChevronRight, Calculator, CheckCircle, Clock, Edit2, Trash2 } from 'lucide-react';


export default function MonthlyActivity() {
    const { getMonthlyReport, updateTransaction, addTransaction, deleteTransaction, categories } = useBudget();
    const [currentMonth, setCurrentMonth] = useState(new Date());

    // Edit State
    const [editingItem, setEditingItem] = useState<any | null>(null);
    const [editForm, setEditForm] = useState({
        label: '',
        amount: '',
        type: 'expense' as 'income' | 'expense',
        date: '',
        status: 'confirmed',
        categoryId: ''
    });

    const report = getMonthlyReport(currentMonth);

    const totalIncome = report
        .filter(i => i.amount > 0)
        .reduce((acc, curr) => acc + curr.amount, 0);

    const totalExpense = report
        .filter(i => i.amount < 0)
        .reduce((acc, curr) => acc + curr.amount, 0);

    const balance = totalIncome + totalExpense;

    const handleEditClick = (item: any) => {
        setEditingItem(item);
        setEditForm({
            label: item.label,
            amount: Math.abs(item.amount).toString(),
            type: item.amount < 0 ? 'expense' : 'income',
            date: format(item.dateObj, 'yyyy-MM-dd'),
            status: item.status || 'recurring', // 'recurring' effectively means 'planned' in UI context here
            categoryId: item.category_id?.toString() || categories.find(c => c.label === item.category)?.id.toString() || ''
        });
    };

    const closeEdit = () => {
        setEditingItem(null);
        setEditForm({ label: '', amount: '', type: 'expense', date: '', status: 'confirmed', categoryId: '' });
    };

    const handleDelete = () => {
        if (!editingItem) return;
        if (window.confirm('Supprimer cette entrée ?')) {
            if (!editingItem.isTransaction) {
                // It's a projection (Recurring or Manual Planned)
                // We create a "skipped" transaction to hide it
                addTransaction({
                    label: editingItem.label,
                    amount: 0,
                    type: editingItem.type,
                    date: editForm.date || new Date().toISOString(),
                    category: editingItem.category,
                    recurringId: editingItem.id, // Link to the projected item's ID
                    status: 'skipped'
                });
            } else {
                // It's a real transaction (confirmed or manual planned)
                deleteTransaction(editingItem.id);
            }
            closeEdit();
        }
    };

    const saveEdit = (e: FormEvent) => {
        e.preventDefault();

        const amount = parseFloat(editForm.amount);
        const type = editForm.type;
        const status = editForm.status === 'recurring' ? 'planned' : editForm.status;

        if (editingItem.isTransaction) {
            // It is a real Transaction -> UPDATE
            updateTransaction(editingItem.id, {
                label: editForm.label,
                amount: amount,
                type: type,
                date: editForm.date,
                status: status,
                categoryId: editForm.categoryId || null,
                category: categories.find(c => c.id.toString() === editForm.categoryId)?.label || editingItem.category
            });
        } else {
            // It is a Projection -> CREATE (Realize)
            addTransaction({
                label: editForm.label,
                amount: amount,
                type: type,
                date: editForm.date,
                categoryId: editForm.categoryId || undefined,
                category: categories.find(c => c.id.toString() === editForm.categoryId)?.label || editingItem.category,
                recurringId: editingItem.id, // Link to rule/plan ID
                status: status
            });
        }
        closeEdit();
    };

    return (
        <div className="grid-layout relative">
            {editingItem && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
                    <div className="bg-[#0f172a] border border-gray-700 p-6 rounded-2xl w-full max-w-md shadow-2xl animate-in fade-in zoom-in-95">
                        <h2 className="text-xl font-bold mb-4 text-white">
                            {editingItem.status === 'confirmed' ? 'Modifier la transaction' : 'Valider / Modifier la charge'}
                        </h2>

                        <form onSubmit={saveEdit} className="space-y-4">
                            <div>
                                <label className="text-sm text-gray-400">Libellé</label>
                                <input
                                    type="text"
                                    value={editForm.label}
                                    onChange={e => setEditForm({ ...editForm, label: e.target.value })}
                                    className="w-full bg-slate-900 border border-slate-700 rounded p-3 text-white focus:border-indigo-500 outline-none"
                                />
                            </div>

                            <div className="flex gap-4">
                                <div className="flex-1">
                                    <label className="text-sm text-gray-400">Montant</label>
                                    <div className="flex gap-2">
                                        <input
                                            type="number"
                                            value={editForm.amount}
                                            onChange={e => setEditForm({ ...editForm, amount: e.target.value })}
                                            className="flex-1 bg-slate-900 border border-slate-700 rounded p-3 text-white focus:border-indigo-500 outline-none"
                                            step="0.01"
                                        />
                                        <div className="flex bg-slate-900 rounded border border-slate-700 p-1">
                                            <button type="button" onClick={() => setEditForm({ ...editForm, type: 'expense' })} className={`px-2 rounded transition-colors ${editForm.type === 'expense' ? 'bg-rose-500/20 text-rose-400' : 'text-gray-500 hover:text-gray-300'}`}>-</button>
                                            <button type="button" onClick={() => setEditForm({ ...editForm, type: 'income' })} className={`px-2 rounded transition-colors ${editForm.type === 'income' ? 'bg-emerald-500/20 text-emerald-400' : 'text-gray-500 hover:text-gray-300'}`}>+</button>
                                        </div>
                                    </div>
                                </div>
                                <div className="w-1/3">
                                    <label className="text-sm text-gray-400">Date</label>
                                    <input
                                        type="date"
                                        value={editForm.date}
                                        onChange={e => setEditForm({ ...editForm, date: e.target.value })}
                                        className="w-full bg-slate-900 border border-slate-700 rounded p-3 text-white focus:border-indigo-500 outline-none"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="text-sm text-gray-400">Catégorie</label>
                                <select
                                    value={editForm.categoryId}
                                    onChange={e => setEditForm({ ...editForm, categoryId: e.target.value })}
                                    className="w-full bg-slate-900 border border-slate-700 rounded p-3 text-white focus:border-indigo-500 outline-none"
                                >
                                    <option value="">Non catégorisé</option>
                                    {categories.map(cat => (
                                        <option key={cat.id} value={cat.id}>
                                            {cat.label}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className="text-sm text-gray-400 block mb-2">Statut</label>
                                <div className="flex bg-slate-900 p-1 rounded-lg border border-slate-700">
                                    <button
                                        type="button"
                                        onClick={() => setEditForm({ ...editForm, status: 'confirmed' })}
                                        className={`flex-1 py-2 rounded-md text-sm font-medium transition-colors ${editForm.status === 'confirmed' ? 'bg-indigo-600 text-white' : 'text-gray-400 hover:text-white'}`}
                                    >
                                        Effectué
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setEditForm({ ...editForm, status: 'planned' })}
                                        className={`flex-1 py-2 rounded-md text-sm font-medium transition-colors ${editForm.status === 'planned' ? 'bg-indigo-600 text-white' : 'text-gray-400 hover:text-white'}`}
                                    >
                                        Prévu
                                    </button>
                                </div>
                            </div>

                            <div className="flex gap-3 mt-6 pt-4 border-t border-slate-700">
                                <button type="button" onClick={handleDelete} className="p-3 rounded-lg bg-rose-500/10 text-rose-400 hover:bg-rose-500/20 mr-auto"><Trash2 size={18} /></button>
                                <button type="button" onClick={closeEdit} className="px-6 py-3 rounded-lg bg-slate-800 text-gray-300 hover:bg-slate-700">Annuler</button>
                                <button type="submit" className="px-6 py-3 rounded-lg bg-indigo-600 text-white font-semibold hover:bg-indigo-700 transition-colors">Valider</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            <h1 className="text-3xl font-bold title-gradient">Activité Mensuelle</h1>

            {/* Controls */}
            <div className="flex items-center justify-between mb-6 glass-panel p-4">
                <button onClick={() => setCurrentMonth(subMonths(currentMonth, 1))} className="p-2 hover:bg-white/10 rounded-full transition-colors">
                    <ChevronLeft size={24} />
                </button>
                <h2 className="text-xl font-semibold capitalize">
                    {format(currentMonth, 'MMMM yyyy', { locale: fr })}
                </h2>
                <button onClick={() => setCurrentMonth(addMonths(currentMonth, 1))} className="p-2 hover:bg-white/10 rounded-full transition-colors">
                    <ChevronRight size={24} />
                </button>
            </div>

            {/* Summary */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                <div className="glass-panel p-6 border-emerald-500/20">
                    <div className="text-sm text-gray-400 mb-1">Total Entrées</div>
                    <div className="text-3xl font-bold text-emerald-400">+{totalIncome.toFixed(2)} €</div>
                </div>
                <div className="glass-panel p-6 border-rose-500/20">
                    <div className="text-sm text-gray-400 mb-1">Total Sorties</div>
                    <div className="text-3xl font-bold text-rose-400">{totalExpense.toFixed(2)} €</div>
                </div>
                <div className="glass-panel p-6 border-indigo-500/20">
                    <div className="text-sm text-gray-400 mb-1">Solde du Mois</div>
                    <div className={`text-3xl font-bold ${balance >= 0 ? 'text-indigo-400' : 'text-amber-400'}`}>
                        {balance > 0 ? '+' : ''}{balance.toFixed(2)} €
                    </div>
                </div>
            </div>

            {/* Timeline List */}
            <div className="glass-panel p-6">
                <h3 className="text-xl font-semibold mb-6 flex items-center gap-2">
                    <Calculator size={20} className="text-indigo-400" /> Détail des Opérations
                </h3>
                <div className="space-y-4">
                    {report.length === 0 ? (
                        <div className="text-center text-gray-500 py-10">Aucune activité pour ce mois.</div>
                    ) : (
                        report.map((item, idx) => (
                            <div key={idx} className="group relative flex items-center justify-between p-4 rounded-xl bg-[#0f172a]/40 border border-gray-800 hover:border-gray-600 transition-colors">
                                <div className="flex items-center gap-4">
                                    <div className={`w-12 h-12 rounded-full flex items-center justify-center font-bold text-sm
                                        ${item.amount > 0 ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-400'}
                                    `}>
                                        {format(item.dateObj, 'dd')}
                                    </div>
                                    <div>
                                        <div className="font-semibold text-lg">{item.label}</div>
                                        <div className="text-sm text-gray-400 flex items-center gap-2">
                                            <span className="capitalize">{item.category || 'Divers'}</span>
                                            {item.status === 'confirmed' ? (
                                                <span className="flex items-center gap-1 text-emerald-500 text-xs bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                                                    <CheckCircle size={10} /> Effectué
                                                </span>
                                            ) : (
                                                <span className="flex items-center gap-1 text-amber-500 text-xs bg-amber-500/10 px-2 py-0.5 rounded-full border border-amber-500/20">
                                                    <Clock size={10} /> Prévu
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                </div>
                                <div className="flex items-center gap-4">
                                    <div className={`text-xl font-bold ${item.amount > 0 ? 'text-emerald-400' : 'text-white'}`}>
                                        {item.amount > 0 ? '+' : ''}{item.amount.toFixed(2)} €
                                    </div>
                                    <button
                                        onClick={() => handleEditClick(item)}
                                        className="opacity-0 group-hover:opacity-100 p-2 hover:bg-white/10 rounded-lg text-gray-400 hover:text-white transition-all cursor-pointer"
                                        title="Modifier"
                                    >
                                        <Edit2 size={18} />
                                    </button>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
}
