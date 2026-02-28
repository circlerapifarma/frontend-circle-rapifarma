import React, { useMemo, useState } from "react";
import {
  MaterialReactTable,
  type MRT_ColumnDef,
  useMaterialReactTable,
} from "material-react-table";
import { FaCoins, FaChevronLeft, FaChevronRight } from "react-icons/fa";
import PagosDropdown from "@/components/PagosDropdown";
import ImageDisplay from "@/components/upfile/ImageDisplay";
import { Tooltip } from "@mui/material";
import type { CuentaPorPagar, Pago } from "./type";
import { useTipoCuentaService } from "./hooks/useTipoCuentaPorPagar";


interface TablaCuentasPorPagarProps {
  cuentasFiltradas: CuentaPorPagar[];
  pagosAprobadosPorCuenta: Record<string, { loading: boolean; pagos: Pago[] }>;
  cuentasParaPagar: any[]; // en tu page lo manejas como array
  handleToggleCuentaParaPagar: (cuenta: CuentaPorPagar) => void;
  handlePagosDropdownOpen: (open: boolean, cuenta: CuentaPorPagar) => void;
  handleEstadoChange: (id: string, value: string) => void;
  ESTATUS_OPCIONES: string[];
  formatFecha: (fecha: string) => string;
  calcularDiasRestantes: (fechaEmision: string, diasCredito: number) => number;
  abrirEdicionCuenta: (cuentaId: string) => void;
}

const TipoBadge: React.FC<{ tipo: string }> = ({ tipo }) => {
  const colores: Record<string, { bg: string; text: string }> = {
    traslado: { bg: "#DBEAFE", text: "#1E40AF" },
    pago_listo: { bg: "#ECFDF5", text: "#059669" },
    "cuenta_por_pagar": { bg: "#FEF3C7", text: "#B45309" },
    default: { bg: "#F3F4F6", text: "#6B7280" }
  };

  const estilo = colores[tipo] || colores.default;

  return (
    <span
      style={{
        padding: "2px 8px",
        borderRadius: 6,
        fontSize: 12,
        fontWeight: 600,
        backgroundColor: estilo.bg,
        color: estilo.text,
      }}
    >
      {tipo.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
    </span>
  );
};


const EstatusBadge: React.FC<{ estatus: string }> = ({ estatus }) => {
  let bg = "#E5E7EB";
  let color = "#374151";
  if (estatus === "anulada") {
    bg = "#FEE2E2";
    color = "#DC2626";
  } else if (estatus === "pagada") {
    bg = "#DCFCE7";
    color = "#16A34A";
  } else if (estatus === "pendiente") {
    bg = "#FEF3C7";
    color = "#CA8A04";
  }
  return (
    <span
      style={{
        padding: "2px 6px",
        borderRadius: 6,
        fontSize: 12,
        fontWeight: 600,
        backgroundColor: bg,
        color,
      }}
    >
      {estatus.charAt(0).toUpperCase() + estatus.slice(1)}
    </span>
  );
};

const TablaCuentasPorPagar: React.FC<TablaCuentasPorPagarProps> = ({
  cuentasFiltradas,
  // pagosAprobadosPorCuenta,
  cuentasParaPagar,
  handleToggleCuentaParaPagar,
  handlePagosDropdownOpen,
  handleEstadoChange,
  ESTATUS_OPCIONES,
  formatFecha,
  calcularDiasRestantes,
  abrirEdicionCuenta,
}) => {
  const [imagenesModalCuenta, setImagenesModalCuenta] = useState<{
    cuentaId: string | null;
    imagenes: string[];
    currentIndex: number;
    numeroFactura?: string;
  }>({ cuentaId: null, imagenes: [], currentIndex: 0 });
  const tipoService = useTipoCuentaService();

  const data = useMemo(
    () =>
      cuentasFiltradas
        .slice()
        .sort(
          (a, b) =>
            calcularDiasRestantes(a.fechaEmision, a.diasCredito) -
            calcularDiasRestantes(b.fechaEmision, b.diasCredito)
        ),
    [cuentasFiltradas, calcularDiasRestantes]
  );

  const columns = useMemo<MRT_ColumnDef<CuentaPorPagar>[]>(
    () => [
      {
        header: "Acciones",
        id: "acciones",
        enableSorting: false,
        size: 120,
        Cell: ({ row }) => {
          const c = row.original;
          const isSelected = (Array.isArray(cuentasParaPagar)
            ? cuentasParaPagar
            : []
          ).some(
            (sel) => sel.cuentaPorPagarId === c._id || sel._id === c._id
          );

          return (
            <div
              style={{
                display: "flex",
                justifyContent: "center",
                gap: 8,
                alignItems: "center",
              }}
            >
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  abrirEdicionCuenta(c._id);
                }}
                disabled={c.estatus === "pagada"}
                title="Preliminar de pago"
                style={{
                  padding: 8,
                  borderRadius: "999px",
                  background: "#FEF3C7",
                  color: "#A16207",
                  border: "none",
                  cursor:
                    c.estatus === "pagada" ? "not-allowed" : "pointer",
                  opacity: c.estatus === "pagada" ? 0.5 : 1,
                  boxShadow: "0 1px 3px #0002",
                }}
              >
                <FaCoins size={16} />
              </button>
              <input
                type="checkbox"
                checked={isSelected}
                onClick={(e) => e.stopPropagation()}
                onChange={() => handleToggleCuentaParaPagar(c)}
                disabled={c.estatus === "pagada"}
              />
            </div>
          );
        },
      },
      {
        header: "Imagen",
        id: "imagen",
        enableSorting: false,
        size: 90,
        Cell: ({ row }) => {
          const c = row.original as any;
          const imagenes = Array.isArray(c.imagenesCuentaPorPagar)
            ? c.imagenesCuentaPorPagar
            : [];
          if (!imagenes.length) return null;
          return (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setImagenesModalCuenta({
                  cuentaId: c._id,
                  imagenes,
                  currentIndex: 0,
                  numeroFactura: c.numeroFactura,
                });
              }}
              style={{
                padding: "4px 8px",
                borderRadius: 6,
                background: "#6366F1",
                color: "white",
                border: "none",
                fontSize: 11,
                fontWeight: 600,
                boxShadow: "0 1px 3px #0003",
                display: "inline-flex",
                alignItems: "center",
                gap: 4,
              }}
            >
              Ver Factura
            </button>
          );
        },
      },
      {
        header: "Pagos",
        id: "pagos",
        enableSorting: false,
        size: 120,
        Cell: ({ row }) => {
          const c = row.original;
          // En tu fila original transformas pagos, pero el dropdown solo necesita onOpen
          return (
            <PagosDropdown
              cuentaId={c._id}
              onOpenChange={(open: boolean) =>
                handlePagosDropdownOpen(open, c)
              }
              montoTotal={c.monto}
              monedaCuenta={c.divisa}
              tasaCuenta={c.tasa}
            />
          );
        },
      },
      {
        header: "Tipo",
        accessorKey: "tipo",
        size: 120,
        Cell: ({ row }) => {
          const c = row.original;
          return <TipoBadge tipo={c.tipo || "traslado"} />;
        },
      },
      {
        header: "Cambiar Tipo",
        id: "cambiarTipo",
        enableSorting: false,
        size: 150,
        Cell: ({ row }) => {
          const c = row.original;
          const TIPO_CUENTA_OPCIONES = [
            "traslado",
            "pago_listo",
            "cuenta_por_pagar"
          ] as const;
          return (
            <select
              value={c.tipo || "traslado"}
              onChange={async (e) => {
                const nuevoTipo = e.target.value as typeof TIPO_CUENTA_OPCIONES[number];
                if (nuevoTipo === c.tipo) return;

                try {
                  await tipoService.actualizarTipoCuenta(c._id, nuevoTipo);
                  // ✅ OPTIMISTIC UPDATE CORRECTO: actualizar cuentas padre
                  // Esto requiere que el padre pase una función de actualización
                } catch (err) {
                  console.error("Error actualizando tipo:", err);
                }
              }}
              className="border border-slate-300 rounded-md px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-400 bg-white"
              disabled={c.estatus === 'pagada'}
            >
              {TIPO_CUENTA_OPCIONES.map((tipo) => (
                <option key={tipo} value={tipo} disabled={tipo === c.tipo}>
                  {tipo.charAt(0).toUpperCase() + tipo.slice(1).replace('_', ' ')}
                </option>
              ))}
            </select>
          );
        },
      },

      {
        header: "Monto Bs",
        id: "montoBs",
        accessorFn: (row) =>
          row.divisa === "USD" ? row.monto * (row.tasa || 0) : row.monto,
        Cell: ({ cell, row }) => {
          const montoBs = cell.getValue<number>();
          const c = row.original;
          const montoUSD =
            c.divisa === "USD"
              ? c.monto
              : c.tasa
                ? c.monto / c.tasa
                : null;
          return (
            <div style={{ textAlign: "right" }}>
              <div style={{ fontWeight: 700 }}>
                {montoBs != null && !Number.isNaN(montoBs)
                  ? `Bs. ${montoBs.toLocaleString("es-VE", {
                    minimumFractionDigits: 4,
                    maximumFractionDigits: 4,
                  })}`
                  : "--"}
              </div>
              <div
                style={{
                  color: "#16A34A",
                  fontStyle: "italic",
                  fontSize: 13,
                }}
              >
                {montoUSD != null && !Number.isNaN(montoUSD)
                  ? `$${montoUSD.toLocaleString("en-US", {
                    minimumFractionDigits: 4,
                    maximumFractionDigits: 4,
                  })}`
                  : "Ref: --"}
              </div>
            </div>
          );
        },
      },
      {
        header: "Retención Bs",
        id: "retencion",
        accessorFn: (row) =>
          row.divisa === "USD"
            ? (row.retencion || 0) * (row.tasa || 0)
            : row.retencion || 0,
        Cell: ({ cell, row }) => {
          const c = row.original;
          const retencionBs = cell.getValue<number>();
          let retencionUSD: number | null = null;
          if (c.retencion != null) {
            retencionUSD =
              c.divisa === "USD"
                ? c.retencion
                : c.tasa
                  ? (c.retencion || 0) / c.tasa
                  : null;
          }
          return (
            <div style={{ textAlign: "right" }}>
              <div style={{ fontWeight: 700 }}>
                {c.retencion != null && !Number.isNaN(retencionBs)
                  ? `Bs. ${retencionBs.toLocaleString("es-VE", {
                    minimumFractionDigits: 4,
                    maximumFractionDigits: 4,
                  })}`
                  : "--"}
              </div>
              <div
                style={{
                  color: "#16A34A",
                  fontStyle: "italic",
                  fontSize: 13,
                }}
              >
                {retencionUSD != null && !Number.isNaN(retencionUSD)
                  ? `$ ${retencionUSD.toLocaleString("en-US", {
                    minimumFractionDigits: 4,
                    maximumFractionDigits: 4,
                  })}`
                  : "--"}
              </div>
            </div>
          );
        },
      },
      {
        header: "Tasa",
        accessorKey: "tasa",
        size: 80,
      },
      {
        header: "Divisa",
        accessorKey: "divisa",
        size: 80,
      },
      {
        header: "Días para Vencer",
        id: "diasParaVencer",
        size: 130,
        Cell: ({ row }) => {
          const c = row.original;
          const dias = calcularDiasRestantes(
            c.fechaEmision,
            c.diasCredito
          );
          let color = "#16A34A";
          if (dias <= 0) color = "#DC2626";
          else if (dias <= 5) color = "#CA8A04";
          return (
            <span style={{ color, fontWeight: 700 }}>
              {dias <= 0 ? "Vencida" : `${dias} días`}
            </span>
          );
        },
      },
      {
        header: "Fecha Emisión",
        accessorKey: "fechaEmision",
        Cell: ({ cell }) => {
          const value = cell.getValue<string>();
          return formatFecha(value);
        },
      },
      {
        header: "Recepción",
        accessorKey: "fechaRecepcion",
        Cell: ({ cell }) => formatFecha(cell.getValue<string>()),
      },
      {
        header: "Fecha Vencimiento",
        id: "fechaVencimiento",
        Cell: ({ row }) => {
          const c = row.original;
          const fechaEmision = new Date(c.fechaEmision);
          if (Number.isNaN(fechaEmision.getTime())) return "-";
          const fechaVenc = new Date(
            fechaEmision.getTime() +
            c.diasCredito * 24 * 60 * 60 * 1000
          );
          return formatFecha(fechaVenc.toISOString());
        },
      },
      {
        header: "Proveedor",
        accessorKey: "proveedor",
      },
      {
        header: "N° Factura",
        accessorKey: "numeroFactura",
      },
      {
        header: "N° Control",
        accessorKey: "numeroControl",
      },
      {
        header: "Descripción",
        accessorKey: "descripcion",
        size: 250,
        Cell: ({ cell }) => {
          const text = cell.getValue<string>() || "";
          const corto =
            text.length > 50 ? `${text.slice(0, 50)}…` : text;
          return (
            <Tooltip title={text} placement="top">
              <span
                style={{
                  cursor: "pointer",
                  textDecoration: "underline",
                  textDecorationStyle: "dotted",
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  display: "inline-block",
                  maxWidth: 220,
                }}
              >
                {corto}
              </span>
            </Tooltip>
          );
        },
      },
      {
        header: "Usuario",
        accessorKey: "usuarioCorreo",
        size: 160,
      },
      {
        header: "Farmacia",
        accessorKey: "farmacia",
        size: 140,
      },
      {
        header: "Estatus",
        accessorKey: "estatus",
        size: 110,
        Cell: ({ cell }) => <EstatusBadge estatus={cell.getValue<string>()} />,
      },
      {
        header: "Cambiar Estatus",
        id: "cambiarEstatus",
        enableSorting: false,
        size: 140,
        Cell: ({ row }) => {
          const c = row.original;
          return (
            <select
              value={c.estatus}
              onChange={(e) =>
                handleEstadoChange(c._id, e.target.value)
              }
              style={{
                border: "1px solid #CBD5F5",
                borderRadius: 6,
                padding: "4px 8px",
                fontSize: 12,
                backgroundColor: "white",
              }}
            >
              {ESTATUS_OPCIONES.map((opt) => (
                <option
                  key={opt}
                  value={opt}
                  disabled={opt === c.estatus}
                >
                  {opt.charAt(0).toUpperCase() + opt.slice(1)}
                </option>
              ))}
            </select>
          );
        },
      },
    ],
    [
      cuentasParaPagar,
      abrirEdicionCuenta,
      handleEstadoChange,
      handlePagosDropdownOpen,
      handleToggleCuentaParaPagar,
      formatFecha,
      calcularDiasRestantes,
      ESTATUS_OPCIONES,
    ]
  );

  const table = useMaterialReactTable({
    data,
    columns,
    enableStickyHeader: true,
    enableColumnResizing: true,
    enableRowSelection: false,
    enableHiding: true,
    meta: {
      tipoService,  // ✅ Pasar servicio a columnas
    },
    muiTableContainerProps: {
      sx: { maxHeight: "70vh" },
    },
    muiTableBodyRowProps: {
      sx: {
        "&:hover": {
          backgroundColor: "#FEF9C3",
        },
        cursor: "pointer",
      },
    },
  });

  const closeImagenesModal = () =>
    setImagenesModalCuenta({
      cuentaId: null,
      imagenes: [],
      currentIndex: 0,
    });

  const goPrev = () =>
    setImagenesModalCuenta((prev) => ({
      ...prev,
      currentIndex:
        prev.currentIndex > 0
          ? prev.currentIndex - 1
          : prev.imagenes.length - 1,
    }));

  const goNext = () =>
    setImagenesModalCuenta((prev) => ({
      ...prev,
      currentIndex:
        prev.currentIndex < prev.imagenes.length - 1
          ? prev.currentIndex + 1
          : 0,
    }));

  return (
    <>
      <MaterialReactTable table={table} />
      {imagenesModalCuenta.cuentaId &&
        imagenesModalCuenta.imagenes.length > 0 && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-opacity-70"
            onClick={closeImagenesModal}
            style={{
              backgroundColor: "rgba(0,0,0,0.5)",
            }}
          >
            <div
              onClick={(e) => e.stopPropagation()}
              style={{
                background: "white",
                borderRadius: 16,
                padding: 24,
                boxShadow: "0 10px 25px #0005",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                maxWidth: 520,
                width: "100%",
              }}
            >
              <button
                onClick={closeImagenesModal}
                style={{
                  position: "absolute",
                  top: 10,
                  right: 16,
                  fontSize: 26,
                  border: "none",
                  background: "transparent",
                  cursor: "pointer",
                  color: "#6B7280",
                }}
              >
                &times;
              </button>
              <div
                style={{
                  marginBottom: 8,
                  fontSize: 18,
                  fontWeight: 600,
                  color: "#4338CA",
                  textAlign: "center",
                }}
              >
                Factura: {imagenesModalCuenta.numeroFactura}
              </div>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  justifyContent: "center",
                }}
              >
                {imagenesModalCuenta.imagenes.length > 1 && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      goPrev();
                    }}
                    style={{
                      padding: 8,
                      borderRadius: "999px",
                      border: "none",
                      background: "#E5E7EB",
                      cursor: "pointer",
                      color: "#4338CA",
                    }}
                  >
                    <FaChevronLeft />
                  </button>
                )}
                <ImageDisplay
                  imageName={
                    imagenesModalCuenta.imagenes[
                    imagenesModalCuenta.currentIndex
                    ]
                  }
                  alt={`Factura ${imagenesModalCuenta.currentIndex + 1
                    }`}
                  style={{
                    maxWidth: 350,
                    maxHeight: 350,
                    borderRadius: 8,
                    border: "1px solid #D1D5DB",
                    boxShadow: "0 1px 4px #0002",
                  }}
                />
                {imagenesModalCuenta.imagenes.length > 1 && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      goNext();
                    }}
                    style={{
                      padding: 8,
                      borderRadius: "999px",
                      border: "none",
                      background: "#E5E7EB",
                      cursor: "pointer",
                      color: "#4338CA",
                    }}
                  >
                    <FaChevronRight />
                  </button>
                )}
              </div>
              {imagenesModalCuenta.imagenes.length > 1 && (
                <div
                  style={{
                    marginTop: 8,
                    fontSize: 12,
                    color: "#6B7280",
                  }}
                >
                  Imagen {imagenesModalCuenta.currentIndex + 1} de{" "}
                  {imagenesModalCuenta.imagenes.length}
                </div>
              )}
            </div>
          </div>
        )}
    </>
  );
};

export default TablaCuentasPorPagar;
