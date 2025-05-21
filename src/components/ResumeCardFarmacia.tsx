import {
    Card,
    CardContent,
    CardDescription,
    CardFooter,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import { useCuadresFarmacia } from "@/hooks/useCuadresFarmacia";

interface ResumeCardFarmaciaProps {
    farmaciaId: string;
    farmaciaNombre: string;
    dia: string; // formato: "YYYY-MM-DD"
    onDetalle?: (farmaciaId: string, dia: string) => void;
}

const ResumeCardFarmacia = ({
    farmaciaId,
    farmaciaNombre,
    dia,
    onDetalle,
}: ResumeCardFarmaciaProps) => {
    const { data: cuadres, isLoading, error } = useCuadresFarmacia(farmaciaId);

    // Filtrar cuadres del día
    const cuadresDia = cuadres?.filter((c: any) => c.dia === dia) || [];

    // Calcular totales
    const totalDia = cuadresDia.reduce(
        (sum: number, c: any) => sum + (c.totalBsEnUsd || 0) + (c.efectivoUsd || 0) + (c.zelleUsd || 0),
        0
    );
    const diferenciaDia = cuadresDia.reduce((sum: number, c: any) => sum + (c.diferenciaUsd || 0), 0);

    return (
        <Card className="shadow-lg border-2 border-blue-200 hover:border-blue-400 transition-all duration-200">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
                <div>
                    <CardTitle className="text-blue-900 text-xl font-bold">{farmaciaNombre}</CardTitle>
                    <CardDescription className="text-blue-700">Día: {dia}</CardDescription>
                </div>
            </CardHeader>
            <CardContent>
                <div className="flex flex-col gap-2">
                    <div className="flex items-center justify-between">
                        <span className="text-gray-700 font-medium">Venta del día:</span>
                        <span className="text-2xl font-bold text-green-700">
                            {totalDia.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USD
                        </span>
                    </div>
                    <div className="flex items-center justify-between">
                        <span className="text-gray-700 font-medium">Diferencia:</span>
                        <span className={`text-2xl font-bold ${diferenciaDia === 0 ? "text-gray-500" : diferenciaDia > 0 ? "text-green-600" : "text-red-600"}`}>
                            {diferenciaDia.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USD
                        </span>
                    </div>
                    <div className="flex items-center justify-between">
                        <span className="text-gray-700 font-medium">Cuadres registrados:</span>
                        <span className="text-blue-800 font-semibold">{cuadresDia.length}</span>
                    </div>
                </div>
            </CardContent>
            <CardFooter className="flex flex-col md:flex-row md:items-center md:justify-between gap-2">
                <div>
                    {isLoading ? (
                        <span className="text-blue-600">Cargando...</span>
                    ) : error ? (
                        <span className="text-red-600">Error al cargar datos</span>
                    ) : cuadresDia.length === 0 ? (
                        <span className="text-gray-500">No hay cuadres para este día.</span>
                    ) : (
                        <span className="text-green-700 font-medium">Datos actualizados</span>
                    )}
                </div>
                <button
                    className="mt-2 md:mt-0 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition"
                    onClick={() => onDetalle?.(farmaciaId, dia)}
                    disabled={isLoading || !!error || cuadresDia.length === 0}
                >
                    Ver detalles
                </button>
            </CardFooter>
        </Card>
    );
};

export default ResumeCardFarmacia;