import React, { useState } from 'react';
import { useBudget } from '../../context/BudgetContext';
import { Target, Plus } from 'lucide-react';

export default function SavingsPlanner() {
    const { savingsGoals, addSavingsGoal } = useBudget();
    const [label, setLabel] = useState('');
    const [target, setTarget] = useState('');
    const [current, setCurrent] = useState('');

    const handleSubmit = (e) => {
        e.preventDefault();
        if (!label || !target) return;
        addSavingsGoal({
            label,
            target: parseFloat(target),
            current: parseFloat(current || 0)
        });
        setLabel('');
        setTarget('');
        setCurrent('');
    };

    return (
        <div className="grid-layout">
            <h1 className="text-3xl font-bold title-gradient">Épargne & Objectifs</h1>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Form */}
                <div className="glass-panel p-6">
                    <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                        <Plus size={20} className="text-indigo-400" /> Nouvel Objectif
                    </h2>
                    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                        <div>
                            <label className="block text-sm text-gray-400 mb-1">Nom de l'objectif</label>
                            <input
                                type="text"
                                value={label}
                                onChange={e => setLabel(e.target.value)}
                                className="w-full bg-[#0f172a] border border-gray-700 rounded-lg p-3 text-white focus:outline-none focus:border-indigo-500"
                                placeholder="Ex: Voyage Japon"
                            />
                        </div>
                        <div>
                            <label className="block text-sm text-gray-400 mb-1">Cible (€)</label>
                            <input
                                type="number"
                                value={target}
                                onChange={e => setTarget(e.target.value)}
                                className="w-full bg-[#0f172a] border border-gray-700 rounded-lg p-3 text-white focus:outline-none focus:border-indigo-500"
                                placeholder="2000"
                            />
                        </div>
                        <div>
                            <label className="block text-sm text-gray-400 mb-1">Montant Actuel (€)</label>
                            <input
                                type="number"
                                value={current}
                                onChange={e => setCurrent(e.target.value)}
                                className="w-full bg-[#0f172a] border border-gray-700 rounded-lg p-3 text-white focus:outline-none focus:border-indigo-500"
                                placeholder="0"
                            />
                        </div>
                        <button className="btn-primary w-full mt-2">Créer</button>
                    </form>
                </div>

                {/* Goals List */}
                <div className="lg:col-span-2 space-y-4">
                    {savingsGoals.map(goal => {
                        const progress = Math.min(100, (goal.current / goal.target) * 100);
                        return (
                            <div key={goal.id} className="glass-panel p-6">
                                <div className="flex justify-between items-center mb-4">
                                    <div className="flex items-center gap-3">
                                        <div className="p-2 rounded-full bg-indigo-500/10 text-indigo-400">
                                            <Target size={24} />
                                        </div>
                                        <div>
                                            <h3 className="font-bold text-lg">{goal.label}</h3>
                                            <p className="text-sm text-gray-400">{goal.current} € / {goal.target} €</p>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <span className="text-2xl font-bold">{Math.round(progress)}%</span>
                                    </div>
                                </div>
                                {/* Progress Bar */}
                                <div className="w-full bg-gray-700 rounded-full h-4 overflow-hidden">
                                    <div
                                        className="bg-indigo-500 h-full rounded-full transition-all duration-500"
                                        style={{ width: `${progress}%` }}
                                    ></div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}
