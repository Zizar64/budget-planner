import React, { useMemo } from 'react';
import { useBudget } from '../context/BudgetContext';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';
import { TrendingDown, TrendingUp, Wallet, Calendar, Edit2, Check, Download } from 'lucide-react';
import { format, addMonths } from 'date-fns';
import { fr } from 'date-fns/locale';

export default function Dashboard() {
    const { balance, getProjection, getEventsForPeriod, initialBalance, setInitialBalance } = useBudget();

    const [isEditingBalance, setIsEditingBalance] = React.useState(false);
    const [editBalanceValue, setEditBalanceValue] = React.useState('');

    const startBalanceEdit = () => {
        setEditBalanceValue(balance.toString());
        setIsEditingBalance(true);
    };

    const handleBalanceSave = (e) => {
        e.preventDefault();
        const newCurrent = parseFloat(editBalanceValue);
        if (!isNaN(newCurrent)) {
            // NewInitial = NewCurrent - (Current - Initial)
            // Simpler: NewInitial = NewCurrent - TxnTotal
            // TxnTotal = Balance - Initial
            const txnTotal = balance - initialBalance;
            setInitialBalance(newCurrent - txnTotal);
        }
        setIsEditingBalance(false);
    };

    const [projectionMonths, setProjectionMonths] = React.useState(6);

    // Get projection based on selected timeframe
    const data = useMemo(() => getProjection(projectionMonths), [getProjection, projectionMonths]);

    // Calculate Gradient Offset for split coloring
    // ... existing gradient logic (omitted for brevity in replacement if unchanged, but need to include context)
    // Actually simpler to just replace the whole component block related to chart or just the lines needed.
    // Let's replace the whole card logic to insert buttons.

    const gradientOffset = () => {
        const dataMax = Math.max(...data.map((i) => i.balance));
        const dataMin = Math.min(...data.map((i) => i.balance));

        if (dataMax <= 0) {
            return 0;
        }
        if (dataMin >= 0) {
            return 1;
        }

        return dataMax / (dataMax - dataMin);
    };

    const off = gradientOffset();

    // Custom Tooltip
    const CustomTooltip = ({ active, payload, label }) => {
        if (active && payload && payload.length) {
            const val = payload[0].value;
            return (
                <div className="glass-panel p-3 text-sm border-0 bg-slate-900/90 shadow-xl">
                    <p className="font-bold mb-1 text-gray-300">{format(new Date(label), 'dd MMM yyyy', { locale: fr })}</p>
                    <p className={`font-bold ${val >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                        Solde: {val.toFixed(2)} €
                    </p>
                    {payload[0].payload.label && (
                        <p className="text-gray-400 text-xs mt-1">Event: {payload[0].payload.label}</p>
                    )}
                </div>
            );
        }
        return null;
    };

    // Get next upcoming event from dynamic projection
    const nextEvent = useMemo(() => {
        // Look ahead 3 months
        const futureEvents = getEventsForPeriod(new Date(), addMonths(new Date(), 3));
        // Filter events strictly in future and take the first one
        const now = new Date();
        return futureEvents.find(e => new Date(e.date) > now);
    }, [getEventsForPeriod]);

    return (
        <div className="grid-layout">
            <header className="flex justify-between items-end">
                {/* ... existing header content ... */}
                <div>
                    <h1 className="text-3xl font-bold title-gradient">Vue d'ensemble</h1>
                    <p className="text-gray-400">Bienvenue, Lucas</p>
                </div>
                <div className="text-right flex flex-col items-end gap-2">
                    <button
                        onClick={() => window.open('/api/export', '_blank')}
                        className="flex items-center gap-2 px-3 py-1 bg-slate-800 hover:bg-slate-700 rounded-lg text-xs text-indigo-400 transition-colors"
                        title="Sauvegarder les données"
                    >
                        <Download size={14} />
                        Sauvegarder
                    </button>
                    <div>
                        <p className="text-sm text-gray-500 mb-1">Solde actuel</p>
                        {isEditingBalance ? (
                            <form onSubmit={handleBalanceSave} className="flex items-center justify-end gap-2">
                                <input
                                    type="number"
                                    value={editBalanceValue}
                                    onChange={(e) => setEditBalanceValue(e.target.value)}
                                    className="bg-slate-900 border border-slate-700 rounded px-2 py-1 w-32 text-right font-bold text-white focus:border-indigo-500 outline-none"
                                    step="0.01"
                                    autoFocus
                                />
                                <button type="submit" className="p-1 text-emerald-400 hover:bg-emerald-500/10 rounded"><Check size={20} /></button>
                            </form>
                        ) : (
                            <div className="group flex items-center justify-end gap-2 cursor-pointer" onClick={startBalanceEdit}>
                                <p className={`text-2xl font-bold ${balance >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                                    {balance.toFixed(2)} €
                                </p>
                                <Edit2 size={14} className="opacity-0 group-hover:opacity-100 text-gray-500 transition-opacity" />
                            </div>
                        )}
                    </div>
                </div>
            </header>

            {/* Hero Chart Card */}
            <div className="glass-panel p-6 h-[400px]">
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-xl font-semibold flex items-center gap-2">
                        <TrendingUp className="text-indigo-400" size={20} />
                        Projection de Trésorerie
                    </h2>
                    <div className="flex bg-slate-800 rounded-lg p-1 gap-1">
                        {[1, 3, 6].map(m => (
                            <button
                                key={m}
                                onClick={() => setProjectionMonths(m)}
                                className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${projectionMonths === m
                                    ? 'bg-indigo-600 text-white shadow-lg'
                                    : 'text-gray-400 hover:text-white hover:bg-slate-700'
                                    }`}
                            >
                                {m} Mois
                            </button>
                        ))}
                    </div>
                </div>

                <ResponsiveContainer width="100%" height="85%">
                    <AreaChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                        <defs>
                            <linearGradient id="splitColor" x1="0" y1="0" x2="0" y2="1">
                                <stop offset={off} stopColor="#10b981" stopOpacity={0.3} />
                                <stop offset={off} stopColor="#f43f5e" stopOpacity={0.3} />
                            </linearGradient>
                            <linearGradient id="splitStroke" x1="0" y1="0" x2="0" y2="1">
                                <stop offset={off} stopColor="#10b981" stopOpacity={1} />
                                <stop offset={off} stopColor="#f43f5e" stopOpacity={1} />
                            </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                        <XAxis
                            dataKey="date"
                            stroke="#94a3b8"
                            fontSize={12}
                            tickFormatter={(str) => format(new Date(str), 'MMM', { locale: fr })}
                            minTickGap={30}
                        />
                        <YAxis stroke="#94a3b8" fontSize={12} domain={[-1200, 5000]} />
                        <Tooltip content={<CustomTooltip />} />
                        <ReferenceLine y={0} stroke="#64748b" strokeDasharray="3 3" />
                        <ReferenceLine y={-1000} stroke="#be123c" strokeDasharray="3 3" label={{ value: 'Découvert (-1000€)', fill: '#be123c', fontSize: 10, position: 'bottom' }} />
                        <Area
                            type="monotone"
                            dataKey="balance"
                            stroke="url(#splitStroke)"
                            strokeWidth={3}
                            fill="url(#splitColor)"
                            fillOpacity={1}
                        />
                    </AreaChart>
                </ResponsiveContainer>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Info Cards can go here */}
                <div className="glass-panel p-6">
                    <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                        <Calendar size={18} className="text-amber-400" /> Prochain Événement
                    </h3>
                    {nextEvent ? (
                        <div>
                            <div className="text-2xl font-bold">{nextEvent.label}</div>
                            <div className={`text-lg ${nextEvent.amount > 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                                {nextEvent.amount > 0 ? '+' : ''}{nextEvent.amount.toFixed(2)} €
                            </div>
                            <div className="text-gray-500 text-sm mt-1">
                                Le {format(new Date(nextEvent.date), 'dd MMMM yyyy', { locale: fr })}
                            </div>
                        </div>
                    ) : (
                        <p className="text-gray-500">Aucun événement planifié.</p>
                    )}
                </div>

                <div className="glass-panel p-6 flex flex-col justify-center items-center text-center">
                    <Wallet size={32} className="text-indigo-400 mb-2" />
                    <p className="text-gray-300">Gérez vos transactions dans l'onglet Budget</p>
                </div>
            </div>
        </div>
    );
}
