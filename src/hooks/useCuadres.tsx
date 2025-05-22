// src/hooks/useCuadres.ts
import { useQuery } from "@tanstack/react-query";

export const useCuadres = (farmacia: string, dia: string) => {
    return useQuery({
        queryKey: ["cuadres", farmacia, dia],
        queryFn: async () => {
            const res = await fetch(
                `/api/cuadres?farmacia=${farmacia}&dia=${dia}`
            );
            if (!res.ok) throw new Error("Error al obtener cuadres");
            const data = await res.json();

            // Asegúrate de que cada objeto tenga sobranteUsd y faltanteUsd, y si no existen, calcúlalos a partir de diferenciaUsd
            const cuadresConSobranteYFaltante = data.map((cuadre: any) => ({
                ...cuadre,
                sobranteUsd:
                    cuadre.sobranteUsd ??
                    (cuadre.diferenciaUsd > 0 ? cuadre.diferenciaUsd : 0),
                faltanteUsd:
                    cuadre.faltanteUsd ??
                    (cuadre.diferenciaUsd < 0
                        ? Math.abs(cuadre.diferenciaUsd)
                        : 0),
            }));

            return cuadresConSobranteYFaltante;
        },
        enabled: !!farmacia && !!dia,
    });
};
