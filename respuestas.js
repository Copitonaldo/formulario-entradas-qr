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
const respuestasTableBody = document.querySelector('#respuestasTable tbody');
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
let nombreFormularioActual = "Formulario"; // Variable para almacenar el nombre limpio del formulario

if (!formId || formId.trim() === "") {
  if (formTitleElement) formTitleElement.textContent = 'ID de Formulario no especificado';
  if (noDataMsg) {
    noDataMsg.textContent = 'Error: No se ha proporcionado un ID de formulario en la URL.';
    noDataMsg.style.display = 'block';
  }
} else {
  if (formTitleElement) formTitleElement.textContent = `Respuestas del Formulario: ${formId}`;
  await cargarRespuestas();
}

async function cargarRespuestas() {
  const { data: formInfo, error: formInfoError } = await supabase
    .from('formularios')
    .select('id, nombre')
    .eq('codigo_form', formId)
    .single();

  if (formInfoError || !formInfo) {
    if (formTitleElement) formTitleElement.textContent = `Error al encontrar formulario ${formId}`;
    if (noDataMsg) {
        noDataMsg.textContent = `Error: No se pudo encontrar el formulario con código ${formId}.`;
        noDataMsg.style.display = 'block';
    }
    return;
  }

  currentFormDbId = formInfo.id;
  nombreFormularioActual = formInfo.nombre || formId; // Guardamos el nombre real
  if (formTitleElement) formTitleElement.textContent = `Respuestas del Formulario: ${nombreFormularioActual}`;

  const { data, error } = await supabase
    .from('respuestas')
    .select('id, codigo_secuencial, nombre_completo, cedula, edad, fecha_registro, referencia_usada')
    .eq('formulario_id', currentFormDbId)
    .order('fecha_registro', { ascending: false });

  if (error) {
    if (noDataMsg) {
        noDataMsg.textContent = "Ocurrió un error al cargar las respuestas.";
        noDataMsg.style.display = 'block';
    }
    todasLasRespuestas = [];
  } else {
    todasLasRespuestas = data.map(r => ({
        id_db: r.id,
        codigo: r.codigo_secuencial,
        nombre: r.nombre_completo,
        cedula: r.cedula,
        edad: r.edad,
        fecha_registro: r.fecha_registro,
        referencia_usada: r.referencia_usada || null
    }));
  }

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
  }

  aplicarFiltrosYOrden();
}

function poblarFiltroReferencias() {
  if (!filterReferencia) return;
  const referenciasUnicas = [...new Set(todasLasRespuestas.map(r => r.referencia_usada).filter(Boolean))];
  
  filterReferencia.innerHTML = '<option value="">Todas las referencias</option>';
  referenciasUnicas.forEach(ref => {
    const option = document.createElement('option');
    option.value = ref;
    option.textContent = `Referencia: ${ref}`;
    filterReferencia.appendChild(option);
  });
}

function aplicarFiltrosYOrden() {
  const term = searchInput ? searchInput.value.toLowerCase() : '';
  const refSelected = filterReferencia ? filterReferencia.value : '';
  const ordenSelected = filterOrden ? filterOrden.value : 'recientes';

  filteredRespuestas = todasLasRespuestas.filter(r => {
    const matchTexto = 
      (r.nombre && r.nombre.toLowerCase().includes(term)) ||
      (r.cedula && formatCedula(r.cedula).toLowerCase().includes(term)) ||
      (r.edad && r.edad.toString().includes(term)) ||
      (r.codigo && r.codigo.toLowerCase().includes(term));
    
    const matchRef = refSelected === '' || r.referencia_usada === refSelected;

    return matchTexto && matchRef;
  });

  filteredRespuestas.sort((a, b) => {
    if (ordenSelected === 'recientes') {
      return new Date(b.fecha_registro) - new Date(a.fecha_registro);
    } else if (ordenSelected === 'antiguos') {
      return new Date(a.fecha_registro) - new Date(b.fecha_registro);
    } else if (ordenSelected === 'nombre') {
      return a.nombre.localeCompare(b.nombre);
    }
    return 0;
  });

  currentPage = 1;
  renderTableAndPagination();
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

function renderTableAndPagination() {
  if (!respuestasTableBody) return;

  const start = (currentPage - 1) * PAGE_SIZE;
  const end = start + PAGE_SIZE;
  const dataToShow = filteredRespuestas.slice(start, end);

  respuestasTableBody.innerHTML = '';

  dataToShow.forEach((r, index) => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${escapeHtml(r.codigo)}</td>
      <td>${escapeHtml(r.nombre)}</td>
      <td>${escapeHtml(formatCedula(r.cedula))}</td>
      <td>${escapeHtml(r.edad)}</td>
      <td>${escapeHtml(r.referencia_usada || '-')}</td>
      <td>
        <button class="action-btn edit-btn" data-id="${r.id_db || index}" disabled>Editar</button>
        <button class="action-btn delete-btn" data-id="${r.id_db || index}" disabled>Borrar</button>
      </td>
    `;
    respuestasTableBody.appendChild(tr);
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
    let html = `<html><head><title>Imprimir Respuestas</title><style>
      body { font-family: Arial; margin: 20px; }
      table { border-collapse: collapse; width: 100%; }
      th, td { border: 1px solid #333; padding: 8px; text-align: center; }
      th { background: #007bff; color: white; }
    </style></head><body><h2>${formTitleElement.textContent}</h2><table><thead><tr><th>Código</th><th>Nombre</th><th>Cédula</th><th>Edad</th><th>Referencia</th></tr></thead><tbody>`;
    filteredRespuestas.forEach(r => {
      html += `<tr><td>${escapeHtml(r.codigo)}</td><td>${escapeHtml(r.nombre)}</td><td>${escapeHtml(formatCedula(r.cedula))}</td><td>${escapeHtml(r.edad)}</td><td>${escapeHtml(r.referencia_usada || '-')}</td></tr>`;
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
    const dataToExport = filteredRespuestas.map(r => ({
      'Código': r.codigo,
      'Nombre': r.nombre,
      'Cédula': formatCedula(r.cedula),
      'Edad': r.edad,
      'Referencia': r.referencia_usada || ''
    }));
    const ws = XLSX.utils.json_to_sheet(dataToExport);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Respuestas');
    // Limpiamos caracteres especiales por seguridad en el nombre del archivo descargado
    const nombreLimpio = nombreFormularioActual.replace(/[^a-zA-Z0-9_\- ]/g, "").trim();
    XLSX.writeFile(wb, `Respuestas_${nombreLimpio}.xlsx`);
  };
}
