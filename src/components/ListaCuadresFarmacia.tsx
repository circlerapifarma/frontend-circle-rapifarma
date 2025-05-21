import React from "react";
import { useCuadresFarmacia } from "@/hooks/useCuadresFarmacia";

interface Props {
    farmaciaId: string;
}

const ListaCuadresFarmacia: React.FC<Props> = ({ farmaciaId }) => {
    const { data, isLoading, error } = useCuadresFarmacia(farmaciaId);

    if (isLoading) return <div>Cargando cuadres...</div>;
    if (error) return <div>Error al cargar cuadres</div>;

    return (
        <div>
            <h2 className="text-xl font-bold mb-2">Cuadres de farmacia {farmaciaId}</h2>
            {data && data.length > 0 ? (
                <ul>
                    {data.map((cuadre: any) => (
                        <li key={cuadre._id} className="mb-2 border-b pb-2">
                            Caja #{cuadre.cajaNumero} - {cuadre.dia} - Cajero: {cuadre.cajero} - Total Bs: {cuadre.totalBs}
                        </li>
                    ))}
                </ul>
            ) : (
                <div>No hay cuadres registrados.</div>
            )}
        </div>
    );
};

export default ListaCuadresFarmacia;