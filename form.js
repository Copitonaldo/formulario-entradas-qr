// Importar Firebase
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-app.js";
import { getDatabase, ref, push } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-database.js";

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

// Variables del DOM
const urlParams = new URLSearchParams(window.location.search);
const formId = urlParams.get('id');
const inputNombre = document.getElementById('nombre');
const inputCedula = document.getElementById('cedula');
const inputEdad = document.getElementById('edad');
const errorMsg = document.getElementById('errorMsg');
const btnGuardar = document.getElementById('btnGuardar');
const confirmacionDatos = document.getElementById('confirmacionDatos');
const confNombre = document.getElementById('confNombre');
const confCedula = document.getElementById('confCedula');
const confEdad = document.getElementById('confEdad');
const btnConfirmar = document.getElementById('btnConfirmar');
const outNombre = document.getElementById('outNombre');
const outCedula = document.getElementById('outCedula');
const outEdad = document.getElementById('outEdad');
const outCodigo = document.getElementById('outCodigo');
const codigoQR = document.getElementById('codigoQR');
const qrCanvas = document.getElementById('qrCanvas');
const guardarBtn = document.getElementById('guardarBtn');
const entradaGenerada = document.getElementById('entradaGenerada');

// Función para capitalizar nombres
function toTitleCase(str) {
  return str.toLowerCase().replace(/(^|\s)\S/g, l => l.toUpperCase());
}

// Validación de cédula
function formatCedula(cedula) {
  return cedula.replace(/\D/g, '').replace(/(\d{2})(\d{3})(\d{3})/, '$1.$2.$3');
}

btnGuardar.addEventListener('click', () => {
  const nombre = inputNombre.value.trim();
  const cedulaRaw = inputCedula.value.replace(/\D/g, '');
  const edad = inputEdad.value.trim();

  // Validaciones
  if (!nombre) {
    errorMsg.textContent = 'Debe ingresar un nombre.';
    errorMsg.style.display = 'block';
    return;
  }

  if (!/^\d{8}$/.test(cedulaRaw)) {
    errorMsg.textContent = 'La cédula debe tener exactamente 8 dígitos.';
    errorMsg.style.display = 'block';
    return;
  }

  if (!edad || isNaN(parseInt(edad))) {
    errorMsg.textContent = 'Edad inválida.';
    errorMsg.style.display = 'block';
    return;
  }

  // Mostrar confirmación
  confNombre.textContent = toTitleCase(nombre);
  confCedula.textContent = formatCedula(cedulaRaw);
  confEdad.textContent = `${edad} años`;
  form.style.display = 'none';
  entradaGenerada.style.display = 'none';
  confirmacionDatos.style.display = 'block';

  window.datosParaConfirmar = { nombre, cedula: cedulaRaw, edad };
});

btnConfirmar.addEventListener('click', function () {
  const { nombre, cedula, edad } = window.datosParaConfirmar;
  const nuevaRespuesta = {
    codigo: Date.now().toString().slice(-5),
    nombre,
    cedula,
    edad,
    fecha: new Date().toISOString()
  };

  const respuestasRef = ref(database, `respuestas/${formId}`);
  push(respuestasRef, nuevaRespuesta);

  // Mostrar datos en pantalla
  outNombre.textContent = nombre;
  outCedula.textContent = formatCedula(cedula);
  outEdad.textContent = `${edad} años`;
  outCodigo.textContent = nuevaRespuesta.codigo;
  codigoQR.textContent = "Código: " + nuevaRespuesta.codigo;

  // Generar QR
  const datosQR = `Nombre: ${nombre}\nCédula: ${cedula}\nEdad: ${edad}`;
  QRCode.toCanvas(qrCanvas, datosQR, { width: 80 }, error => {
    if (error) alert("Error generando QR");
  });

  confirmacionDatos.style.display = 'none';
  entradaGenerada.style.display = 'block';
});
