import React, { useState, useEffect } from "react";

const AgregarGastos: React.FC<{ onSubmitSuccess?: () => void }> = ({ onSubmitSuccess }) => {
  const [formData, setFormData] = useState({
    monto: "",
    titulo: "",
    descripcion: "",
    localidad: "",
    fecha: "",
  });
  const [localidades, setLocalidades] = useState<{ id: string; nombre: string }[]>([]);

  useEffect(() => {
    const fetchLocalidades = async () => {
      try {
        const res = await fetch(`${import.meta.env.VITE_API_BASE_URL}/farmacias`);
        const data = await res.json();
        const lista = data.farmacias
          ? Object.entries(data.farmacias).map(([id, nombre]) => ({ id, nombre: String(nombre) }))
          : Object.entries(data).map(([id, nombre]) => ({ id, nombre: String(nombre) }));
        setLocalidades(lista);
      } catch (err) {
        console.error("Error al obtener localidades", err);
      }
    };
    fetchLocalidades();
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const confirmSave = window.confirm("¿Seguro que desea guardar el gasto?"); // Confirmación antes de guardar
    if (!confirmSave) return;

    alert("Guardando el gasto, por favor espere..."); // Alerta antes de guardar
    try {
      const res = await fetch(`${import.meta.env.VITE_API_BASE_URL}/gastos`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formData),
      });

      if (!res.ok) {
        throw new Error("Error al guardar el gasto");
      }

      const data = await res.json();
      console.log("Gasto guardado exitosamente:", data);
      alert("Gasto guardado exitosamente");

      // Reiniciar el formulario
      setFormData({
        monto: "",
        titulo: "",
        descripcion: "",
        localidad: "",
        fecha: "",
      });

      if (onSubmitSuccess) {
        onSubmitSuccess();
      }
    } catch (error) {
      console.error(error);
      alert("Hubo un error al guardar el gasto");
    }
  };

  return (
    <div className="max-w-xl mx-auto bg-white rounded-2xl shadow-lg p-8 sm:p-10">
      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label htmlFor="monto" className="block text-sm font-medium text-gray-700 mb-1">Monto</label>
          <input
            type="number"
            name="monto"
            id="monto"
            value={formData.monto}
            onChange={handleChange}
            className="w-full rounded-lg border border-gray-300 px-4 py-2 text-sm shadow-sm focus:border-red-500 focus:ring-1 focus:ring-red-500 transition"
            required
          />
        </div>

        <div>
          <label htmlFor="titulo" className="block text-sm font-medium text-gray-700 mb-1">Título</label>
          <input
            type="text"
            name="titulo"
            id="titulo"
            value={formData.titulo}
            onChange={handleChange}
            className="w-full rounded-lg border border-gray-300 px-4 py-2 text-sm shadow-sm focus:border-red-500 focus:ring-1 focus:ring-red-500 transition"
            required
          />
        </div>

        <div>
          <label htmlFor="descripcion" className="block text-sm font-medium text-gray-700 mb-1">Descripción</label>
          <textarea
            name="descripcion"
            id="descripcion"
            rows={4}
            value={formData.descripcion}
            onChange={handleChange}
            className="w-full rounded-lg border border-gray-300 px-4 py-2 text-sm shadow-sm focus:border-red-500 focus:ring-1 focus:ring-red-500 transition"
            required
          ></textarea>
        </div>

        <div>
          <label htmlFor="localidad" className="block text-sm font-medium text-gray-700 mb-1">Localidad</label>
          <select
            name="localidad"
            id="localidad"
            value={formData.localidad}
            onChange={handleChange}
            className="w-full rounded-lg border border-gray-300 px-4 py-2 text-sm shadow-sm bg-white focus:border-red-500 focus:ring-1 focus:ring-red-500 transition"
            required
          >
            <option value="">Seleccione una opción</option>
            {localidades.map(loc => (
              <option key={loc.id} value={loc.id}>{loc.nombre}</option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="fecha" className="block text-sm font-medium text-gray-700 mb-1">Fecha</label>
          <input
            type="date"
            name="fecha"
            id="fecha"
            value={formData.fecha}
            onChange={handleChange}
            className="w-full rounded-lg border border-gray-300 px-4 py-2 text-sm shadow-sm focus:border-red-500 focus:ring-1 focus:ring-red-500 transition"
            required
          />
        </div>

        <div className="pt-4">
          <button
            type="submit"
            className="w-full bg-red-500 text-white text-sm font-medium py-2.5 rounded-lg shadow hover:bg-red-600 transition focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-red-500"
          >
            Guardar Gasto
          </button>
        </div>
      </form>
    </div>
  );
};

export default AgregarGastos;
