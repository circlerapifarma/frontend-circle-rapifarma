# Resumen: Verificaciones Necesarias en el Backend

## 🎯 Objetivo
Asegurar que los gastos verificados aparezcan correctamente en:
- **ResumenFarmacias**: Apartado "Gastos Verificados" de cada farmacia
- **VentaTotal**: Sección "Resúmenes > Mes a la fecha > Gastos"

---

## ✅ Verificaciones Críticas (Hacer PRIMERO)

### 1. **Verificar Formato de Fecha en el Backend**

**Problema detectado:**
- Los logs muestran gastos verified con fechas de junio/julio/agosto 2025
- Pero necesitamos gastos de diciembre 2025 (mes actual)
- El formato de fecha puede estar causando problemas de comparación

**Acción requerida:**
1. Hacer una consulta a la base de datos para verificar el formato de `fecha`:

```javascript
// MongoDB
db.gastos.find({ 
  estado: "verified",
  fecha: { $gte: "2025-12-01", $lte: "2025-12-31" }
}).forEach(function(gasto) {
  print("ID: " + gasto._id);
  print("Fecha: " + gasto.fecha);
  print("Tipo: " + typeof gasto.fecha);
  print("---");
});
```

**Verificar:**
- ✅ El campo `fecha` está en formato `YYYY-MM-DD` (ejemplo: "2025-12-14")
- ❌ NO debe estar en formato `DD/MM/YYYY` (ejemplo: "14/12/2025")
- ❌ NO debe ser un objeto Date
- ❌ NO debe tener hora (ejemplo: "2025-12-14T10:30:00Z")

**Si el formato es incorrecto:**
- Corregir en el endpoint GET `/gastos` para que siempre devuelva `YYYY-MM-DD`
- O actualizar los datos en la base de datos

---

### 2. **Verificar que Existen Gastos Verificados de Diciembre 2025**

**Acción requerida:**
```javascript
// MongoDB - Contar gastos verified de diciembre 2025
db.gastos.countDocuments({
  estado: "verified",
  fecha: { $gte: "2025-12-01", $lte: "2025-12-31" }
});
```

**Si el resultado es 0:**
- ❌ No hay gastos verificados de diciembre 2025
- ✅ Verificar que los gastos que se verificaron tengan la fecha correcta
- ✅ Verificar que el campo `fecha` no se esté actualizando cuando se cambia el estado a "verified"

---

### 3. **Verificar Campo `localidad`**

**Acción requerida:**
```javascript
// MongoDB - Verificar que localidad sea ID de farmacia
db.gastos.find({ estado: "verified" }).forEach(function(gasto) {
  print("Gasto ID: " + gasto._id);
  print("Localidad: " + gasto.localidad);
  print("---");
});

// Comparar con IDs de farmacias
db.farmacias.find({}).forEach(function(farmacia) {
  print("Farmacia ID: " + farmacia._id);
  print("Farmacia Nombre: " + farmacia.nombre);
  print("---");
});
```

**Verificar:**
- ✅ `localidad` es el ID de la farmacia (ejemplo: "farmacia_id_1")
- ❌ NO debe ser el nombre de la farmacia (ejemplo: "Farmacia Centro")
- ❌ NO debe estar vacío o ser null

**Si `localidad` es incorrecto:**
- Actualizar los gastos para usar IDs en lugar de nombres
- O corregir en el endpoint GET `/gastos` para mapear nombres a IDs

---

### 4. **Verificar Endpoint GET `/gastos`**

**Acción requerida:**
Hacer una petición de prueba:

```bash
GET https://backend-circle-rapifarma.onrender.com/gastos
Headers:
  Authorization: Bearer <token>
```

**Verificar en la respuesta:**
1. ✅ Devuelve un array de gastos (no un objeto vacío)
2. ✅ Incluye gastos con `estado: "verified"`
3. ✅ El campo `fecha` está en formato `YYYY-MM-DD`
4. ✅ El campo `localidad` es un ID válido de farmacia
5. ✅ No devuelve error 401 (Unauthorized)

**Si hay error 401:**
- Verificar que el endpoint acepte el header `Authorization: Bearer <token>`
- Verificar que el middleware de autenticación esté configurado correctamente

---

### 5. **Verificar Conversión de Moneda**

**Para gastos en Bs:**
- ✅ Debe tener campo `tasa` con valor > 0
- ✅ El cálculo es: `montoUSD = montoBs / tasa`

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

## 🔧 Correcciones Necesarias (Si se Encuentran Problemas)

### Corrección 1: Formatear Fechas en el Endpoint

**Si las fechas vienen en formato incorrecto del backend:**

```javascript
// En el endpoint GET /gastos
app.get('/gastos', authenticateToken, async (req, res) => {
  try {
    const gastos = await db.gastos.find({});
    
    // Formatear fechas a YYYY-MM-DD
    const gastosFormateados = gastos.map(gasto => {
      let fechaFormateada = gasto.fecha;
      
      // Si es Date object, convertir a string
      if (fechaFormateada instanceof Date) {
        fechaFormateada = fechaFormateada.toISOString().split('T')[0];
      }
      
      // Si es DD/MM/YYYY, convertir a YYYY-MM-DD
      if (typeof fechaFormateada === 'string' && fechaFormateada.includes('/')) {
        const [dia, mes, año] = fechaFormateada.split('/');
        fechaFormateada = `${año}-${mes.padStart(2, '0')}-${dia.padStart(2, '0')}`;
      }
      
      return {
        ...gasto,
        fecha: fechaFormateada
      };
    });
    
    res.json(gastosFormateados);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
```

---

### Corrección 2: Corregir Campo `localidad`

**Si `localidad` tiene nombres en lugar de IDs:**

```javascript
// En el endpoint GET /gastos
app.get('/gastos', authenticateToken, async (req, res) => {
  try {
    const gastos = await db.gastos.find({});
    const farmacias = await db.farmacias.find({});
    
    // Crear mapa de nombres a IDs
    const mapaFarmacias = {};
    farmacias.forEach(f => {
      mapaFarmacias[f.nombre] = f._id.toString();
    });
    
    // Corregir localidad si es nombre
    const gastosCorregidos = gastos.map(gasto => {
      if (mapaFarmacias[gasto.localidad]) {
        gasto.localidad = mapaFarmacias[gasto.localidad];
      }
      return gasto;
    });
    
    res.json(gastosCorregidos);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
```

---

### Corrección 3: Asegurar que `fecha` NO Cambie al Verificar

**En el endpoint PATCH `/gastos/estado`:**

```javascript
app.patch('/gastos/estado', authenticateToken, async (req, res) => {
  try {
    const { id, estado } = req.body;
    
    // Actualizar SOLO el estado, NO tocar la fecha
    const gasto = await db.gastos.findByIdAndUpdate(
      id,
      { $set: { estado: estado } },
      { new: true }
    );
    
    // Asegurar que la fecha se devuelva en formato YYYY-MM-DD
    if (gasto.fecha instanceof Date) {
      gasto.fecha = gasto.fecha.toISOString().split('T')[0];
    }
    
    res.json(gasto);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
```

---

## 📋 Checklist Rápido

Usa este checklist para verificar rápidamente:

- [ ] **Endpoint `/gastos` devuelve datos correctamente**
  - [ ] Acepta autenticación (no devuelve 401)
  - [ ] Devuelve array de gastos
  - [ ] Incluye gastos con `estado: "verified"`

- [ ] **Campo `fecha` es correcto**
  - [ ] Está en formato `YYYY-MM-DD`
  - [ ] Hay gastos verified de diciembre 2025
  - [ ] No cambia cuando se actualiza el estado

- [ ] **Campo `localidad` es correcto**
  - [ ] Es el ID de la farmacia (no el nombre)
  - [ ] Coincide con los IDs de `/farmacias`
  - [ ] No está vacío ni es null

- [ ] **Campo `estado` es correcto**
  - [ ] Tiene valor `"verified"` (exactamente, case-sensitive)
  - [ ] No es null ni undefined

- [ ] **Conversión de moneda**
  - [ ] Gastos en Bs tienen campo `tasa` > 0
  - [ ] Gastos en USD tienen `tasa` = 0 o no tienen tasa

---

## 🧪 Prueba Rápida

**Hacer esta petición y verificar la respuesta:**

```bash
curl -X GET https://backend-circle-rapifarma.onrender.com/gastos \
  -H "Authorization: Bearer <token>"
```

**Verificar en la respuesta:**
1. ¿Hay gastos con `estado: "verified"`?
2. ¿Las fechas están en formato `YYYY-MM-DD`?
3. ¿Hay gastos de diciembre 2025?
4. ¿El campo `localidad` es un ID válido?

**Si todo está correcto:**
- Los gastos deberían aparecer automáticamente en el frontend
- El frontend ya está configurado para filtrar y mostrar correctamente

---

## 📝 Notas Importantes

1. **El frontend ya está listo:**
   - Filtra por estado "verified"
   - Filtra por rango de fechas (mes actual hasta día de hoy)
   - Convierte Bs a USD automáticamente
   - Actualiza automáticamente cada 60 segundos
   - Tiene logs detallados para depuración

2. **El problema más común:**
   - Formato de fecha incorrecto en el backend
   - Fechas fuera del rango del mes actual
   - Campo `localidad` incorrecto

3. **Después de corregir:**
   - Los gastos aparecerán automáticamente
   - No se necesita cambiar nada en el frontend
   - Los logs del frontend ayudarán a verificar que todo funciona

---

## ✅ Resumen de Acciones

1. **Verificar formato de fecha** en la base de datos
2. **Verificar que existan gastos verified de diciembre 2025**
3. **Verificar campo `localidad`** (debe ser ID, no nombre)
4. **Verificar endpoint `/gastos`** (autenticación y respuesta)
5. **Corregir si es necesario** (formatear fechas, corregir localidad)

**Una vez corregido, los gastos aparecerán automáticamente en el frontend.**

