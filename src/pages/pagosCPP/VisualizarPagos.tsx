import React, { useState } from 'react';
import TablaPagos from './TablaPagos';
import type { Pago } from './pagosTypes';
import { fetchPagosPorRangoFechas, useToggle } from './usePagosPCC';

const VisualizarPagos: React.FC = () => {
  const [fechaInicio, setFechaInicio] = useState('');
  const [fechaFin, setFechaFin] = useState('');
  const [pagos, setPagos] = useState<Pago[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Para controlar el toggle global (si aplica)
  const [, , resetToggle] = useToggle(false);

  const handleBuscar = async (e: React.FormEvent) => {
    e.preventDefault();
    resetToggle(); // Restablece el toggle antes de buscar
    setLoading(true);
    setError(null);
    try {
      const pagosRes = await fetchPagosPorRangoFechas(fechaInicio, fechaFin);
      setPagos(pagosRes);
    } catch (err: any) {
      setError(err.message || 'Error al buscar pagos');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: '2rem' }}>
      <h1>Visualizar Pagos</h1>
      <p>Aquí podrás visualizar los pagos realizados.</p>
      <form onSubmit={handleBuscar} style={{ marginBottom: 24, display: 'flex', gap: 16, alignItems: 'center' }}>
        <label>
          Fecha inicio:
          <input type="date" value={fechaInicio} onChange={e => setFechaInicio(e.target.value)} required />
        </label>
        <label>
          Fecha fin:
          <input type="date" value={fechaFin} onChange={e => setFechaFin(e.target.value)} required />
        </label>
        <button type="submit" disabled={loading} style={{ padding: '0.5rem 1rem' }}>Buscar</button>
      </form>
      {loading && <div>Cargando pagos...</div>}
      {error && <div style={{ color: 'red' }}>{error}</div>}
      <TablaPagos pagos={pagos} />
    </div>
  );
};

export default VisualizarPagos;