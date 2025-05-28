import CrearCajeroModal from "@/components/CrearCajeroModal";
import EditarCajeroModal from "@/components/EditarCajeroModal";
import React, { useEffect, useState } from "react";

interface Cajero {
  _id: string; // Add _id field
  id: string;
  nombre: string;
  farmacias: Record<string, string>;
  comision: number;
  estado: string;
}

const AdminCajerosPage: React.FC = () => {
  const [cajeros, setCajeros] = useState<Cajero[]>([]);
  const [selectedCajero, setSelectedCajero] = useState<Cajero | null>(null);
  const [modalEditarOpen, setModalEditarOpen] = useState(false);
  const [modalCrearOpen, setModalCrearOpen] = useState(false);

  useEffect(() => {
    const fetchCajeros = async () => {
      try {
        const res = await fetch(`${import.meta.env.VITE_API_BASE_URL}/cajeros`);
        const data = await res.json();
        const transformedData = data.map((cajero: any) => ({
          _id: cajero._id, // Use _id as id
          id: cajero.ID, // Use _id as id
          nombre: cajero.NOMBRE,
          farmacias: cajero.FARMACIAS || {},
          comision: cajero.comision || 0, // Default commission
          estado: cajero.estado || "activo", // Default state
        }));
        setCajeros(transformedData);
        console.log("Cajeros transformados:", transformedData);
      } catch (error) {
        console.error("Error al obtener los cajeros:", error);
      }
    };
    fetchCajeros();
  }, []);
  const handleEditarCajero = (cajero: Cajero) => {
    setSelectedCajero(cajero);
    setModalEditarOpen(true);
  };

  const handleCrearCajero = () => {
    setModalCrearOpen(true);
  };

  return (
    <div className="max-w-4xl mx-auto py-8 px-4">
      <h1 className="text-2xl font-bold text-blue-800 mb-6 text-center">Administrar Cajeros</h1>
      <button
        className="bg-green-500 text-white py-2 px-4 rounded-lg shadow hover:bg-green-600 transition mb-4"
        onClick={handleCrearCajero}
      >
        Crear Nuevo Cajero
      </button>
      {cajeros.length === 0 ? (
        <div className="text-center text-gray-500">No hay cajeros registrados.</div>
      ) : (
        <ul className="divide-y divide-gray-200">
          {cajeros.map(cajero => (
            <li key={cajero._id} className="py-4 flex justify-between items-center">
              <div>
                <h3 className="text-lg font-semibold text-gray-800">{cajero.nombre}</h3>
                <p className="text-sm text-gray-600">ID: {cajero.id}</p>
                <p className="text-sm text-gray-600">Comisión: {cajero.comision}%</p>
                <p className={`text-sm font-medium ${cajero.estado === "activo" ? "text-green-600" : "text-red-600"}`}>
                  Estado: {cajero.estado}
                </p>
              </div>
              <button
                className="text-sm font-medium text-blue-600 hover:underline"
                onClick={() => handleEditarCajero(cajero)}
              >
                Editar
              </button>
            </li>
          ))}
        </ul>
      )}
      {modalEditarOpen && selectedCajero && (
        <EditarCajeroModal
          open={modalEditarOpen}
          onClose={() => setModalEditarOpen(false)}
          cajero={selectedCajero}
        />
      )}
      {modalCrearOpen && (
        <CrearCajeroModal
          open={modalCrearOpen}
          onClose={() => setModalCrearOpen(false)}
        />
      )}
    </div>
  );
};

export default AdminCajerosPage;
