import React, { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useGastos } from "@/hooks/useGastos";
import AgregarGastosPage from "./AgregarGastosPage";

const ChequeoGastosPage: React.FC = () => {
  const { localidades, gastosPorLocalidad, loading, error } = useGastos();
  const [modalAbierto, setModalAbierto] = useState(false);
  const [modalAgregarAbierto, setModalAgregarAbierto] = useState(false);
  const [localidadSeleccionada, setLocalidadSeleccionada] = useState("");
  const [localidadNombreSeleccionada, setLocalidadNombreSeleccionada] = useState("");

  const abrirModal = (id: string, nombre: string) => {
    setLocalidadSeleccionada(id);
    setLocalidadNombreSeleccionada(nombre);
    setModalAbierto(true);
  };

  const verificarGasto = async (gastoId: string, nuevoEstado: string) => {
    console.log(`Verificando gasto ${gastoId} con estado ${nuevoEstado}`);
    try {
      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/gastos/estado`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ id: gastoId, estado: nuevoEstado }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Error al actualizar el estado del gasto");
      }

      alert(`Estado del gasto actualizado a ${nuevoEstado}`);
      setModalAbierto(false);
      window.location.reload();
    } catch (error: any) {
      console.error("Error al verificar el gasto:", error);
      alert(`Hubo un error al actualizar el estado del gasto: ${error.message || error}`);
    }
  };

  if (loading) return <div className="text-center py-10 text-lg text-gray-600">Cargando...</div>;
  if (error) return <div className="text-center text-red-600 py-10 text-lg">{error}</div>;

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-blue-200 p-4 sm:p-6">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-4xl font-extrabold text-red-500 mb-10 text-center tracking-tight">Chequeo de Gastos</h1>
        <div className="flex justify-end mb-4">
          <Button
            onClick={() => setModalAgregarAbierto(true)}
            className="bg-green-500 hover:bg-green-600 text-white font-semibold py-2 px-4 rounded-lg"
          >
            Agregar Gasto
          </Button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-8">
          {localidades.map((loc) => (
            <Card
              key={loc.id}
              className="relative bg-white p-6 rounded-2xl shadow-xl transition-transform transform hover:scale-[1.02] border-l-4 border-red-300"
            >
              <div className="text-center text-xl font-semibold text-red-500 mb-4">{loc.nombre}</div>
              {gastosPorLocalidad[loc.id]?.filter((gasto) => gasto.estado === "wait").length > 0 && (
                <span className="absolute top-3 right-3 bg-red-500 text-white text-sm font-bold px-2 py-1 rounded-full shadow">
                  {gastosPorLocalidad[loc.id].filter((gasto) => gasto.estado === "wait").length}
                </span>
              )}
              <Button
                onClick={() => abrirModal(loc.id, loc.nombre)}
                className="w-full bg-red-500 hover:bg-red-600 text-white font-semibold py-2 mt-4 rounded-lg"
              >
                Ver gastos
              </Button>
            </Card>
          ))}
        </div>

        {modalAbierto && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl p-8 relative border-4 border-blue-700 mx-2 sm:mx-0">
              <button
                className="absolute top-3 right-5 text-3xl text-gray-500 hover:text-red-600 font-bold"
                onClick={() => setModalAbierto(false)}
              >
                &times;
              </button>
              <h2 className="text-3xl font-extrabold text-blue-800 mb-6 text-center tracking-wide drop-shadow">
                Gastos - {localidadNombreSeleccionada}
              </h2>
              <div className="flex flex-col gap-8 max-h-[65vh] overflow-y-auto">
                {gastosPorLocalidad[localidadSeleccionada]?.filter((gasto) => gasto.estado === "wait").map((gasto) => (
                  <Card key={gasto._id} className="p-6 border-2 border-blue-300 rounded-xl shadow-lg bg-blue-50">
                    <div className="text-lg font-bold text-blue-900">Título: {gasto.titulo}</div>
                    <div className="text-base">Monto: ${gasto.monto.toFixed(2)}</div>
                    <div className="text-base">Descripción: {gasto.descripcion}</div>
                    <div className="text-base">Fecha: {gasto.fecha}</div>
                    <div className="flex gap-4 mt-4">
                      <Button
                        onClick={() => verificarGasto(gasto._id, "verified")}
                        className="bg-green-500 hover:bg-green-600 text-white font-semibold py-2 px-4 rounded-lg"
                      >
                        Verificar
                      </Button>
                      <Button
                        onClick={() => verificarGasto(gasto._id, "denied")}
                        className="bg-red-500 hover:bg-red-600 text-white font-semibold py-2 px-4 rounded-lg"
                      >
                        Denegar
                      </Button>
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          </div>
        )}

        {modalAgregarAbierto && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl p-8 relative border-4 border-green-700 mx-2 sm:mx-0">
              <button
                className="absolute top-3 right-5 text-3xl text-gray-500 hover:text-red-600 font-bold"
                onClick={() => setModalAgregarAbierto(false)}
              >
                &times;
              </button>
              <h2 className="text-3xl font-extrabold text-green-800 mb-6 text-center tracking-wide drop-shadow">
                Agregar Nuevo Gasto
              </h2>
              <AgregarGastosPage />
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ChequeoGastosPage;