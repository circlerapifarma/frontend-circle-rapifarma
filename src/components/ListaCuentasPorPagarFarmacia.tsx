import React, { useState } from "react";

interface Props {
  data: any[]; // Recibe los datos ya cargados y filtrados por fecha desde el padre
}

const ListaCuentasPorPagarFarmacia: React.FC<Props> = ({ data }) => {
  const [proveedorFiltro, setProveedorFiltro] = useState("");

  // Chip visual para el estado con mejores colores
  const EstadoChip: React.FC<{ estatus: string }> = ({ estatus }) => {
    const config: Record<string, string> = {
      wait: "bg-yellow-100 text-yellow-700 border-yellow-300",
      activa: "bg-blue-100 text-blue-700 border-blue-300",
      pagada: "bg-green-100 text-green-700 border-green-300",
      anulada: "bg-red-100 text-red-700 border-red-300",
      inactiva: "bg-red-100 text-red-700 border-red-300",
    };
    const style = config[estatus] || "bg-gray-100 text-gray-700 border-gray-300";
    
    return (
      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border shadow-sm ${style}`}>
        {estatus.toUpperCase()}
      </span>
    );
  };

  // Filtrado local por nombre de proveedor
  const cuentasFiltradas = data.filter((cuenta) =>
    cuenta.proveedor.toLowerCase().includes(proveedorFiltro.toLowerCase())
  );

  return (
    <div className="space-y-4">
      {/* Buscador interno por proveedor */}
      <div className="flex items-center gap-2">
        <input
          type="text"
          placeholder="Filtrar por proveedor en estos resultados..."
          value={proveedorFiltro}
          onChange={(e) => setProveedorFiltro(e.target.value)}
          className="w-full max-w-sm border border-slate-200 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white/50"
        />
        <span className="text-xs text-slate-500 font-medium">
          Mostrando {cuentasFiltradas.length} de {data.length}
        </span>
      </div>

      {cuentasFiltradas.length > 0 ? (
        <div className="overflow-x-auto rounded-xl border border-slate-200 shadow-sm">
          <table className="min-w-full bg-white/70 backdrop-blur-sm divide-y divide-slate-200">
            <thead className="bg-slate-50">
              <tr className="text-[10px] text-slate-500 uppercase tracking-wider text-left">
                <th className="px-3 py-3 font-bold">Factura</th>
                <th className="px-3 py-3 font-bold">Proveedor</th>
                <th className="px-3 py-3 font-bold text-right">Monto</th>
                <th className="px-3 py-3 font-bold text-center">Divisa</th>
                <th className="px-3 py-3 font-bold">F. Emisión</th>
                <th className="px-3 py-3 font-bold">F. Vencimiento</th>
                <th className="px-3 py-3 font-bold text-center">Estado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {cuentasFiltradas.map((cuenta) => (
                <tr key={cuenta._id} className="hover:bg-emerald-50/50 transition-colors">
                  <td className="px-3 py-3 font-mono text-xs text-slate-600">{cuenta.numeroFactura}</td>
                  <td className="px-3 py-3 text-xs font-medium text-slate-800">{cuenta.proveedor}</td>
                  <td className="px-3 py-3 text-xs font-bold text-right text-slate-900">
                    {Number(cuenta.monto).toLocaleString("es-VE", { minimumFractionDigits: 2 })}
                  </td>
                  <td className="px-3 py-3 text-[10px] font-bold text-center text-slate-500">
                    {cuenta.divisa}
                  </td>
                  <td className="px-3 py-3 font-mono text-[11px] text-slate-600">
                    {cuenta.fechaEmision}
                  </td>
                  <td className="px-3 py-3 font-mono text-[11px] text-slate-600">
                    {cuenta.fechaVencimiento}
                  </td>
                  <td className="px-3 py-3 text-center">
                    <EstadoChip estatus={cuenta.estatus} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="text-center py-12 bg-slate-50 border-2 border-dashed rounded-2xl">
          <p className="text-slate-400 text-sm">No se encontraron facturas con los filtros aplicados.</p>
        </div>
      )}
    </div>
  );
};

export default ListaCuentasPorPagarFarmacia;