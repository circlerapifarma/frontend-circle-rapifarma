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
            return res.json();
        },
        enabled: !!farmacia && !!dia,
    });
};
