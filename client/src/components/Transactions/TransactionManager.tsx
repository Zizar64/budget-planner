import { useState, FormEvent } from 'react';
import { useBudget } from '../../context/BudgetContext';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { CheckCircle, Plus, ArrowUpRight, ArrowDownRight } from 'lucide-react';
import { RecurringItem } from '../../types';

export default function TransactionManager() {
    const { recurring, transactions, addTransaction, isPaidThisMonth, isSkippedThisMonth, categories } = useBudget();
    const [amount, setAmount] = useState('');
    const [label, setLabel] = useState('');
    const [type, setType] = useState<'income' | 'expense'>('expense');
    const [status, setStatus] = useState('confirmed');
    const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
    const [categoryId, setCategoryId] = useState('');

    const handleSubmit = (e: FormEvent) => {
        e.preventDefault();
        if (!amount || !label || !date) return;
        addTransaction({
            label,
            amount: parseFloat(amount),
            type,
            date: new Date(date).toISOString(),
            category: categories.find(c => c.id.toString() === categoryId)?.label || 'Manual',
            categoryId: categoryId || undefined,
            status // 'confirmed' or 'planned'
        });
        setAmount('');
        setLabel('');
        setStatus('confirmed');
        setCategoryId('');
        setDate(new Date().toISOString().split('T')[0]);
    };

    const handleMarkAsPaid = (item: RecurringItem) => {
        if (window.confirm(`Confirmer le paiement de ${item.label} (${item.amount}€) ?`)) {
            addTransaction({
                label: item.label,
                amount: item.amount,
                type: item.type,
                date: new Date().toISOString(),
                category: item.category,
                categoryId: item.categoryId,
                recurringId: item.id,
                status: 'confirmed'
            });
        }
    };

    return (
        <div className="grid-layout">
            <h1 className="text-3xl font-bold title-gradient">Transactions</h1>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Add New Transaction Form */}
                <div className="glass-panel p-6">
                    <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                        <Plus size={20} className="text-indigo-400" /> Ajouter
                    </h2>
                    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                        <div>
                            <label className="block text-sm text-gray-400 mb-1">Libellé</label>
                            <input
                                type="text"
                                value={label}
                                onChange={(e) => setLabel(e.target.value)}
                                className="w-full bg-[#0f172a] border border-gray-700 rounded-lg p-3 text-white focus:outline-none focus:border-indigo-500"
                                placeholder="Ex: Courses"
                            />
                        </div>

                        <div>
                            <label className="block text-sm text-gray-400 mb-1">Montant</label>
                            <div className="relative">
                                <input
                                    type="number"
                                    value={amount}
                                    onChange={(e) => setAmount(e.target.value)}
                                    className="w-full bg-[#0f172a] border border-gray-700 rounded-lg p-3 text-white focus:outline-none focus:border-indigo-500"
                                    placeholder="0.00"
                                    step="0.01"
                                />
                                <span className="absolute right-4 top-3 text-gray-500">€</span>
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm text-gray-400 mb-1">Date</label>
                            <input
                                type="date"
                                value={date}
                                onChange={(e) => setDate(e.target.value)}
                                className="w-full bg-[#0f172a] border border-gray-700 rounded-lg p-3 text-white focus:outline-none focus:border-indigo-500"
                            />
                        </div>

                        <div className="flex gap-4">
                            <div className="flex-1">
                                <label className="block text-sm text-gray-400 mb-1">Catégorie</label>
                                <select
                                    value={categoryId}
                                    onChange={(e) => setCategoryId(e.target.value)}
                                    className="w-full bg-[#0f172a] border border-gray-700 rounded-lg p-3 text-white focus:outline-none focus:border-indigo-500"
                                >
                                    <option value="">Non catégorisé</option>
                                    {categories.map(cat => (
                                        <option key={cat.id} value={cat.id}>
                                            {cat.label}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        <div className="flex gap-4">
                            <div className="flex-1">
                                <label className="block text-sm text-gray-400 mb-1">Type</label>
                                <div className="flex bg-[#0f172a] p-1 rounded-lg">
                                    <button
                                        type="button"
                                        onClick={() => setType('expense')}
                                        className={`flex-1 py-2 rounded-md text-sm font-medium transition-colors ${type === 'expense' ? 'bg-rose-500/20 text-rose-400' : 'text-gray-400 hover:text-white'}`}
                                    >
                                        Dépense
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setType('income')}
                                        className={`flex-1 py-2 rounded-md text-sm font-medium transition-colors ${type === 'income' ? 'bg-emerald-500/20 text-emerald-400' : 'text-gray-400 hover:text-white'}`}
                                    >
                                        Revenu
                                    </button>
                                </div>
                            </div>
                            <div className="flex-1">
                                <label className="block text-sm text-gray-400 mb-1">Statut</label>
                                <div className="flex bg-[#0f172a] p-1 rounded-lg">
                                    <button
                                        type="button"
                                        onClick={() => setStatus('confirmed')}
                                        className={`flex-1 py-2 rounded-md text-sm font-medium transition-colors ${status === 'confirmed' ? 'bg-indigo-600 text-white' : 'text-gray-400 hover:text-white'}`}
                                    >
                                        Effectué
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setStatus('planned')}
                                        className={`flex-1 py-2 rounded-md text-sm font-medium transition-colors ${status === 'planned' ? 'bg-amber-500/20 text-amber-400' : 'text-gray-400 hover:text-white'}`}
                                    >
                                        Prévu
                                    </button>
                                </div>
                            </div>
                        </div>

                        <button type="submit" className="btn-primary w-full mt-2">
                            Valider
                        </button>
                    </form>
                </div>

                {/* History List */}
                <div className="glass-panel p-6 lg:col-span-2">
                    <h2 className="text-xl font-semibold mb-4">Toutes les Transactions</h2>
                    <div className="space-y-3">
                        {transactions.filter(t => t.status !== 'skipped').length === 0 ? (
                            <p className="text-gray-500 text-sm">Aucune transaction.</p>
                        ) : (
                            [...transactions]
                                .filter(t => t.status !== 'skipped')
                                .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                                .map((txn) => (
                                    <div key={txn.id} className={`flex items-center justify-between p-3 rounded-lg border ${txn.status === 'planned' ? 'bg-amber-500/5 border-amber-500/20' : 'bg-[#0f172a]/50 border-gray-800'}`}>
                                        <div className="flex items-center gap-3">
                                            <div className={`p-2 rounded-full ${txn.amount > 0 ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-400'}`}>
                                                {txn.amount > 0 ? <ArrowDownRight size={18} /> : <ArrowUpRight size={18} />}
                                            </div>
                                            <div>
                                                <div className="font-medium flex items-center gap-2">
                                                    {txn.label}
                                                    {txn.status === 'planned' && (
                                                        <span className="text-[10px] uppercase tracking-wider bg-amber-500/20 text-amber-400 px-1.5 py-0.5 rounded border border-amber-500/30">
                                                            Prévu
                                                        </span>
                                                    )}
                                                </div>
                                                <div className="text-xs text-gray-500">
                                                    {format(new Date(txn.date || new Date()), 'dd MMM yyyy', { locale: fr })}
                                                </div>
                                            </div>
                                        </div>
                                        <div className={`font-bold ${txn.amount > 0 ? 'text-emerald-400' : 'text-gray-200'} ${txn.status === 'planned' ? 'opacity-70' : ''}`}>
                                            {txn.amount > 0 ? '+' : ''}{Number(txn.amount).toFixed(2)} €
                                        </div>
                                    </div>
                                ))
                        )}
                    </div>
                </div>

            </div>

            {/* Upcoming / Recurring View */}
            <div className="glass-panel p-6 mt-6">
                <h2 className="text-xl font-semibold mb-4">Charges & Revenus Planifiés (Ce mois)</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {recurring.filter(item => !isSkippedThisMonth(item.id)).map(item => {
                        const isPaid = isPaidThisMonth(item.id);
                        return (
                            <div key={item.id} className={`p-4 rounded-xl border flex justify-between items-center ${isPaid ? 'border-emerald-500/30 bg-emerald-500/5' : 'border-gray-800 bg-[#0f172a]/30'}`}>
                                <div>
                                    <div className="font-medium flex items-center gap-2">
                                        {item.label}
                                        {isPaid && <CheckCircle size={14} className="text-emerald-400" />}
                                    </div>
                                    <div className="text-sm text-gray-500">{item.dayOfMonth} du mois</div>
                                </div>
                                <div className="text-right">
                                    <div className={`font-bold ${item.type === 'income' ? 'text-emerald-400' : 'text-gray-200'}`}>
                                        {item.type === 'expense' ? '-' : '+'}{item.amount} €
                                    </div>
                                    {!isPaid ? (
                                        <button
                                            onClick={() => handleMarkAsPaid(item)}
                                            className="text-xs text-indigo-400 hover:text-indigo-300 mt-1 cursor-pointer bg-indigo-500/10 px-2 py-1 rounded hover:bg-indigo-500/20 transition-colors"
                                        >
                                            Marquer payé
                                        </button>
                                    ) : (
                                        <span className="text-xs text-emerald-500 italic mt-1 block">
                                            Payé ce mois
                                        </span>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}
