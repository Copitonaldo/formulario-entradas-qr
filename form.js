// Importar Firebase
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-app.js ";
import { getDatabase, ref, push } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-database.js ";

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

// Utilidad para capitalizar cada palabra del nombre
function toTitleCase(str) {
  return str.toLowerCase().replace(/(^|\s)\S/g, l => l.toUpperCase());
}

// Utilidad para formatear la cédula en puntos tipo 32.015.800
function formatCedula(cedula) {
  return cedula.replace(/\D/g, '').replace(/(\d{2})(\d{3})(\d{3})/, '$1.$2.$3');
}

// - DOM -
const urlParams = new URLSearchParams(window.location.search);
const formId = urlParams.get('id');
let formulario = null;

// Referencias al DOM
const inputNombre = document.getElementById('nombre');
const inputCedula = document.getElementById('cedula');
const inputEdad = document.getElementById('edad');
const errorMsg = document.getElementById('errorMsg');
const btnGuardar = document.getElementById('btnGuardar');
const confirmacionDatos = document.getElementById('confirmacionDatos');
const confNombre = document.getElementById('confNombre');
const confCedula = document.getElementById('confEdad');
const btnConfirmar = document.getElementById('btnConfirmar');
const outNombre = document.getElementById('outNombre');
const outCedula = document.getElementById('outCedula');
const outEdad = document.getElementById('outEdad');
const outCodigo = document.getElementById('outCodigo');
const codigoQR = document.getElementById('codigoQR');
const qrCanvas = document.getElementById('qrCanvas');
const guardarBtn = document.getElementById('guardarBtn');
const ticket = document.getElementById('ticket');
const entradaGenerada = document.getElementById('entradaGenerada');

let ultimoCodigo = '';
let ultimoNombre = '';

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

  // Mostrar confirmación con nombre capitalizado y cédula formateada
  confNombre.textContent = toTitleCase(nombre);
  confCedula.textContent = formatCedula(cedulaRaw);
  confEdad.textContent = `${edad} años`;
  form.style.display = 'none';
  entradaGenerada.style.display = 'none';
  confirmacionDatos.style.display = 'block';

  window.datosParaConfirmar = { nombre, cedula: cedulaRaw, edad };
});

// Botón "Sí" en confirmación: genera QR, guarda y muestra entrada
btnConfirmar.addEventListener('click', function () {
  const { nombre, cedula, edad } = window.datosParaConfirmar;

  const nuevaRespuesta = {
    codigo: Date.now().toString().slice(-5),
    nombre,
    cedula,
    edad,
    fecha: new Date().toISOString()
  };

  // Guardar en Firebase
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
  QRCode.toCanvas(qrCanvas, datosQR, { width: 80 }, function (error) {
    if (error) alert("Error generando QR");
  });

  confirmacionDatos.style.display = 'none';
  entradaGenerada.style.display = 'block';
});

guardarBtn.addEventListener('click', () => {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  const qrBoxWidth = 240;
  const qrBoxHeight = 130;
  const qrBoxX = 20;
  const qrBoxY = 20;
  const radius = 10;

  canvas.width = qrBoxWidth + 40;
  canvas.height = qrBoxHeight + 60;

  // Fondo blanco
  ctx.fillStyle = "#fff";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Bordes redondeados
  ctx.beginPath();
  ctx.moveTo(qrBoxX + radius, qrBoxY);
  ctx.arcTo(qrBoxX + qrBoxWidth, qrBoxY, qrBoxX + qrBoxWidth, qrBoxY + qrBoxHeight, radius);
  ctx.arcTo(qrBoxX + qrBoxWidth, qrBoxY + qrBoxHeight, qrBoxX, qrBoxY + qrBoxHeight, radius);
  ctx.arcTo(qrBoxX, qrBoxY + qrBoxHeight, qrBoxX, qrBoxY, radius);
  ctx.arcTo(qrBoxX, qrBoxY, qrBoxX + qrBoxWidth, qrBoxY, radius);
  ctx.closePath();
  ctx.fillStyle = "#fff";
  ctx.fill();

  // Dibujar QR
  const qrSize = 80;
  const qrX = qrBoxX + (qrBoxWidth - qrSize) / 2;
  const qrY = qrBoxY + 4;
  ctx.drawImage(qrCanvas, qrX, qrY, qrSize, qrSize);

  // Texto debajo del QR
  ctx.font = "bold 14px Arial";
  ctx.fillStyle = "#222";
  ctx.textAlign = "center";
  ctx.fillText("Código: " + outCodigo.textContent, qrBoxX + qrBoxWidth / 2, qrY + qrSize + 18);

  // Descargar imagen
  canvas.toBlob(function(blob) {
    const enlace = document.createElement('a');
    enlace.href = URL.createObjectURL(blob);
    enlace.download = `Entrada_${outCodigo.textContent}.jpg`;
    document.body.appendChild(enlace);
    enlace.click();
    document.body.removeChild(enlace);
  }, 'image/jpeg', 0.92);
});