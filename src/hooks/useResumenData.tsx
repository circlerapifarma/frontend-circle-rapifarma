import { useState, useEffect, useMemo, useCallback } from "react";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

interface PagoCPP {
  _id?: string;
  farmaciaId: string;
  montoDePago?: number;
  monedaDePago?: "USD" | "Bs";
  estado?: string; // "pagada", "abonada", etc.
  cuentaPorPagarId?: string;
  estatus?: string; // "activo", "inactivo", etc.
  tasaDePago?: number; // Tasa al momento del pago

  // Agrega otros campos que necesites del pago
}

type VentasFarmacia = {
  totalVentas: number;
  totalBs: number;
  totalUsd: number;
  efectivoUsd: number;
  zelleUsd: number;
  faltantes: number;
  sobrantes: number;
  totalGeneralSinRecargas: number;
  valesUsd: number;
  totalCosto: number;
};

interface PuntoVenta {
  puntoDebito?: number;
  puntoCredito?: number;
}

interface Cuadre {
  dia: string;
  estado: "verified" | "wait" | "denied";
  recargaBs?: number;
  pagomovilBs?: number;
  efectivoBs?: number;
  puntosVenta?: PuntoVenta[];
  efectivoUsd?: number;
  zelleUsd?: number;
  tasa?: number;
  faltanteUsd?: number;
  sobranteUsd?: number;
  valesUsd?: number;
  devolucionesBs?: number;
  costo?: number | string;
}

interface InventarioItem {
  farmacia: string;
  costo?: number | string;
}

interface Gasto {
  _id?: string;
  localidad: string; // ID de la farmacia
  estado: "verified" | "pending" | "wait" | "denied";
  fecha: string;
  divisa: "Bs" | "USD";
  tasa?: number | string;
  monto: number | string;
}

interface CuentaPorPagar {
  farmacia: string; // ID de la farmacia
  estatus: "activa" | "pagada";
  fechaEmision: string;
  montoUsd: number;
}

export function useResumenData() {
  const [pagos, setPagos] = useState<PagoCPP[]>([]); // <-- NUEVO ESTADO PARA PAGOS
  const [farmacias, setFarmacias] = useState<{ id: string; nombre: string }[]>(
    []
  );
  const [ventas, setVentas] = useState<{ [key: string]: VentasFarmacia }>({});
  const [cuadresPorFarmacia, setCuadresPorFarmacia] = useState<{
    [key: string]: Cuadre[];
  }>({});
  const [inventariosFarmacia, setInventariosFarmacia] = useState<{
    [key: string]: number;
  }>({});
  const [costoInventarioCuadresPorFarmacia, setCostoInventarioCuadresPorFarmacia] = useState<{
    [key: string]: number;
  }>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [fechaInicio, setFechaInicio] = useState<string>("");
  const [fechaFin, setFechaFin] = useState<string>("");
  const [detallesVisibles, setDetallesVisibles] = useState<{
    [key: string]: boolean;
  }>({});
  const [gastos, setGastos] = useState<Gasto[]>([]);
  const [cuentasPorPagar, setCuentasPorPagar] = useState<CuentaPorPagar[]>([]);

  const setDateRange = useCallback((start: Date, end: Date) => {
    const formatDate = (date: Date) => date.toISOString().split("T")[0];
    setFechaInicio(formatDate(start));
    setFechaFin(formatDate(end));
  }, []);

  const setHoy = useCallback(() => {
    const hoy = new Date();
    setDateRange(hoy, hoy);
  }, [setDateRange]);

  const setAyer = useCallback(() => {
    const ayer = new Date();
    ayer.setDate(ayer.getDate() - 1);
    setDateRange(ayer, ayer);
  }, [setDateRange]);

  const setSemanaActual = useCallback(() => {
    const today = new Date();
    const day = today.getDay();
    const diffToMonday = day === 0 ? -6 : 1 - day;
    const monday = new Date(new Date().setDate(today.getDate() + diffToMonday));
    const sunday = new Date(new Date().setDate(monday.getDate() + 6));
    setDateRange(monday, sunday);
  }, [setDateRange]);

  const setQuincenaActual = useCallback(() => {
    const today = new Date();
    const year = today.getFullYear();
    const month = today.getMonth();
    let startDay: Date, endDay: Date;
    if (today.getDate() < 16) {
      startDay = new Date(year, month, 1);
      endDay = new Date(year, month, 15);
    } else {
      startDay = new Date(year, month, 16);
      endDay = new Date(year, month + 1, 0);
    }
    setDateRange(startDay, endDay);
  }, [setDateRange]);

  const setMesActual = useCallback(() => {
    const now = new Date();
    const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    setDateRange(firstDay, today);
  }, [setDateRange]);

  useEffect(() => {
    const fetchInitialData = async () => {
      setLoading(true);
      setError(null);
      try {
        const token = localStorage.getItem("token");
        const headers: HeadersInit = {};
        if (token) {
          // Y añadimos la propiedad solo si el token existe
          headers.Authorization = `Bearer ${token}`;
        }

        const resFarmacias = await fetch(`${API_BASE_URL}/farmacias`, {
          headers,
        });
        if (!resFarmacias.ok) throw new Error("Error al obtener farmacias.");
        const dataFarmacias = await resFarmacias.json();
        const listaFarmacias = dataFarmacias.farmacias
          ? Object.entries(dataFarmacias.farmacias).map(([id, nombre]) => ({
            id,
            nombre: String(nombre),
          }))
          : Object.entries(dataFarmacias).map(([id, nombre]) => ({
            id,
            nombre: String(nombre),
          }));
        setFarmacias(listaFarmacias);

        const resultCuadres: { [key: string]: Cuadre[] } = {};
        const cuadrePromises = listaFarmacias.map(async (farm) => {
          try {
            const params = new URLSearchParams({
              farmacia: farm.id,
              fechaInicio,
              fechaFin,
              // estado: "wait"   // <-- opcional
            });

            const resCuadres = await fetch(
              `${API_BASE_URL}/cuadres?${params.toString()}`,
              { headers }
            );

            if (!resCuadres.ok) return { farmId: farm.id, data: [] };

            const data = await resCuadres.json();
            return { farmId: farm.id, data };

          } catch (err) {
            return { farmId: farm.id, data: [] };
          }
        });

        const settledResults = await Promise.allSettled(cuadrePromises);
        settledResults.forEach((settledResult) => {
          if (settledResult.status === "fulfilled") {
            resultCuadres[settledResult.value.farmId] =
              settledResult.value.data;
          }
        });
        setCuadresPorFarmacia(resultCuadres);

        let inventariosPorFarmacia: { [key: string]: number } = {};
        const resInventarios = await fetch(`${API_BASE_URL}/inventarios`, {
          headers,
        });
        if (resInventarios.ok) {
          const dataInventarios: InventarioItem[] = await resInventarios.json();
          dataInventarios.forEach((inv) => {
            if (!inv.farmacia) return;
            if (!inventariosPorFarmacia[inv.farmacia])
              inventariosPorFarmacia[inv.farmacia] = 0;
            inventariosPorFarmacia[inv.farmacia] += Number(inv.costo || 0);
          });
        }
        setInventariosFarmacia(inventariosPorFarmacia);

        const resGastos = await fetch(`${API_BASE_URL}/gastos`, { headers });
        if (resGastos.ok) {
          const dataGastos = await resGastos.json();
          console.log("useResumenData - Gastos iniciales obtenidos:", dataGastos.length, "total");
          console.log("useResumenData - Gastos verified iniciales:", dataGastos.filter((g: any) => g.estado === "verified").length);
          setGastos(dataGastos);
        } else {
          console.error("useResumenData - Error al obtener gastos iniciales:", resGastos.status, resGastos.statusText);
        }

        const resCuentas = await fetch(`${API_BASE_URL}/cuentas-por-pagar`, {
          headers,
        });
        if (resCuentas.ok) setCuentasPorPagar(await resCuentas.json());
      } catch (err: any) {
        setError(err.message || "Error desconocido al cargar datos iniciales.");
      } finally {
        setLoading(false);
      }
    };
    setMesActual();
    fetchInitialData();
  }, [setMesActual]);

  // Recargar gastos periódicamente para que aparezcan los nuevos gastos verificados
  useEffect(() => {
    const fetchGastos = async () => {
      try {
        const token = localStorage.getItem("token");
        const headers: HeadersInit = {};
        if (token) {
          headers.Authorization = `Bearer ${token}`;
        }
        const resGastos = await fetch(`${API_BASE_URL}/gastos`, { headers });
        if (resGastos.ok) {
          const dataGastos = await resGastos.json();
          console.log("useResumenData - Gastos actualizados:", dataGastos.length, "total");
          console.log("useResumenData - Gastos verified:", dataGastos.filter((g: any) => g.estado === "verified").length);
          setGastos(dataGastos);
        } else {
          console.error("useResumenData - Error al obtener gastos:", resGastos.status, resGastos.statusText);
        }
      } catch (err) {
        // Silenciosamente fallar, no interrumpir
        console.error("useResumenData - Error al actualizar gastos:", err);
      }
    };
    
    // Recargar inmediatamente y luego cada minuto
    fetchGastos();
    const interval = setInterval(fetchGastos, 60000); // 60 segundos
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const ventasPorFarmacia: { [key: string]: VentasFarmacia } = {};
    farmacias.forEach((farm) => {
      const data = cuadresPorFarmacia[farm.id] || [];
      let totalBs = 0,
        totalUsd = 0,
        totalGeneral = 0,
        efectivoUsd = 0,
        zelleUsd = 0,
        faltantes = 0,
        sobrantes = 0,
        totalGeneralSinRecargas = 0,
        valesUsd = 0,
        totalCosto = 0;
      data.forEach((c) => {
        if (c.estado !== "verified") return;
        if (
          (fechaInicio && c.dia < fechaInicio) ||
          (fechaFin && c.dia > fechaFin)
        )
          return;
        let sumaBs =
          Number(c.recargaBs || 0) +
          Number(c.pagomovilBs || 0) +
          Number(c.efectivoBs || 0);
        if (Array.isArray(c.puntosVenta)) {
          sumaBs += c.puntosVenta.reduce(
            (acc, pv) =>
              acc + Number(pv.puntoDebito || 0) + Number(pv.puntoCredito || 0),
            0
          );
        }
        totalBs += sumaBs;
        const sumaUsd = Number(c.efectivoUsd || 0) + Number(c.zelleUsd || 0);
        totalUsd += sumaUsd;
        efectivoUsd += Number(c.efectivoUsd || 0);
        zelleUsd += Number(c.zelleUsd || 0);
        const tasa = Number(c.tasa || 0);
        if (tasa > 0) {
          totalGeneral += sumaUsd + sumaBs / tasa;
          totalGeneralSinRecargas +=
            sumaUsd + (sumaBs - Number(c.recargaBs || 0)) / tasa;
        } else {
          totalGeneral += sumaUsd;
          totalGeneralSinRecargas += sumaUsd;
        }
        faltantes += Number(c.faltanteUsd || 0);
        sobrantes += Number(c.sobranteUsd || 0);
        valesUsd += Number(c.valesUsd || 0);
        if (typeof c.costo === "number") {
          totalCosto += c.costo;
        } else if (typeof c.costo === "string" && c.costo !== "") {
          totalCosto += Number(c.costo);
        }
      });
      ventasPorFarmacia[farm.id] = {
        totalVentas: Number(totalGeneral.toFixed(2)),
        totalBs: Number(totalBs.toFixed(2)),
        totalUsd: Number(totalUsd.toFixed(2)),
        efectivoUsd: Number(efectivoUsd.toFixed(2)),
        zelleUsd: Number(zelleUsd.toFixed(2)),
        faltantes: Number(faltantes.toFixed(2)),
        sobrantes: Number(sobrantes.toFixed(2)),
        totalGeneralSinRecargas: Number(totalGeneralSinRecargas.toFixed(2)),
        valesUsd: Number(valesUsd.toFixed(2)),
        totalCosto: Number(totalCosto.toFixed(2)),
      };
    });
    setVentas(ventasPorFarmacia);
  }, [cuadresPorFarmacia, farmacias, fechaInicio, fechaFin]);

  useEffect(() => {
    const fetchPagosPorRango = async () => {
      if (!fechaInicio || !fechaFin) {
        setPagos([]); // Limpia los pagos si no hay fecha
        return;
      }
      try {
        const token = localStorage.getItem("token");
        const headers: HeadersInit = {};
        if (token) {
          // Y añadimos la propiedad solo si el token existe
          headers.Authorization = `Bearer ${token}`;
        }
        const url = `${API_BASE_URL}/pagoscpp/rango-fechas?fechaInicio=${fechaInicio}&fechaFin=${fechaFin}`;
        const resPagos = await fetch(url, { headers });
        if (resPagos.ok) {
          setPagos(await resPagos.json()); // <-- Actualiza el estado 'pagos'
        } else {
          console.error("Error al obtener los pagos por rango de fecha.");
          setPagos([]);
        }
      } catch (error) {
        console.error("Error en la petición de pagos:", error);
        setPagos([]);
      }
    };

    fetchPagosPorRango();
  }, [fechaInicio, fechaFin]);

  const pendientesPorFarmacia = useMemo(() => {
    const pendientes: { [key: string]: number } = {};
    farmacias.forEach((farm) => {
      const data = cuadresPorFarmacia[farm.id] || [];
      let totalPendiente = 0;
      data.forEach((c) => {
        if (c.estado !== "wait") return;
        if (
          (fechaInicio && c.dia < fechaInicio) ||
          (fechaFin && c.dia > fechaFin)
        )
          return;
        let sumaBs =
          Number(c.recargaBs || 0) +
          Number(c.pagomovilBs || 0) +
          Number(c.efectivoBs || 0);
        if (Array.isArray(c.puntosVenta)) {
          sumaBs += c.puntosVenta.reduce(
            (acc, pv) =>
              acc + Number(pv.puntoDebito || 0) + Number(pv.puntoCredito || 0),
            0
          );
        }
        sumaBs -= Number(c.devolucionesBs || 0);
        const sumaUsd = Number(c.efectivoUsd || 0) + Number(c.zelleUsd || 0);
        const tasa = Number(c.tasa || 0);
        totalPendiente += tasa > 0 ? sumaUsd + sumaBs / tasa : sumaUsd;
      });
      pendientes[farm.id] = Number(totalPendiente.toFixed(2));
    });
    return pendientes;
  }, [farmacias, cuadresPorFarmacia, fechaInicio, fechaFin]);

  const sortedFarmacias = useMemo(() => {
    return [...farmacias].sort((a, b) => {
      const ventasA = ventas[a.id]?.totalVentas || 0;
      const ventasB = ventas[b.id]?.totalVentas || 0;
      return ventasB - ventasA;
    });
  }, [farmacias, ventas]);

  const calcularDetalles = useCallback(
    (farmId: string) => {
      const cuadresFarmacia = cuadresPorFarmacia[farmId] || [];
      let sumaRecargaBs = 0,
        sumaPagomovilBs = 0,
        sumaEfectivoBs = 0,
        sumaPuntoDebito = 0,
        sumaPuntoCredito = 0,
        sumaDevolucionesBs = 0;
      cuadresFarmacia.forEach((c) => {
        if (c.estado !== "verified") return;
        if (
          (fechaInicio && c.dia < fechaInicio) ||
          (fechaFin && c.dia > fechaFin)
        )
          return;
        sumaRecargaBs += Number(c.recargaBs || 0);
        sumaPagomovilBs += Number(c.pagomovilBs || 0);
        sumaEfectivoBs += Number(c.efectivoBs || 0);
        sumaDevolucionesBs += Number(c.devolucionesBs || 0);
        if (Array.isArray(c.puntosVenta)) {
          sumaPuntoDebito += c.puntosVenta.reduce(
            (acc, pv) => acc + Number(pv.puntoDebito || 0),
            0
          );
          sumaPuntoCredito += c.puntosVenta.reduce(
            (acc, pv) => acc + Number(pv.puntoCredito || 0),
            0
          );
        }
      });
      const formatBs = (amount: number) =>
        amount.toLocaleString("es-VE", {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        }) + " Bs";
      return (
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 mt-4 text-sm shadow-inner animate-fade-in">
          <h4 className="text-md font-bold text-gray-800 mb-3 border-b pb-2">
            Detalles Adicionales del Cuadre
          </h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-2">
            <div className="flex justify-between">
              <span>Recarga Bs:</span>
              <span className="font-medium">{formatBs(sumaRecargaBs)}</span>
            </div>
            <div className="flex justify-between">
              <span>Pago Móvil Bs:</span>
              <span className="font-medium">{formatBs(sumaPagomovilBs)}</span>
            </div>
            <div className="flex justify-between">
              <span>Efectivo Bs:</span>
              <span className="font-medium">{formatBs(sumaEfectivoBs)}</span>
            </div>
            <div className="flex justify-between">
              <span>Punto Débito Bs:</span>
              <span className="font-medium">{formatBs(sumaPuntoDebito)}</span>
            </div>
            <div className="flex justify-between">
              <span>Punto Crédito Bs:</span>
              <span className="font-medium">{formatBs(sumaPuntoCredito)}</span>
            </div>
            <div className="flex justify-between">
              <span>Devoluciones Bs:</span>
              <span className="font-medium text-red-600">
                {formatBs(sumaDevolucionesBs)}
              </span>
            </div>
          </div>
        </div>
      );
    },
    [cuadresPorFarmacia, fechaInicio, fechaFin]
  );

  // Función helper para parsear fechas de manera robusta
  const parseDate = (dateStr: string | Date | undefined | null): Date | null => {
    if (!dateStr) return null;
    
    // Si ya es un Date object, retornarlo
    if (dateStr instanceof Date) {
      return dateStr;
    }
    
    // Si es string, intentar parsearlo
    if (typeof dateStr === 'string') {
      // Formato DD/MM/YYYY
      if (dateStr.includes('/')) {
        const partes = dateStr.split('/');
        if (partes.length === 3) {
          const [dia, mes, año] = partes;
          const añoNum = parseInt(año);
          const mesNum = parseInt(mes) - 1; // Mes es 0-indexed
          const diaNum = parseInt(dia);
          if (!isNaN(añoNum) && !isNaN(mesNum) && !isNaN(diaNum)) {
            return new Date(añoNum, mesNum, diaNum);
          }
        }
      }
      
      // Formato YYYY-MM-DD (con o sin hora)
      if (dateStr.includes('-')) {
        const fecha = new Date(dateStr);
        if (!isNaN(fecha.getTime())) {
          return fecha;
        }
      }
      
      // Intentar parsear como ISO string
      const fecha = new Date(dateStr);
      if (!isNaN(fecha.getTime())) {
        return fecha;
      }
    }
    
    return null;
  };

  // Estado para almacenar gastos por farmacia desde el endpoint optimizado
  const [gastosPorFarmaciaData, setGastosPorFarmaciaData] = useState<{ [key: string]: number }>({});

  // Fetch gastos por farmacia usando el endpoint optimizado
  useEffect(() => {
    const fetchGastosPorFarmacia = async () => {
      try {
        // Calcular rango del mes actual hasta el día de hoy dinámicamente
        const now = new Date();
        const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const fechaInicioMes = firstDayOfMonth.toISOString().split("T")[0];
        const fechaFinHoy = today.toISOString().split("T")[0];
        
        const token = localStorage.getItem("token");
        const headers: HeadersInit = {};
        if (token) {
          headers.Authorization = `Bearer ${token}`;
        }
        
        // Usar el endpoint optimizado del backend
        const url = `${API_BASE_URL}/gastos/verified/por-farmacia?fecha_inicio=${fechaInicioMes}&fecha_fin=${fechaFinHoy}`;
        const res = await fetch(url, { headers });
        
        if (res.ok) {
          const data = await res.json();
          console.log("useResumenData - Gastos por farmacia obtenidos:", data);
          setGastosPorFarmaciaData(data);
        } else {
          console.error("useResumenData - Error al obtener gastos por farmacia:", res.status, res.statusText);
          // Fallback: usar el método anterior si el nuevo endpoint falla
          setGastosPorFarmaciaData({});
        }
      } catch (error) {
        console.error("useResumenData - Error al obtener gastos por farmacia:", error);
        // Fallback: usar el método anterior si hay error
        setGastosPorFarmaciaData({});
      }
    };
    
    fetchGastosPorFarmacia();
    // Actualizar cada 60 segundos
    const interval = setInterval(fetchGastosPorFarmacia, 60000);
    return () => clearInterval(interval);
  }, []);

  // Fetch costo de inventario de cuadres por farmacia usando el endpoint optimizado
  useEffect(() => {
    const fetchCostoInventarioCuadres = async () => {
      try {
        // Calcular rango del mes actual hasta el día de hoy dinámicamente
        const now = new Date();
        const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const fechaInicioMes = firstDayOfMonth.toISOString().split("T")[0];
        const fechaFinHoy = today.toISOString().split("T")[0];
        
        const token = localStorage.getItem("token");
        const headers: HeadersInit = {};
        if (token) {
          headers.Authorization = `Bearer ${token}`;
        }
        
        // Usar el endpoint optimizado del backend
        const url = `${API_BASE_URL}/cuadres/costo-inventario/por-farmacia?fecha_inicio=${fechaInicioMes}&fecha_fin=${fechaFinHoy}`;
        const res = await fetch(url, { headers });
        
        if (res.ok) {
          const data = await res.json();
          console.log("useResumenData - Costo inventario cuadres por farmacia obtenidos:", data);
          setCostoInventarioCuadresPorFarmacia(data);
        } else {
          console.error("useResumenData - Error al obtener costo inventario cuadres por farmacia:", res.status, res.statusText);
          setCostoInventarioCuadresPorFarmacia({});
        }
      } catch (error) {
        console.error("useResumenData - Error al obtener costo inventario cuadres por farmacia:", error);
        setCostoInventarioCuadresPorFarmacia({});
      }
    };
    
    fetchCostoInventarioCuadres();
    // Actualizar cada 60 segundos
    const interval = setInterval(fetchCostoInventarioCuadres, 60000);
    return () => clearInterval(interval);
  }, []);

  const gastosPorFarmacia = useMemo(() => {
    // Si tenemos datos del endpoint optimizado, usarlos directamente
    if (Object.keys(gastosPorFarmaciaData).length > 0) {
      console.log("useResumenData - Usando datos del endpoint optimizado:", gastosPorFarmaciaData);
      return gastosPorFarmaciaData;
    }
    
    // Fallback: calcular desde gastos si el endpoint no está disponible
    const resultado: { [key: string]: number } = {};
    const now = new Date();
    const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const fechaInicioMes = firstDayOfMonth.toISOString().split("T")[0];
    const fechaFinHoy = today.toISOString().split("T")[0];
    
    const fechaInicioDate = new Date(fechaInicioMes);
    const fechaFinDate = new Date(fechaFinHoy);
    fechaInicioDate.setHours(0, 0, 0, 0);
    fechaFinDate.setHours(23, 59, 59, 999);
    
    farmacias.forEach((farm) => {
      const gastosFiltrados = gastos.filter((g) => {
        const tieneLocalidad = g.localidad === farm.id;
        const esVerificado = g.estado === "verified";
        
        let enRango = false;
        if (g.fecha) {
          const fechaGasto = parseDate(g.fecha);
          if (fechaGasto) {
            fechaGasto.setHours(0, 0, 0, 0);
            enRango = fechaGasto >= fechaInicioDate && fechaGasto <= fechaFinDate;
          }
        }
        
        return tieneLocalidad && esVerificado && enRango;
      });
      
      const total = gastosFiltrados.reduce((acc, g) => {
        if (g.divisa === "Bs" && g.tasa && Number(g.tasa) > 0) {
          return acc + Number(g.monto || 0) / Number(g.tasa);
        }
        return acc + Number(g.monto || 0);
      }, 0);
      resultado[farm.id] = Math.max(0, total);
    });
    
    return resultado;
  }, [gastosPorFarmaciaData, gastos, farmacias]);

  const cuentasActivasPorFarmacia = useMemo(() => {
    const resultado: { [key: string]: number } = {};
    farmacias.forEach((farm) => {
      const total = cuentasPorPagar
        .filter((c) => c.farmacia === farm.id && c.estatus === "activa")
        .reduce((acc, c) => acc + Number(c.montoUsd || 0), 0);
      resultado[farm.id] = Math.max(0, total);
    });
    return resultado;
  }, [cuentasPorPagar, farmacias]);

  const MontoFacturadoCuentasPagadasPorFarmacia = useMemo(() => {
    const resultado: { [key: string]: number } = {};
    farmacias.forEach((farm) => {
      const total = cuentasPorPagar
        .filter(
          (c) =>
            c.farmacia === farm.id &&
            c.estatus === "pagada" &&
            (!fechaInicio ||
              new Date(c.fechaEmision) >= new Date(fechaInicio)) &&
            (!fechaFin || new Date(c.fechaEmision) <= new Date(fechaFin))
        )
        .reduce((acc, c) => acc + Number(c.montoUsd || 0), 0);
      resultado[farm.id] = Math.max(0, total);
    });
    return resultado;
  }, [cuentasPorPagar, farmacias, fechaInicio, fechaFin]);

  const totalPagosPorFarmacia = useMemo(() => {
    const resultado: {
      [key: string]: {
        pagosUsd: number;
        pagosBs: number;
        pagosGeneralUsd: number;
        abonosNoLiquidadosEnUsd: number; // <-- CAMBIO DE NOMBRE Y LÓGICA
        abonosNoLiquidadosEnBs: number;
        montoOriginalFacturasUsd: number;
        diferencialPagosUsd: number;
      };
    } = {};

    farmacias.forEach((farm) => {
      let abonosEnUsd = 0;
      let abonosEnBs = 0;
      let pagosUsd = 0;
      let pagosBs = 0;
      let pagosGeneralUsd = 0;
      let montoOriginalFacturasUsd = 0;

      const pagosDeLaFarmacia = pagos.filter((p) => p.farmaciaId === farm.id);
      const cuentasProcesadas = new Set<string>();

      pagosDeLaFarmacia.forEach((pago) => {
        if (pago.estado === "abonada") {
          const montoAbono = Number(pago.montoDePago || 0);
          // Separamos el monto en su respectivo acumulador sin convertir
          if (pago.monedaDePago === "USD") {
            abonosEnUsd += montoAbono;
          } else if (pago.monedaDePago === "Bs") {
            abonosEnBs += montoAbono;
          }
          return;
        }

        if (
          pago.cuentaPorPagarId &&
          cuentasProcesadas.has(pago.cuentaPorPagarId)
        ) {
          return;
        }

        if (pago.estado === "pagada") {
          // CORRECCIÓN: Lógica para sumar el monto original una sola vez por factura y con conversión
          const agregarMontoOriginal = (pagoInfo: any) => {
            const montoOrig = Number(pagoInfo.montoOriginal || 0);
            if (pagoInfo.monedaOriginal === "Bs") {
              const tasaOrig =
                Number(pagoInfo.tasaOriginal) > 0
                  ? Number(pagoInfo.tasaOriginal)
                  : 1;
              montoOriginalFacturasUsd += montoOrig / tasaOrig;
            } else {
              // Asumimos USD si no es Bs
              montoOriginalFacturasUsd += montoOrig;
            }
          };

          if (pago.estatus === "abonado" && pago.cuentaPorPagarId) {
            const abonosRelacionados = pagosDeLaFarmacia.filter(
              (abono) => abono.cuentaPorPagarId === pago.cuentaPorPagarId
            );

            // Añadimos el monto original de la factura UNA SOLA VEZ
            agregarMontoOriginal(pago);

            abonosRelacionados.forEach((abono) => {
              const monto = Number(abono.montoDePago || 0);
              const tasa =
                Number(abono.tasaDePago) > 0 ? Number(abono.tasaDePago) : 1;

              if (abono.monedaDePago === "USD") {
                pagosUsd += monto;
                pagosGeneralUsd += monto;
              } else if (abono.monedaDePago === "Bs") {
                pagosBs += monto;
                pagosGeneralUsd += monto / tasa;
              }
            });
            cuentasProcesadas.add(pago.cuentaPorPagarId);
          } else {
            // Añadimos el monto original de la factura
            agregarMontoOriginal(pago);

            const monto = Number(pago.montoDePago || 0);
            const tasa =
              Number(pago.tasaDePago) > 0 ? Number(pago.tasaDePago) : 1;

            if (pago.monedaDePago === "USD") {
              pagosUsd += monto;
              pagosGeneralUsd += monto;
            } else if (pago.monedaDePago === "Bs") {
              pagosBs += monto;
              pagosGeneralUsd += monto / tasa;
            }
          }
        }
      });

      const diferencialPagosUsd = pagosGeneralUsd - montoOriginalFacturasUsd;

      resultado[farm.id] = {
        pagosUsd: parseFloat(pagosUsd.toFixed(2)),
        pagosBs: parseFloat(pagosBs.toFixed(2)),
        pagosGeneralUsd: parseFloat(pagosGeneralUsd.toFixed(2)),
        abonosNoLiquidadosEnUsd: parseFloat(abonosEnUsd.toFixed(2)), // <-- NUEVO
        abonosNoLiquidadosEnBs: parseFloat(abonosEnBs.toFixed(2)), // <-- NUEVO
        montoOriginalFacturasUsd: parseFloat(
          montoOriginalFacturasUsd.toFixed(2)
        ),
        diferencialPagosUsd: parseFloat(diferencialPagosUsd.toFixed(2)),
      };
    });

    return resultado;
  }, [pagos, farmacias]);

  return {
    loading,
    error,
    ventas,
    sortedFarmacias,
    pendientesPorFarmacia,
    inventariosFarmacia,
    costoInventarioCuadresPorFarmacia,
    fechaInicio,
    fechaFin,
    setFechaInicio,
    setFechaFin,
    setHoy,
    setAyer,
    setSemanaActual,
    setQuincenaActual,
    setMesActual,
    detallesVisibles,
    setDetallesVisibles,
    calcularDetalles,
    gastosPorFarmacia,
    cuentasActivasPorFarmacia,
    cuentasPagadasPorFarmacia: MontoFacturadoCuentasPagadasPorFarmacia,
    totalPagosPorFarmacia,
  };
}
