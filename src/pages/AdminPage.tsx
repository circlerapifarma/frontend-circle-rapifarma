import ResumeCardFarmacia from '@/components/ResumeCardFarmacia';
import ResumenCuadreFarmacia from '@/components/ResumenCuadreFarmacia';
import AgregarCuadreModal from "@/components/AgregarCuadreModal";
import React, { useState } from 'react';
import { useDataFarmaciaContext } from '@/context/DataFarmaciaContext';
import { useUserContext } from '@/context/UserContext';

const AdminPage: React.FC = () => {
    const { farmacias, getCuadreCajasByFarmaciaAndDia, getAllCuadreCajasByFarmaciaAndDia } = useDataFarmaciaContext();
    const { usuario } = useUserContext();
    const [dia, setDia] = useState<string>('2025-05-18');
    const [detalleFarmacia, setDetalleFarmacia] = useState<string | null>(null);
    const [modalFarmacia, setModalFarmacia] = useState<string | null>(null);

    // Filtra farmacias según los accesos del usuario autenticado
    const farmaciasFiltradas = usuario
        ? farmacias.filter(f => usuario.accesos.includes(f))
        : [];

    // Handler para abrir el modal
    const handleAgregarCuadre = (farmacia: string) => {
        setModalFarmacia(farmacia);
    };

    return (
        <div className="flex flex-col items-center min-h-screen bg-gradient-to-br from-blue-100 to-blue-300 py-8 px-2">
            <div className="w-full max-w-2xl mb-8">
                <h1 className="text-4xl font-extrabold text-center text-blue-900 mb-2 drop-shadow-lg tracking-tight">Resumen de Ventas</h1>
                <p className="text-center text-gray-700 mb-6 text-lg">Selecciona una fecha para ver el resumen de cada farmacia</p>
                <div className="flex justify-center">
                    <input
                        type="date"
                        value={dia}
                        onChange={e => setDia(e.target.value)}
                        className="mb-4 p-2 border rounded shadow focus:outline-none focus:ring-2 focus:ring-blue-400 bg-white"
                    />
                </div>
            </div>
            {farmaciasFiltradas.length === 0 ? (
                <div className="text-center text-gray-500 mt-12 text-lg">
                    No tienes acceso a ninguna farmacia.
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 w-full max-w-4xl">
                    {farmaciasFiltradas.map((farmacia) => {
                        const data = getCuadreCajasByFarmaciaAndDia(farmacia, dia);
                        return (
                            <div
                                key={farmacia}
                                className="relative bg-white rounded-xl shadow-xl p-6 flex flex-col items-center transition-transform hover:scale-105 hover:shadow-2xl border border-blue-100"
                            >
                                <ResumeCardFarmacia
                                    farmacia={farmacia}
                                    totalDia={data.reduce((acc, item) => acc + item.totalBs, 0)}
                                    DiferenciaDia={data.reduce((acc, item) => acc + item.diferenciaUsd, 0)}
                                />
                                {/* Botón Agregar Cuadre */}
                                <button
                                    className="mt-4 px-4 py-2 bg-gradient-to-r from-green-500 to-green-700 text-white font-semibold rounded shadow hover:from-green-600 hover:to-green-800 transition z-20 relative"
                                    onClick={e => {
                                        e.stopPropagation(); // Evita que el clic llegue al div de fondo
                                        handleAgregarCuadre(farmacia);
                                    }}
                                >
                                    <span className="material-icons text-base align-middle mr-2">add_circle</span>
                                    Agregar Cuadre
                                </button>
                                <div
                                    className="absolute inset-0 z-10"
                                    onClick={() => setDetalleFarmacia(farmacia)}
                                    style={{ cursor: "pointer" }}
                                />
                            </div>
                        );
                    })}
                </div>
            )}
            {/* Modal para agregar cuadre */}
            {modalFarmacia && (
                <div>

                    <AgregarCuadreModal
                        farmacia={modalFarmacia}
                        dia={dia}
                        onClose={() => setModalFarmacia(null)}
                    />
                </div>
            )}
            {detalleFarmacia && (
                <div className="flex flex-col items-center mb-4">

                    <div className='w-full max-w-4xl'>

                        <ResumenCuadreFarmacia
                            farmacia={detalleFarmacia}
                            cuadreCajas={getAllCuadreCajasByFarmaciaAndDia(detalleFarmacia, dia)}
                            onClose={() => setDetalleFarmacia(null)}
                        />
                    </div>
                </div>
            )}
        </div>
    );
};

export default AdminPage;