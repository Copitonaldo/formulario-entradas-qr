// Importar Supabase
import { createClient } from 'https://cdn.jsdelivr.net/npm/ @supabase/supabase-js/+esm';

// Configuración de Supabase
const SUPABASE_URL = 'https://wiyejeeiehwfkdcbpomp.supabase.co ';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndpeWVqZWVpZWh3ZmtkY2Jwb21wIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTE1NjQwOTYsImV4cCI6MjA2NzE0MDA5Nn0.yDq4eOHujKH2nmg-F-DVnqCHGwdfEmf4Z968KXl1SDc';

// Inicializar Supabase
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Variables del DOM
const urlParams = new URLSearchParams(window.location.search);
const formId = urlParams.get('id');
const formTitleElement = document.getElementById('formTitle');
const dashboardCount = document.getElementById('dashboardCount');
const respuestasTableBody = document.querySelector('#respuestasTable tbody');
const searchInput = document.getElementById('searchInput');
const paginationDiv = document.getElementById('pagination');
const noDataMsg = document.getElementById('noDataMsg');
const excelBtn = document.getElementById('excelBtn');
const printBtn = document.getElementById('printBtn');

let todasLasRespuestas = [];
let filteredRespuestas = [];
let currentPage = 1;
const PAGE_SIZE = 50;

// --- Validación de formId ---
if (!formId || formId.trim() === "") {
  if (formTitleElement) formTitleElement.textContent = 'ID de Formulario no especificado';
  if (noDataMsg) {
    noDataMsg.textContent = 'Error: No se ha proporcionado un ID de formulario en la URL.';
    noDataMsg.style.display = 'block';
  }
  if (searchInput) searchInput.style.display = 'none';
  if (respuestasTableBody) respuestasTableBody.style.display = 'none';
  if (excelBtn) excelBtn.style.display = 'none';
  if (printBtn) printBtn.style.display = 'none';
  console.error("No se recibió formId en la URL");
} else {
  if (formTitleElement) formTitleElement.textContent = `Respuestas del Formulario: ${formId}`;
  if (noDataMsg) {
    noDataMsg.textContent = 'Cargando respuestas...';
    noDataMsg.style.display = 'block';
  }
  // Cargar respuestas desde Supabase
  cargarRespuestas();
}

// --- Cargar datos del formulario y sus respuestas ---
async function cargarRespuestas() {
  const { data: formInfo, error: formInfoError } = await supabase
    .from('formularios')
    .select('id')
    .eq('codigo_form', formId)
    .single();

  if (formInfoError || !formInfo) {
    console.error("Formulario no encontrado:", formInfoError);
    noDataMsg.textContent = `Error: Formulario no encontrado.`;
    noDataMsg.style.display = 'block';
    return;
  }

  const formulario_id = formInfo.id;

  const { data, error } = await supabase
    .from('respuestas')
    .select('id, codigo_secuencial, nombre_completo, cedula, edad')
    .eq('formulario_id', formulario_id)
    .order('fecha_registro', { ascending: false });

  if (error) {
    console.error("Error al cargar respuestas:", error);
    noDataMsg.textContent = "Error al cargar las respuestas.";
    noDataMsg.style.display = 'block';
    return;
  }

  if (data.length === 0) {
    noDataMsg.textContent = "Este formulario aún no tiene respuestas.";
    noDataMsg.style.display = 'block';
    return;
  }

  todasLasRespuestas = data.map(r => ({
    id_db: r.id,
    codigo: r.codigo_secuencial,
    nombre: r.nombre_completo,
    cedula: r.cedula,
    edad: r.edad
  }));

  filteredRespuestas = [...todasLasRespuestas];
  currentPage = 1;
  renderTableAndPagination();
}

// --- Formateadores útiles ---
function formatCedula(cedula) {
  if (typeof cedula !== 'string') cedula = String(cedula || '');
  return cedula.replace(/\D/g, '').replace(/(\d{2})(\d{3})(\d{3})/, '$1.$2.$3');
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// --- Renderizar tabla con paginación ---
function renderTableAndPagination() {
  if (!respuestasTableBody) return;
  const start = (currentPage - 1) * PAGE_SIZE;
  const end = start + PAGE_SIZE;
  const dataToShow = filteredRespuestas.slice(start, end);
  respuestasTableBody.innerHTML = '';
  noDataMsg.style.display = 'none';

  if (dataToShow.length === 0 && formId) {
    noDataMsg.textContent = 'No hay resultados para esta búsqueda.';
    noDataMsg.style.display = 'block';
  }

  dataToShow.forEach(r => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${escapeHtml(r.codigo)}</td>
      <td><input class="edit-input" data-id="${r.id_db}" data-field="nombre" value="${escapeHtml(r.nombre)}" /></td>
      <td><input class="edit-input" data-id="${r.id_db}" data-field="cedula" value="${formatCedula(r.cedula)}" disabled /></td>
      <td><input class="edit-input" data-id="${r.id_db}" data-field="edad" value="${escapeHtml(r.edad)}" /></td>
      <td>
        <button class="action-btn edit-btn" onclick="guardarCambios('${r.id_db}')">Guardar</button>
        <button class="action-btn delete-btn" onclick="borrarRespuesta('${r.id_db}')">Borrar</button>
      </td>
    `;
    respuestasTableBody.appendChild(tr);
  });

  if (dashboardCount) dashboardCount.textContent = filteredRespuestas.length;

  // Paginación
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

// --- Guardar cambios (editar respuesta) ---
window.guardarCambios = async function(respuestaIdDb) {
  const inputs = document.querySelectorAll(`.edit-input[data-id="${respuestaIdDb}"]`);
  const campos = {};

  inputs.forEach(input => {
    const field = input.getAttribute('data-field');
    let valor = input.value.trim();

    if (field === 'cedula') {
      valor = valor.replace(/\./g, ''); // Limpiar puntos
    }

    if (field === 'edad') {
      valor = parseInt(valor);
      if (isNaN(valor) || valor < 0) {
        alert("La edad debe ser un número positivo.");
        return;
      }
    }

    campos[field] = valor;
  });

  if (!campos.nombre || !campos.cedula || isNaN(campos.edad)) {
    alert("Por favor corrige los campos antes de guardar.");
    return;
  }

  const { error } = await supabase
    .from('respuestas')
    .update({
      nombre_completo: campos.nombre,
      cedula: campos.cedula,
      edad: campos.edad
    })
    .eq('id', respuestaIdDb);

  if (error) {
    console.error("Error al guardar cambios:", error);
    alert("❌ Error al guardar los cambios.");
  } else {
    alert("✅ Cambios guardados correctamente.");
    await cargarRespuestas();
  }
};

// --- Borrar respuesta ---
window.borrarRespuesta = async function(respuestaIdDb) {
  if (!confirm("¿Estás seguro de querer borrar esta respuesta?")) return;

  const { error } = await supabase
    .from('respuestas')
    .delete()
    .eq('id', respuestaIdDb);

  if (error) {
    console.error("Error al borrar respuesta:", error);
    alert("❌ Error al borrar la respuesta.");
  } else {
    alert("✅ Respuesta eliminada exitosamente.");
    await cargarRespuestas();
  }
};

// --- Búsqueda dinámica ---
if (searchInput) {
  searchInput.addEventListener('input', () => {
    const term = searchInput.value.toLowerCase();
    filteredRespuestas = todasLasRespuestas.filter(r =>
      r.nombre.toLowerCase().includes(term) ||
      formatCedula(r.cedula).toLowerCase().includes(term) ||
      r.edad.toString().includes(term) ||
      r.codigo.toLowerCase().includes(term)
    );
    currentPage = 1;
    renderTableAndPagination();
  });
}

// --- Imprimir respuestas ---
if (printBtn) {
  printBtn.onclick = function () {
    if (!formId || filteredRespuestas.length === 0) return;
    const dataToPrint = filteredRespuestas;
    let html = `<html><head><title>Imprimir Respuestas</title><style>
      body { font-family: Arial; margin: 20px; }
      table { border-collapse: collapse; width: 100%; }
      th, td { border: 1px solid #333; padding: 8px; text-align: center; }
      th { background: #007bff; color: white; }
    </style></head><body><h2>${formTitleElement.textContent}</h2><table><thead><tr><th>Código</th><th>Nombre</th><th>Cédula</th><th>Edad</th></tr></thead><tbody>`;
    dataToPrint.forEach(r => {
      html += `<tr><td>${r.codigo}</td><td>${r.nombre}</td><td>${formatCedula(r.cedula)}</td><td>${r.edad}</td></tr>`;
    });
    html += '</tbody></table></body></html>';
    const win = window.open('', '', 'width=900,height=700');
    win.document.write(html);
    win.document.close();
    setTimeout(() => win.print(), 500);
  };
}

// --- Exportar a Excel ---
if (excelBtn) {
  excelBtn.onclick = function () {
    if (!formId || filteredRespuestas.length === 0) return;
    if (!window.XLSX) {
      console.error("Librería XLSX no cargada.");
      alert("Función de Excel no disponible.");
      return;
    }

    const dataToExport = filteredRespuestas.map(r => ({
      'Código': r.codigo,
      'Nombre': r.nombre,
      'Cédula': formatCedula(r.cedula),
      'Edad': r.edad
    }));

    const ws = XLSX.utils.json_to_sheet(dataToExport);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Respuestas');
    XLSX.writeFile(wb, `Respuestas_${formId}.xlsx`);
  };
}
