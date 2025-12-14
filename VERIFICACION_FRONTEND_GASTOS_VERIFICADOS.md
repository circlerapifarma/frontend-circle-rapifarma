# Verificación Frontend - Gastos Verificados

## ✅ Backend Implementado Correctamente

El backend ha implementado todas las validaciones según el documento. Ahora necesitamos verificar que el frontend esté recibiendo y procesando los datos correctamente.

## 🔍 Pasos de Verificación

### Paso 1: Abrir Consola del Navegador

1. Abre la aplicación en el navegador
2. Presiona `F12` para abrir las herramientas de desarrollador
3. Ve a la pestaña **"Console"**

### Paso 2: Navegar a ResumenFarmacias

1. Navega a la página **ResumenFarmacias**
2. Observa los logs en la consola

**Logs esperados:**
```
useResumenData - Gastos iniciales obtenidos: X total
useResumenData - Gastos verified iniciales: X
useResumenData - Total gastos: X
useResumenData - Rango de fechas: 2024-12-01 a 2024-12-14
useResumenData - Farmacias: X
useResumenData - Farmacia [Nombre] ([ID]): {
  totalGastos: X,
  gastosDeEstaFarmacia: X,
  gastosVerificados: X,
  gastosEnRango: X,
  gastosFiltrados: [...],
  todosGastosFarmacia: [...]
}
```

### Paso 3: Navegar a VentaTotal

1. Navega a la página **VentaTotal**
2. Observa los logs en la consola

**Logs esperados:**
```
=== VentaTotal - Gastos ===
Gastos obtenidos del backend: X total
Rango de fechas: 2024-12-01 a 2024-12-14
Gastos con estado 'verified': X
Detalles de gastos verified: [...]
Gastos filtrados (verified y en rango): X
Total gastos calculado: X
```

## 📊 Interpretación de Logs

### Escenario 1: "Gastos obtenidos del backend: 0"

**Problema:** El backend no está devolviendo gastos o hay error de autenticación.

**Verificar:**
- ✅ Token de autenticación válido
- ✅ Endpoint `/gastos` funciona correctamente
- ✅ No hay error 401 en la consola (pestaña Network)

**Solución:**
- Verificar que el token no haya expirado
- Verificar que el endpoint `/gastos` esté funcionando
- Revisar la pestaña Network para ver la respuesta del backend

---

### Escenario 2: "Gastos con estado 'verified': 0"

**Problema:** No hay gastos con estado "verified" en la base de datos.

**Verificar:**
- ✅ Los gastos en la BD tienen `estado: "verified"` (exactamente, case-sensitive)
- ✅ El backend no está filtrando los gastos verified antes de devolverlos

**Solución:**
- Verificar en la BD que los gastos tengan `estado: "verified"`
- Verificar que el backend no esté filtrando los gastos verified

---

### Escenario 3: "Gastos filtrados (verified y en rango): 0" pero "Gastos con estado 'verified': X"

**Problema:** Los gastos verified están fuera del rango de fechas del mes actual.

**Verificar en los logs:**
- Revisar "Detalles de gastos verified" para ver las fechas
- Verificar que `enRango: false` para todos los gastos

**Ejemplo de log:**
```javascript
Detalles de gastos verified: [
  {
    fecha: "2024-11-30",  // ❌ Fuera del rango (noviembre)
    enRango: false
  },
  {
    fecha: "2024-12-15",  // ❌ Fuera del rango (día 15, hoy es día 14)
    enRango: false
  }
]
```

**Solución:**
- Verificar que las fechas de los gastos estén entre el 1 y el 14 de diciembre
- Si las fechas están correctas pero `enRango: false`, puede ser un problema de formato de fecha

---

### Escenario 4: "gastosDeEstaFarmacia: 0" pero "Gastos con estado 'verified': X"

**Problema:** Los gastos no tienen el campo `localidad` correcto o no coincide con los IDs de farmacias.

**Verificar en los logs:**
- Revisar "todosGastosFarmacia" para ver el campo `localidad`
- Comparar con los IDs de farmacias

**Ejemplo de log:**
```javascript
todosGastosFarmacia: [
  {
    localidad: "Farmacia Centro",  // ❌ Es nombre, no ID
    estado: "verified",
    fecha: "2024-12-14",
    enRango: true
  }
]
```

**Solución:**
- El backend debe convertir nombres de farmacias a IDs
- O actualizar los gastos en la BD para usar IDs en lugar de nombres

---

### Escenario 5: "gastosEnRango: 0" pero "gastosVerificados: X"

**Problema:** Los gastos verified están fuera del rango de fechas.

**Verificar:**
- Revisar "todosGastosFarmacia" para ver las fechas
- Verificar que `enRango: false` para todos

**Solución:**
- Verificar que las fechas estén en el rango correcto (1 al 14 de diciembre)
- Verificar formato de fecha (debe ser "YYYY-MM-DD")

---

### Escenario 6: "Total gastos calculado: 0" pero hay gastos filtrados

**Problema:** Error en la conversión de moneda o cálculo.

**Verificar:**
- Revisar "gastosFiltrados" para ver `monto`, `divisa`, `tasa`
- Verificar que los gastos en Bs tengan `tasa > 0`

**Ejemplo de log:**
```javascript
gastosFiltrados: [
  {
    monto: 50000,
    divisa: "Bs",
    tasa: 0,  // ❌ Falta tasa
    fecha: "2024-12-14"
  }
]
```

**Solución:**
- Verificar que los gastos en Bs tengan `tasa > 0`
- El backend debe validar esto en POST /gastos

---

## 🧪 Prueba Manual

### Prueba 1: Verificar que el backend devuelve gastos

1. Abre la pestaña **Network** en las herramientas de desarrollador
2. Filtra por "gastos"
3. Haz clic en la petición GET `/gastos`
4. Ve a la pestaña **Response**
5. Verifica que devuelva un array con gastos

**Respuesta esperada:**
```json
[
  {
    "_id": "...",
    "localidad": "farmacia_id_1",
    "fecha": "2024-12-14",
    "estado": "verified",
    "monto": 100,
    "divisa": "USD",
    "tasa": 0
  }
]
```

### Prueba 2: Verificar autenticación

1. En la pestaña **Network**, busca la petición GET `/gastos`
2. Ve a la pestaña **Headers**
3. Verifica que tenga `Authorization: Bearer <token>`
4. Verifica que el Status sea `200` (no 401)

---

## 📋 Checklist de Verificación

Usa este checklist para verificar cada punto:

- [ ] **Consola muestra logs correctamente**
  - [ ] Logs de "Gastos obtenidos"
  - [ ] Logs de "Gastos verified"
  - [ ] Logs de "Gastos filtrados"

- [ ] **Backend devuelve gastos**
  - [ ] Petición GET `/gastos` devuelve array
  - [ ] Array contiene gastos con `estado: "verified"`
  - [ ] No hay error 401

- [ ] **Estructura de datos correcta**
  - [ ] Campo `localidad` es ID de farmacia
  - [ ] Campo `fecha` está en formato "YYYY-MM-DD"
  - [ ] Campo `estado` es "verified"
  - [ ] Campo `tasa` > 0 para gastos en Bs

- [ ] **Filtrado funciona**
  - [ ] Gastos verified aparecen en logs
  - [ ] Gastos en rango aparecen en logs
  - [ ] Total calculado es > 0

---

## 🚨 Problemas Comunes y Soluciones

### Problema: Logs muestran 0 gastos pero backend devuelve gastos

**Causa:** Problema de autenticación o formato de respuesta.

**Solución:**
1. Verificar que el token sea válido
2. Verificar que la respuesta del backend sea un array
3. Verificar que no haya errores en la consola

---

### Problema: Gastos aparecen en logs pero no en la UI

**Causa:** Problema en el renderizado o cálculo.

**Solución:**
1. Verificar que `gastosPorFarmacia` tenga valores > 0
2. Verificar que el componente `ResumeCardFarmacia` reciba el prop `gastos`
3. Verificar que el cálculo del total sea correcto

---

### Problema: Gastos aparecen en VentaTotal pero no en ResumenFarmacias

**Causa:** Campo `localidad` incorrecto o vacío.

**Solución:**
1. Verificar que `localidad` sea ID de farmacia válido
2. Verificar que coincida con los IDs de `/farmacias`
3. Actualizar gastos en BD si es necesario

---

## ✅ Una vez verificado

Después de verificar los logs, deberías poder identificar exactamente dónde está el problema:

1. **Si "Gastos obtenidos: 0"** → Problema de autenticación o backend
2. **Si "Gastos verified: 0"** → No hay gastos con estado "verified"
3. **Si "Gastos en rango: 0"** → Fechas fuera del rango
4. **Si "gastosDeEstaFarmacia: 0"** → Campo `localidad` incorrecto
5. **Si "Total: 0" pero hay gastos** → Problema en conversión de moneda

Comparte los logs con el equipo para identificar y resolver el problema rápidamente.

