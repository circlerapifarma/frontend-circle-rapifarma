import { useState, useEffect } from 'react';

export const useCuentasSelection = () => {
    const [cuentasParaPagar, setCuentasParaPagar] = useState<any[]>(() => {
        const stored = localStorage.getItem('cuentasParaPagar');
        return stored ? JSON.parse(stored) : [];
    });

    const [selectedIds, setSelectedIds] = useState<string[]>([]);

    useEffect(() => {
        localStorage.setItem('cuentasParaPagar', JSON.stringify(cuentasParaPagar));
        setSelectedIds(cuentasParaPagar.map(c => c.cuentaPorPagarId));
    }, [cuentasParaPagar]);

    const toggleSeleccion = (cuenta: any) => {
        setCuentasParaPagar(prev => {
            const existe = prev.find(c => c.cuentaPorPagarId === cuenta._id);
            if (existe) return prev.filter(c => c.cuentaPorPagarId !== cuenta._id);

            const montoDePago = cuenta.divisa === 'USD' 
                ? Number((cuenta.monto * cuenta.tasa).toFixed(2)) 
                : Number(cuenta.monto);
            
            const retencion = Number(cuenta.retencion) || 0;

            return [...prev, {
                ...cuenta,
                cuentaPorPagarId: cuenta._id,
                montoOriginal: cuenta.monto,
                monedaOriginal: cuenta.divisa,
                tasaOriginal: cuenta.tasa,
                montoDePago: Math.max(montoDePago - retencion, 0),
                monedaDePago: 'Bs'
            }];
        });
    };

    const clearSeleccion = () => setCuentasParaPagar([]);

    return { cuentasParaPagar, selectedIds, toggleSeleccion, clearSeleccion };
};