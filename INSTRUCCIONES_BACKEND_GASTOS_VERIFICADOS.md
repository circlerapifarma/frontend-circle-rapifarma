# Instrucciones Backend - Gastos Verificados en Resúmenes

## Objetivo
Implementar la funcionalidad para que los gastos verificados aparezcan correctamente en:
1. **ResumenFarmacias**: En el apartado "Gastos Verificados" de cada farmacia
2. **VentaTotal**: En la sección "Resúmenes > Mes a la fecha > Gastos" (suma de todos los gastos de todas las farmacias)

## Requisitos

### 1. Endpoint GET `/gastos`
**Comportamiento actual:**
- Debe devolver todos los gastos o permitir filtrar por localidad

**Requisitos adicionales:**
- Los gastos deben incluir el campo `fecha` (fecha del gasto, no fecha de registro)
- Los gastos deben incluir el campo `fechaRegistro` (opcional, fecha cuando se registró)
- Los gastos deben incluir el campo `estado` con valores: `"wait"`, `"verified"`, `"denied"`
- Los gastos deben incluir el campo `localidad` (ID de la farmacia)
- Los gastos deben incluir el campo `monto` (monto del gasto)
- Los gastos deben incluir el campo `divisa` (`"USD"` o `"Bs"`)
- Los gastos deben incluir el campo `tasa` (tasa de cambio si la divisa es Bs)

**Estructura esperada de un gasto:**
```json
{
  "_id": "string",
  "titulo": "string",
  "descripcion": "string",
  "monto": number,
  "divisa": "USD" | "Bs",
  "tasa": number,
  "localidad": "string (ID de farmacia)",
  "fecha": "YYYY-MM-DD",
  "fechaRegistro": "YYYY-MM-DD (opcional)",
  "estado": "wait" | "verified" | "denied",
  "imagenGasto": "string (opcional)",
  "imagenesGasto": ["string"] (opcional)
}
```

### 2. Filtrado por Fecha
**Importante:** El frontend filtra los gastos verificados por el campo `fecha` (fecha del gasto), no por `fechaRegistro`.

**Ejemplo:**
- Si estamos en el mes 12, día 14
- Deben aparecer todos los gastos verificados donde:
  - `estado === "verified"`
  - `fecha` esté entre el día 1 y el día 14 del mes 12
  - `localidad` corresponda a la farmacia (para ResumenFarmacias)

### 3. Endpoint GET `/gastos/estado` (Ya existe)
**Verificar que:**
- Permite filtrar por estado: `?estado=verified`
- Permite filtrar por localidad: `?localidad=<id>`
- Devuelve los gastos con la estructura completa mencionada arriba

### 4. Conversión de Moneda
**Lógica de conversión:**
- Si `divisa === "Bs"` y `tasa > 0`:
  - Monto en USD = `monto / tasa`
- Si `divisa === "USD"`:
  - Monto en USD = `monto`

**Todos los totales deben mostrarse en USD.**

## Endpoints Necesarios

### GET `/gastos`
**Query Parameters opcionales:**
- `localidad`: Filtrar por ID de farmacia
- `estado`: Filtrar por estado (`wait`, `verified`, `denied`)

**Respuesta:**
```json
[
  {
    "_id": "string",
    "titulo": "string",
    "descripcion": "string",
    "monto": 100.50,
    "divisa": "USD",
    "tasa": 0,
    "localidad": "farmacia_id_1",
    "fecha": "2024-12-14",
    "fechaRegistro": "2024-12-14T10:30:00Z",
    "estado": "verified",
    "imagenGasto": "url_imagen",
    "imagenesGasto": ["url1", "url2"]
  }
]
```

### GET `/gastos/estado`
**Query Parameters:**
- `estado` (requerido): `wait`, `verified`, o `denied`
- `localidad` (opcional): ID de farmacia

**Respuesta:** Misma estructura que `/gastos`

### PATCH `/gastos/estado`
**Body:**
```json
{
  "id": "gasto_id",
  "estado": "verified" | "denied"
}
```

**Comportamiento:**
- Actualiza el estado del gasto
- Debe mantener todos los demás campos intactos
- Debe devolver el gasto actualizado

## Validaciones Importantes

1. **Campo `fecha`:**
   - Debe estar en formato `YYYY-MM-DD`
   - Debe ser la fecha del gasto (no la fecha de registro)
   - No debe ser null o undefined

2. **Campo `estado`:**
   - Solo puede ser: `"wait"`, `"verified"`, `"denied"`
   - Por defecto debe ser `"wait"` cuando se crea un gasto

3. **Campo `localidad`:**
   - Debe corresponder a un ID de farmacia válido
   - No debe ser null o undefined

4. **Campo `tasa`:**
   - Si `divisa === "Bs"`, debe ser un número > 0
   - Si `divisa === "USD"`, puede ser 0 o no estar presente

## Casos de Uso

### Caso 1: ResumenFarmacias
**Flujo:**
1. Frontend llama a `GET /gastos`
2. Frontend filtra:
   - `estado === "verified"`
   - `localidad === <id_farmacia>`
   - `fecha >= fechaInicio && fecha <= fechaFin` (rango del mes actual)
3. Frontend calcula total en USD:
   - Si `divisa === "Bs"`: `monto / tasa`
   - Si `divisa === "USD"`: `monto`
4. Frontend muestra el total en "Gastos Verificados" de cada farmacia

### Caso 2: VentaTotal
**Flujo:**
1. Frontend llama a `GET /gastos`
2. Frontend filtra:
   - `estado === "verified"`
   - `fecha >= fechaInicio && fecha <= fechaFin` (rango del mes actual)
3. Frontend suma todos los gastos (de todas las farmacias) en USD
4. Frontend muestra el total en "Resúmenes > Mes a la fecha > Gastos"

## Ejemplo de Filtrado por Mes

**Si estamos en diciembre 2024, día 14:**
- `fechaInicio`: `2024-12-01`
- `fechaFin`: `2024-12-14`
- Deben aparecer todos los gastos verificados donde:
  - `fecha >= "2024-12-01" && fecha <= "2024-12-14"`
  - `estado === "verified"`

## Notas Adicionales

1. **Performance:**
   - Si hay muchos gastos, considerar agregar índices en la base de datos para:
     - `estado`
     - `localidad`
     - `fecha`

2. **Consistencia:**
   - Asegurar que cuando un gasto se verifica (estado cambia a `"verified"`), el campo `fecha` no cambie
   - El campo `fecha` debe ser la fecha original del gasto, no la fecha de verificación

3. **Validación de Datos:**
   - Verificar que todos los gastos tengan el campo `fecha` correctamente formateado
   - Verificar que los gastos verificados tengan `localidad` válida

## Testing

**Casos de prueba sugeridos:**

1. Crear un gasto con `estado: "wait"` y verificar que no aparezca en los resúmenes
2. Verificar un gasto (cambiar a `"verified"`) y verificar que aparezca en ResumenFarmacias
3. Verificar un gasto y verificar que aparezca en VentaTotal
4. Crear gastos con fechas del mes anterior y verificar que no aparezcan
5. Crear gastos con fechas del mes actual y verificar que aparezcan
6. Crear gastos en Bs con tasa y verificar que se conviertan correctamente a USD
7. Crear gastos en USD y verificar que se muestren correctamente

## Prioridad
**ALTA** - Esta funcionalidad es crítica para el sistema de resúmenes financieros.

