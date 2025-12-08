import { useState, useEffect } from 'react';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

interface DatosFinancieros {
  ventasMesActual: number;
  ventasMesAnterior: number;
  gastosMesActual: number;
  gastosMesAnterior: number;
  cuentasPorPagar: number;
  cuentasPagadas: number;
  cuentasPagadasMesAnterior: number;
  variacionVentas: number; // Porcentaje
  variacionGastos: number; // Porcentaje
  variacionCuentasPagadas: number; // Porcentaje
}

export function useDashboardFinanciero() {
  const [datos, setDatos] = useState<DatosFinancieros>({
    ventasMesActual: 0,
    ventasMesAnterior: 0,
    gastosMesActual: 0,
    gastosMesAnterior: 0,
    cuentasPorPagar: 0,
    cuentasPagadas: 0,
    cuentasPagadasMesAnterior: 0,
    variacionVentas: 0,
    variacionGastos: 0,
    variacionCuentasPagadas: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchDatos = async () => {
      setLoading(true);
      setError(null);
      try {
        const token = localStorage.getItem("token");
        if (!token) {
          throw new Error("No se encontró el token de autenticación");
        }

        const headers = {
          'Authorization': `Bearer ${token}`
        };

        // Obtener fechas del mes actual y anterior
        const ahora = new Date();
        const primerDiaMesActual = new Date(ahora.getFullYear(), ahora.getMonth(), 1);
        const ultimoDiaMesActual = new Date(ahora.getFullYear(), ahora.getMonth() + 1, 0);
        const primerDiaMesAnterior = new Date(ahora.getFullYear(), ahora.getMonth() - 1, 1);
        const ultimoDiaMesAnterior = new Date(ahora.getFullYear(), ahora.getMonth(), 0);

        const fechaInicioActual = primerDiaMesActual.toISOString().split('T')[0];
        const fechaFinActual = ultimoDiaMesActual.toISOString().split('T')[0];
        const fechaInicioAnterior = primerDiaMesAnterior.toISOString().split('T')[0];
        const fechaFinAnterior = ultimoDiaMesAnterior.toISOString().split('T')[0];

        // 1. Obtener ventas (cuadres verificados)
        const resCuadres = await fetch(`${API_BASE_URL}/cuadres/all`, { headers });
        if (!resCuadres.ok) throw new Error("Error al obtener cuadres");
        const cuadres = await resCuadres.json();

        // Filtrar y calcular ventas del mes actual
        const cuadresMesActual = cuadres.filter((c: any) => {
          if (c.estado !== "verified" || !c.dia) return false;
          const fecha = new Date(c.dia);
          return fecha >= new Date(fechaInicioActual) && fecha <= new Date(fechaFinActual);
        });
        const ventasMesActual = cuadresMesActual.reduce((acc: number, c: any) => acc + (c.totalGeneralUsd || 0), 0);

        // Filtrar y calcular ventas del mes anterior
        const cuadresMesAnterior = cuadres.filter((c: any) => {
          if (c.estado !== "verified" || !c.dia) return false;
          const fecha = new Date(c.dia);
          return fecha >= new Date(fechaInicioAnterior) && fecha <= new Date(fechaFinAnterior);
        });
        const ventasMesAnterior = cuadresMesAnterior.reduce((acc: number, c: any) => acc + (c.totalGeneralUsd || 0), 0);

        // 2. Obtener gastos
        const resGastos = await fetch(`${API_BASE_URL}/gastos`, { headers });
        if (!resGastos.ok) throw new Error("Error al obtener gastos");
        const gastos = await resGastos.json();

        // Filtrar y calcular gastos del mes actual
        const gastosMesActualArray = Array.isArray(gastos)
          ? gastos.filter((g: any) => {
              if (g.estado !== 'verified' || !g.fecha) return false;
              const fecha = new Date(g.fecha);
              return fecha >= new Date(fechaInicioActual) && fecha <= new Date(fechaFinActual);
            })
          : [];
        const gastosMesActual = gastosMesActualArray.reduce((acc: number, g: any) => {
          if (g.divisa === 'Bs' && g.tasa && Number(g.tasa) > 0) {
            return acc + (Number(g.monto || 0) / Number(g.tasa));
          }
          return acc + Number(g.monto || 0);
        }, 0);

        // Filtrar y calcular gastos del mes anterior
        const gastosMesAnteriorArray = Array.isArray(gastos)
          ? gastos.filter((g: any) => {
              if (g.estado !== 'verified' || !g.fecha) return false;
              const fecha = new Date(g.fecha);
              return fecha >= new Date(fechaInicioAnterior) && fecha <= new Date(fechaFinAnterior);
            })
          : [];
        const gastosMesAnterior = gastosMesAnteriorArray.reduce((acc: number, g: any) => {
          if (g.divisa === 'Bs' && g.tasa && Number(g.tasa) > 0) {
            return acc + (Number(g.monto || 0) / Number(g.tasa));
          }
          return acc + Number(g.monto || 0);
        }, 0);

        // 3. Obtener cuentas por pagar (activas)
        const resCuentas = await fetch(`${API_BASE_URL}/cuentas-por-pagar`, { headers });
        if (!resCuentas.ok) throw new Error("Error al obtener cuentas por pagar");
        const cuentas = await resCuentas.json();
        const cuentasPorPagar = Array.isArray(cuentas)
          ? cuentas
              .filter((c: any) => c.estatus === 'activa')
              .reduce((acc: number, c: any) => acc + (Number(c.montoUsd || 0)), 0)
          : 0;

        // 4. Obtener pagos (cuentas pagadas) - usar endpoint de rango de fechas
        const paramsMesActual = new URLSearchParams({
          fechaInicio: fechaInicioActual,
          fechaFin: fechaFinActual,
        });
        const resPagosMesActual = await fetch(`${API_BASE_URL}/pagoscpp/rango-fechas?${paramsMesActual}`, { headers });
        if (!resPagosMesActual.ok) throw new Error("Error al obtener pagos del mes actual");
        const pagosMesActual = await resPagosMesActual.json();

        const paramsMesAnterior = new URLSearchParams({
          fechaInicio: fechaInicioAnterior,
          fechaFin: fechaFinAnterior,
        });
        const resPagosMesAnterior = await fetch(`${API_BASE_URL}/pagoscpp/rango-fechas?${paramsMesAnterior}`, { headers });
        if (!resPagosMesAnterior.ok) throw new Error("Error al obtener pagos del mes anterior");
        const pagosMesAnterior = await resPagosMesAnterior.json();

        // Calcular cuentas pagadas del mes actual
        const cuentasPagadas = Array.isArray(pagosMesActual)
          ? pagosMesActual.reduce((acc: number, p: any) => {
              if (p.monedaDePago === 'Bs' && p.tasaDePago && Number(p.tasaDePago) > 0) {
                return acc + (Number(p.montoDePago || 0) / Number(p.tasaDePago));
              }
              return acc + Number(p.montoDePago || 0);
            }, 0)
          : 0;

        // Calcular cuentas pagadas del mes anterior
        const cuentasPagadasMesAnterior = Array.isArray(pagosMesAnterior)
          ? pagosMesAnterior.reduce((acc: number, p: any) => {
              if (p.monedaDePago === 'Bs' && p.tasaDePago && Number(p.tasaDePago) > 0) {
                return acc + (Number(p.montoDePago || 0) / Number(p.tasaDePago));
              }
              return acc + Number(p.montoDePago || 0);
            }, 0)
          : 0;

        // Calcular variaciones porcentuales
        const variacionVentas = ventasMesAnterior > 0
          ? ((ventasMesActual - ventasMesAnterior) / ventasMesAnterior) * 100
          : 0;
        const variacionGastos = gastosMesAnterior > 0
          ? ((gastosMesActual - gastosMesAnterior) / gastosMesAnterior) * 100
          : 0;
        const variacionCuentasPagadas = cuentasPagadasMesAnterior > 0
          ? ((cuentasPagadas - cuentasPagadasMesAnterior) / cuentasPagadasMesAnterior) * 100
          : 0;

        setDatos({
          ventasMesActual,
          ventasMesAnterior,
          gastosMesActual,
          gastosMesAnterior,
          cuentasPorPagar,
          cuentasPagadas,
          cuentasPagadasMesAnterior,
          variacionVentas,
          variacionGastos,
          variacionCuentasPagadas,
        });
      } catch (err: any) {
        console.error("Error fetching datos financieros:", err);
        setError(err.message || "Error al obtener los datos financieros");
      } finally {
        setLoading(false);
      }
    };

    fetchDatos();
  }, []);

  return { datos, loading, error };
}

