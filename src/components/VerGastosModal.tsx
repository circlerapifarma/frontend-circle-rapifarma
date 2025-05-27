import React, { useEffect, useState } from "react";

interface VerGastosModalProps {
  open: boolean;
  onClose: () => void;
  farmaciaId: string;
  farmaciaNombre: string;
}

interface Gasto {
  id: string;
  titulo: string;
  descripcion: string;
  monto: number;
  fecha: string;
  estado: string;
}

const VerGastosModal: React.FC<VerGastosModalProps> = ({ open, onClose, farmaciaId, farmaciaNombre }) => {
  const [gastos, setGastos] = useState<Gasto[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (open) {
      const fetchGastos = async () => {
        setLoading(true);
        try {
          const res = await fetch(`${import.meta.env.VITE_API_BASE_URL}/gastos?localidad=${farmaciaId}&estado=wait`); // Filter by estado=wait
          if (!res.ok) {
            throw new Error("Error al obtener los gastos");
          }
          const data = await res.json();
          setGastos(data);
        } catch (error) {
          console.error("Error al obtener los gastos:", error);
        } finally {
          setLoading(false);
        }
      };
      fetchGastos();
    }
  }, [open, farmaciaId]);

  const handleDeny = async (gastoId: string) => {
    try {
      const res = await fetch(`${import.meta.env.VITE_API_BASE_URL}/gastos/estado`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ id: gastoId, estado: "denied" }),
      });

      if (!res.ok) {
        throw new Error("Error al denegar el gasto");
      }

      alert("Gasto denegado exitosamente");
      setGastos(gastos.filter(gasto => gasto.id !== gastoId)); // Remove denied gasto from the list
    } catch (error) {
      console.error("Error al denegar el gasto:", error);
      alert("Hubo un error al denegar el gasto");
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-lg w-full max-w-2xl p-6">
        <h2 className="text-xl font-bold mb-4">Cuadres en espera de {farmaciaNombre}</h2>
        <button
          className="absolute top-4 right-4 text-gray-500 hover:text-gray-700"
          onClick={onClose}
        >
          &times;
        </button>
        {loading ? (
          <div className="text-center text-gray-500">Cargando cuadres...</div>
        ) : gastos.length === 0 ? (
          <div className="text-center text-gray-500">No hay cuadres en espera para esta farmacia.</div>
        ) : (
          <ul className="divide-y divide-gray-200">
            {gastos.map(gasto => (
              <li key={gasto.id} className="py-4">
                <div className="flex justify-between items-center">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-800">{gasto.titulo}</h3>
                    <p className="text-sm text-gray-600">{gasto.descripcion}</p>
                    <p className="text-sm text-gray-600">Fecha: {new Date(gasto.fecha).toLocaleDateString()}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-bold text-gray-800">${gasto.monto.toFixed(2)}</p>
                    <button
                      className="text-sm font-medium text-red-600 hover:underline"
                      onClick={() => handleDeny(gasto.id)}
                    >
                      Denegar
                    </button>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
};

export default VerGastosModal;
