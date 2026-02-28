import { useEffect, useState, useMemo, useRef } from "react";
import ImageDisplay from "../components/upfile/ImageDisplay";
import type { MRT_ColumnDef } from 'material-react-table';
import { MaterialReactTable, useMaterialReactTable } from 'material-react-table';
import { MRT_Localization_ES } from 'material-react-table/locales/es';
import ImageDisplay2 from "@/components/upfile/ImageDisplay2";
import { getPresignedUrl } from "@/components/upfile/UpFileGasto";
import { mkConfig, generateCsv, download } from 'export-to-csv';
import { Box, Button } from '@mui/material';
import { FileDownload as FileDownloadIcon } from '@mui/icons-material';

const csvConfig = mkConfig({
  fieldSeparator: ',',
  decimalSeparator: '.',
  useKeysAsHeaders: true,
  filename: `Reporte_Gastos_${new Date().toISOString().split('T')[0]}`,
});

interface Gasto {
  _id: string;
  titulo: string;
  descripcion: string;
  monto: number;
  fecha: string; // Fecha de gasto (ej: "2025-06-23")
  fechaRegistro?: string | number | { $date: { $numberLong: string } }; // Puede venir como ISO, timestamp o formato Mongo
  estado: string; // "wait", "verified", "denied"
  localidad: string;
  divisa?: string;
  tasa?: number;
  imagenGasto?: string;
  imagenesGasto?: string[];
}

interface FarmaciaChip {
  id: string;
  nombre: string;
}

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;
const ESTADO_OPCIONES = ["wait", "verified", "denied"];

function formatFecha(fechaISO: string, fechaRegistro?: any) {
  // Si hay fechaRegistro y es un objeto Mongo, usarla para mostrar fecha y hora
  if (fechaRegistro && typeof fechaRegistro === 'object' && fechaRegistro.$date && fechaRegistro.$date.$numberLong) {
    const date = new Date(Number(fechaRegistro.$date.$numberLong));
    return date.toLocaleString('es-VE', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }
  // Si es string o timestamp
  if (fechaRegistro && (typeof fechaRegistro === 'string' || typeof fechaRegistro === 'number')) {
    const date = new Date(fechaRegistro);
    return date.toLocaleString('es-VE', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }
  // Fallback: solo fecha simple
  const date = new Date(fechaISO);
  return date.toLocaleDateString('es-VE', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

// Componente Badge para el estado del gasto
const EstadoGastoBadge: React.FC<{ estado: string }> = ({ estado }) => {
  let colorClasses = "";
  let textoEstado = estado;

  switch (estado?.toLowerCase()) {
    case "wait":
      colorClasses = "bg-yellow-100 text-yellow-800";
      textoEstado = "En Espera";
      break;
    case "verified":
      colorClasses = "bg-green-100 text-green-800";
      textoEstado = "Verificado";
      break;
    case "denied":
      colorClasses = "bg-red-100 text-red-800";
      textoEstado = "Rechazado";
      break;
    default:
      colorClasses = "bg-slate-100 text-slate-800";
      textoEstado = estado?.charAt(0).toUpperCase() + estado?.slice(1);
  }
  return (
    <span className={`px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${colorClasses}`}>
      {textoEstado}
    </span>
  );
};

const apiFetch = async (endpoint: string, options: RequestInit = {}) => {
  const token = localStorage.getItem("token");
  const headers: HeadersInit = {
    ...options.headers,
    "Content-Type": "application/json",
    ...(token ? { "Authorization": `Bearer ${token}` } : {}),
  };
  const res = await fetch(`${API_BASE_URL}${endpoint}`, { ...options, headers });
  if (!res.ok) throw new Error("Error en la petición");
  return res.json();
};

const VisualizarGastosFarmaciaPage: React.FC = () => {
  const [gastos, setGastos] = useState<Gasto[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [farmacias, setFarmacias] = useState<FarmaciaChip[]>([]);
  const [selectedFarmacia, setSelectedFarmacia] = useState<string>("");
  const [estadoFiltro, setEstadoFiltro] = useState<string>("");
  const [fechaInicio, setFechaInicio] = useState<string>("");
  const [fechaFin, setFechaFin] = useState<string>("");
  const [success, setSuccess] = useState<string | null>(null);
  const [confirmDialog, setConfirmDialog] = useState<{ open: boolean; gastoId: string | null; nuevoEstado: string }>({ open: false, gastoId: null, nuevoEstado: "" });
  const [imagenAmpliada, setImagenAmpliada] = useState<{ imagenes: string[], index: number } | null>(null);
  const fetchGastos = async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (selectedFarmacia) params.append("localidad", selectedFarmacia);
      if (fechaInicio) params.append("fecha_inicio", fechaInicio);
      if (fechaFin) params.append("fecha_fin", fechaFin);

      const data = await apiFetch(`/gastos?${params.toString()}`);
      setGastos(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleExportData = () => {
    const exportData = gastosFiltrados.map((g) => {
      const monto = g.monto || 0;
      const tasa = g.tasa || 1;

      // Calculamos los valores para que el Excel sea informativo
      const montoBs = g.divisa === 'Bs' ? monto : monto * tasa;
      const montoUSD = g.divisa === 'USD' ? monto : monto / tasa;

      return {
        'Fecha Gasto': g.fecha,
        'Título': g.titulo,
        'Descripción': g.descripcion,
        'Farmacia/Localidad': g.localidad,
        'Monto Original': monto,
        'Moneda': g.divisa,
        'Tasa Cambio': tasa,
        'Equivalente Bs': montoBs.toFixed(2),
        'Equivalente USD': montoUSD.toFixed(2),
        'Estado': g.estado === 'verified' ? 'Verificado' : g.estado === 'wait' ? 'Espera' : 'Rechazado',
      };
    });

    const csv = generateCsv(csvConfig)(exportData);
    download(csvConfig)(csv);
  };

  const handleEstadoSelect = (gastoId: string, nuevoEstado: string) => {
    setConfirmDialog({ open: true, gastoId, nuevoEstado });
  };

  const handleConfirmChange = async () => {
    if (!confirmDialog.gastoId) return;
    setError(null);
    try {
      const token = localStorage.getItem("token"); // Asumiendo que usas token
      const headers: HeadersInit = { "Content-Type": "application/json" };
      if (token) {
        headers["Authorization"] = `Bearer ${token}`;
      }

      const res = await fetch(`${API_BASE_URL}/gastos/estado`, {
        method: "PATCH",
        headers: headers,
        body: JSON.stringify({ id: confirmDialog.gastoId, estado: confirmDialog.nuevoEstado })
      });
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({ message: "Error desconocido al actualizar estado" }));
        throw new Error(errorData.detail || errorData.message || "Error al actualizar el estado del gasto");
      }
      setGastos(prev => prev.map(g => g._id === confirmDialog.gastoId ? { ...g, estado: confirmDialog.nuevoEstado } : g));
      setSuccess("Estado actualizado correctamente");
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      setError(err.message || "Error al actualizar el estado del gasto");
      setTimeout(() => setError(null), 5000);
    } finally {
      setConfirmDialog({ open: false, gastoId: null, nuevoEstado: "" });
    }
  };

  const handleCancelChange = () => {
    setConfirmDialog({ open: false, gastoId: null, nuevoEstado: "" });
  };

  const gastosFiltrados = useMemo(() => {
    return gastos
      .filter(g => {
        const matchEstado = !estadoFiltro || g.estado?.toLowerCase() === estadoFiltro.toLowerCase();
        return matchEstado;
      })
      .sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime());
  }, [gastos, estadoFiltro]);

  // Memorizamos los totales
  const { totalUSD, totalBs } = useMemo(() => {
    return gastosFiltrados.reduce((acc, g) => {
      const monto = g.monto || 0;
      const tasa = g.tasa || 1;

      if (g.divisa === 'Bs') {
        acc.totalBs += monto;
        acc.totalUSD += (monto / tasa);
      } else {
        acc.totalUSD += monto;
        acc.totalBs += (monto * tasa);
      }
      return acc;
    }, { totalUSD: 0, totalBs: 0 });
  }, [gastosFiltrados]);

  const [presignedMap, setPresignedMap] = useState<Record<string, string>>({});

  const getImageUrlFor = async (imageName: string) => {
    // 1) si ya está en cache, devolverla
    if (presignedMap[imageName]) return presignedMap[imageName];

    const url = await getPresignedUrl(imageName, "get_object");
    setPresignedMap(prev => ({ ...prev, [imageName]: url }));
    return url;
  };

  const useGastoColumns = (
    setImagenAmpliada: (data: { imagenes: string[]; index: number }) => void,
    handleEstadoSelect: (id: string, nuevoEstado: string) => void
  ) => {
    return useMemo<MRT_ColumnDef<Gasto>[]>(
      () => [
        {
          accessorKey: 'imagenesGasto', // Podemos usar este o imagenGasto
          header: 'Imagen',
          size: 120,
          enableResizing: false,    // <--- No se puede estirar
          enableColumnFilter: false, // <--- No se puede filtrar
          enableSorting: false,      // <--- No se puede ordenar
          // en la definición de columnas
          Cell: ({ row }) => {
            const g = row.original;
            const imagenes = Array.isArray(g.imagenesGasto) && g.imagenesGasto.length > 0
              ? g.imagenesGasto
              : g.imagenGasto ? [g.imagenGasto] : [];

            if (imagenes.length === 0) return <span className="text-slate-400 text-xs">Sin imagen</span>;

            return (
              <ImageDisplay2
                imageName={imagenes[0]}
                alt="Imagen gasto"
                style={{ height: 40, width: 40, objectFit: 'cover', borderRadius: 8, cursor: 'pointer' }}
                onClickImage={() => setImagenAmpliada({ imagenes, index: 0 })}
                // nueva prop
                resolveUrl={getImageUrlFor}
              />
            );
          },

        },
        {
          accessorKey: 'fecha',
          header: 'Fecha',
          Cell: ({ cell }) => formatFecha(cell.getValue<string>()),
        },
        {
          id: 'fechaRegistro',
          header: 'Fecha R.',
          Cell: ({ row }) => formatFecha(row.original.fecha, row.original.fechaRegistro),
        },
        {
          accessorKey: 'titulo',
          header: 'Título',
          muiTableBodyCellProps: { sx: { fontWeight: 'bold' } },
        },
        {
          accessorKey: 'descripcion',
          header: 'Descripción',
          enableTooltip: true, // MRT ya maneja tooltips básicos o puedes personalizar
          Cell: ({ cell }) => (
            <div className="max-w-md truncate" title={cell.getValue<string>()}>
              {cell.getValue<string>()}
            </div>
          ),
        },
        {
          accessorKey: 'monto',
          header: 'Monto',
          muiTableBodyCellProps: { align: 'right' },
          Cell: ({ cell }) =>
            cell.getValue<number>().toLocaleString('es-VE', {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2
            }),
        },
        {
          accessorKey: 'divisa',
          header: 'Moneda',
          Cell: ({ cell }) => cell.getValue<string>() || '-',
        },
        {
          accessorKey: 'tasa',
          header: 'Tasa',
          Cell: ({ cell }) => cell.getValue<number>() || '-',
        },
        {
          accessorKey: 'estado',
          header: 'Estado',
          Cell: ({ cell }) => <EstadoGastoBadge estado={cell.getValue<string>()} />,
        },
        {
          id: 'acciones',
          header: 'Acción',
          Cell: ({ row }) => (
            <select
              value={row.original.estado}
              onChange={(e) => handleEstadoSelect(row.original._id, e.target.value)}
              className="border-slate-300 rounded-md py-1 px-2 text-xs"
            >
              {ESTADO_OPCIONES.map((opt) => (
                <option key={opt} value={opt}>
                  {opt.charAt(0).toUpperCase() + opt.slice(1)}
                </option>
              ))}
            </select>
          ),
        },
      ],
      [setImagenAmpliada, handleEstadoSelect]
    );
  };
  const columns = useGastoColumns(setImagenAmpliada, handleEstadoSelect);
  const table = useMaterialReactTable({
    columns,
    data: gastosFiltrados, // Tus datos
    enableColumnResizing: true,
    enableColumnOrdering: true,
    enablePagination: true,
    localization: MRT_Localization_ES, // Para que esté en español  
    initialState: { density: 'compact' },


    renderBottomToolbarCustomActions: () => (
    <Box sx={{ display: 'flex', gap: '1rem', p: '4px' }}>
      <Button
        onClick={handleExportData}
        startIcon={<FileDownloadIcon />}
        variant="contained"
        sx={{
          backgroundColor: '#b91c1c', // Rojo para combinar con tu diseño
          '&:hover': { backgroundColor: '#991b1b' }
        }}
      >
        Exportar (csv)
      </Button>
    </Box>
  ),
    // Estilos personalizados para mantener tu estética de "rojo"
    muiTableHeadCellProps: {
      sx: {
        backgroundColor: '#fef2f2', // bg-red-50
        color: '#b91c1c',           // text-red-700
        fontWeight: 'bold',
        textTransform: 'uppercase',
        fontSize: '0.75rem',
      },
    },
    muiTablePaperProps: {
      elevation: 0,
      sx: { borderRadius: '8px', border: '1px solid #e2e8f0' }
    }
  });


  useEffect(() => {
    const now = new Date();

    // hoy como fin
    const lastDay = now;

    // hace 6 días como inicio
    const firstDay = new Date(now);
    firstDay.setDate(now.getDate() - 6);

    setFechaInicio(firstDay.toISOString().slice(0, 10));
    setFechaFin(lastDay.toISOString().slice(0, 10));


    const usuarioRaw = localStorage.getItem("usuario");
    if (usuarioRaw) {
      try {
        const usuario = JSON.parse(usuarioRaw);
        const farmaciasObj = usuario.farmacias || {};
        const farmaciasArr = Object.entries(farmaciasObj).map(([id, nombre]) => ({ id, nombre: String(nombre) }));
        setFarmacias(farmaciasArr);
        if (farmaciasArr.length === 1) { // Si solo hay una farmacia, seleccionarla por defecto
          setSelectedFarmacia(farmaciasArr[0].id);
        }
      } catch {
        setFarmacias([]);
      }
    }
  }, []);

  useEffect(() => {
    // Solo llamar a fetchGastos si las fechas están seteadas (evita llamadas iniciales sin fechas)
    // y si hay farmacias o no se requiere una farmacia seleccionada para la primera carga
    if (fechaInicio && fechaFin && (farmacias.length === 0 || farmacias.length > 1 || selectedFarmacia)) {
      fetchGastos();
    }
  }, [selectedFarmacia, fechaInicio, fechaFin, farmacias]); // Añadir farmacias a las dependencias

  const [showFarmacias, setShowFarmacias] = useState(false);
  const farmaciaRef = useRef<HTMLDivElement>(null);

  // Cerrar popover al hacer click fuera
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (farmaciaRef.current && !farmaciaRef.current.contains(event.target as Node)) {
        setShowFarmacias(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className="h-1 bg-slate-50 py-8">
      <div className="w-full mx-auto px-4 sm:px-6 lg:px-8">
        <h1 className="text-3xl font-bold text-red-700 mb-8 text-center">Gestión de Gastos</h1>

        {error && (
          <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 mb-6 rounded-md shadow" role="alert">
            <p className="font-bold">Error</p>
            <p>{error}</p>
          </div>
        )}
        {success && (
          <div className="bg-green-100 border-l-4 border-green-500 text-green-700 p-4 mb-6 rounded-md shadow" role="alert">
            <p className="font-bold">Éxito</p>
            <p>{success}</p>
          </div>
        )}

        <div className="bg-white rounded-xl shadow-md border border-slate-200 mb-8">
          {/* Header Sutil */}
          <div className="bg-slate-50/50 px-6 py-3 border-b border-slate-100 flex justify-between items-center">
            <h2 className="text-sm font-bold text-slate-700 uppercase tracking-wider flex items-center gap-2">
              <span className="w-1 h-4 bg-red-500 rounded-full"></span>
              Panel de Filtros
            </h2>
            {(fechaInicio || fechaFin || estadoFiltro || selectedFarmacia) && (
              <button
                onClick={() => { setEstadoFiltro(""); setFechaInicio(""); setFechaFin(""); setSelectedFarmacia(""); }}
                className="text-xs font-semibold text-red-600 hover:text-red-700 transition-colors flex items-center gap-1"
              >
                Limpiar Todo ✕
              </button>
            )}
          </div>

          <div className="p-5">
            <div className="flex flex-wrap items-end gap-4">

              {/* Selector de Farmacia */}
              <div className="flex-1 min-w-[220px] md:flex-none" ref={farmaciaRef}>
                <label className="block text-[10px] uppercase tracking-widest font-bold text-slate-400 mb-1.5 ml-1">
                  Farmacia
                </label>
                <div className="relative">
                  <button
                    onClick={() => setShowFarmacias(!showFarmacias)}
                    className={`w-full flex items-center justify-between gap-3 h-10 px-3 rounded-lg border transition-all text-sm
                ${selectedFarmacia
                        ? 'border-red-200 bg-red-50/50 text-red-700 shadow-sm'
                        : 'border-slate-300 bg-white text-slate-600 hover:border-slate-400'}`}
                  >
                    <div className="flex items-center gap-2 truncate">
                      <svg className="w-4 h-4 flex-shrink-0 opacity-60" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 21V5a2-2 0 00-2-2H7a2-2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-10V4m0 10V4m-4 10h4" />
                      </svg>
                      <span className="truncate font-medium">
                        {selectedFarmacia ? farmacias.find(f => f.id === selectedFarmacia)?.nombre : "Todas las farmacias"}
                      </span>
                    </div>
                    <svg className={`w-3 h-3 transition-transform duration-200 ${showFarmacias ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>

                  {/* Popover con animación */}
                  {showFarmacias && (
                    <div className="absolute left-2 top-1 z-[100] mt-2 w-64 bg-white border border-slate-200 rounded-xl shadow-2xl py-2 animate-in fade-in slide-in-from-top-2 duration-200">
                      <button
                        onClick={() => { setSelectedFarmacia(""); setShowFarmacias(false); }}
                        className="w-full text-left px-4 py-2 text-xs font-bold text-slate-400 hover:bg-slate-50"
                      >
                        MOSTRAR TODAS
                      </button>
                      <div className="h-px bg-slate-100 my-1" />
                      <div className="max-h-60 overflow-y-auto custom-scrollbar">
                        {farmacias.map(f => (
                          <button
                            key={f.id}
                            onClick={() => { setSelectedFarmacia(f.id); setShowFarmacias(false); }}
                            className={`w-full text-left px-4 py-2.5 text-sm transition-colors
                        ${selectedFarmacia === f.id ? 'bg-red-50 text-red-700 font-bold' : 'text-slate-600 hover:bg-slate-50'}`}
                          >
                            {f.nombre}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Estado */}
              <div className="w-full md:w-44">
                <label htmlFor="estadoFiltro" className="block text-[10px] uppercase tracking-widest font-bold text-slate-400 mb-1.5 ml-1">
                  Estado
                </label>
                <select
                  id="estadoFiltro"
                  value={estadoFiltro}
                  onChange={e => setEstadoFiltro(e.target.value)}
                  className="w-full h-10 bg-white border-slate-300 border rounded-lg shadow-sm focus:border-red-500 focus:ring-2 focus:ring-red-200 transition-all px-3 text-sm font-medium text-slate-600 outline-none appearance-none cursor-pointer"
                  style={{ backgroundImage: `url("data:image/svg+xml;charset=UTF-8,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3e%3cpolyline points='6 9 12 15 18 9'%3e%3c/polyline%3e%3c/svg%3e")`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 0.75rem center', backgroundSize: '1rem' }}
                >
                  <option value="">Cualquier estado</option>
                  {ESTADO_OPCIONES.map(opt => (
                    <option key={opt} value={opt}>{opt.charAt(0).toUpperCase() + opt.slice(1)}</option>
                  ))}
                </select>
              </div>

              {/* Rango de Fechas */}
              <div className="flex-1 min-w-[300px] grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[10px] uppercase tracking-widest font-bold text-slate-400 mb-1.5 ml-1">Desde</label>
                  <input
                    type="date"
                    value={fechaInicio}
                    onChange={e => setFechaInicio(e.target.value)}
                    className="w-full h-10 bg-white border-slate-300 border rounded-lg px-3 text-sm text-slate-600 focus:border-red-500 focus:ring-2 focus:ring-red-200 outline-none transition-all"
                  />
                </div>
                <div>
                  <label className="block text-[10px] uppercase tracking-widest font-bold text-slate-400 mb-1.5 ml-1">Hasta</label>
                  <input
                    type="date"
                    value={fechaFin}
                    onChange={e => setFechaFin(e.target.value)}
                    className="w-full h-10 bg-white border-slate-300 border rounded-lg px-3 text-sm text-slate-600 focus:border-red-500 focus:ring-2 focus:ring-red-200 outline-none transition-all"
                  />
                </div>
              </div>

            </div>
          </div>
        </div>

        {loading ? (
          <div className="text-center py-10 text-slate-500 text-lg">
            <svg className="animate-spin h-8 w-8 text-red-600 mx-auto mb-3" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            Cargando gastos...
          </div>
        ) : gastosFiltrados.length === 0 ? (
          <div className="text-center text-slate-500 py-10 bg-white p-6 rounded-lg shadow-lg">
            <svg className="mx-auto h-12 w-12 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
              <path vectorEffect="non-scaling-stroke" strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.25 3.75H6.75C5.7835 3.75 5 4.5335 5 5.5V18.5C5 19.4665 5.7835 20.25 6.75 20.25H17.25C18.2165 20.25 19 19.4665 19 18.5V12.75M10.75 8.75L18.25 1.25M18.25 1.25H13.75M18.25 1.25V5.75" />
            </svg>
            <h3 className="mt-2 text-lg font-medium text-slate-800">No hay gastos registrados</h3>
            <p className="mt-1 text-sm text-slate-500">No se encontraron gastos que coincidan con los filtros aplicados o para el período seleccionado.</p>
          </div>
        ) : (
          <>
            {/* Vista de tabla para pantallas medianas y grandes */}
            <MaterialReactTable table={table} />
            {/* Total de gastos en tabla, ahora fuera de la tabla */}
            <div className="flex flex-col sm:flex-row sm:justify-end gap-2 bg-red-50 border-t border-red-200 px-5 py-4 mt-2 rounded-lg">
              <span className="text-lg font-bold text-red-700">Total Bs: {totalBs.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
              <span className="text-lg font-bold text-blue-700">Total $: {totalUSD.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
            </div>

            {/* Vista tipo tarjeta para móviles */}
            <div className="sm:hidden flex flex-col gap-4">
              {gastosFiltrados.map(g => (
                <div key={g._id} className="bg-white rounded-lg shadow-lg p-4 flex flex-col gap-2.5">
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="font-semibold text-base text-red-700">{g.titulo}</div>
                      <div className="text-xs text-slate-500 gasto-fecha">{formatFecha(g.fecha, g.fechaRegistro)}</div>
                    </div>
                    <EstadoGastoBadge estado={g.estado} />
                  </div>
                  <p className="text-sm text-slate-600 line-clamp-3" title={g.descripcion}>{g.descripcion || "Sin descripción"}</p>
                  <div className="flex justify-between items-center mt-2 pt-2 border-t border-slate-100">
                    <span className="font-bold text-lg text-slate-800 gasto-monto">
                      {g.divisa === 'Bs' && g.tasa ?
                        `Bs ${(g.monto).toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} / Tasa: ${g.tasa}\n$${(g.monto / g.tasa).toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                        :
                        `$${g.monto.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                      }
                    </span>
                    <select
                      value={g.estado}
                      onChange={e => handleEstadoSelect(g._id, e.target.value)}
                      className="border-slate-300 rounded-md shadow-sm focus:border-red-500 focus:ring focus:ring-red-200 focus:ring-opacity-50 py-1.5 px-2 text-xs"
                    >
                      {ESTADO_OPCIONES.map(opt => (
                        <option key={opt} value={opt}>{opt.charAt(0).toUpperCase() + opt.slice(1)}</option>
                      ))}
                    </select>
                  </div>
                </div>
              ))}
              {/* Total de gastos en vista móvil, ahora fuera de la lista */}
              <div className="flex flex-col gap-2 bg-red-50 border-t border-red-200 px-4 py-3 mt-2 rounded-lg sm:hidden">
                <span className="text-base font-bold text-red-700">Total Bs: {totalBs.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                <span className="text-base font-bold text-blue-700">Total $: {totalUSD.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
              </div>
            </div>
          </>
        )}

        {confirmDialog.open && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-white bg-opacity-50 backdrop-blur-sm p-4">
            <div className="bg-white p-6 sm:p-8 rounded-lg shadow-2xl max-w-md w-full">
              <h2 className="text-xl font-semibold text-slate-800 mb-2">Confirmar Cambio de Estado</h2>
              <p className="text-slate-600 mb-4">
                ¿Está seguro que desea cambiar el estado del gasto a
                <span className={`font-bold ml-1 ${confirmDialog.nuevoEstado === 'denied' ? 'text-red-600' : confirmDialog.nuevoEstado === 'verified' ? 'text-green-600' : 'text-yellow-600'}`}>{confirmDialog.nuevoEstado}</span>?
              </p>
              {confirmDialog.nuevoEstado === 'denied' && (
                <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-3 mb-4 rounded-md text-sm">
                  <strong>Advertencia:</strong> Esta acción es irreversible. El gasto será marcado como rechazado.
                </div>
              )}
              <div className="flex justify-end gap-3">
                <button
                  onClick={handleCancelChange}
                  className="px-5 py-2.5 rounded-md bg-slate-200 text-slate-700 hover:bg-slate-300 font-medium transition-colors duration-150 ease-in-out"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleConfirmChange}
                  className={`px-5 py-2.5 rounded-md font-medium transition-colors duration-150 ease-in-out shadow-sm hover:shadow-md ${confirmDialog.nuevoEstado === 'denied' ? 'bg-red-600 text-white hover:bg-red-700' : 'bg-indigo-600 text-white hover:bg-indigo-700'}`}
                >
                  Aceptar
                </button>
              </div>
            </div>
          </div>
        )}
        {imagenAmpliada && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-60">
            <button
              className="absolute top-4 right-4 text-white text-2xl bg-black bg-opacity-40 rounded-full px-3 py-1"
              onClick={() => setImagenAmpliada(null)}
              aria-label="Cerrar"
            >×</button>
            <div className="flex flex-col items-center">
              <ImageDisplay
                imageName={imagenAmpliada.imagenes[imagenAmpliada.index]}
                alt={`Imagen ampliada ${imagenAmpliada.index + 1}`}
                style={{ maxHeight: '80vh', maxWidth: '90vw', borderRadius: 12, boxShadow: '0 0 24px #0008', border: '4px solid #fff', marginBottom: 16 }}
              />
              {imagenAmpliada.imagenes.length > 1 && (
                <div className="flex gap-2 justify-center">
                  <button
                    className="px-3 py-1 bg-white bg-opacity-80 rounded shadow text-slate-700 font-bold"
                    disabled={imagenAmpliada.index === 0}
                    onClick={() => setImagenAmpliada(imagenAmpliada => imagenAmpliada ? { ...imagenAmpliada, index: imagenAmpliada.index - 1 } : null)}
                  >Anterior</button>
                  <span className="text-white font-semibold">{imagenAmpliada.index + 1} / {imagenAmpliada.imagenes.length}</span>
                  <button
                    className="px-3 py-1 bg-white bg-opacity-80 rounded shadow text-slate-700 font-bold"
                    disabled={imagenAmpliada.index === imagenAmpliada.imagenes.length - 1}
                    onClick={() => setImagenAmpliada(imagenAmpliada => imagenAmpliada ? { ...imagenAmpliada, index: imagenAmpliada.index + 1 } : null)}
                  >Siguiente</button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default VisualizarGastosFarmaciaPage;
