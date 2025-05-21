import { useQuery } from "@tanstack/react-query";

export function useCuadresFarmacia(farmaciaId: string) {
    return useQuery({
        queryKey: ["cuadres", farmaciaId],
        queryFn: async () => {
            const res = await fetch(`http://localhost:8000/cuadres/${farmaciaId}`, {
                method: "GET",
            });
            if (!res.ok) throw new Error("Error al obtener cuadres");
            return res.json();
        },
        enabled: !!farmaciaId,
    });
}