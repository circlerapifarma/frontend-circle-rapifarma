import React, { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import VerificacionCuadresModal from "@/components/VerificacionCuadresModal";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

const VerificacionCuadresPage: React.FC = () => {
  const [farmacias, setFarmacias] = useState<{ id: string; nombre: string }[]>([]);
  const [cuadresPorFarmacia, setCuadresPorFarmacia] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [modalAbierto, setModalAbierto] = useState(false);
  const [farmaciaSeleccionada, setFarmaciaSeleccionada] = useState<string>("");
  const [farmaciaNombreSeleccionada, setFarmaciaNombreSeleccionada] = useState<string>("");

  useEffect(() => {
    const fetchFarmacias = async () => {
      setLoading(true);
      try {
        const res = await fetch(`${API_BASE_URL}/farmacias`);
        const data = await res.json();
        const lista = data.farmacias
          ? Object.entries(data.farmacias).map(([id, nombre]) => ({ id, nombre: String(nombre) }))
          : Object.entries(data).map(([id, nombre]) => ({ id, nombre: String(nombre) }));
        setFarmacias(lista);
      } catch (err: any) {
        setError("Error al obtener farmacias");
      } finally {
        setLoading(false);
      }
    };
    fetchFarmacias();
  }, []);

  useEffect(() => {
    const fetchCuadresPorFarmacia = async () => {
      try {
        const hoy = new Date();
        const fechaFin = hoy.toISOString().split("T")[0];
        const fechaInicioDate = new Date(hoy);
        fechaInicioDate.setDate(hoy.getDate() - 7);
        const fechaInicio = fechaInicioDate.toISOString().split("T")[0];

        const response = await fetch(
          `${API_BASE_URL}/cuadres?fechaInicio=${fechaInicio}&fechaFin=${fechaFin}`
        );
        const data = await response.json();

        const cuadresCount = data.reduce((acc: Record<string, number>, cuadre: any) => {
          if (cuadre.estado === "wait") {
            acc[cuadre.codigoFarmacia] = (acc[cuadre.codigoFarmacia] || 0) + 1;
          }
          return acc;
        }, {});

        setCuadresPorFarmacia(cuadresCount);
      } catch (err) {
        console.error("Error al obtener cuadres por farmacia", err);
      }
    };

    fetchCuadresPorFarmacia();
  }, []);

  const abrirModal = (id: string, nombre: string) => {
    setFarmaciaSeleccionada(id);
    setFarmaciaNombreSeleccionada(nombre);
    setModalAbierto(true);
  };

  const cerrarModal = () => {
    setModalAbierto(false);
    setFarmaciaSeleccionada("");
    setFarmaciaNombreSeleccionada("");
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-white border border-slate-200 shadow-sm text-slate-600 text-sm">
          <span className="h-2 w-2 rounded-full bg-blue-500 animate-ping" />
          <span>Cargando...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="px-4 py-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm">
          {error}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 px-4 py-6 sm:px-8 sm:py-10">
      <div className="max-w-6xl mx-auto space-y-6">
        <header className="flex flex-col items-center gap-2">
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 text-center">
            Verificación de Cuadres
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 text-center">
            Cuadres en espera por farmacia.
          </p>
        </header>

        <div className="rounded-2xl border border-slate-200 bg-white shadow-sm p-4 sm:p-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
            {farmacias.map((farm) => (
              <Card
                key={farm.id}
                className="relative bg-white p-4 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-transform duration-200 hover:-translate-y-0.5"
              >
                <div className="text-sm sm:text-base font-semibold text-slate-900 text-center mb-2 truncate">
                  {farm.nombre}
                </div>

                {cuadresPorFarmacia[farm.id] && (
                  <span className="absolute top-3 right-3 bg-red-500 text-white text-xs font-semibold px-2 py-0.5 rounded-full shadow-sm">
                    {cuadresPorFarmacia[farm.id]}
                  </span>
                )}

                <Button
                  onClick={() => abrirModal(farm.id, farm.nombre)}
                  className="w-full bg-slate-900 hover:bg-blue-700 text-white font-medium py-2 mt-3 rounded-xl text-xs sm:text-sm"
                >
                  Ver cuadres pendientes
                </Button>
              </Card>
            ))}
          </div>
        </div>

        <VerificacionCuadresModal
          open={modalAbierto}
          onClose={cerrarModal}
          farmaciaId={farmaciaSeleccionada}
          farmaciaNombre={farmaciaNombreSeleccionada}
        />
      </div>
    </div>
  );
};

export default VerificacionCuadresPage;
