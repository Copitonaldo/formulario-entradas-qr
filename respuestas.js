// Importar Firebase
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-app.js";
import { getDatabase, ref, onValue } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-database.js";

// Configuración de Firebase
const firebaseConfig = {
  apiKey: "AIzaSyAnjDU-BWTGTmbOrxjFsdNkvp8pNnXJba4",
  authDomain: "entradas-qr-07.firebaseapp.com",
  projectId: "entradas-qr-07",
  storageBucket: "entradas-qr-07.firebasestorage.app",
  messagingSenderId: "543393610176",
  appId: "1:543393610176:web:5f2ac0c66ae80415b47025"
};

// Inicializar Firebase
const app = initializeApp(firebaseConfig);
const database = getDatabase(app);

// Variables DOM
const urlParams = new URLSearchParams(window.location.search);
const formId = urlParams.get('id');
const formTitleElement = document.getElementById('formTitle');
const dashboardCount = document.getElementById('dashboardCount');
const respuestasTable = document.getElementById('respuestasTable'); // Referencia a la tabla completa
const respuestasTableBody = document.querySelector('#respuestasTable tbody');
const searchInput = document.getElementById('searchInput');
const paginationDiv = document.getElementById('pagination');
const excelBtn = document.getElementById('excelBtn');
const printBtn = document.getElementById('printBtn');
const noDataMsg = document.getElementById('noDataMsg');

let respuestas = [];
let filteredRespuestas = [];
let currentPage = 1;
const PAGE_SIZE = 50;

// --- INICIO: Validación de formId ---
if (!formId || formId.trim() === "") {
  if (formTitleElement) {
    formTitleElement.textContent = 'ID de Formulario no especificado';
  }
  if (noDataMsg) {
    noDataMsg.textContent = 'Error: No se ha proporcionado un ID de formulario en la URL (parámetro `?id=`). No se pueden cargar respuestas.';
    noDataMsg.style.display = 'block';
  }
  // Ocultar elementos de la interfaz si no hay formId
  if (searchInput) searchInput.style.display = 'none';
  if (respuestasTable) respuestasTable.style.display = 'none';
  if (paginationDiv) paginationDiv.style.display = 'none';
  if (printBtn) printBtn.style.display = 'none';
  if (excelBtn) excelBtn.style.display = 'none';
  if (dashboardCount) dashboardCount.parentElement.style.display = 'none'; // Ocultar el div del dashboard

  console.error("formId es nulo, está vacío o solo contiene espacios. No se cargarán respuestas.");
  // No se necesita 'throw Error' aquí como en form.js porque este script principalemente lee datos.
  // Simplemente no procederemos a la carga de datos.
} else {
  if (formTitleElement) {
    formTitleElement.textContent = `Respuestas del Formulario: ${formId}`;
  }
  if (noDataMsg) {
    noDataMsg.textContent = 'No hay respuestas para este formulario.'; // Mensaje por defecto
    noDataMsg.style.display = 'none'; // Oculto inicialmente
  }

  // Cargar respuestas desde Firebase solo si formId es válido
  const respuestasRef = ref(database, `respuestas/${formId}`);
  onValue(respuestasRef, (snapshot) => {
    const data = snapshot.val();
    if (data) {
      respuestas = Object.values(data);
      if (noDataMsg) noDataMsg.style.display = 'none';
      if (respuestasTable) respuestasTable.style.display = ''; // Asegurarse que la tabla sea visible
      if (searchInput) searchInput.style.display = '';
      if (printBtn) printBtn.style.display = 'inline-block';
      if (excelBtn) excelBtn.style.display = 'inline-block';
    } else {
      respuestas = [];
      if (noDataMsg) noDataMsg.style.display = 'block'; // Mostrar mensaje de no hay datos
      if (respuestasTable) respuestasTable.style.display = 'none'; // Ocultar tabla si no hay datos
      if (searchInput) searchInput.style.display = 'none';
      if (printBtn) printBtn.style.display = 'none';
      if (excelBtn) excelBtn.style.display = 'none';
      if (paginationDiv) paginationDiv.innerHTML = ''; // Limpiar paginación
    }
    filteredRespuestas = [...respuestas];
    currentPage = 1;
    renderTableAndPagination();
  }, (error) => {
    console.error("Error cargando datos de Firebase:", error);
    if (formTitleElement) formTitleElement.textContent = `Error al cargar respuestas para ${formId}`;
    if (noDataMsg) {
        noDataMsg.textContent = "Ocurrió un error al cargar las respuestas. Revise la consola para más detalles.";
        noDataMsg.style.display = 'block';
    }
    if (respuestasTable) respuestasTable.style.display = 'none';
    if (searchInput) searchInput.style.display = 'none';
    if (printBtn) printBtn.style.display = 'none';
    if (excelBtn) excelBtn.style.display = 'none';
  });
}
// --- FIN: Validación de formId ---

function formatCedula(cedula) {
  if (typeof cedula !== 'string') cedula = String(cedula || '');
  return cedula.replace(/\D/g, '').replace(/(\d{2})(\d{3})(\d{3})/, '$1.$2.$3');
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

function renderTableAndPagination() {
  if (!respuestasTableBody) return; // Salir si el body de la tabla no existe

  const start = (currentPage - 1) * PAGE_SIZE;
  const end = start + PAGE_SIZE;
  const dataToShow = filteredRespuestas.slice(start, end);

  respuestasTableBody.innerHTML = '';
  if (dataToShow.length === 0 && (formId && formId.trim() !== "")) {
      if (noDataMsg && !noDataMsg.textContent.startsWith("Error:")) { // No sobrescribir mensaje de error de formId
        noDataMsg.style.display = 'block';
      }
      if (respuestasTable) respuestasTable.style.display = 'none';
  } else if (dataToShow.length > 0) {
      if (noDataMsg) noDataMsg.style.display = 'none';
      if (respuestasTable) respuestasTable.style.display = '';
  }


  dataToShow.forEach((r, index) => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${escapeHtml(r.codigo || '')}</td>
      <td>${escapeHtml(r.nombre || 'N/A')}</td>
      <td>${escapeHtml(formatCedula(r.cedula || ''))}</td>
      <td>${escapeHtml(r.edad || '')}</td>
      <td>
        <button class="action-btn edit-btn" data-index="${start + index}">Editar</button>
        <button class="action-btn delete-btn" data-index="${start + index}">Borrar</button>
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

if (searchInput) {
  searchInput.addEventListener('input', () => {
    const term = searchInput.value.toLowerCase();
    filteredRespuestas = respuestas.filter(r =>
      (r.nombre && r.nombre.toLowerCase().includes(term)) ||
      (r.cedula && formatCedula(r.cedula).toLowerCase().includes(term)) ||
      (r.edad && r.edad.toString().includes(term)) ||
      (r.codigo && r.codigo.toLowerCase().includes(term))
    );
    currentPage = 1;
    renderTableAndPagination();
  });
}

if (printBtn) {
  printBtn.onclick = function () {
    if (!formId || filteredRespuestas.length === 0) return; // No imprimir si no hay formId o datos
    const dataToPrint = filteredRespuestas;
    let html = `<html><head><title>Imprimir Respuestas - ${formId}</title><style>
      body { font-family: Arial; margin: 20px; }
      table { border-collapse: collapse; width: 100%; }
      th, td { border: 1px solid #333; padding: 8px; text-align: center; }
      th { background: #007bff; color: white; }
    </style></head><body><h2>Respuestas del Formulario: ${formId}</h2><table><thead><tr><th>Código</th><th>Nombre</th><th>Cédula</th><th>Edad</th></tr></thead><tbody>`;
    dataToPrint.forEach(r => {
      html += `<tr><td>${escapeHtml(r.codigo || '')}</td><td>${escapeHtml(r.nombre || '')}</td><td>${escapeHtml(formatCedula(r.cedula || ''))}</td><td>${escapeHtml(r.edad || '')}</td></tr>`;
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
    if (!formId || filteredRespuestas.length === 0) return; // No exportar si no hay formId o datos
    // XLSX ya está disponible globalmente gracias al script cargado en respuestas.html
    if (!window.XLSX) {
      console.error("La librería XLSX no está cargada.");
      alert("Error: La funcionalidad de exportar a Excel no está disponible.");
      return;
    }
    const dataToExport = filteredRespuestas.map(r => ({
      'Código': r.codigo || '',
      'Nombre': r.nombre || '',
      'Cédula': formatCedula(r.cedula || ''),
      'Edad': r.edad || ''
    }));
    const ws = XLSX.utils.json_to_sheet(dataToExport);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Respuestas');
    XLSX.writeFile(wb, `Respuestas_${formId}.xlsx`);
  };
}

// La carga inicial de datos ya se maneja dentro de la validación de formId.
// Ya no es necesario tener la llamada a onValue() fuera de ese bloque.
