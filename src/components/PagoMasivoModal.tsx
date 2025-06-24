import React, { useRef, useEffect, useState } from "react";
import { FaMoneyCheckAlt, FaTimes } from "react-icons/fa";
import { animate } from "animejs";
import UpFile from "./upfile/UpFilePagosCPP";

// Los tipos y props ahora igual que AbonoModal
export interface PagoMasivoFormData {
  fecha: string;
  moneda: 'USD' | 'Bs';
  monto: number;
  referencia: string;
  usuario: string;
  bancoEmisor: string;
  bancoReceptor: string;
  tasa?: number;
  imagenPago?: string;
  farmaciaId: string;
  estado: 'cancelada' | 'aprobado' | 'en_espera';
  cuentaPorPagarId?: string;
}

interface PagoMasivoModalProps {
  open: boolean;
  onClose: () => void;
  facturaIds: string[];
  cuentas: any[]; // Puede ser CuentaPorPagar extendido
  onSubmit: (data: PagoMasivoFormData) => void;
  loading: boolean;
  error: string | null;
  monedaConversion: 'USD' | 'Bs';
  setMonedaConversion: (moneda: 'USD' | 'Bs') => void;
}

const PagoMasivoModal: React.FC<PagoMasivoModalProps> = ({ open, onClose, facturaIds, cuentas, onSubmit, loading, error, monedaConversion, setMonedaConversion }) => {
  const [form, setForm] = useState<PagoMasivoFormData>({
    fecha: new Date().toISOString().slice(0, 10),
    moneda: monedaConversion,
    monto: 0,
    referencia: "",
    usuario: "",
    bancoEmisor: "",
    bancoReceptor: "",
    tasa: undefined,
    imagenPago: undefined,
    farmaciaId: cuentas[0]?.farmacia || "",
    estado: 'aprobado',
    cuentaPorPagarId: undefined,
  });
  const [imagenPago, setImagenPago] = useState<string>("");
  const modalRef = useRef<HTMLDivElement>(null);

  // Calcula el monto total según la moneda seleccionada y la tasa de cada cuenta
  useEffect(() => {
    if (facturaIds.length > 0 && cuentas.length > 0) {
      let total = 0;
      if (form.moneda === "Bs") {
        total = cuentas.filter(c => facturaIds.includes(c._id)).reduce((acc, c) => acc + c.monto, 0);
      } else if (form.moneda === "USD") {
        total = cuentas.filter(c => facturaIds.includes(c._id)).reduce((acc, c) => {
          if (c.tasa && c.tasa > 0) {
            return acc + (c.monto / c.tasa);
          }
          return acc;
        }, 0);
      }
      setForm(f => ({ ...f, monto: Number(total.toFixed(2)) }));
    }
  }, [facturaIds, cuentas, form.moneda]);

  useEffect(() => {
    if (open && modalRef.current) {
      animate(modalRef.current, {
        opacity: [0, 1],
        scale: [0.95, 1],
        duration: 350,
        ease: "outCubic",
      });
    }
  }, [open]);

  // Sincroniza el form.moneda con la moneda global
  useEffect(() => {
    setForm(f => ({ ...f, moneda: monedaConversion }));
  }, [monedaConversion]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setForm(f => ({ ...f, [name]: name === "monto" || name === "tasa" ? Number(value) : value }));
  };

  const handleMonedaChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const { value } = e.target;
    setForm(f => ({ ...f, moneda: value as 'USD' | 'Bs' }));
    setMonedaConversion(value as 'USD' | 'Bs');
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({ ...form, imagenPago });
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-white bg-opacity-40 backdrop-blur-sm">
      <div
        ref={modalRef}
        className="bg-white rounded-xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto p-6 relative border-2 border-green-600 animate-fade-in"
      >
        <button className="absolute top-3 right-4 text-2xl text-gray-400 hover:text-red-600" onClick={onClose}>
          <FaTimes />
        </button>
        <h2 className="text-2xl font-bold text-green-700 mb-4 flex items-center gap-2">
          <FaMoneyCheckAlt /> Registrar Pago Masivo
        </h2>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex gap-2">
            <div className="flex-1">
              <label className="block text-sm font-medium text-slate-700 mb-1">Fecha</label>
              <input type="date" name="fecha" value={form.fecha} onChange={handleChange} className="w-full border-slate-300 rounded-md shadow-sm py-2 px-3 text-sm" required />
            </div>
            <div className="flex-1">
              <label className="block text-sm font-medium text-slate-700 mb-1">Moneda</label>
              <select name="moneda" value={form.moneda} onChange={handleMonedaChange} className="w-full border-slate-300 rounded-md shadow-sm py-2 px-3 text-sm">
                <option value="Bs">Bs</option>
                <option value="USD">USD</option>
              </select>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Monto total</label>
            <input type="number" name="monto" value={form.monto} onChange={handleChange} min="0" step="0.01" required className="w-full border-slate-300 rounded-md shadow-sm py-2 px-3 text-sm" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Referencia</label>
            <input type="text" name="referencia" value={form.referencia} onChange={handleChange} className="w-full border-slate-300 rounded-md shadow-sm py-2 px-3 text-sm" required />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Usuario</label>
            <input type="text" name="usuario" value={form.usuario} onChange={handleChange} className="w-full border-slate-300 rounded-md shadow-sm py-2 px-3 text-sm" required />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Banco Emisor</label>
            <input type="text" name="bancoEmisor" value={form.bancoEmisor} onChange={handleChange} className="w-full border-slate-300 rounded-md shadow-sm py-2 px-3 text-sm" required />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Banco Receptor</label>
            <input type="text" name="bancoReceptor" value={form.bancoReceptor} onChange={handleChange} className="w-full border-slate-300 rounded-md shadow-sm py-2 px-3 text-sm" required />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Tasa</label>
            <input type="number" name="tasa" value={form.tasa ?? ''} onChange={handleChange} min="0" step="0.0001" required className="w-full border-slate-300 rounded-md shadow-sm py-2 px-3 text-sm" />
          </div>
          <UpFile
            label="Agregar imagen de pago"
            allowedFileTypes={["image/*"]}
            onUploadSuccess={setImagenPago}
          />
          {error && <div className="text-red-600 text-sm text-center">{error}</div>}
          <div className="flex justify-end gap-3 mt-2">
            <button type="button" onClick={onClose} className="px-5 py-2 rounded-md bg-slate-200 text-slate-700 hover:bg-slate-300 font-medium">Cancelar</button>
            <button type="submit" className="px-5 py-2 rounded-md bg-green-600 text-white font-semibold hover:bg-green-700 transition-all" disabled={loading}>
              {loading ? "Registrando..." : "Registrar Pago"}
            </button>
          </div>
        </form>
        <div className="mt-4">
          <h3 className="text-sm font-semibold text-slate-700 mb-1">Facturas seleccionadas:</h3>
          <ul className="text-xs text-slate-600 max-h-24 overflow-y-auto list-disc pl-5">
            {cuentas.filter(c => facturaIds.includes(c._id)).map(c => (
              <li key={c._id}>
                {c.numeroFactura} - {c.proveedor} - {form.moneda === 'Bs'
                  ? c.monto.toLocaleString("es-VE", { style: "currency", currency: "VES" })
                  : c.tasa && c.tasa > 0
                    ? (c.monto / c.tasa).toLocaleString("en-US", { style: "currency", currency: "USD" })
                    : "-"}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
};

export default PagoMasivoModal;
