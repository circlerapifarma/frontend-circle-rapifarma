import React from "react";
import type { Pago } from "./pagosTypes";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableCell,
  TableHead,
} from "@/components/ui/table";
import ImageDisplay from "@/components/upfile/ImageDisplay";
import { Button } from "@/components/ui/button";
import { useState } from "react";


const FARMACIAS: Record<string, string> = {
  "01": "Santa Elena",
  "02": "Sur America",
  "03": "Rapifarma",
  "04": "San Carlos",
  "05": "Las Alicias",
  "06": "San Martin",
  "07": "Milagro Norte",
};

interface TablaPagosProps {
  pagos: Pago[];
}


// Agrupa los pagos por el campo imagenPago
function agruparPorImagenPago(pagos: Pago[]): Record<string, Pago[]> {
  return pagos.reduce((acc: Record<string, Pago[]>, pago) => {
    const key = pago.imagenPago || "Sin comprobante";
    if (!acc[key]) acc[key] = [];
    acc[key].push(pago);
    return acc;
  }, {} as Record<string, Pago[]>);
}




const TablaPagos: React.FC<TablaPagosProps> = ({ pagos }) => {

  // Estado para toggles por pago (por id o referencia)
  const [openMap, setOpenMap] = useState<Record<string, boolean>>({});

  // Estado para filtro de proveedor
  const [proveedorFiltro, setProveedorFiltro] = useState<string>("");

  const handleToggle = (key: string) => {
    setOpenMap((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  // Filtrar pagos por coincidencia parcial de proveedor
  const pagosFiltrados = proveedorFiltro.trim()
    ? pagos.filter(p =>
        p.proveedor && p.proveedor.toLowerCase().includes(proveedorFiltro.trim().toLowerCase())
      )
    : pagos;

  // Calcular totales generales de los pagos filtrados
  const totalGeneralBs = pagosFiltrados
    .filter(p => p.monedaDePago && p.monedaDePago.toLowerCase() === "bs")
    .reduce((acc, p) => acc + (typeof p.montoDePago === "number" ? p.montoDePago : parseFloat(p.montoDePago)), 0);
  const totalGeneralUsd = pagosFiltrados
    .filter(p => p.monedaDePago && p.monedaDePago.toLowerCase() === "usd")
    .reduce((acc, p) => acc + (typeof p.montoDePago === "number" ? p.montoDePago : parseFloat(p.montoDePago)), 0);

  const pagosAgrupados = agruparPorImagenPago(pagosFiltrados);

  return (
    <div className="overflow-x-auto">
      <div style={{ marginBottom: 16, display: 'flex', alignItems: 'center', gap: 32 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <label style={{ fontWeight: 500 }}>Filtrar por proveedor:</label>
          <input
            type="text"
            value={proveedorFiltro}
            onChange={e => setProveedorFiltro(e.target.value)}
            placeholder="Escribe el nombre del proveedor..."
            style={{ padding: "4px 8px", borderRadius: 4, minWidth: 220 }}
          />
        </div>
        <div style={{ fontWeight: 500, fontSize: 15 }}>
          <span style={{ marginRight: 24 }}>
            Total General Bs: <span style={{ color: '#1a7f37' }}>{totalGeneralBs.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
          </span>
          <span>
            Total General USD: <span style={{ color: '#1a56db' }}>{totalGeneralUsd.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
          </span>
        </div>
      </div>
      {Object.entries(pagosAgrupados).map(([imagen, pagosGrupo]) => {
        // Calcular totales por moneda
        const totalBs = pagosGrupo
          .filter(p => p.monedaDePago && p.monedaDePago.toLowerCase() === "bs")
          .reduce((acc, p) => acc + (typeof p.montoDePago === "number" ? p.montoDePago : parseFloat(p.montoDePago)), 0);
        const totalUsd = pagosGrupo
          .filter(p => p.monedaDePago && p.monedaDePago.toLowerCase() === "usd")
          .reduce((acc, p) => acc + (typeof p.montoDePago === "number" ? p.montoDePago : parseFloat(p.montoDePago)), 0);

        return (
          <div key={imagen} className="mb-8">
            <div className="flex items-center gap-4 mb-2">
              {imagen !== "Sin comprobante" ? (
                <div className="w-20 h-20 flex items-center justify-center">
                  <ImageDisplay
                    imageName={imagen}
                    alt="Comprobante"
                    style={{
                      width: 80,
                      height: 80,
                      objectFit: "contain",
                      borderRadius: 8,
                      boxShadow: "0 0 4px #0002",
                    }}
                  />
                </div>
              ) : (
                <span className="text-gray-500 italic">Sin comprobante</span>
              )}
              <span className="font-semibold text-lg">
                Pagos ({pagosGrupo.length})
              </span>
            </div>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Fecha</TableHead>
                  <TableHead>Usuario</TableHead>
                  <TableHead>Referencia</TableHead>
                <TableHead>Proveedor</TableHead>
                <TableHead>Farmacia</TableHead>
                <TableHead>N° Factura</TableHead>
                <TableHead>Tasa (Original / Pago)</TableHead>
                <TableHead>Monto</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead>Comprobante</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pagosGrupo.map((pago) => {
                  const key = pago._id || pago.referencia;
                  const open = !!openMap[key];
                  return (
                    <TableRow key={key}>
                      <TableCell>{pago.fecha}</TableCell>
                      <TableCell>{pago.usuario}</TableCell>
                      <TableCell>{pago.referencia}</TableCell>
                    <TableCell>{pago.proveedor}</TableCell>
                    <TableCell>{FARMACIAS[pago.farmaciaId] || pago.farmaciaId}</TableCell>
                    <TableCell>{pago.numeroFactura}</TableCell>
                    <TableCell>
                      <span style={{ fontWeight: 500 }}>
                        {pago.tasaOriginal ?? '-'} / {pago.tasaDePago ?? '-'}
                      </span>
                    </TableCell>
                    <TableCell>{pago.montoDePago} {pago.monedaDePago}</TableCell>
                    <TableCell>{pago.estado}</TableCell>
                    <TableCell>
                        <div>
                          {!open && imagen !== "Sin comprobante" && (
                            <Button onClick={() => handleToggle(key)}>
                              Ver Comprobante
                            </Button>
                          )}
                          {open && imagen !== "Sin comprobante" && (
                            <ImageDisplay
                              imageName={imagen}
                              alt="Comprobante"
                              style={{
                                width: 48,
                                height: 48,
                                objectFit: "cover",
                                borderRadius: 6,
                                boxShadow: "0 0 2px #0002",
                              }}
                            />
                          )}
                          {imagen === "Sin comprobante" && (
                            <span className="text-gray-400 text-xs">Sin comprobante</span>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
            <div style={{ marginTop: 8, fontWeight: 500, fontSize: 15 }}>
              <span style={{ marginRight: 24 }}>
                Total Bs: <span style={{ color: '#1a7f37' }}>{totalBs.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
              </span>
              <span>
                Total USD: <span style={{ color: '#1a56db' }}>{totalUsd.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default TablaPagos;
