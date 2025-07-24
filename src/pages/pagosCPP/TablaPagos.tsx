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
                <TableHead>Banco Emisor</TableHead>
                <TableHead>Banco Receptor</TableHead>
                <TableHead>Monto</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead>Fotos Cuenta x Pagar</TableHead>
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
                    <TableCell>{pago.bancoEmisor}</TableCell>
                    <TableCell>{pago.bancoReceptor}</TableCell>
                    <TableCell>
                      {pago.montoDePago} {pago.monedaDePago}
                    </TableCell>
                    <TableCell>{pago.estado}</TableCell>
                    <TableCell>
                      <div>
                        {!open && (
                          <Button onClick={() => handleToggle(key)}>
                            Ver Comprobante
                          </Button>
                        )}
                        {open && (
                          <>
                            {Array.isArray(pago.imagenesCuentaPorPagar) &&
                            pago.imagenesCuentaPorPagar.length > 0 ? (
                              <div className="flex gap-2 flex-wrap">
                                {pago.imagenesCuentaPorPagar.map((img, idx) => {
                                  if (typeof img === "string") {
                                    return (
                                      <ImageDisplay
                                        key={img + idx}
                                        imageName={img}
                                        alt={`Cuenta por pagar ${idx + 1}`}
                                        style={{
                                          width: 48,
                                          height: 48,
                                          objectFit: "cover",
                                          borderRadius: 6,
                                          boxShadow: "0 0 2px #0002",
                                        }}
                                      />
                                    );
                                  } else if (
                                    img &&
                                    typeof img === "object" &&
                                    "url" in img
                                  ) {
                                    return (
                                      <ImageDisplay
                                        key={img.url + idx}
                                        imageName={img.url}
                                        alt={
                                          img.descripcion ||
                                          `Cuenta por pagar ${idx + 1}`
                                        }
                                        style={{
                                          width: 48,
                                          height: 48,
                                          objectFit: "cover",
                                          borderRadius: 6,
                                          boxShadow: "0 0 2px #0002",
                                        }}
                                      />
                                    );
                                  } else {
                                    return null;
                                  }
                                })}
                              </div>
                            ) : (
                              <span className="text-gray-400 text-xs">
                                Sin foto
                              </span>
                            )}
                          </>
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
