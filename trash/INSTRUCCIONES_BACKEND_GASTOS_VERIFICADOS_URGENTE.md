# Instrucciones Backend - Gastos Verificados NO Aparecen (URGENTE)

## 🚨 Problema Actual

**Situación:**
- Ya existen gastos verificados en la base de datos
- Rango de fechas: 1 al 14 de diciembre (mes 12)
- Los gastos NO aparecen en:
  - ResumenFarmacias (apartado "Gastos Verificados")
  - VentaTotal (sección "Resúmenes > Mes a la fecha > Gastos")

## ✅ Verificaciones Inmediatas

### 1. **Endpoint GET `/gastos` - Verificar Respuesta**

**Acción requerida:**
Hacer una petición GET a `/gastos` y verificar que devuelva los gastos verificados.

**Petición de prueba:**
```bash
GET https://backend-circle-rapifarma.onrender.com/gastos
Headers:
  Authorization: Bearer <token>
```

**Verificar en la respuesta:**
1. ✅ Que devuelva un array de gastos (no un objeto vacío)
2. ✅ Que incluya gastos con `estado: "verified"`
3. ✅ Que los gastos tengan fechas del 1 al 14 de diciembre 2024

**Ejemplo de respuesta esperada:**
```json
[
  {
    "_id": "gasto_id_1",
    "titulo": "Gasto ejemplo",
    "descripcion": "Descripción del gasto",
    "monto": 100,
    "divisa": "USD",
    "tasa": 0,
    "localidad": "farmacia_id_1",
    "fecha": "2024-12-14",
    "estado": "verified"
  },
  {
    "_id": "gasto_id_2",
    "titulo": "Otro gasto",
    "monto": 50000,
    "divisa": "Bs",
    "tasa": 40,
    "localidad": "farmacia_id_2",
    "fecha": "2024-12-10",
    "estado": "verified"
  }
]
```

---

### 2. **Verificar Estructura de Datos en Base de Datos**

**Consulta SQL/MongoDB para verificar gastos verificados:**

**Si usas MongoDB:**
```javascript
db.gastos.find({
  estado: "verified",
  fecha: {
    $gte: "2024-12-01",
    $lte: "2024-12-14"
  }
})
```

**Si usas SQL:**
```sql
SELECT * FROM gastos 
WHERE estado = 'verified' 
AND fecha >= '2024-12-01' 
AND fecha <= '2024-12-14';
```

**Verificar que cada gasto tenga:**

| Campo | Tipo | Requerido | Ejemplo | ⚠️ Problema si falta |
|-------|------|-----------|---------|---------------------|
| `_id` | string | ✅ | "gasto123" | No crítico para filtrado |
| `localidad` | string | ✅ | "farmacia_id_1" | ❌ **NO aparecerá en ResumenFarmacias** |
| `fecha` | string | ✅ | "2024-12-14" | ❌ **NO aparecerá en ningún módulo** |
| `estado` | string | ✅ | "verified" | ❌ **NO aparecerá en ningún módulo** |
| `monto` | number | ✅ | 100 | No se calculará correctamente |
| `divisa` | string | ✅ | "USD" o "Bs" | No se calculará correctamente |
| `tasa` | number | ⚠️ | 40 | ❌ **Si es Bs sin tasa, conversión fallará** |

---

### 3. **Verificar Campo `localidad`**

**⚠️ CRÍTICO:** El campo `localidad` debe ser el **ID de la farmacia**, no el nombre.

**Verificar:**
1. Hacer petición GET a `/farmacias` para obtener los IDs válidos
2. Comparar los IDs con el campo `localidad` de los gastos
3. Asegurar que coincidan exactamente

**Ejemplo:**
```bash
# Obtener farmacias
GET /farmacias
Respuesta: {
  "farmacias": {
    "farmacia_id_1": "Farmacia Centro",
    "farmacia_id_2": "Farmacia Norte"
  }
}

# Verificar que los gastos usen estos IDs
Gasto.localidad debe ser: "farmacia_id_1" o "farmacia_id_2"
NO debe ser: "Farmacia Centro" o "Farmacia Norte"
```

**Si el campo `localidad` está vacío o tiene un valor incorrecto:**
- ❌ Los gastos NO aparecerán en ResumenFarmacias
- ✅ Pero SÍ aparecerán en VentaTotal (suma total)

---

### 4. **Verificar Formato de Fecha**

**⚠️ CRÍTICO:** El campo `fecha` debe estar en formato `YYYY-MM-DD`.

**Formatos válidos:**
- ✅ `"2024-12-14"`
- ✅ `"2024-12-01"`
- ✅ `"2024-12-10"`

**Formatos inválidos:**
- ❌ `"14/12/2024"` (formato DD/MM/YYYY)
- ❌ `"2024-12-14T10:30:00Z"` (con hora)
- ❌ `"14-12-2024"` (formato DD-MM-YYYY)
- ❌ `Date object` (debe ser string)

**Verificar en base de datos:**
```javascript
// MongoDB
db.gastos.find({ estado: "verified" }).forEach(function(gasto) {
  print("Fecha: " + gasto.fecha + " - Tipo: " + typeof gasto.fecha);
});
```

**Si la fecha está en formato incorrecto:**
- El frontend no podrá comparar correctamente
- Los gastos NO aparecerán aunque estén en el rango correcto

---

### 5. **Verificar Autenticación**

**Problema detectado:**
- Error 401 (Unauthorized) en algunas peticiones

**Verificar:**
1. El endpoint `/gastos` debe aceptar el header `Authorization: Bearer <token>`
2. Si el token es válido, debe devolver los gastos
3. Si el token es inválido o expirado, debe devolver 401 con mensaje claro

**Middleware de autenticación:**
```javascript
// Ejemplo de middleware
app.get('/gastos', authenticateToken, async (req, res) => {
  // authenticateToken debe validar el token
  // Si es válido, continuar
  // Si no, devolver 401
});
```

**Si hay error 401:**
- ❌ El frontend no puede obtener los gastos
- ❌ Los módulos mostrarán $0

---

### 6. **Verificar Conversión de Moneda**

**Para gastos en Bs:**
- Debe tener campo `tasa` con valor > 0
- El cálculo es: `montoUSD = montoBs / tasa`

**Ejemplo:**
```json
{
  "monto": 50000,
  "divisa": "Bs",
  "tasa": 40,
  // Cálculo: 50000 / 40 = 1250 USD
}
```

**Si falta la tasa:**
- ❌ El cálculo fallará
- ❌ El gasto no se sumará correctamente

---

## 🔧 Correcciones Necesarias

### Corrección 1: Verificar y Corregir Campo `localidad`

**Si los gastos tienen `localidad` incorrecta:**

**Opción A - Actualizar en base de datos:**
```javascript
// MongoDB - Actualizar gastos con localidad incorrecta
db.gastos.updateMany(
  { estado: "verified", localidad: "Farmacia Centro" },
  { $set: { localidad: "farmacia_id_1" } }
);
```

**Opción B - Corregir en el endpoint:**
```javascript
// En el endpoint GET /gastos
// Mapear nombres de farmacias a IDs antes de devolver
const gastos = await db.gastos.find({ estado: "verified" });
const farmacias = await db.farmacias.find();

const gastosCorregidos = gastos.map(gasto => {
  // Si localidad es nombre, convertir a ID
  const farmacia = farmacias.find(f => f.nombre === gasto.localidad);
  if (farmacia) {
    gasto.localidad = farmacia._id;
  }
  return gasto;
});
```

---

### Corrección 2: Verificar y Corregir Formato de Fecha

**Si las fechas están en formato incorrecto:**

**Opción A - Actualizar en base de datos:**
```javascript
// MongoDB - Convertir fechas a formato YYYY-MM-DD
db.gastos.find({ estado: "verified" }).forEach(function(gasto) {
  if (gasto.fecha instanceof Date) {
    const fechaStr = gasto.fecha.toISOString().split('T')[0];
    db.gastos.updateOne(
      { _id: gasto._id },
      { $set: { fecha: fechaStr } }
    );
  }
});
```

**Opción B - Formatear en el endpoint:**
```javascript
// En el endpoint GET /gastos
const gastos = await db.gastos.find({ estado: "verified" });
const gastosFormateados = gastos.map(gasto => ({
  ...gasto,
  fecha: formatDate(gasto.fecha) // Función que convierte a YYYY-MM-DD
}));
```

---

### Corrección 3: Verificar Autenticación

**Si el endpoint rechaza peticiones autenticadas:**

```javascript
// Asegurar que el middleware de autenticación permita GET /gastos
app.get('/gastos', authenticateToken, async (req, res) => {
  try {
    const gastos = await db.gastos.find({});
    res.json(gastos);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// O si no requiere autenticación:
app.get('/gastos', async (req, res) => {
  try {
    const gastos = await db.gastos.find({});
    res.json(gastos);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
```

---

## 📋 Checklist de Verificación

Usa este checklist para verificar cada punto:

- [ ] **Endpoint `/gastos` devuelve array de gastos**
  - [ ] Incluye gastos con `estado: "verified"`
  - [ ] Incluye gastos del 1 al 14 de diciembre

- [ ] **Campo `localidad` es correcto**
  - [ ] Es el ID de la farmacia (no el nombre)
  - [ ] Coincide con los IDs de `/farmacias`
  - [ ] No está vacío ni es null

- [ ] **Campo `fecha` es correcto**
  - [ ] Está en formato `YYYY-MM-DD`
  - [ ] Es string (no Date object)
  - [ ] Las fechas están entre "2024-12-01" y "2024-12-14"

- [ ] **Campo `estado` es correcto**
  - [ ] Tiene valor `"verified"` (exactamente, case-sensitive)
  - [ ] No es null ni undefined

- [ ] **Autenticación funciona**
  - [ ] Endpoint acepta `Authorization: Bearer <token>`
  - [ ] No devuelve error 401 con token válido
  - [ ] Devuelve los gastos correctamente

- [ ] **Conversión de moneda**
  - [ ] Gastos en Bs tienen campo `tasa` > 0
  - [ ] Gastos en USD tienen `tasa` = 0 o no tienen tasa

---

## 🧪 Pruebas Recomendadas

### Prueba 1: Verificar que los gastos se devuelven
```bash
curl -X GET https://backend-circle-rapifarma.onrender.com/gastos \
  -H "Authorization: Bearer <token>"
```

**Resultado esperado:**
- Status 200
- Array con gastos verificados
- Cada gasto tiene `localidad`, `fecha`, `estado`, `monto`, `divisa`

### Prueba 2: Verificar estructura de un gasto específico
```bash
# Obtener un gasto específico
curl -X GET https://backend-circle-rapifarma.onrender.com/gastos/<gasto_id> \
  -H "Authorization: Bearer <token>"
```

**Verificar:**
- `localidad` es un ID válido de farmacia
- `fecha` está en formato `YYYY-MM-DD`
- `estado` es `"verified"`
- Si `divisa === "Bs"`, tiene `tasa > 0`

### Prueba 3: Verificar filtrado por fecha
```bash
# Obtener gastos del 1 al 14 de diciembre
curl -X GET "https://backend-circle-rapifarma.onrender.com/gastos?fechaInicio=2024-12-01&fechaFin=2024-12-14" \
  -H "Authorization: Bearer <token>"
```

**Resultado esperado:**
- Solo gastos con fechas entre 2024-12-01 y 2024-12-14

---

## 🚨 Problemas Comunes y Soluciones

### Problema: Gastos no aparecen aunque existen en BD

**Causas posibles:**
1. Campo `localidad` incorrecto o vacío
2. Campo `fecha` en formato incorrecto
3. Campo `estado` no es exactamente `"verified"`
4. Error de autenticación (401)

**Solución:**
1. Verificar estructura de datos en BD
2. Corregir campos incorrectos
3. Verificar autenticación del endpoint

---

### Problema: Gastos aparecen en VentaTotal pero no en ResumenFarmacias

**Causa:**
- Campo `localidad` está vacío o tiene valor incorrecto

**Solución:**
- Actualizar campo `localidad` con IDs válidos de farmacias

---

### Problema: Total de gastos es $0 aunque hay gastos verificados

**Causas posibles:**
1. Fechas fuera del rango del mes actual
2. Error en conversión de moneda (tasa incorrecta)
3. Error de autenticación

**Solución:**
1. Verificar fechas de los gastos
2. Verificar tasa para gastos en Bs
3. Verificar autenticación

---

## 📝 Resumen de Acciones Inmediatas

1. **Verificar endpoint `/gastos`:**
   - Hacer petición GET y verificar respuesta
   - Asegurar que devuelve gastos verificados

2. **Verificar estructura de datos:**
   - Campo `localidad` con ID de farmacia válido
   - Campo `fecha` en formato `YYYY-MM-DD`
   - Campo `estado` con valor `"verified"`

3. **Verificar autenticación:**
   - Endpoint acepta `Authorization: Bearer <token>`
   - No devuelve error 401

4. **Corregir datos si es necesario:**
   - Actualizar `localidad` si tiene valores incorrectos
   - Formatear `fecha` si está en formato incorrecto

5. **Probar nuevamente:**
   - Verificar que los gastos aparezcan en ResumenFarmacias
   - Verificar que los gastos aparezcan en VentaTotal

---

## ✅ Una vez corregido

Después de hacer las correcciones, los gastos verificados deberían aparecer automáticamente en:
- **ResumenFarmacias**: En el apartado "Gastos Verificados" de cada farmacia
- **VentaTotal**: En la sección "Resúmenes > Mes a la fecha > Gastos"

El frontend ya está configurado para:
- Filtrar por estado "verified"
- Filtrar por rango de fechas (mes actual hasta día de hoy)
- Convertir Bs a USD automáticamente
- Actualizar automáticamente cada 60 segundos

