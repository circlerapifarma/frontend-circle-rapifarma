import React, { useEffect, useState } from "react";
import { Loader2, AlertTriangle, DollarSign, PlusCircle, MinusCircle } from "lucide-react";
import { motion } from "framer-motion";

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.15 },
  },
};

const cardVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.4, type: "spring", stiffness: 80 },
  },
};

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

const TotalGeneralFarmaciasPage: React.FC = () => {
  const [totalGeneral, setTotalGeneral] = useState<number | null>(null);
  const [totalSobrantes, setTotalSobrantes] = useState<number | null>(null);
  const [totalFaltantes, setTotalFaltantes] = useState<number | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchTotalGeneral = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/cuadres/all`);
        const data = await response.json();
        const verifiedData = data.filter((cuadre: any) => cuadre.estado === "verified");
        const total = verifiedData.reduce((acc: number, cuadre: any) => acc + cuadre.totalGeneralUsd, 0);
        const sobrantes = verifiedData.reduce((acc: number, cuadre: any) => acc + (cuadre.sobranteUsd || 0), 0);
        const faltantes = verifiedData.reduce((acc: number, cuadre: any) => acc + (cuadre.faltanteUsd || 0), 0);
        setTotalGeneral(total);
        setTotalSobrantes(sobrantes);
        setTotalFaltantes(faltantes);
      } catch {
        setError("Error al obtener el total general de las farmacias");
      } finally {
        setLoading(false);
      }
    };

    fetchTotalGeneral();
  }, []);

  return (
    <div className="min-h-screen bg-white flex items-center justify-center px-4 py-12">
      <div className="max-w-4xl w-full text-center space-y-8">
        <h1 className="text-3xl md:text-4xl font-bold text-gray-800">Resumen General de Ventas</h1>

        {loading ? (
          <div className="flex items-center justify-center text-gray-600 text-lg gap-2 animate-pulse">
            <Loader2 className="animate-spin" /> Cargando datos...
          </div>
        ) : error ? (
          <div className="text-red-600 flex items-center justify-center gap-2 text-lg">
            <AlertTriangle className="w-6 h-6" /> {error}
          </div>
        ) : (
          <motion.div
            className="grid md:grid-cols-3 gap-6"
            variants={containerVariants}
            initial="hidden"
            animate="visible"
          >
            {/* CARD GENERAL */}
            <motion.div
              variants={cardVariants}
              whileHover={{ scale: 1.03 }}
              className="rounded-xl border border-gray-200 bg-blue-50 p-6 space-y-3 shadow-sm"
            >
              <div className="flex justify-center text-blue-400">
                <DollarSign className="w-7 h-7" />
              </div>
              <h2 className="text-lg font-semibold text-gray-700">Total General (USD)</h2>
              <p className="text-2xl font-bold text-gray-900">${totalGeneral?.toFixed(2)}</p>
            </motion.div>

            {/* CARD SOBRANTES */}
            <motion.div
              variants={cardVariants}
              whileHover={{ scale: 1.03 }}
              className="rounded-xl border border-gray-200 bg-green-50 p-6 space-y-3 shadow-sm"
            >
              <div className="flex justify-center text-green-400">
                <PlusCircle className="w-7 h-7" />
              </div>
              <h2 className="text-lg font-semibold text-gray-700">Total Sobrantes (USD)</h2>
              <p className="text-2xl font-bold text-gray-900">${totalSobrantes?.toFixed(2)}</p>
            </motion.div>

            {/* CARD FALTANTES */}
            <motion.div
              variants={cardVariants}
              whileHover={{ scale: 1.03 }}
              className="rounded-xl border border-gray-200 bg-red-50 p-6 space-y-3 shadow-sm"
            >
              <div className="flex justify-center text-red-400">
                <MinusCircle className="w-7 h-7" />
              </div>
              <h2 className="text-lg font-semibold text-gray-700">Total Faltantes (USD)</h2>
              <p className="text-2xl font-bold text-gray-900">${totalFaltantes?.toFixed(2)}</p>
            </motion.div>
          </motion.div>
        )}
      </div>
    </div>
  );
};

export default TotalGeneralFarmaciasPage;
