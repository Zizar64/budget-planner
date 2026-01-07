import React, { useState } from 'react';
import { useBudget } from '../../context/BudgetContext';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { Edit2, Trash2, Plus, X, Check } from 'lucide-react';
import { format } from 'date-fns';

export default function BudgetPlanner() {
    const { recurring, addRecurringItem, updateRecurringItem, deleteRecurringItem, categories } = useBudget();
    const [isEditing, setIsEditing] = useState(false);
    const [editId, setEditId] = useState(null);

    // Form State
    const [label, setLabel] = useState('');
    const [amount, setAmount] = useState('');
    const [type, setType] = useState('expense');
    const [day, setDay] = useState('1');
    const [categoryId, setCategoryId] = useState('');
    const [isLimited, setIsLimited] = useState(false);
    const [duration, setDuration] = useState('');
    const [startDate, setStartDate] = useState(format(new Date(), 'yyyy-MM-dd'));

    const resetForm = () => {
        setLabel('');
        setAmount('');
        setType('expense');
        setDay('1');
        setCategoryId('');
        setIsLimited(false);
        setDuration('');
        setStartDate(format(new Date(), 'yyyy-MM-dd'));
        setIsEditing(false);
        setEditId(null);
    };

    const handleEdit = (item) => {
        setIsEditing(true);
        setEditId(item.id);
        setLabel(item.label);
        setAmount(Math.abs(item.amount));
        setType(item.type);
        setDay(item.dayOfMonth);
        setCategoryId(item.category_id || categories.find(c => c.label === item.category)?.id || '');
        if (item.durationMonths) {
            setIsLimited(true);
            setDuration(item.durationMonths);
            setStartDate(item.startDate || format(new Date(), 'yyyy-MM-dd'));
        } else {
            setIsLimited(false);
            setDuration('');
        }
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        const payload = {
            label,
            amount: parseFloat(amount),
            type,
            dayOfMonth: parseInt(day),
            category: categories.find(c => c.id === categoryId)?.label || 'Divers',
            categoryId,
            startDate: isLimited ? startDate : null,
            durationMonths: isLimited ? parseInt(duration) : null
        };

        if (isEditing) {
            updateRecurringItem(editId, payload);
        } else {
            addRecurringItem(payload);
        }
        resetForm();
    };

    const handleDelete = (id) => {
        if (window.confirm('Supprimer cette charge ?')) {
            deleteRecurringItem(id);
        }
    };

    // Aggregate for Chart
    const dataMap = recurring.reduce((acc, item) => {
        if (item.type === 'expense') {
            if (!acc[item.category]) acc[item.category] = 0;
            acc[item.category] += item.amount;
        }
        return acc;
    }, {});

    const data = Object.keys(dataMap).map(key => ({
        name: key,
        value: dataMap[key]
    }));

    const COLORS = ['#6366f1', '#10b981', '#f59e0b', '#f43f5e', '#8b5cf6', '#ec4899'];

    return (
        <div className="grid-layout">
            <div className="flex justify-between items-center">
                <h1 className="text-3xl font-bold title-gradient">Budget & Charges</h1>

            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Form */}
                <div className="glass-panel p-6">
                    <h2 className="text-xl font-semibold mb-4 text-indigo-400">
                        {isEditing ? 'Modifier une charge' : 'Ajouter une charge'}
                    </h2>
                    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                        <div>
                            <label className="text-xs text-gray-400">Libellé</label>
                            <input type="text" required value={label} onChange={e => setLabel(e.target.value)} className="w-full bg-slate-900 border border-slate-700 rounded p-2 text-white" />
                        </div>
                        <div>
                            <label className="text-xs text-gray-400">Catégorie</label>
                            <select
                                value={categoryId}
                                onChange={e => setCategoryId(e.target.value)}
                                className="w-full bg-slate-900 border border-slate-700 rounded p-2 text-white"
                            >
                                <option value="">Choisir...</option>
                                {categories.map(cat => (
                                    <option key={cat.id} value={cat.id}>
                                        {cat.label}
                                    </option>
                                ))}
                            </select>
                        </div>
                        <div className="flex gap-4">
                            <div className="flex-1">
                                <label className="text-xs text-gray-400">Montant</label>
                                <input type="number" required value={amount} onChange={e => setAmount(e.target.value)} className="w-full bg-slate-900 border border-slate-700 rounded p-2 text-white" />
                            </div>
                            <div className="w-24">
                                <label className="text-xs text-gray-400">Jour</label>
                                <input type="number" min="1" max="31" required value={day} onChange={e => setDay(e.target.value)} className="w-full bg-slate-900 border border-slate-700 rounded p-2 text-white" />
                            </div>
                        </div>

                        <div className="flex items-center gap-4 bg-slate-900 p-2 rounded">
                            <label className="text-sm text-gray-300 flex items-center gap-2">
                                <input type="radio" checked={type === 'expense'} onChange={() => setType('expense')} /> Dépense
                            </label>
                            <label className="text-sm text-gray-300 flex items-center gap-2">
                                <input type="radio" checked={type === 'income'} onChange={() => setType('income')} /> Revenu
                            </label>
                        </div>

                        <div className="border-t border-slate-700 pt-4">
                            <label className="flex items-center gap-2 text-sm text-gray-300 mb-2 cursor-pointer">
                                <input type="checkbox" checked={isLimited} onChange={e => setIsLimited(e.target.checked)} />
                                Durée Limitée (Mois)
                            </label>
                            {isLimited && (
                                <div className="flex gap-4 animate-in fade-in slide-in-from-top-2">
                                    <div className="flex-1">
                                        <label className="text-xs text-gray-500">Nb Mois</label>
                                        <input type="number" value={duration} onChange={e => setDuration(e.target.value)} className="w-full bg-slate-900 border border-slate-700 rounded p-2 text-white" />
                                    </div>
                                    <div className="flex-1">
                                        <label className="text-xs text-gray-500">Début</label>
                                        <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="w-full bg-slate-900 border border-slate-700 rounded p-2 text-white" />
                                    </div>
                                </div>
                            )}
                        </div>

                        <div className="flex gap-2 mt-2">
                            {isEditing && (
                                <button type="button" onClick={resetForm} className="flex-1 bg-slate-700 text-white py-2 rounded">Annuler</button>
                            )}
                            <button type="submit" className="flex-1 bg-indigo-600 text-white py-2 rounded">
                                {isEditing ? 'Mettre à jour' : 'Ajouter'}
                            </button>
                        </div>
                    </form>
                </div>

                {/* List */}
                <div className="glass-panel p-6 lg:col-span-2 overflow-hidden flex flex-col h-[600px]">
                    <h2 className="text-xl font-semibold mb-4">Liste des Charges</h2>
                    <div className="overflow-y-auto flex-1 space-y-2 pr-2">
                        {recurring.map(item => (
                            <div key={item.id} className="zoom-hover bg-slate-800/50 p-3 rounded-lg border border-slate-700 flex justify-between items-center group">
                                <div className="flex flex-col">
                                    <span className="font-bold flex items-center gap-2">
                                        {item.label}
                                        {item.durationMonths && (
                                            <span className="text-[10px] bg-amber-500/20 text-amber-300 px-2 py-0.5 rounded-full">
                                                {item.durationMonths} mois
                                            </span>
                                        )}
                                    </span>
                                    <span className="text-xs text-gray-400">Le {item.dayOfMonth} du mois • {item.category}</span>
                                </div>
                                <div className="flex items-center gap-4">
                                    <span className={`font-mono font-bold ${item.type === 'income' ? 'text-emerald-400' : 'text-gray-200'}`}>
                                        {parseFloat(item.amount).toFixed(2)} €
                                    </span>
                                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <button onClick={() => handleEdit(item)} className="p-2 hover:bg-indigo-500/20 rounded text-indigo-400"><Edit2 size={16} /></button>
                                        <button onClick={() => handleDelete(item.id)} className="p-2 hover:bg-rose-500/20 rounded text-rose-400"><Trash2 size={16} /></button>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}
