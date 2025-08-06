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
  const pagosAgrupados = agruparPorImagenPago(pagos);
  // Estado para toggles por pago (por id o referencia)
  const [openMap, setOpenMap] = useState<Record<string, boolean>>({});

  const handleToggle = (key: string) => {
    setOpenMap((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  return (
    <div className="overflow-x-auto">
      {Object.entries(pagosAgrupados).map(([imagen, pagosGrupo]) => (
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
        </div>
      ))}
    </div>
  );
};

export default TablaPagos;
