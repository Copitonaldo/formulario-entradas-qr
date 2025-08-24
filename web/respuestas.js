// Importar Supabase y Capacitor
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm';
import { Preferences } from '@capacitor/preferences';
import { BarcodeScanner } from '@capacitor/barcode-scanner';

// Configuración de Supabase
const SUPABASE_URL = 'https://wiyejeeiehwfkdcbpomp.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndpeWVqZWVpZWh3ZmtkY2Jwb21wIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTE1NjQwOTYsImV4cCI6MjA2NzE0MDA5Nn0.yDq4eOHujKH2nmg-F-DVnqCHGwdfEmf4Z968KXl1SDc';

// Inicializar Supabase
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Variables DOM
const urlParams = new URLSearchParams(window.location.search);
const formId = urlParams.get('id'); // Este es el 'codigo_form' en Supabase
const formTitleElement = document.getElementById('formTitle');
const dashboardCount = document.getElementById('dashboardCount');
const respuestasTable = document.getElementById('respuestasTable');
const respuestasTableBody = document.querySelector('#respuestasTable tbody');
const searchInput = document.getElementById('searchInput');
const paginationDiv = document.getElementById('pagination');
const excelBtn = document.getElementById('excelBtn');
const printBtn = document.getElementById('printBtn');
const scanBtn = document.getElementById('scanBtn');
const noDataMsg = document.getElementById('noDataMsg');

let todasLasRespuestas = [];
let filteredRespuestas = [];
let currentPage = 1;
const PAGE_SIZE = 50;
let currentFormDbId = null;

// --- INICIO: Validación de formId y carga de datos ---
if (!formId || formId.trim() === "") {
  if (formTitleElement) {
    formTitleElement.textContent = 'ID de Formulario no especificado';
  }
  if (noDataMsg) {
    noDataMsg.textContent = 'Error: No se ha proporcionado un ID de formulario en la URL (parámetro `?id=`). No se pueden cargar respuestas.';
    noDataMsg.style.display = 'block';
  }
  if (searchInput) searchInput.style.display = 'none';
  if (respuestasTable) respuestasTable.style.display = 'none';
  if (paginationDiv) paginationDiv.style.display = 'none';
  if (printBtn) printBtn.style.display = 'none';
  if (excelBtn) excelBtn.style.display = 'none';
  if (dashboardCount) dashboardCount.parentElement.style.display = 'none';
  console.error("formId (codigo_form) es nulo, está vacío o solo contiene espacios. No se cargarán respuestas.");
} else {
  if (formTitleElement) {
    formTitleElement.textContent = `Respuestas del Formulario: ${formId}`;
  }
  if (noDataMsg) {
    noDataMsg.textContent = 'Cargando respuestas...';
    noDataMsg.style.display = 'block';
  }
  await cargarRespuestas();
}
// --- FIN: Validación de formId y carga de datos ---

async function persistCheckedInState() {
  const storageKey = `respuestas-${formId}`;
  try {
    await Preferences.set({ key: storageKey, value: JSON.stringify(todasLasRespuestas) });
    console.log('Estado de check-in guardado localmente.');
  } catch (e) {
    console.error('Error al guardar el estado de check-in', e);
  }
}

async function cargarRespuestas() {
  const storageKey = `respuestas-${formId}`;

  // 1. Cargar desde el almacenamiento local primero para una experiencia offline rápida
  try {
    const { value } = await Preferences.get({ key: storageKey });
    if (value) {
      console.log('Cargando datos desde el almacenamiento local...');
      todasLasRespuestas = JSON.parse(value);
      if (todasLasRespuestas.length > 0) {
        if (noDataMsg) noDataMsg.style.display = 'none';
        if (respuestasTable) respuestasTable.style.display = '';
        if (searchInput) searchInput.style.display = '';
        if (printBtn) printBtn.style.display = 'inline-block';
        if (excelBtn) excelBtn.style.display = 'inline-block';
        if (scanBtn) scanBtn.style.display = 'inline-block';
        filteredRespuestas = [...todasLasRespuestas];
        currentPage = 1;
        renderTableAndPagination();
      }
    }
  } catch (e) {
    console.error('Error al leer del almacenamiento local', e);
  }

  // 2. Intentar obtener datos frescos de Supabase
  try {
    const { data: formInfo, error: formInfoError } = await supabase
      .from('formularios')
      .select('id, nombre')
      .eq('codigo_form', formId)
      .single();

    if (formInfoError || !formInfo) throw formInfoError || new Error('Formulario no encontrado');

    currentFormDbId = formInfo.id;
    if (formTitleElement) formTitleElement.textContent = `Respuestas del Formulario: ${formInfo.nombre || formId}`;

    const { data, error } = await supabase
      .from('respuestas')
      .select('id, codigo_secuencial, nombre_completo, cedula, edad, fecha_registro, referencia_usada, checked_in')
      .eq('formulario_id', currentFormDbId)
      .order('fecha_registro', { ascending: false });

    if (error) throw error;

    // Mapear datos frescos
    const respuestasFrescas = data.map(r => ({
      id_db: r.id,
      codigo: r.codigo_secuencial,
      nombre: r.nombre_completo,
      cedula: r.cedula,
      edad: r.edad,
      referencia_usada: r.referencia_usada || null,
      checked_in: r.checked_in || false // Sincroniza con el estado de la DB si existe
    }));

    // Actualizar almacenamiento local y UI
    await Preferences.set({ key: storageKey, value: JSON.stringify(respuestasFrescas) });
    todasLasRespuestas = respuestasFrescas;

    if (todasLasRespuestas.length > 0) {
      if (noDataMsg) noDataMsg.style.display = 'none';
      if (respuestasTable) respuestasTable.style.display = '';
      if (searchInput) searchInput.style.display = '';
      if (printBtn) printBtn.style.display = 'inline-block';
      if (excelBtn) excelBtn.style.display = 'inline-block';
    if (scanBtn) scanBtn.style.display = 'inline-block';
    } else {
        if (noDataMsg) noDataMsg.textContent = 'No hay respuestas para este formulario.';
        if (respuestasTable) respuestasTable.style.display = 'none';
    }

    // Volver a filtrar con el término de búsqueda actual si existe
    const term = searchInput.value.toLowerCase();
    if (term) {
        filteredRespuestas = todasLasRespuestas.filter(r =>
          (r.nombre && r.nombre.toLowerCase().includes(term)) ||
          (r.cedula && formatCedula(r.cedula).toLowerCase().includes(term)) ||
          (r.edad && r.edad.toString().includes(term)) ||
          (r.codigo && r.codigo.toLowerCase().includes(term)) ||
          (r.referencia_usada && r.referencia_usada.toLowerCase().includes(term))
        );
    } else {
        filteredRespuestas = [...todasLasRespuestas];
    }
    currentPage = 1;
    renderTableAndPagination();
    console.log('Datos frescos cargados y guardados localmente.');

  } catch (error) {
    console.error("Error al cargar respuestas desde Supabase (puede ser por estar offline):", error);
    if (todasLasRespuestas.length === 0) { // Solo mostrar error si no hay datos cacheados
        if (noDataMsg) {
            noDataMsg.textContent = "Error al cargar. Mostrando datos sin conexión si están disponibles.";
            noDataMsg.style.display = 'block';
        }
        if (respuestasTable) respuestasTable.style.display = 'none';
    } else {
        console.log("Mostrando datos desde la caché debido a un error de red.");
    }
  }
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
  if (dataToShow.length === 0 && (formId && formId.trim() !== "")) {
      if (noDataMsg && !noDataMsg.textContent.startsWith("Error:")) {
        noDataMsg.textContent = 'No hay resultados para la búsqueda o filtro actual.';
        noDataMsg.style.display = 'block';
      }
  } else if (dataToShow.length > 0) {
      if (noDataMsg) noDataMsg.style.display = 'none';
      if (respuestasTable) respuestasTable.style.display = '';
  }

  dataToShow.forEach((r, index) => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${escapeHtml(r.codigo)}</td>
      <td>${escapeHtml(r.nombre)}</td>
      <td>${escapeHtml(formatCedula(r.cedula))}</td>
      <td>${escapeHtml(r.edad)}</td>
      <td>${escapeHtml(r.referencia_usada || '-')}</td>
      <td>${r.checked_in ? '🔒' : ''}</td>
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

if (scanBtn) {
  scanBtn.addEventListener('click', async () => {
    try {
      // Pedir permiso y escanear
      await BarcodeScanner.checkPermission({ force: true });
      const result = await BarcodeScanner.startScan();

      if (result.hasContent) {
        console.log('QR Scanned:', result.content);
        const codeMatch = result.content.match(/Código:\s*(\d+)/);

        if (codeMatch && codeMatch[1]) {
          const scannedCode = codeMatch[1];
          const entry = todasLasRespuestas.find(r => r.codigo === scannedCode);

          if (entry) {
            if (entry.checked_in) {
              alert(`Esta entrada (Código: ${scannedCode}) ya ha sido registrada.`);
            } else {
              // Actualizar el estado en Supabase
              const { error } = await supabase
                .from('respuestas')
                .update({ checked_in: true })
                .eq('id', entry.id_db);

              if (error) {
                console.error('Error al actualizar el estado de check-in en la DB:', error);
                alert('Error al sincronizar el estado con la base de datos. Intente de nuevo.');
              } else {
                // Si la actualización de la DB es exitosa, actualizar el estado local y la UI
                entry.checked_in = true;
                alert(`Entrada con Código: ${scannedCode} registrada con éxito.`);
                await persistCheckedInState();
                renderTableAndPagination();
              }
            }
          } else {
            alert(`Código de entrada no encontrado: ${scannedCode}`);
          }
        } else {
          alert('El código QR no contiene un código de entrada válido.');
        }
      }
    } catch (e) {
      console.error('Error en el escáner:', e);
      alert('Ocurrió un error al escanear. Asegúrese de dar permisos de cámara.');
    }
  });
}

if (searchInput) {
  searchInput.addEventListener('input', () => {
    const term = searchInput.value.toLowerCase();
    filteredRespuestas = todasLasRespuestas.filter(r =>
      (r.nombre && r.nombre.toLowerCase().includes(term)) ||
      (r.cedula && formatCedula(r.cedula).toLowerCase().includes(term)) ||
      (r.edad && r.edad.toString().includes(term)) ||
      (r.codigo && r.codigo.toLowerCase().includes(term)) ||
      (r.referencia_usada && r.referencia_usada.toLowerCase().includes(term)) // Búsqueda por referencia
    );
    currentPage = 1;
    renderTableAndPagination();
  });
}

if (printBtn) {
  printBtn.onclick = function () {
    if (!formId || filteredRespuestas.length === 0) return;
    const dataToPrint = filteredRespuestas;
    let html = `<html><head><title>Imprimir Respuestas - ${formTitleElement.textContent.replace('Respuestas del Formulario: ','')}</title><style>
      body { font-family: Arial; margin: 20px; }
      table { border-collapse: collapse; width: 100%; }
      th, td { border: 1px solid #333; padding: 8px; text-align: center; }
      th { background: #007bff; color: white; }
    </style></head><body><h2>${formTitleElement.textContent}</h2><table><thead><tr><th>Código</th><th>Nombre</th><th>Cédula</th><th>Edad</th><th>Referencia</th></tr></thead><tbody>`;
    dataToPrint.forEach(r => {
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
    if (!window.XLSX) {
      console.error("La librería XLSX no está cargada.");
      alert("Error: La funcionalidad de exportar a Excel no está disponible.");
      return;
    }
    const dataToExport = filteredRespuestas.map(r => ({
      'Código': r.codigo,
      'Nombre': r.nombre,
      'Cédula': formatCedula(r.cedula),
      'Edad': r.edad,
      'Referencia': r.referencia_usada || '' // Añadir referencia a Excel
    }));
    const ws = XLSX.utils.json_to_sheet(dataToExport);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Respuestas');
    XLSX.writeFile(wb, `Respuestas_${formId}.xlsx`);
  };
}
console.log("respuestas.js cargado con lógica de referencias.");
