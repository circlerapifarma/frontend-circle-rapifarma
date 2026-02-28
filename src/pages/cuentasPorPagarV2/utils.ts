export const formatFecha = (fechaISO: string) => {
    if (!fechaISO) return "-";
    const date = new Date(fechaISO);
    if (isNaN(date.getTime())) return "-";
    const userTimezoneOffset = date.getTimezoneOffset() * 60000;
    return new Date(date.getTime() + userTimezoneOffset).toLocaleDateString('es-VE', {
        day: '2-digit', month: '2-digit', year: 'numeric'
    });
};

export const calcularDiasRestantes = (fechaEmision: string, diasCredito: number) => {
    const fechaVenc = new Date(fechaEmision);
    fechaVenc.setDate(fechaVenc.getDate() + diasCredito);
    const hoy = new Date();
    return Math.ceil((fechaVenc.getTime() - hoy.getTime()) / (1000 * 60 * 60 * 24));
};