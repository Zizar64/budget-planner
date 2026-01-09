import { useMemo } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import { useBudget } from '../../context/BudgetContext';

interface SpendingChartProps {
    items: any[]; // Or define a tighter interface for report items
}

export default function SpendingChart({ items }: SpendingChartProps) {
    const { categories } = useBudget();

    const data = useMemo(() => {
        // 1. Filter expenses
        const expenses = items.filter(item => item.amount < 0);

        // 2. Group by category
        const groups: Record<string, any> = {};
        expenses.forEach(item => {
            const catId = item.category_id?.toString() || 'uncategorized';
            const catLabel = item.category || 'Non catégorisé';

            if (!groups[catId]) {
                groups[catId] = {
                    id: catId,
                    name: catLabel,
                    value: 0
                };
            }
            groups[catId].value += Math.abs(item.amount);
        });

        // 3. Convert to array and sort
        return Object.values(groups)
            .sort((a: any, b: any) => b.value - a.value); // Sort by highest spending
    }, [items]);

    // Helper to get color
    const getColor = (catId: string) => {
        if (catId === 'uncategorized') return '#94a3b8'; // gray-400
        const cat = categories.find(c => c.id.toString() === catId);
        return cat ? cat.color : '#94a3b8';
    };

    const CustomTooltip = ({ active, payload }: any) => {
        if (active && payload && payload.length) {
            const data = payload[0].payload;
            return (
                <div className="glass-panel p-2 text-sm border-0 bg-slate-900/90 shadow-xl">
                    <p className="font-semibold text-white">{data.name}</p>
                    <p className="text-gray-300">{data.value.toFixed(2)} €</p>
                </div>
            );
        }
        return null;
    };

    if (data.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center h-full text-gray-500 text-sm">
                <p>Aucune donnée</p>
            </div>
        );
    }

    return (
        <div className="w-full h-full">
            <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                    <Pie
                        data={data}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={80}
                        paddingAngle={5}
                        dataKey="value"
                        stroke="none"
                    >
                        {data.map((entry: any, index: number) => (
                            <Cell key={`cell-${index}`} fill={getColor(entry.id)} />
                        ))}
                    </Pie>
                    <Tooltip content={<CustomTooltip />} />
                    <Legend
                        layout="vertical"
                        verticalAlign="middle"
                        align="right"
                        wrapperStyle={{ fontSize: '12px', color: '#cbd5e1' }}
                    />
                </PieChart>
            </ResponsiveContainer>
        </div>
    );
}
