# Especificación de Desarrollo · App Informe Jira GrupoMar

## 1. Objetivo

Desarrollar una app interna para generar informes visuales de avances Jira de GrupoMar.

La app debe conectarse a Jira mediante el **MCP de Atlassian** disponible en Antigravity, consultar los issues finalizados en un período determinado y generar un informe visual corporativo en **HTML**, con opción de exportar también a **PDF**.

El informe debe servir para reuniones semanales o mensuales. No debe ser una exportación de Jira, sino una vista limpia de avances reales agrupados por proyecto, épica/frente y tarea/subtarea.

---

## 2. Resultado esperado

La app debe permitir:

- Seleccionar un período:
  - Semana actual.
  - Semana pasada.
  - Semana concreta por número ISO.
  - Mes completo.
  - Rango personalizado.
- Seleccionar proyectos Jira:
  - Todos.
  - Uno o varios proyectos concretos.
- Consultar Jira en vivo usando MCP Atlassian.
- Agrupar los resultados por:
  - Espacio / proyecto Jira.
  - Épica o frente principal.
  - Tarea o subtarea finalizada.
- Previsualizar el informe en pantalla.
- Descargar el informe como:
  - HTML.
  - PDF horizontal.
- Aplicar diseño corporativo GrupoMar.
- Mantener la visualización en una sola pantalla de escritorio.
- Usar scroll interno por tarjeta si un espacio tiene más contenido del que entra.

---

## 3. Recomendación de producto

Construir una **mini app web interna**, no solo un HTML suelto.

La app debería tener:

1. Panel de filtros.
2. Botón para consultar Jira.
3. Vista previa del informe.
4. Botón para descargar HTML.
5. Botón para descargar PDF.

Esto permitirá reutilizar el informe cada semana o mes sin depender de prompts manuales.

---

## 4. Stack recomendado

Propuesta principal:

- React + TypeScript.
- Vite o Next.js.
- CSS puro, CSS Modules o Tailwind.
- Backend ligero Node.js si hace falta para:
  - consultar MCP/Jira,
  - generar HTML,
  - generar PDF.

Para PDF:

- Playwright o Puppeteer.
- Renderizar el HTML y exportar con `page.pdf()`.

Configuración PDF recomendada:

```ts
await page.pdf({
  path: outputPath,
  format: "A4",
  landscape: true,
  printBackground: true,
  margin: {
    top: "8mm",
    right: "8mm",
    bottom: "8mm",
    left: "8mm"
  }
});
```

---

## 5. Integración con MCP Atlassian

La app debe usar el MCP de Atlassian ya conectado en Antigravity.

Operaciones necesarias:

1. Buscar issues por JQL.
2. Obtener detalle de issue por clave.
3. Consultar padres para reconstruir jerarquía:
   - Épica.
   - Tarea.
   - Subtarea.

Herramientas esperadas o equivalentes:

```txt
searchJiraIssuesUsingJql
getJiraIssue
```

Si el MCP tiene otros nombres de herramientas, adaptar la implementación manteniendo la misma lógica.

Campos mínimos a obtener:

```ts
key
summary
issuetype
status
statusCategory
project
parent
assignee
duedate
resolutiondate
created
updated
webUrl
description
priority
```

Importante: **no usar `updated` como criterio principal de avance finalizado**. El avance real se debe basar en `resolved` / `resolutiondate`.

---

## 6. Proyectos Jira conocidos

Por defecto consultar estos proyectos:

| Clave | Proyecto |
|---|---|
| DES | Decide IA (ERP) |
| HED | Hedyla |
| KPI | KPI TOP |
| LG | Lean Grupamar |
| MV | Máquina Volumétrica |
| GRUPA | Seguimiento Central & Delegaciones |
| SPG | Seguimiento Proyectos Gral |

La app debe permitir seleccionar uno, varios o todos.

Si Jira devuelve otros proyectos visibles con actividad, la app debe poder incluirlos.

---

## 7. Interpretación de períodos

Usar calendario ISO:

- La semana empieza el lunes.
- La semana termina el domingo.
- “Semana 28” significa semana ISO 28 del año seleccionado.
- Si no se selecciona año, usar el año actual.
- “Semana actual” significa la semana ISO actual.
- “Semana pasada” significa la semana ISO anterior completa.
- “Mes completo” significa desde el día 1 hasta el último día del mes.
- “Rango personalizado” usa exactamente las fechas elegidas.

Para Jira usar siempre rango **cerrado-abierto**:

```jql
resolved >= "YYYY-MM-DD"
AND resolved < "YYYY-MM-DD"
```

Ejemplo Semana 28 de 2026:

```txt
Visual:
06/07/2026 — 12/07/2026

Técnico:
resolved >= "2026-07-06"
resolved < "2026-07-13"
```

Esto evita perder issues resueltos durante el último día.

---

## 8. JQL base

Para todos los proyectos principales:

```jql
project in (DES, HED, KPI, LG, MV, GRUPA, SPG)
AND statusCategory = Done
AND resolved >= "{START_DATE}"
AND resolved < "{END_EXCLUSIVE_DATE}"
ORDER BY project ASC, resolutiondate DESC
```

Para un solo proyecto:

```jql
project = MV
AND statusCategory = Done
AND resolved >= "{START_DATE}"
AND resolved < "{END_EXCLUSIVE_DATE}"
ORDER BY resolutiondate DESC
```

Para varios proyectos seleccionados:

```jql
project in (MV, HED, LG)
AND statusCategory = Done
AND resolved >= "{START_DATE}"
AND resolved < "{END_EXCLUSIVE_DATE}"
ORDER BY project ASC, resolutiondate DESC
```

---

## 9. Criterio de avance

Incluir únicamente issues que cumplan:

```txt
statusCategory = Done
AND resolved / resolutiondate dentro del período
```

Estados equivalentes de cierre:

- Listo.
- Finalizada.
- Done.
- Cerrado.
- Finalizado.
- Resuelto.
- Cualquier estado cuya `statusCategory` sea `Done`.

Tipos de issue a incluir:

- Épica / Epic / Epica.
- Tarea / Task.
- Subtarea / Subtask.
- Historia / Story.
- Función / Feature.
- Cualquier otro issue resuelto dentro del período.

No incluir por defecto:

- Pendientes.
- En curso.
- En revisión.
- Aplazados.
- Pausados.
- Issues sin `resolutiondate`.
- Issues en estado Listo cuya `resolutiondate` esté fuera del período.

Diferenciar siempre:

```txt
Estado actual en Jira ≠ avance del período
```

Un issue puede estar actualmente en Listo, pero solo representa avance del período si fue resuelto dentro del rango consultado.

---

## 10. Enriquecimiento jerárquico

Cada issue finalizado debe enriquecerse para saber a qué frente pertenece.

### Caso 1 · Issue tipo Épica

Mostrar como frente cerrado:

```txt
Espacio → Épica cerrada
```

Ejemplo:

```txt
KPI TOP
└── KPI-29 · Atenciones Comerciales
```

### Caso 2 · Issue tipo Tarea

Buscar épica padre:

```txt
Espacio → Épica/frente → Tarea cerrada
```

Ejemplo:

```txt
Máquina Volumétrica
└── MV-1 · Volumétrica - Implantación SVQ
    └── MV-4 · Colocación de Estructura
```

### Caso 3 · Issue tipo Subtarea

Buscar tarea padre y épica padre de esa tarea:

```txt
Espacio → Épica/frente → Tarea padre → Subtarea cerrada
```

Ejemplo:

```txt
Hedyla
└── HED-3 · Planificador SCT
    └── HED-15 · Planificación en tiempo real JONAY supervisadas
        └── HED-24 · PTR S28
```

### Caso 4 · Jerarquía incompleta

Si falta padre o épica:

```txt
Sin épica identificada
Sin tarea padre identificada
```

No inventar contexto.

---

## 11. Modelo de datos interno

```ts
type JiraIssue = {
  key: string;
  title: string;
  type: string;
  status: string;
  statusCategory: string;
  projectKey: string;
  projectName: string;
  resolvedDate: string;
  dueDate?: string | null;
  webUrl?: string;
  parentKey?: string;
  parentTitle?: string;
  epicKey?: string;
  epicTitle?: string;
  isLate: boolean;
};

type ReportIssue = {
  key: string;
  title: string;
  status: string;
  resolvedDate: string;
  shortResolvedDate: string;
  url?: string;
  parentContext?: string;
  isLate: boolean;
};

type ReportFront = {
  epicKey: string;
  epicTitle: string;
  issues: ReportIssue[];
};

type ReportProject = {
  projectKey: string;
  projectName: string;
  totalClosures: number;
  fronts: ReportFront[];
};

type ReportData = {
  title: string;
  periodLabel: string;
  startDate: string;
  endDate: string;
  endExclusiveDate: string;
  totalClosures: number;
  projectsWithClosures: number;
  frontsWithProgress: number;
  lateClosures: number;
  projects: ReportProject[];
};
```

---

## 12. Agrupación del informe

Agrupar siempre así:

```txt
Proyecto / Espacio Jira
└── Épica o frente principal
    └── Tarea o subtarea finalizada
```

Ejemplo:

```txt
Seguimiento Central & Delegaciones
├── GRUPA-24 · Materiales de Estiba
│   └── GRUPA-86 · Alta cantidad material estiba
├── GRUPA-68 · Gestión de proyecto JIRA
│   └── GRUPA-72 · Espacio Proyectos General
└── GRUPA-20 · Tiempos de Servicio (TDS)
    └── GRUPA-77 · Delegación Madrid
```

No mostrar espacios sin cierres, salvo que exista un checkbox:

```txt
☐ Mostrar espacios sin actividad
```

Por defecto debe estar desactivado.

---

## 13. KPIs superiores

Mostrar máximo 4 KPIs:

1. Elementos finalizados.
2. Espacios con cierres.
3. Frentes con avance.
4. Fuera de fecha.

Definición de fuera de fecha:

```ts
const isLate =
  issue.dueDate &&
  issue.resolvedDate &&
  new Date(issue.resolvedDate) > new Date(issue.dueDate);
```

---

## 14. Diseño visual corporativo

Usar diseño corporativo GrupoMar.

### Colores

```css
:root {
  --blue: #091197;
  --cyan: #03A9EC;
  --orange: #F75600;
  --white: #FFFFFF;
  --bg: #F6F6F6;
  --text: #12233D;
  --muted: #5F6F82;
  --line: #DBE4EE;
  --ok: #0C8B4D;
  --ok-bg: #E9F7EF;
  --soft: #F8FBFF;
}
```

### Layout general

```txt
Topbar blanca
├── Logo GrupoMar izquierda
└── Período derecha en cápsula

Bloque superior
├── Panel degradado azul con título
└── KPIs

Cuerpo
└── Grid de tarjetas por proyecto
    └── Frentes / épicas
        └── Issues cerrados
```

---

## 15. Reglas visuales

### Topbar

- Fondo blanco.
- Logo GrupoMar a la izquierda.
- Período a la derecha en cápsula.
- Sin recuadro alrededor del logo.
- Altura aproximada: 70px.
- Sombra inferior muy sutil.

### Header

- Panel con degradado:
  - `#091197` a `#03A9EC`.
- Título:
  - `Avances finalizados agrupados por frente`
- Subtítulo breve.
- KPIs en tarjetas blancas.

### Tarjeta de proyecto

Cada tarjeta debe mostrar:

- Nombre del proyecto.
- Clave del proyecto.
- Badge circular con número de cierres.
- Bloques internos por épica/frente.
- Issues finalizados.

### Bloque de frente

Mostrar:

- Título de la épica/frente.
- Lista compacta de issues cerrados.

### Issue

Mostrar:

- Clave + título.
- Fecha corta de cierre a la derecha.
- Línea secundaria con tarea padre o contexto.
- Borde izquierdo azul claro.
- Si está fuera de fecha, borde izquierdo naranja.

No mostrar por defecto:

- Responsable.
- Informador.
- Prioridad.
- Tabla final.
- Lectura ejecutiva larga.
- Descripciones largas.
- Conteos internos por tipo.
- Espacios sin cierres.

---

## 16. Comportamiento de scroll

La página debe intentar verse completa sin scroll global en escritorio.

Si un proyecto tiene muchas tareas, el scroll debe aparecer dentro de la tarjeta de ese proyecto, no en toda la página.

CSS recomendado:

```css
html,
body {
  height: 100%;
  overflow: hidden;
}

.page {
  height: 100vh;
  display: flex;
  flex-direction: column;
}

.content {
  flex: 1;
  min-height: 0;
}

.grid {
  min-height: 0;
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  grid-template-rows: repeat(2, minmax(0, 1fr));
}

.project-card {
  min-height: 0;
  overflow: hidden;
  display: grid;
  grid-template-rows: auto 1fr;
}

.fronts {
  min-height: 0;
  overflow-y: auto;
  overflow-x: hidden;
}
```

Los textos largos deben partir línea dentro del bloque.

Ningún globo, tarjeta o subparte debe sobresalir de su bloque.

---

## 17. Pantalla de la app

La app debe tener un panel de filtros.

### Tipo de informe

Radio o select:

```txt
Semana
Mes
Rango personalizado
```

### Si elige Semana

Campos:

- Año.
- Número de semana ISO.
- Botón “Semana actual”.
- Botón “Semana pasada”.

### Si elige Mes

Campos:

- Año.
- Mes.

### Si elige Rango personalizado

Campos:

- Fecha inicio.
- Fecha fin.

### Proyectos

Checkboxes:

```txt
Todos
DES
HED
KPI
LG
MV
GRUPA
SPG
```

### Opciones adicionales

```txt
☐ Mostrar espacios sin actividad
☐ Incluir responsables
☐ Incluir pendientes/en revisión
```

Por defecto:

```txt
Mostrar espacios sin actividad: false
Incluir responsables: false
Incluir pendientes/en revisión: false
```

### Acciones

Botones:

```txt
Actualizar desde Jira
Previsualizar
Descargar HTML
Descargar PDF
```

---

## 18. Flujo funcional

1. Usuario selecciona período.
2. App calcula:
   - `startDate`
   - `endDate`
   - `endExclusiveDate`
   - `periodLabel`
3. App genera JQL.
4. App consulta Jira vía MCP Atlassian.
5. App obtiene issues finalizados.
6. App consulta padres/épicas necesarios.
7. App normaliza datos.
8. App agrupa por proyecto y frente.
9. App calcula KPIs.
10. App renderiza preview.
11. Usuario descarga HTML o PDF.

---

## 19. Exportación HTML

Debe generar un archivo `.html` autónomo:

- CSS embebido.
- Logo embebido en base64 o referenciado localmente.
- Sin dependencias externas.
- Debe abrirse correctamente en navegador.

Nombre sugerido:

```txt
informe_jira_semana_28_2026.html
informe_jira_julio_2026.html
informe_jira_2026-07-01_2026-07-15.html
```

---

## 20. Exportación PDF

Flujo:

1. Generar el HTML.
2. Renderizar con Playwright/Puppeteer.
3. Exportar a PDF en horizontal.

Configuración:

```ts
await page.pdf({
  path: outputPath,
  format: "A4",
  landscape: true,
  printBackground: true,
  margin: {
    top: "8mm",
    right: "8mm",
    bottom: "8mm",
    left: "8mm"
  }
});
```

El PDF debe mantener el diseño lo más parecido posible al HTML.

---

## 21. Mensajes de usuario

Cuando genere informe:

```txt
Informe generado para Semana 28, del 06/07/2026 al 12/07/2026.
Se detectaron 12 elementos finalizados en 6 espacios, agrupados en 8 frentes de trabajo.
```

Cuando no haya datos:

```txt
No se detectaron elementos finalizados en Jira para el período seleccionado.
```

Cuando falle Jira:

```txt
No se pudo consultar Jira. Revisa la conexión MCP de Atlassian.
```

Cuando falte jerarquía:

```txt
Hay elementos sin épica o padre identificado. Se mostrarán bajo “Sin épica identificada”.
```

---

## 22. Validaciones

La app debe validar:

- No generar informe sin período.
- No generar informe sin proyectos seleccionados.
- No generar informe con fechas inválidas.
- No generar informe si fecha inicio es posterior a fecha fin.
- No inventar datos si Jira no responde.
- No incluir issues resueltos fuera del período.
- No confundir estado actual con avance del período.
- No mostrar espacios sin cierres salvo opción explícita.
- Marcar fuera de fecha solo si hay `duedate`.

---

## 23. Casos de prueba

### Caso 1 · Semana concreta

Entrada:

```txt
Semana 28, año 2026, todos los proyectos
```

Resultado esperado:

- Consulta del 2026-07-06 al 2026-07-13.
- Agrupa cierres por proyecto y épica.
- No muestra espacios sin cierres.

### Caso 2 · Mes completo

Entrada:

```txt
Julio 2026
```

Resultado esperado:

- Consulta del 2026-07-01 al 2026-08-01.
- Agrupa por proyecto y frente.
- Usa scroll interno si hay mucho contenido.

### Caso 3 · Proyecto específico

Entrada:

```txt
Semana 28, solo MV
```

Resultado esperado:

- Solo proyecto MV.
- Muestra Máquina Volumétrica si tiene cierres.
- No muestra otros proyectos.

### Caso 4 · Sin resultados

Entrada:

```txt
Semana sin cierres
```

Resultado esperado:

- Mensaje “No se detectaron elementos finalizados”.
- No generar tarjetas vacías.

---

## 24. Criterios de aceptación

El desarrollo se considera correcto si:

- Permite generar informes semanales.
- Permite generar informes mensuales.
- Permite rangos personalizados.
- Consulta Jira usando `resolved`, no `updated`.
- Agrupa por proyecto y épica/frente.
- Incluye épicas, tareas, subtareas y otros issues resueltos.
- No muestra espacios sin cierres.
- Marca cierres fuera de fecha.
- Genera HTML corporativo GrupoMar.
- El HTML se ve en una sola pantalla en escritorio.
- Cada tarjeta tiene scroll interno si el contenido no entra.
- Permite descargar HTML.
- Permite descargar PDF.
- No inventa datos si Jira falla.
- Usa correctamente el MCP Atlassian.
- Mantiene el diseño limpio, compacto y apto para reunión.

---

## 25. Resumen de la lógica clave

```txt
No se mide avance por updated.
Se mide avance por resolved / resolutiondate.

No se listan tareas sueltas.
Se agrupan por proyecto → épica/frente → issue cerrado.

No se muestran espacios vacíos.
Solo espacios con cierres.

No se hace scroll global en escritorio.
Cada tarjeta debe tener scroll interno si lo necesita.

No se exporta Jira.
Se genera una vista ejecutiva de avance real.
```
