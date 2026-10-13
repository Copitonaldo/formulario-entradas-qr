// Importar Supabase
import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.47.4/+esm";

const SUPABASE_URL = 'https://wiyejeeiehwfkdcbpomp.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndpeWVqZWVpZWh3ZmtkY2Jwb21wIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTE1NjQwOTYsImV4cCI6MjA2NzE0MDA5Nn0.yDq4eOHujKH2nmg-F-DVnqCHGwdfEmf4Z968KXl1SDc';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const urlParams = new URLSearchParams(window.location.search);
const formId = urlParams.get('id'); 
const formTitleElement = document.getElementById('formTitle');
const dashboardCount = document.getElementById('dashboardCount');
const respuestasTable = document.getElementById('respuestasTable');
const tableHeaderRow = document.getElementById('tableHeaderRow');
const tableBody = document.getElementById('tableBody');
const searchInput = document.getElementById('searchInput');
const filterReferencia = document.getElementById('filterReferencia');
const filterOrden = document.getElementById('filterOrden');
const paginationDiv = document.getElementById('pagination');
const excelBtn = document.getElementById('excelBtn');
const printBtn = document.getElementById('printBtn');
const noDataMsg = document.getElementById('noDataMsg');

let todasLasRespuestas = []; 
let filteredRespuestas = []; 
let currentPage = 1;
const PAGE_SIZE = 50;
let currentFormDbId = null; 
let currentFormTipo = 'normal'; 
let parametrosDinamicos = [];
let currentFormNombreReal = ''; 

if (!formId || formId.trim() === "") {
  if (formTitleElement) formTitleElement.textContent = 'ID de Formulario no especificado';
  if (noDataMsg) {
    noDataMsg.textContent = 'Error: No se ha proporcionado un ID de formulario en la URL.';
    noDataMsg.style.display = 'block';
  }
  if (searchInput) searchInput.style.display = 'none';
  if (filterReferencia) filterReferencia.style.display = 'none';
  if (filterOrden) filterOrden.style.display = 'none';
  if (respuestasTable) respuestasTable.style.display = 'none';
  if (paginationDiv) paginationDiv.style.display = 'none';
  if (printBtn) printBtn.style.display = 'none';
  if (excelBtn) excelBtn.style.display = 'none';
  if (dashboardCount) dashboardCount.parentElement.style.display = 'none';
} else {
  if (formTitleElement) formTitleElement.textContent = `Respuestas del Formulario: ${formId}`;
  if (noDataMsg) {
    noDataMsg.textContent = 'Cargando respuestas...'; 
    noDataMsg.style.display = 'block';
  }
  await cargarRespuestas(); 
}

async function cargarRespuestas() {
  const { data: formInfo, error: formInfoError } = await supabase
    .from('formularios')
    .select('id, nombre, tipo_formulario, parametros_personalizados') 
    .eq('codigo_form', formId)
    .single();

  if (formInfoError || !formInfo) {
    if (formTitleElement) formTitleElement.textContent = `Error al encontrar formulario ${formId}`;
    if (noDataMsg) {
        noDataMsg.textContent = `Error: No se pudo encontrar el formulario con código ${formId}.`;
        noDataMsg.style.display = 'block';
    }
    if (respuestasTable) respuestasTable.style.display = 'none';
    return;
  }

  currentFormDbId = formInfo.id;
  currentFormTipo = formInfo.tipo_formulario || 'normal';
  currentFormNombreReal = formInfo.nombre || formId; 
  parametrosDinamicos = Array.isArray(formInfo.parametros_personalizados) ? formInfo.parametros_personalizados : [];
  
  if (formTitleElement) {
    formTitleElement.textContent = `Respuestas del Formulario: ${currentFormNombreReal}`;
  }

  ajustarOpcionesFiltroOrden();

  const { data: respuestasData, error: respuestasError } = await supabase
    .from('respuestas')
    .select('id, codigo_secuencial, nombre_completo, cedula, edad, fecha_registro, referencia_usada, parametros_personalizados')
    .eq('formulario_id', currentFormDbId)
    .order('fecha_registro', { ascending: false }); 

  if (respuestasError) {
    if (noDataMsg) {
        noDataMsg.textContent = "Ocurrió un error al cargar las respuestas.";
        noDataMsg.style.display = 'block';
    }
    todasLasRespuestas = [];
  } else {
    let referenciasMap = {};
    if (currentFormTipo === 'vip_general') {
      const { data: refsData } = await supabase
        .from('referencias_usos')
        .select('codigo_referencia, tipo_entrada')
        .eq('formulario_id', currentFormDbId);
      
      if (refsData) {
        refsData.forEach(ref => {
          referenciasMap[ref.codigo_referencia] = ref.tipo_entrada || 'General';
        });
      }
    }

    todasLasRespuestas = respuestasData.map(r => {
      let tipoEntradaFinal = 'N/A';
      if (currentFormTipo === 'vip_general') {
        tipoEntradaFinal = referenciasMap[r.referencia_usada] || 'General';
      }

      return {
        id_db: r.id, 
        codigo: r.codigo_secuencial,
        nombre: r.nombre_completo,
        cedula: r.cedula,
        edad: r.edad,
        fecha_registro: r.fecha_registro,
        referencia_usada: r.referencia_usada || null,
        tipo_entrada: tipoEntradaFinal,
        parametros_personalizados: r.parametros_personalizados || {}
      };
    });
  }

  construirEncabezadosTabla();
  poblarFiltroReferencias();

  if (todasLasRespuestas.length > 0) {
    if (noDataMsg) noDataMsg.style.display = 'none';
    if (respuestasTable) respuestasTable.style.display = '';
    if (searchInput) searchInput.style.display = '';
    if (filterReferencia) filterReferencia.style.display = '';
    if (filterOrden) filterOrden.style.display = '';
    if (printBtn) printBtn.style.display = 'inline-block';
    if (excelBtn) excelBtn.style.display = 'inline-block';
  } else {
    if (noDataMsg) {
        noDataMsg.textContent = 'No hay respuestas para este formulario.';
        noDataMsg.style.display = 'block';
    }
    if (respuestasTable) respuestasTable.style.display = 'none';
    if (searchInput) searchInput.style.display = 'none';
    if (filterReferencia) filterReferencia.style.display = 'none';
    if (filterOrden) filterOrden.style.display = 'none';
    if (printBtn) printBtn.style.display = 'none';
    if (excelBtn) excelBtn.style.display = 'none';
  }

  aplicarFiltrosYOrden();
}

function ajustarOpcionesFiltroOrden() {
  if (!filterOrden) return;

  filterOrden.innerHTML = `
    <option value="recientes">Más recientes primero[cite: 24]</option>
    <option value="antiguos">Más antiguos primero[cite: 24]</option>
    <option value="nombre">Ordenar por Nombre (A-Z)[cite: 24]</option>
    <option value="codigo_desc">Código: Mayor a Menor[cite: 24]</option>
    <option value="codigo_asc">Código: Menor a Mayor[cite: 24]</option>
  `;

  if (currentFormTipo === 'vip_general') {
    filterOrden.innerHTML += `
      <option value="solo_vip">Separar / Filtrar: Solo VIP</option>
      <option value="solo_general">Separar / Filtrar: Solo General</option>
    `;
  }
}

function construirEncabezadosTabla() {
  if (!tableHeaderRow) return;

  let html = `
    <th>Código</th>
    <th>Nombre</th>
    <th>Cédula</th>
    <th>Edad</th>
  `;

  parametrosDinamicos.forEach(param => {
    html += `<th>${escapeHtml(param)}</th>`;
  });

  html += `<th>Referencia</th>`;

  if (currentFormTipo === 'vip_general') {
    html += `<th>Tipo de Entrada</th>`;
  }

  html += `<th>Acciones</th>`;
  tableHeaderRow.innerHTML = html;
}

function poblarFiltroReferencias() {
  if (!filterReferencia) return;
  const referenciasUnicas = [...new Set(todasLasRespuestas.map(r => r.referencia_usada).filter(Boolean))];
  
  filterReferencia.innerHTML = '<option value="">Todas las referencias[cite: 14, 23]</option>';
  referenciasUnicas.forEach(ref => {
    const opt = document.createElement('option');
    opt.value = ref;
    opt.textContent = ref;
    filterReferencia.appendChild(opt);
  });
}

function formatCedula(cedula) {
  if (typeof cedula !== 'string') cedula = String(cedula || '');
  return cedula.replace(/\D/g, '').replace(/(\d{2})(\d{3})(\d{3})/, '$1.$2.$3');
}

function escapeHtml(text) {
    if (text === null || typeof text === 'undefined') return '';
    const div = document.createElement('div');
    div.textContent = String(text);
    return div.innerHTML;
}

function aplicarFiltrosYOrden() {
  const term = searchInput ? searchInput.value.toLowerCase() : '';
  const refSeleccionada = filterReferencia ? filterReferencia.value : '';
  const ordenSeleccionado = filterOrden ? filterOrden.value : 'recientes';

  filteredRespuestas = todasLasRespuestas.filter(r => {
    let cumpleTexto = (
      (r.nombre && r.nombre.toLowerCase().includes(term)) ||
      (r.cedula && formatCedula(r.cedula).toLowerCase().includes(term)) ||
      (r.edad && r.edad.toString().includes(term)) ||
      (r.codigo && r.codigo.toLowerCase().includes(term)) ||
      (r.referencia_usada && r.referencia_usada.toLowerCase().includes(term)) ||
      (r.tipo_entrada && r.tipo_entrada.toLowerCase().includes(term)) ||
      Object.values(r.parametros_personalizados).some(val => String(val).toLowerCase().includes(term))
    );

    let cumpleRef = refSeleccionada === '' || r.referencia_usada === refSeleccionada;

    let cumpleTipoEntrada = true;
    if (ordenSeleccionado === 'solo_vip') {
      cumpleTipoEntrada = r.tipo_entrada.toUpperCase() === 'VIP';
    } else if (ordenSeleccionado === 'solo_general') {
      cumpleTipoEntrada = r.tipo_entrada.toUpperCase() === 'GENERAL';
    }

    return cumpleTexto && cumpleRef && cumpleTipoEntrada;
  });

  filteredRespuestas.sort((a, b) => {
    if (ordenSeleccionado === 'recientes') {
      return new Date(b.fecha_registro) - new Date(a.fecha_registro);
    } else if (ordenSeleccionado === 'antiguos') {
      return new Date(a.fecha_registro) - new Date(b.fecha_registro);
    } else if (ordenSeleccionado === 'nombre') {
      return (a.nombre || '').localeCompare(b.nombre || '');
    } else if (ordenSeleccionado === 'codigo_desc') {
      return String(b.codigo).localeCompare(String(a.codigo), undefined, { numeric: true });
    } else if (ordenSeleccionado === 'codigo_asc') {
      return String(a.codigo).localeCompare(String(b.codigo), undefined, { numeric: true });
    }
    return 0;
  });

  currentPage = 1;
  renderTableAndPagination();
}

function renderTableAndPagination() {
  if (!tableBody) return;
  const start = (currentPage - 1) * PAGE_SIZE;
  const end = start + PAGE_SIZE;
  const dataToShow = filteredRespuestas.slice(start, end);
  
  tableBody.innerHTML = '';
  
  if (dataToShow.length === 0) {
    if (noDataMsg) {
      noDataMsg.textContent = 'No hay resultados para la búsqueda o filtro actual.';
      noDataMsg.style.display = 'block';
    }
  } else {
    if (noDataMsg) noDataMsg.style.display = 'none';
  }

  dataToShow.forEach((r, index) => {
    const tr = document.createElement('tr');
    
    let htmlCeldasDinamicas = '';
    parametrosDinamicos.forEach(param => {
      const valorParam = r.parametros_personalizados[param] || '-';
      htmlCeldasDinamicas += `<td>${escapeHtml(valorParam)}</td>`;
    });

    let htmlCeldaTipo = '';
    if (currentFormTipo === 'vip_general') {
      htmlCeldaTipo = `<td><strong>${escapeHtml(r.tipo_entrada)}</strong></td>`;
    }

    tr.innerHTML = `
      <td>${escapeHtml(r.codigo)}</td>
      <td>${escapeHtml(r.nombre)}</td>
      <td>${escapeHtml(formatCedula(r.cedula))}</td>
      <td>${escapeHtml(r.edad)}</td>
      ${htmlCeldasDinamicas}
      <td>${escapeHtml(r.referencia_usada || '-')}</td>
      ${htmlCeldaTipo}
      <td>
        <button class="action-btn edit-btn" data-id="${r.id_db || index}" disabled>Editar</button>
        <button class="action-btn delete-btn" data-id="${r.id_db || index}" disabled>Borrar</button>
      </td>
    `;

    // Asignación automática de etiquetas móviles basadas en el contenido real de la tabla
    const etiquetasColumnas = ['Código', 'Nombre', 'Cédula', 'Edad', ...parametrosDinamicos, 'Referencia'];
    if (currentFormTipo === 'vip_general') etiquetasColumnas.push('Tipo de Entrada');
    etiquetasColumnas.push('Acciones');
    Array.from(tr.cells).forEach((celda, i) => {
      celda.dataset.label = etiquetasColumnas[i] || '';
    });

    tableBody.appendChild(tr);
  });

  if (dashboardCount) dashboardCount.textContent = filteredRespuestas.length;
  
  if (paginationDiv) {
    paginationDiv.innerHTML = '';
    const totalPages = Math.ceil(filteredRespuestas.length / PAGE_SIZE);
    if (totalPages > 1) {
      for (let i = 1; i <= totalPages; i++) {
        const btn = document.createElement('button');
        btn.textContent = i;
        if (i === currentPage) btn.disabled = true;
        btn.onclick = () => {
          currentPage = i;
          renderTableAndPagination();
        };
        paginationDiv.appendChild(btn);
      }
    }
  }
}

if (searchInput) searchInput.addEventListener('input', aplicarFiltrosYOrden);
if (filterReferencia) filterReferencia.addEventListener('change', aplicarFiltrosYOrden);
if (filterOrden) filterOrden.addEventListener('change', aplicarFiltrosYOrden);

if (printBtn) {
  printBtn.onclick = function () {
    if (!formId || filteredRespuestas.length === 0) return;
    const dataToPrint = filteredRespuestas; 
    
    let html = `<html><head><title>Imprimir Respuestas</title><style>
      body { font-family: Arial; margin: 20px; }
      table { border-collapse: collapse; width: 100%; }
      th, td { border: 1px solid #333; padding: 8px; text-align: center; }
      th { background: #007bff; color: white; }
    </style></head><body><h2>${formTitleElement.textContent}</h2><table><thead><tr><th>Código</th><th>Nombre</th><th>Cédula</th><th>Edad</th>`;
    
    parametrosDinamicos.forEach(param => {
      html += `<th>${escapeHtml(param)}</th>`;
    });

    html += `<th>Referencia</th>`;
    if (currentFormTipo === 'vip_general') {
      html += `<th>Tipo de Entrada</th>`;
    }
    html += `</tr></thead><tbody>`;

    dataToPrint.forEach(r => {
      html += `<tr><td>${escapeHtml(r.codigo)}</td><td>${escapeHtml(r.nombre)}</td><td>${escapeHtml(formatCedula(r.cedula))}</td><td>${escapeHtml(r.edad)}</td>`;
      
      parametrosDinamicos.forEach(param => {
        html += `<td>${escapeHtml(r.parametros_personalizados[param] || '-')}</td>`;
      });

      html += `<td>${escapeHtml(r.referencia_usada || '-')}</td>`;
      if (currentFormTipo === 'vip_general') {
        html += `<td>${escapeHtml(r.tipo_entrada)}</td>`;
      }
      html += `</tr>`;
    });
    
    html += '</tbody></table></body></html>';
    const win = window.open('', '', 'width=900,height=700');
    win.document.write(html);
    win.document.close();
    setTimeout(() => win.print(), 500);
  };
}

if (excelBtn) {
  excelBtn.onclick = function () {
    if (!formId || filteredRespuestas.length === 0) return;
    if (!window.XLSX) {
      alert("Error: La librería XLSX no está cargada.");
      return;
    }
    
    const dataToExport = filteredRespuestas.map(r => {
      let obj = {
        'Código': r.codigo,
        'Nombre': r.nombre,
        'Cédula': formatCedula(r.cedula),
        'Edad': r.edad,
      };

      parametrosDinamicos.forEach(param => {
        obj[param] = r.parametros_personalizados[param] || '';
      });

      obj['Referencia'] = r.referencia_usada || '';

      if (currentFormTipo === 'vip_general') {
        obj['Tipo de Entrada'] = r.tipo_entrada;
      }
      return obj;
    });

    const ws = XLSX.utils.json_to_sheet(dataToExport);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Respuestas');
    
    const nombreArchivoLimpio = `Respuestas ${currentFormNombreReal.replace(/[/\\?%*:|"<>]/g, '')}.xlsx`;
    XLSX.writeFile(wb, nombreArchivoLimpio);
  };
}
