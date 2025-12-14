# Verificaciones Backend - Gastos Verificados

## ✅ Cambios Subidos al Frontend

Los cambios en el frontend ya están subidos. Ahora necesitas verificar lo siguiente en el backend:

## 🔍 Verificaciones Críticas del Backend

### 1. **Endpoint GET `/gastos` - Autenticación**

**Verificar:**
- ✅ El endpoint acepta el header `Authorization: Bearer <token>`
- ✅ Si requiere autenticación, debe validar el token correctamente
- ✅ Si no requiere autenticación, debe funcionar sin el header

**Problema detectado:**
- El frontend está enviando el token pero puede que el backend esté rechazando la petición (error 401)

**Solución:**
- Verificar la configuración de CORS y autenticación del endpoint `/gastos`
- Asegurar que el middleware de autenticación permita este endpoint o lo valide correctamente

---

### 2. **Estructura de Datos de Gastos**

**Verificar que cada gasto tenga estos campos:**

```json
{
  "_id": "string",
  "titulo": "string",
  "descripcion": "string",
  "monto": number,
  "divisa": "USD" | "Bs",
  "tasa": number,  // Si divisa es "Bs", debe ser > 0
  "localidad": "string",  // ⚠️ CRÍTICO: ID de la farmacia
  "fecha": "YYYY-MM-DD",  // ⚠️ CRÍTICO: Fecha del gasto (no fechaRegistro)
  "fechaRegistro": "YYYY-MM-DD",  // Opcional
  "estado": "wait" | "verified" | "denied",  // ⚠️ CRÍTICO
  "imagenGasto": "string",  // Opcional
  "imagenesGasto": ["string"]  // Opcional
}
```

**Campos críticos a verificar:**

1. **`localidad`**: 
   - ✅ Debe ser el ID de la farmacia (no el nombre)
   - ✅ Debe coincidir con los IDs que devuelve `/farmacias`
   - ❌ Si está vacío o null, los gastos no aparecerán en ResumenFarmacias

2. **`fecha`**:
   - ✅ Debe estar en formato `YYYY-MM-DD` (ejemplo: "2024-12-14")
   - ✅ Debe ser la fecha del gasto, no la fecha de registro
   - ❌ Si está en otro formato, el filtrado por fecha fallará

3. **`estado`**:
   - ✅ Solo puede ser: `"wait"`, `"verified"`, o `"denied"`
   - ✅ Los gastos verificados deben tener `estado: "verified"`
   - ❌ Si el estado es null o tiene otro valor, no aparecerán

4. **`tasa`**:
   - ✅ Si `divisa === "Bs"`, debe ser un número > 0
   - ✅ Si `divisa === "USD"`, puede ser 0 o no estar presente
   - ❌ Si falta la tasa para gastos en Bs, la conversión a USD fallará

---

### 3. **Endpoint GET `/inventarios` - Autenticación**

**Problema detectado:**
- Error 401 (Unauthorized) al acceder a `/inventarios`

**Verificar:**
- ✅ El endpoint acepta el header `Authorization: Bearer <token>`
- ✅ Si requiere autenticación, debe validar el token correctamente
- ✅ Verificar la configuración de CORS

---

### 4. **Filtrado por Fecha**

**Comportamiento esperado:**
- El frontend filtra gastos donde:
  - `fecha >= "YYYY-MM-01"` (primer día del mes actual)
  - `fecha <= "YYYY-MM-DD"` (día actual)

**Ejemplo (si estamos en diciembre 14, 2024):**
- `fechaInicio`: "2024-12-01"
- `fechaFin`: "2024-12-14"
- Deben aparecer todos los gastos verificados del 1 al 14 de diciembre

**Verificar en el backend:**
- ✅ El campo `fecha` está guardado correctamente en formato `YYYY-MM-DD`
- ✅ Los gastos verificados tienen fechas dentro del mes actual
- ✅ No hay problemas de zona horaria que afecten las fechas

---

### 5. **Endpoint PATCH `/gastos/estado`**

**Verificar:**
- ✅ Cuando se actualiza el estado a `"verified"`, el campo `fecha` NO cambia
- ✅ El campo `localidad` se mantiene intacto
- ✅ Todos los demás campos se mantienen intactos
- ✅ Devuelve el gasto actualizado correctamente

---

## 🧪 Pruebas Recomendadas

### Prueba 1: Verificar estructura de datos
```bash
# Hacer una petición GET a /gastos
# Verificar que todos los gastos tengan:
# - localidad (ID de farmacia)
# - fecha (formato YYYY-MM-DD)
# - estado ("wait", "verified", o "denied")
# - monto, divisa, tasa
```

### Prueba 2: Verificar gastos verificados
```bash
# Filtrar gastos con estado "verified"
# Verificar que tengan:
# - localidad válida (coincide con IDs de /farmacias)
# - fecha dentro del mes actual
```

### Prueba 3: Verificar autenticación
```bash
# Hacer petición GET /gastos con header Authorization
# Verificar que no devuelva 401
# Hacer petición GET /inventarios con header Authorization
# Verificar que no devuelva 401
```

### Prueba 4: Verificar conversión de moneda
```bash
# Crear un gasto en Bs con tasa
# Verificar que: monto / tasa = monto en USD
# Ejemplo: monto = 1000 Bs, tasa = 40 → 1000 / 40 = 25 USD
```

---

## 📊 Logs del Frontend para Depuración

Cuando abras la consola del navegador (F12), verás logs como:

```
useResumenData - Gastos iniciales obtenidos: X total
useResumenData - Gastos verified iniciales: X
useResumenData - Total gastos: X
useResumenData - Rango de fechas: YYYY-MM-01 a YYYY-MM-DD
useResumenData - Farmacia [Nombre] ([ID]): {
  totalGastos: X,
  gastosDeEstaFarmacia: X,
  gastosVerificados: X,
  gastosEnRango: X,
  gastosFiltrados: [...]
}
```

**Si ves estos problemas en los logs:**

1. **"Gastos iniciales obtenidos: 0"**
   - ❌ El backend no está devolviendo gastos o hay error de autenticación
   - ✅ Verificar endpoint `/gastos` y autenticación

2. **"Gastos verified iniciales: 0"**
   - ❌ No hay gastos con estado "verified"
   - ✅ Verificar que los gastos verificados tengan `estado: "verified"`

3. **"gastosEnRango: 0"**
   - ❌ Los gastos están fuera del rango de fechas del mes actual
   - ✅ Verificar el campo `fecha` de los gastos

4. **"gastosDeEstaFarmacia: 0"**
   - ❌ Los gastos no tienen el campo `localidad` correcto
   - ✅ Verificar que `localidad` coincida con los IDs de `/farmacias`

---

## 🚨 Problemas Comunes y Soluciones

### Problema: Gastos no aparecen en ResumenFarmacias
**Causas posibles:**
1. Campo `localidad` vacío o incorrecto
2. Estado no es "verified"
3. Fecha fuera del rango del mes actual
4. Error de autenticación (401)

**Solución:**
- Verificar los logs del frontend
- Verificar la estructura de datos en el backend
- Asegurar que los gastos verificados tengan todos los campos correctos

### Problema: Error 401 en `/gastos` o `/inventarios`
**Causas posibles:**
1. Token inválido o expirado
2. Middleware de autenticación rechazando la petición
3. CORS mal configurado

**Solución:**
- Verificar que el token sea válido
- Verificar la configuración del middleware de autenticación
- Verificar la configuración de CORS

### Problema: Total de gastos en $0
**Causas posibles:**
1. No hay gastos verificados
2. Los gastos están fuera del rango de fechas
3. Error en la conversión de moneda (tasa incorrecta)

**Solución:**
- Verificar los logs del frontend
- Verificar que haya gastos con `estado: "verified"`
- Verificar que las fechas estén en el rango correcto
- Verificar que la tasa sea correcta para gastos en Bs

---

## ✅ Checklist de Verificación

- [ ] Endpoint `/gastos` acepta autenticación y devuelve datos
- [ ] Endpoint `/inventarios` acepta autenticación y devuelve datos
- [ ] Los gastos tienen el campo `localidad` con ID de farmacia válido
- [ ] Los gastos tienen el campo `fecha` en formato `YYYY-MM-DD`
- [ ] Los gastos verificados tienen `estado: "verified"`
- [ ] Los gastos en Bs tienen el campo `tasa` > 0
- [ ] El endpoint `PATCH /gastos/estado` actualiza correctamente el estado
- [ ] No hay errores 401 en las peticiones
- [ ] Los logs del frontend muestran gastos correctamente

---

## 📝 Notas Adicionales

- El frontend calcula el rango de fechas dinámicamente (mes actual hasta día de hoy)
- El frontend convierte automáticamente Bs a USD usando la tasa
- El frontend actualiza los gastos automáticamente cada 60 segundos
- Los logs del frontend ayudan a identificar exactamente dónde está el problema

