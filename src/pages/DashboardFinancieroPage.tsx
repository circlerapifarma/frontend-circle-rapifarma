import React from 'react';
import { useDashboardFinanciero } from '@/hooks/useDashboardFinanciero';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { TrendingUp, TrendingDown, DollarSign, Receipt, CheckCircle, Loader2, AlertTriangle } from 'lucide-react';
import { motion } from 'framer-motion';
import DashboardCard from '@/components/DashboardCard';

const DashboardFinancieroPage: React.FC = () => {
  const { datos, loading, error } = useDashboardFinanciero();

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-VE', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  };

  const formatPercent = (value: number) => {
    const sign = value >= 0 ? '+' : '';
    return `${sign}${value.toFixed(1)}%`;
  };

  // Datos para gráfica de barras (Ventas y Gastos)
  const datosComparacion = [
    {
      name: 'Mes Anterior',
      Ventas: datos.ventasMesAnterior,
      Gastos: datos.gastosMesAnterior,
    },
    {
      name: 'Mes Actual',
      Ventas: datos.ventasMesActual,
      Gastos: datos.gastosMesActual,
    },
  ];

  // Datos para gráfica de líneas (Cuentas Pagadas)
  const datosCuentasPagadas = [
    {
      name: 'Mes Anterior',
      'Cuentas Pagadas': datos.cuentasPagadasMesAnterior,
    },
    {
      name: 'Mes Actual',
      'Cuentas Pagadas': datos.cuentasPagadas,
    },
  ];

  // Datos para gráfica de pastel (Distribución)
  const datosDistribucion = [
    { name: 'Ventas', value: datos.ventasMesActual },
    { name: 'Gastos', value: datos.gastosMesActual },
    { name: 'Cuentas Pagadas', value: datos.cuentasPagadas },
  ];

  const COLORS = ['#10b981', '#ef4444', '#3b82f6'];

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-blue-100">
        <div className="flex flex-col items-center">
          <Loader2 className="w-12 h-12 text-blue-600 animate-spin mb-4" />
          <p className="text-lg text-blue-700 font-semibold">Cargando datos financieros...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-red-50 to-red-100">
        <div className="flex flex-col items-center">
          <AlertTriangle className="w-12 h-12 text-red-600 mb-4" />
          <p className="text-lg text-red-700 font-semibold">Error: {error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-blue-100 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <h1 className="text-4xl font-extrabold text-gray-900 mb-2">
            📊 Dashboard Financiero
          </h1>
          <p className="text-gray-600">
            Resumen financiero completo con comparación mes a mes
          </p>
        </motion.div>

        {/* Cards de Métricas Principales */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {/* Ventas */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <DashboardCard
              title="Ventas del Mes"
              value={
                <div className="flex items-center justify-between">
                  <span className="text-3xl font-bold text-green-600">
                    {formatCurrency(datos.ventasMesActual)}
                  </span>
                  <div className={`flex items-center ${datos.variacionVentas >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {datos.variacionVentas >= 0 ? (
                      <TrendingUp className="w-5 h-5 mr-1" />
                    ) : (
                      <TrendingDown className="w-5 h-5 mr-1" />
                    )}
                    <span className="text-sm font-semibold">
                      {formatPercent(datos.variacionVentas)}
                    </span>
                  </div>
                </div>
              }
              subtitle={`vs ${formatCurrency(datos.ventasMesAnterior)} mes anterior`}
              badge={
                <span className="bg-green-100 text-green-700 px-2 py-0.5 rounded text-xs font-medium">
                  Ventas
                </span>
              }
            />
          </motion.div>

          {/* Gastos */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <DashboardCard
              title="Gastos del Mes"
              value={
                <div className="flex items-center justify-between">
                  <span className="text-3xl font-bold text-red-600">
                    {formatCurrency(datos.gastosMesActual)}
                  </span>
                  <div className={`flex items-center ${datos.variacionGastos <= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {datos.variacionGastos <= 0 ? (
                      <TrendingDown className="w-5 h-5 mr-1" />
                    ) : (
                      <TrendingUp className="w-5 h-5 mr-1" />
                    )}
                    <span className="text-sm font-semibold">
                      {formatPercent(datos.variacionGastos)}
                    </span>
                  </div>
                </div>
              }
              subtitle={`vs ${formatCurrency(datos.gastosMesAnterior)} mes anterior`}
              badge={
                <span className="bg-red-100 text-red-700 px-2 py-0.5 rounded text-xs font-medium">
                  Gastos
                </span>
              }
            />
          </motion.div>

          {/* Cuentas por Pagar */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            <DashboardCard
              title="Cuentas por Pagar"
              value={
                <span className="text-3xl font-bold text-orange-600">
                  {formatCurrency(datos.cuentasPorPagar)}
                </span>
              }
              subtitle="Total pendiente"
              badge={
                <span className="bg-orange-100 text-orange-700 px-2 py-0.5 rounded text-xs font-medium">
                  Pendiente
                </span>
              }
            />
          </motion.div>

          {/* Cuentas Pagadas */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
          >
            <DashboardCard
              title="Cuentas Pagadas"
              value={
                <div className="flex items-center justify-between">
                  <span className="text-3xl font-bold text-blue-600">
                    {formatCurrency(datos.cuentasPagadas)}
                  </span>
                  <div className={`flex items-center ${datos.variacionCuentasPagadas >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {datos.variacionCuentasPagadas >= 0 ? (
                      <TrendingUp className="w-5 h-5 mr-1" />
                    ) : (
                      <TrendingDown className="w-5 h-5 mr-1" />
                    )}
                    <span className="text-sm font-semibold">
                      {formatPercent(datos.variacionCuentasPagadas)}
                    </span>
                  </div>
                </div>
              }
              subtitle={`vs ${formatCurrency(datos.cuentasPagadasMesAnterior)} mes anterior`}
              badge={
                <span className="bg-blue-100 text-blue-700 px-2 py-0.5 rounded text-xs font-medium">
                  Pagadas
                </span>
              }
            />
          </motion.div>
        </div>

        {/* Gráficas */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Gráfica de Barras - Ventas vs Gastos */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.5 }}
            className="bg-white rounded-2xl shadow-lg p-6"
          >
            <h3 className="text-xl font-bold text-gray-800 mb-4 flex items-center">
              <DollarSign className="w-5 h-5 mr-2 text-green-600" />
              Ventas vs Gastos - Comparación Mensual
            </h3>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={datosComparacion}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip formatter={(value: number) => formatCurrency(value)} />
                <Legend />
                <Bar dataKey="Ventas" fill="#10b981" name="Ventas (USD)" />
                <Bar dataKey="Gastos" fill="#ef4444" name="Gastos (USD)" />
              </BarChart>
            </ResponsiveContainer>
          </motion.div>

          {/* Gráfica de Líneas - Cuentas Pagadas */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.6 }}
            className="bg-white rounded-2xl shadow-lg p-6"
          >
            <h3 className="text-xl font-bold text-gray-800 mb-4 flex items-center">
              <CheckCircle className="w-5 h-5 mr-2 text-blue-600" />
              Cuentas Pagadas - Tendencia
            </h3>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={datosCuentasPagadas}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip formatter={(value: number) => formatCurrency(value)} />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="Cuentas Pagadas"
                  stroke="#3b82f6"
                  strokeWidth={3}
                  name="Cuentas Pagadas (USD)"
                  dot={{ r: 6 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </motion.div>
        </div>

        {/* Gráfica de Pastel - Distribución */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7 }}
          className="bg-white rounded-2xl shadow-lg p-6"
        >
          <h3 className="text-xl font-bold text-gray-800 mb-4 flex items-center">
            <Receipt className="w-5 h-5 mr-2 text-purple-600" />
            Distribución Financiera del Mes Actual
          </h3>
          <ResponsiveContainer width="100%" height={400}>
            <PieChart>
              <Pie
                data={datosDistribucion}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }) => `${name}: ${percent ? (percent * 100).toFixed(0) : 0}%`}
                outerRadius={120}
                fill="#8884d8"
                dataKey="value"
              >
                {datosDistribucion.map((_, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip formatter={(value: number) => formatCurrency(value)} />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </motion.div>

        {/* Resumen de Utilidad */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8 }}
          className="mt-8 bg-gradient-to-r from-green-500 to-emerald-600 rounded-2xl shadow-lg p-6 text-white"
        >
          <h3 className="text-2xl font-bold mb-4">Resumen de Utilidad</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <p className="text-green-100 text-sm mb-1">Ventas Totales</p>
              <p className="text-3xl font-bold">{formatCurrency(datos.ventasMesActual)}</p>
            </div>
            <div>
              <p className="text-green-100 text-sm mb-1">Gastos Totales</p>
              <p className="text-3xl font-bold">{formatCurrency(datos.gastosMesActual)}</p>
            </div>
            <div>
              <p className="text-green-100 text-sm mb-1">Utilidad Neta</p>
              <p className="text-3xl font-bold">
                {formatCurrency(datos.ventasMesActual - datos.gastosMesActual)}
              </p>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default DashboardFinancieroPage;

