import React, { useState } from 'react';
import { FileSpreadsheet, Loader2 } from 'lucide-react';
import * as XLSX from 'xlsx';

interface ExportExcelProps {
    fechaInicio: string;
    fechaFin: string;
    farmacias: { value: string; label: string }[];
}

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';


const ExportarTodoExcel: React.FC<ExportExcelProps> = ({ fechaInicio, fechaFin, farmacias }) => {
    const [isExporting, setIsExporting] = useState(false);

    const handleExport = async () => {
        if (!fechaInicio || !fechaFin) return alert("Por favor, seleccione un rango de fechas");

        setIsExporting(true);
        const dataFinal: any[] = [];

        try {
            // Filtramos el array para no procesar la opción "Todas las farmacias"
            const listaFarmacias = farmacias.filter(f => f.value !== "");

            // Ejecutamos todas las consultas al mismo tiempo
            await Promise.all(
                listaFarmacias.map(async (farmacia) => {
                    try {
                        // Construimos las URLs (ajusta el /api/ según tu estructura de backend)
                        const urlCuadres = `${API_BASE_URL}/cuadres?farmacia=${farmacia.value}&fechaInicio=${fechaInicio}&fechaFin=${fechaFin}&estado=verified`;
                        const urlGastos = `${API_BASE_URL}/gastos?localidad=${farmacia.value}&fecha_inicio=${fechaInicio}&fecha_fin=${fechaFin}&estado=verified`;

                        const [resCuadres, resGastos] = await Promise.all([
                            fetch(urlCuadres).then(r => r.ok ? r.json() : []),
                            fetch(urlGastos).then(r => r.ok ? r.json() : { totalGastosUsd: 0 })
                        ]);

                        // Procesamos la data recibida
                        const cuadres = Array.isArray(resCuadres) ? resCuadres : [];
                        const gastos = Array.isArray(resGastos) ? resGastos : [];

                        // Cálculos idénticos a tu lógica de useMemo
                        const totalVenta = cuadres.reduce((acc: number, c: any) => acc + (Number(c.totalGeneralUsd) || 0), 0);
                        const totalCosto = cuadres.reduce((acc: number, c: any) => acc + ((Number(c.costoInventario) || 0) / (Number(c.tasa) || 1)), 0);
                        const totalSobrante = cuadres.reduce((acc: number, c: any) => acc + (Number(c.sobranteUsd) || 0), 0);
                        const totalFaltante = cuadres.reduce((acc: number, c: any) => acc + (Number(c.faltanteUsd) || 0), 0);

                        // Calcular total de gastos
                        const totalGasto = gastos
                            .filter((g: any) => g.estado === "verified")
                            .reduce((total: number, g: any) => {
                                if (g.divisa === 'USD') {
                                    return total + (Number(g.monto) || 0);
                                }
                                if (g.divisa === 'Bs' && g.tasa > 0) {
                                    return total + ((Number(g.monto) || 0) / g.tasa);
                                }
                                return total;
                            }, 0);

                        dataFinal.push({
                            "Código": farmacia.value,
                            "Farmacia": farmacia.label,
                            "Venta Bruta ($)": totalVenta,
                            "Costo Cuadre ($)": totalCosto,
                            "Gastos ($)": totalGasto,
                            "Utilidad ($)": totalVenta - (totalCosto + totalGasto),
                            "Sobrantes ($)": totalSobrante,
                            "Faltantes ($)": totalFaltante,
                            "Diferencia Neta ($)": totalSobrante - totalFaltante
                        });
                    } catch (err) {
                        console.error(`Error en farmacia ${farmacia.label}:`, err);
                    }
                })
            );

            // Ordenar por nombre de farmacia
            dataFinal.sort((a, b) => a.Farmacia.localeCompare(b.Farmacia));

            // Creación del libro de Excel
            const ws = XLSX.utils.json_to_sheet(dataFinal);
            const wb = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(wb, ws, "Consolidado");

            // Descarga del archivo
            XLSX.writeFile(wb, `Reporte_General_${fechaInicio}_al_${fechaFin}.xlsx`);

        } catch (error) {
            console.error("Error crítico exportando:", error);
            alert("Error al generar el archivo Excel");
        } finally {
            setIsExporting(false);
        }
    };

    return (
        <button
            onClick={handleExport}
            disabled={isExporting}
            className="flex items-center gap-2 px-6 py-3 bg-emerald-600 text-white rounded-2xl font-bold hover:bg-emerald-700 transition-all shadow-lg active:scale-95 disabled:opacity-50"
        >
            {isExporting ? (
                <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
                <FileSpreadsheet className="w-5 h-5" />
            )}
            {isExporting ? "Procesando Datos..." : "Exportar Consolidado Excel"}
        </button>
    );
};

export default ExportarTodoExcel;