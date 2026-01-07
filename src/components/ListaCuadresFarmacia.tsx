import React from "react";

interface Props {
    farmaciaId: string;
    data: any[]; // Recibe los datos ya cargados desde el componente padre
}

const ListaCuadresFarmacia: React.FC<Props> = ({ data }) => {
    
    // Chip visual reutilizable para estado de cuadre
    const EstadoChip: React.FC<{ estado: string }> = ({ estado }) => {
        let color = "bg-gray-200 text-gray-700";
        let label = estado;
        switch (estado) {
            case "wait":
                color = "bg-yellow-100 text-yellow-700 border border-yellow-300";
                label = "Pendiente";
                break;
            case "verified":
                color = "bg-green-100 text-green-700 border border-green-300";
                label = "Verificado";
                break;
            case "denied":
                color = "bg-red-100 text-red-700 border border-red-300";
                label = "Rechazado";
                break;
            default:
                label = estado;
        }
        return (
            <span className={`px-3 py-1 rounded-full text-xs font-bold shadow-sm ${color}`}>
                {label.toUpperCase()}
            </span>
        );
    };

    return (
        <div className="w-full">
            {data && data.length > 0 ? (
                <div className="space-y-3">
                    {data.map((cuadre: any) => (
                        <div 
                            key={cuadre._id} 
                            className="flex flex-col md:flex-row md:items-center justify-between p-4 bg-white/60 border border-slate-200 rounded-xl hover:shadow-md transition-all gap-3"
                        >
                            <div className="flex flex-wrap items-center gap-4 text-sm">
                                <div className="flex flex-col">
                                    <span className="text-xs text-slate-500 font-semibold uppercase">Fecha</span>
                                    <span className="font-mono font-bold text-slate-800">{cuadre.dia}</span>
                                </div>
                                
                                <div className="flex flex-col border-l pl-4">
                                    <span className="text-xs text-slate-500 font-semibold uppercase">Cajero / Turno</span>
                                    <span className="text-slate-700">
                                        {cuadre.cajero || 'N/D'} — <span className="italic">{cuadre.turno || 'N/D'}</span>
                                    </span>
                                </div>
                            </div>

                            <div className="flex items-center gap-6">
                                <div className="text-right">
                                    <span className="block text-xs text-slate-500 font-semibold uppercase">Balance</span>
                                    <div className="flex gap-3">
                                        <span className={`font-bold ${cuadre.sobranteUsd > 0 ? 'text-green-600' : 'text-slate-400'}`}>
                                            +{cuadre.sobranteUsd} $
                                        </span>
                                        <span className={`font-bold ${cuadre.faltanteUsd > 0 ? 'text-red-600' : 'text-slate-400'}`}>
                                            -{cuadre.faltanteUsd} $
                                        </span>
                                    </div>
                                </div>
                                <EstadoChip estado={cuadre.estado} />
                            </div>
                        </div>
                    ))}
                </div>
            ) : (
                <div className="text-center py-10 bg-slate-50 border-2 border-dashed rounded-2xl">
                    <p className="text-slate-500 font-medium">No se encontraron cuadres para este periodo.</p>
                </div>
            )}
        </div>
    );
};

export default ListaCuadresFarmacia;