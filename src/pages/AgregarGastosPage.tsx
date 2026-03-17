import React, { useState, useEffect } from "react";
import UpFileGasto from "@/components/upfile/UpFileGasto";
import ImageDisplay from "@/components/upfile/ImageDisplay";

const AgregarGastos: React.FC<{ onSubmitSuccess?: () => void }> = ({ onSubmitSuccess }) => {
  const [formData, setFormData] = useState({
    monto: "",
    titulo: "",
    descripcion: "",
    localidad: "",
    fecha: "",
    tasa: "",
    divisa: "",
  });

  const [imagenesGasto, setImagenesGasto] = useState<Array<string | null>>([null, null, null]);
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

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>,
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.fecha) {
      alert("Debe seleccionar una fecha válida.");
      return;
    }

    const imagenesValidas = imagenesGasto.filter((img): img is string => !!img);
    if (imagenesValidas.length === 0) {
      alert("Debe adjuntar al menos una imagen del comprobante del gasto.");
      return;
    }

    const hoy = new Date();
    const fechaSeleccionada = new Date(formData.fecha);
    hoy.setHours(0, 0, 0, 0);
    fechaSeleccionada.setHours(0, 0, 0, 0);
    if (fechaSeleccionada > hoy) {
      alert("La fecha no puede ser mayor a hoy.");
      return;
    }

    const confirmSave = window.confirm("¿Seguro que desea guardar el gasto?");
    if (!confirmSave) return;

    alert("Guardando el gasto, por favor espere...");

    try {
      const dataToSend = {
        ...formData,
        fecha: formData.fecha,
        imagenGasto: imagenesValidas[0],
        imagenesGasto: imagenesValidas,
      };

      const res = await fetch(`${import.meta.env.VITE_API_BASE_URL}/gastos`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(dataToSend),
      });

      if (!res.ok) {
        throw new Error("Error al guardar el gasto");
      }

      const data = await res.json();
      console.log("Gasto guardado exitosamente:", data);
      alert("Gasto guardado exitosamente");

      setFormData({
        monto: "",
        titulo: "",
        descripcion: "",
        localidad: "",
        fecha: "",
        tasa: "",
        divisa: "",
      });
      setImagenesGasto([null, null, null]);

      if (onSubmitSuccess) onSubmitSuccess();
    } catch (error) {
      console.error(error);
      alert("Hubo un error al guardar el gasto");
    }
  };

  return (
    <div className="max-w-xl mx-auto bg-white rounded-2xl border border-slate-200 shadow-sm p-6 sm:p-7">
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Título */}
        <div className="space-y-1">
          <label htmlFor="titulo" className="block text-sm font-medium text-slate-700">
            Título
          </label>
          <input
            type="text"
            name="titulo"
            id="titulo"
            value={formData.titulo}
            onChange={handleChange}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-red-500 focus:ring-1 focus:ring-red-500 outline-none"
            required
          />
        </div>

        {/* Descripción */}
        <div className="space-y-1">
          <label htmlFor="descripcion" className="block text-sm font-medium text-slate-700">
            Descripción
          </label>
          <textarea
            name="descripcion"
            id="descripcion"
            rows={3}
            value={formData.descripcion}
            onChange={handleChange}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-red-500 focus:ring-1 focus:ring-red-500 outline-none resize-none"
            required
          />
        </div>

        {/* Moneda */}
        <div className="space-y-1">
          <label htmlFor="divisa" className="block text-sm font-medium text-slate-700">
            Moneda
          </label>
          <select
            name="divisa"
            id="divisa"
            value={formData.divisa}
            onChange={handleChange}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm bg-white focus:border-red-500 focus:ring-1 focus:ring-red-500 outline-none"
            required
          >
            <option value="">Seleccione una moneda</option>
            <option value="USD">USD</option>
            <option value="Bs">Bs</option>
          </select>
        </div>

        {/* Tasa */}
        <div className="space-y-1">
          <label htmlFor="tasa" className="block text-sm font-medium text-slate-700">
            Tasa
          </label>
          <input
            type="number"
            name="tasa"
            required
            id="tasa"
            value={formData.tasa}
            onChange={handleChange}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-red-500 focus:ring-1 focus:ring-red-500 outline-none"
            step="any"
            min="0"
            placeholder="Ej: 40.5"
          />
        </div>

        {/* Monto */}
        <div className="space-y-1">
          <label htmlFor="monto" className="block text-sm font-medium text-slate-700">
            Monto
          </label>
          <input
            type="number"
            name="monto"
            id="monto"
            value={formData.monto}
            onChange={handleChange}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-red-500 focus:ring-1 focus:ring-red-500 outline-none"
            required
            onWheel={(e) => e.currentTarget.blur()}
          />
        </div>

        {/* Fecha */}
        <div className="space-y-1">
          <label htmlFor="fecha" className="block text-sm font-medium text-slate-700">
            Fecha
          </label>
          <input
            type="date"
            name="fecha"
            id="fecha"
            value={formData.fecha}
            onChange={handleChange}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-red-500 focus:ring-1 focus:ring-red-500 outline-none"
            required
          />
        </div>

        {/* Localidad */}
        <div className="space-y-1">
          <label htmlFor="localidad" className="block text-sm font-medium text-slate-700">
            Localidad
          </label>
          <select
            name="localidad"
            id="localidad"
            value={formData.localidad}
            onChange={handleChange}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm bg-white focus:border-red-500 focus:ring-1 focus:ring-red-500 outline-none"
            required
          >
            <option value="">Seleccione una opción</option>
            {localidades.map((loc) => (
              <option key={loc.id} value={loc.id}>
                {loc.nombre}
              </option>
            ))}
          </select>
        </div>

        {/* Imágenes */}
        <div className="space-y-2">
          <label className="block text-sm font-medium text-slate-700">
            Comprobante(s) del gasto (máx. 3)
          </label>
          <div className="flex flex-col gap-3">
            {[0, 1, 2].map((idx) => (
              <div key={idx} className="flex flex-col gap-2">
                <UpFileGasto
                  onUploadSuccess={(objectName: string) => {
                    setImagenesGasto((prev) => {
                      const newArr = [...prev];
                      newArr[idx] = objectName;
                      return newArr;
                    });
                  }}
                  label={`Adjuntar imagen ${idx + 1}`}
                  maxSizeMB={5}
                  initialFileUrl={imagenesGasto[idx] || undefined}
                />
                {imagenesGasto[idx] && (
                  <div className="relative inline-block">
                    <ImageDisplay
                      imageName={imagenesGasto[idx]!}
                      style={{
                        maxWidth: 180,
                        maxHeight: 180,
                        borderRadius: 8,
                        marginTop: 4,
                        boxShadow: "0 2px 8px rgba(0,0,0,0.06)",
                      }}
                    />
                    <button
                      type="button"
                      className="absolute top-2 right-2 bg-white/90 rounded-full p-1 shadow text-red-600 hover:bg-red-100 hover:text-red-700 transition-colors"
                      title="Eliminar imagen"
                      onClick={() => {
                        setImagenesGasto((prev) => {
                          const newArr = [...prev];
                          newArr[idx] = null;
                          return newArr;
                        });
                      }}
                    >
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        className="h-4 w-4"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Botón submit */}
        <div className="pt-2">
          <button
            type="submit"
            className="w-full bg-red-600 hover:bg-red-700 text-white text-sm font-medium py-2.5 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-red-500"
          >
            Guardar gasto
          </button>
        </div>
      </form>
    </div>
  );
};

export default AgregarGastos;
