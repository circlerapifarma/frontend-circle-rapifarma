import React, { useState } from "react";

interface CuentaPorPagar {
  fechaEmision: string;
  fechaRecepcion: string;
  diasCredito: number;
  numeroFactura: string;
  numeroControl: string;
  proveedor: string;
  descripcion: string;
  monto: number;
  retencion: number;
  divisa: "USD" | "Bs";
  tasa: number;
  estatus: string;
  usuarioCorreo: string;
  farmacia: string;
}

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

const CuentasPorPagarPage: React.FC = () => {
  // Obtener usuario autenticado de localStorage
  const usuario = (() => {
    try {
      return JSON.parse(localStorage.getItem("usuario") || "null");
    } catch {
      return null;
    }
  })();

  // Obtener farmacias del usuario autenticado
  const farmaciasUsuario: Record<string, string> = usuario?.farmacias || {};
  const farmaciasArr = Object.entries(farmaciasUsuario);
  // Si solo tiene una farmacia, seleccionarla por defecto
  const [farmacia, setFarmacia] = useState(farmaciasArr.length === 1 ? farmaciasArr[0][0] : "");

  const [form, setForm] = useState<CuentaPorPagar>({
    fechaEmision: "",
    fechaRecepcion: "",
    diasCredito: 0,
    numeroFactura: "",
    numeroControl: "",
    proveedor: "",
    descripcion: "",
    monto: 0,
    retencion: 0,
    divisa: "USD",
    tasa: 0,
    estatus: "activa",
    usuarioCorreo: usuario?.correo || "",
    farmacia: ""
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setForm(prev => ({
      ...prev,
      [name]: name === "diasCredito" || name === "monto" || name === "retencion" ? Number(value) : value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setLoading(true);
    try {
      const payload = { ...form, usuarioCorreo: usuario?.correo || "", farmacia };
      // Obtener token JWT del localStorage (guardado como string plano bajo la key "token")
      const token = localStorage.getItem("token");
      if (!token) throw new Error("No se encontró el token de autenticación");
      const response = await fetch(`${API_BASE_URL}/cuentas-por-pagar`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.detail || "Error al registrar la cuenta por pagar");
      }
      setSuccess("Cuenta por pagar registrada exitosamente.");
      setForm({
        fechaEmision: "",
        fechaRecepcion: "",
        diasCredito: 0,
        numeroFactura: "",
        numeroControl: "",
        proveedor: "",
        descripcion: "",
        monto: 0,
        retencion: 0,
        divisa: "USD",
        tasa: 0,
        estatus: "activa",
        usuarioCorreo: usuario?.correo || "",
        farmacia: ""
      });
      setFarmacia(farmaciasArr.length === 1 ? farmaciasArr[0][0] : "");
    } catch (err: any) {
      setError(err.message || "Error al registrar la cuenta por pagar");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-xl mx-auto py-8 px-4">
      <h1 className="text-2xl font-bold text-blue-800 mb-6 text-center">Registrar Cuenta por Pagar</h1>
      {error && <div className="text-red-600 mb-4">{error}</div>}
      {success && <div className="text-green-600 mb-4">{success}</div>}
      <form onSubmit={handleSubmit} className="space-y-4 bg-blue-50 p-6 rounded-xl shadow">
        {/* Visualización del usuario autenticado */}
        <div>
          <label className="block text-sm font-medium text-gray-700">Correo usuario</label>
          <input type="text" value={usuario?.correo || ""} className="w-full border rounded px-2 py-1 bg-gray-100" disabled />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">Farmacia</label>
          <select name="farmacia" value={farmacia} onChange={e => setFarmacia(e.target.value)} className="w-full border rounded px-2 py-1" required>
            <option value="">Seleccione una farmacia</option>
            {farmaciasArr.map(([id, nombre]) => (
              <option key={id} value={id}>{nombre}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">Fecha de Emisión</label>
          <input type="date" name="fechaEmision" value={form.fechaEmision} onChange={handleChange} className="w-full border rounded px-2 py-1" required />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">Fecha de Recepción</label>
          <input type="date" name="fechaRecepcion" value={form.fechaRecepcion} onChange={handleChange} className="w-full border rounded px-2 py-1" required />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">Días de Crédito</label>
          <input type="number" name="diasCredito" value={form.diasCredito} onChange={handleChange} min={0} className="w-full border rounded px-2 py-1" required onWheel={e => e.currentTarget.blur()} />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">Número de Factura</label>
          <input type="text" name="numeroFactura" value={form.numeroFactura} onChange={handleChange} className="w-full border rounded px-2 py-1" required />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">Número de Control</label>
          <input type="text" name="numeroControl" value={form.numeroControl} onChange={handleChange} className="w-full border rounded px-2 py-1" required />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">Proveedor</label>
          <input type="text" name="proveedor" value={form.proveedor} onChange={handleChange} className="w-full border rounded px-2 py-1" required />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">Descripción</label>
          <textarea name="descripcion" value={form.descripcion} onChange={handleChange} className="w-full border rounded px-2 py-1" required />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">Monto a Pagar</label>
          <input type="number" name="monto" value={form.monto} onChange={handleChange} min={0} step="0.01" className="w-full border rounded px-2 py-1" required onWheel={e => e.currentTarget.blur()} />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">Retención</label>
          <input type="number" name="retencion" value={form.retencion} onChange={handleChange} min={0} step="0.01" className="w-full border rounded px-2 py-1" required onWheel={e => e.currentTarget.blur()} />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">Divisa</label>
          <select name="divisa" value={form.divisa} onChange={handleChange} className="w-full border rounded px-2 py-1">
            <option value="USD">Dólares</option>
            <option value="Bs">Bolívares</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">Tasa</label>
          <input type="number" name="tasa" value={form.tasa} onChange={handleChange} min={0} step="0.01" className="w-full border rounded px-2 py-1" required onWheel={e => e.currentTarget.blur()} />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">Estatus</label>
          <select name="estatus" value={form.estatus} onChange={handleChange} className="w-full border rounded px-2 py-1">
            <option value="activa">Activa</option>
            <option value="inactiva">Inactiva</option>
          </select>
        </div>
        <button type="submit" className="bg-blue-600 text-white px-4 py-2 rounded w-full mt-2" disabled={loading}>
          {loading ? "Guardando..." : "Registrar"}
        </button>
      </form>
    </div>
  );
};

export default CuentasPorPagarPage;
