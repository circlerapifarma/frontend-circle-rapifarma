import React from "react";
import { Badge } from "@/components/ui/badge";
import { ReceiptText, Calendar, Image as ImageIcon } from "lucide-react";

interface Gasto {
    _id: string;
    titulo: string;
    descripcion: string;
    monto: number;
    montoUsd: number;
    divisa: string;
    tasa: number;
    fecha: string;
    estado: string;
    imagenesGasto?: string[];
}

interface Props {
    data: Gasto[];
}

const ListaGastosFarmacia: React.FC<Props> = ({ data }) => {
    
    const EstadoBadge: React.FC<{ estado: string }> = ({ estado }) => {
        const config: Record<string, string> = {
            wait: "bg-yellow-100 text-yellow-700 border-yellow-300",
            verified: "bg-green-100 text-green-700 border-green-300",
            denied: "bg-red-100 text-red-700 border-red-300",
        };
        const style = config[estado] || "bg-gray-100 text-gray-700 border-gray-300";
        const label = estado === 'wait' ? 'Pendiente' : estado === 'verified' ? 'Verificado' : 'Rechazado';
        
        return (
            <Badge className={`variant-outline shadow-sm ${style} uppercase text-[10px]`}>
                {label}
            </Badge>
        );
    };

    return (
        <div className="space-y-3">
            {data.length > 0 ? (
                data.map((gasto) => (
                    <div 
                        key={gasto._id} 
                        className="group bg-white/60 hover:bg-white border border-slate-200 rounded-xl p-4 transition-all hover:shadow-md"
                    >
                        <div className="flex flex-col md:flex-row justify-between gap-4">
                            {/* Izquierda: Info Principal */}
                            <div className="flex gap-4">
                                <div className="h-12 w-12 rounded-lg bg-blue-50 flex items-center justify-center text-blue-600 shrink-0">
                                    <ReceiptText size={24} />
                                </div>
                                <div className="space-y-1">
                                    <h3 className="font-bold text-slate-900 leading-none capitalize">
                                        {gasto.titulo.toLowerCase()}
                                    </h3>
                                    <p className="text-xs text-slate-500 line-clamp-1">
                                        {gasto.descripcion}
                                    </p>
                                    <div className="flex items-center gap-3 text-[11px] text-slate-400 font-medium">
                                        <span className="flex items-center gap-1">
                                            <Calendar size={12} /> {gasto.fecha}
                                        </span>
                                        {gasto.imagenesGasto && gasto.imagenesGasto.length > 0 && (
                                            <span className="flex items-center gap-1 text-blue-500">
                                                <ImageIcon size={12} /> {gasto.imagenesGasto.length} adjuntos
                                            </span>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* Derecha: Montos y Estado */}
                            <div className="flex flex-row md:flex-col justify-between items-end gap-2 border-t md:border-t-0 pt-3 md:pt-0">
                                <div className="text-right">
                                    <div className="flex items-center justify-end gap-1 text-slate-900">
                                        <span className="text-xs font-bold text-slate-400">USD</span>
                                        <span className="text-lg font-black">${gasto.montoUsd.toFixed(2)}</span>
                                    </div>
                                    <div className="text-[11px] font-bold text-slate-500">
                                        {gasto.monto.toLocaleString('es-VE')} {gasto.divisa} 
                                        <span className="text-slate-300 ml-1 font-normal">
                                            (Tasa: {gasto.tasa})
                                        </span>
                                    </div>
                                </div>
                                <EstadoBadge estado={gasto.estado} />
                            </div>
                        </div>
                    </div>
                ))
            ) : (
                <div className="text-center py-12 bg-slate-50 border-2 border-dashed rounded-2xl">
                    <p className="text-slate-400 text-sm">No hay gastos en este rango.</p>
                </div>
            )}
        </div>
    );
};

export default ListaGastosFarmacia;