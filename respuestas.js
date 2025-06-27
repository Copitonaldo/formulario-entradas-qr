// Importar Firebase
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-app.js ";
import { getDatabase, ref, onValue } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-database.js ";

// Tu configuración de Firebase
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

// Variables
const urlParams = new URLSearchParams(window.location.search);
const formId = urlParams.get('id');
const formTitle = document.getElementById('formTitle');
const searchInput = document.getElementById('searchInput');
const printBtn = document.getElementById('printBtn');
const excelBtn = document.getElementById('excelBtn');
const dashboardCount = document.getElementById('dashboardCount');
const respuestasTableBody = document.querySelector('#respuestasTable tbody');
const paginationDiv = document.getElementById('pagination');

let respuestas = [];
let filteredRespuestas = [];
let currentPage = 1;
const PAGE_SIZE = 50;

function formatCedula(cedula) {
  if (!cedula || cedula.length !== 8) return '';
  return cedula.replace(/(\d{3})(\d{3})(\d{2})/, "$1.$2.$3");
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

function renderTableAndPagination() {
  const start = (currentPage - 1) * PAGE_SIZE;
  const end = start + PAGE_SIZE;
  const dataToShow = filteredRespuestas.slice(start, end);

  respuestasTableBody.innerHTML = '';
  dataToShow.forEach((r, index) => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${escapeHtml(r.codigo || '')}</td>
      <td>${escapeHtml(r.nombre)}</td>
      <td>${escapeHtml(formatCedula(r.cedula))}</td>
      <td>${escapeHtml(r.edad)}</td>
      <td>
        <button class="action-btn edit-btn" data-index="${start + index}">Editar</button>
        <button class="action-btn delete-btn" data-index="${start + index}">Borrar</button>
      </td>
    `;
    respuestasTableBody.appendChild(tr);
  });

  dashboardCount.textContent = filteredRespuestas.length;

  // Paginación
  paginationDiv.innerHTML = '';
  const totalPages = Math.ceil(filteredRespuestas.length / PAGE_SIZE);
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

searchInput.addEventListener('input', () => {
  const term = searchInput.value.toLowerCase();
  filteredRespuestas = respuestas.filter(r =>
    r.nombre.toLowerCase().includes(term) ||
    formatCedula(r.cedula).toLowerCase().includes(term) ||
    r.edad.toString().includes(term) ||
    r.codigo.toLowerCase().includes(term)
  );
  currentPage = 1;
  renderTableAndPagination();
});

printBtn.onclick = function () {
  const dataToPrint = filteredRespuestas;
  let html = `<html><head><title>Imprimir Respuestas</title><style>
    body { font-family: Arial; margin: 20px; }
    table { border-collapse: collapse; width: 100%; }
    th, td { border: 1px solid #333; padding: 8px; text-align: center; }
    th { background: #007bff; color: white; }
  </style></head><body><h2>Respuestas</h2><table><thead><tr><th>Código</th><th>Nombre</th><th>Cédula</th><th>Edad</th></tr></thead><tbody>`;
  dataToPrint.forEach(r => {
    html += `<tr><td>${r.codigo}</td><td>${r.nombre}</td><td>${formatCedula(r.cedula)}</td><td>${r.edad}</td></tr>`;
  });
  html += '</tbody></table></body></html>';
  const win = window.open('', '', 'width=900,height=700');
  win.document.write(html);
  win.document.close();
  setTimeout(() => win.print(), 500);
};

excelBtn.onclick = function () {
  const XLSX = require('xlsx');
  const dataToExport = filteredRespuestas.map(r => ({
    Código: r.codigo,
    Nombre: r.nombre,
    Cédula: formatCedula(r.cedula),
    Edad: r.edad
  }));
  const ws = XLSX.utils.json_to_sheet(dataToExport);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Respuestas');
  XLSX.writeFile(wb, `Respuestas_${formId}.xlsx`);
};

// Cargar respuestas desde Firebase
const respuestasRef = ref(database, `respuestas/${formId}`);
onValue(respuestasRef, (snapshot) => {
  const data = snapshot.val() || {};
  respuestas = Object.values(data);
  filteredRespuestas = [...respuestas];
  currentPage = 1;
  renderTableAndPagination();
  printBtn.style.display = 'inline-block';
  excelBtn.style.display = 'inline-block';
});