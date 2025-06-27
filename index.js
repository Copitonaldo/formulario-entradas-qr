// Importar Firebase
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-app.js ";
import { getDatabase, ref, push, onValue, remove } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-database.js ";

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

// Referencia a la tabla de formularios
const formulariosRef = ref(database, 'formularios');

// Contraseña simple
const PASSWORD = 'admin123';
const loginSection = document.getElementById('loginSection');
const adminPanel = document.getElementById('adminPanel');
const loginBtn = document.getElementById('loginBtn');
const passwordInput = document.getElementById('password');
const loginError = document.getElementById('loginError');
const logoutBtn = document.getElementById('logoutBtn');
const createForm = document.getElementById('createForm');
const formNameInput = document.getElementById('formName');
const formBgInput = document.getElementById('formBgInput');
const formulariosTableBody = document.querySelector('#formulariosTable tbody');

let formularios = [];

// Escuchar cambios en tiempo real
onValue(formulariosRef, (snapshot) => {
  const data = snapshot.val();
  if (data) {
    formularios = Object.values(data);
    renderFormularios();
  }
});

function generarCodigoFormulario() {
  return 'FORM' + Math.random().toString(36).substr(2, 5).toUpperCase();
}

function leerArchivoBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = e => resolve(e.target.result);
    reader.onerror = e => reject(e);
    reader.readAsDataURL(file);
  });
}

function renderFormularios() {
  formulariosTableBody.innerHTML = '';
  formularios.forEach(f => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${f.codigo}</td>
      <td>${f.nombre}</td>
      <td><img src="${f.imagen || ''}" alt="Imagen" class="thumb"></td>
      <td>
        <a href="form.html?id=${f.codigo}" target="_blank">Formulario Público</a> |
        <a href="respuestas.html?id=${f.codigo}" target="_blank">Lista de Datos</a> |
        <button class="delete-btn" onclick="borrarFormulario('${f.codigo}')">Borrar</button>
      </td>
    `;
    formulariosTableBody.appendChild(tr);
  });
}

createForm.addEventListener('submit', async e => {
  e.preventDefault();
  const nombre = formNameInput.value.trim();
  if (!nombre) return alert('Ingrese un nombre para el formulario');
  
  let imagenBase64 = '';
  if (formBgInput.files.length > 0) {
    imagenBase64 = await leerArchivoBase64(formBgInput.files[0]);
  }

  const codigo = generarCodigoFormulario();
  const nuevoFormulario = { codigo, nombre, imagen: imagenBase64 };
  push(formulariosRef, nuevoFormulario);
  createForm.reset();
  alert(`Formulario creado con código ${codigo}`);
});

window.borrarFormulario = function(codigo) {
  if (!confirm('¿Seguro que quieres borrar este formulario y sus datos?')) return;
  const index = formularios.findIndex(f => f.codigo === codigo);
  if (index !== -1) {
    const key = Object.keys(formularios).find(k => formularios[k].codigo === codigo);
    if (key) remove(ref(database, `formularios/${key}`));
  }
};

loginBtn.addEventListener('click', () => {
  if (passwordInput.value === PASSWORD) {
    loginError.style.display = 'none';
    loginSection.style.display = 'none';
    adminPanel.style.display = 'block';
    logoutBtn.style.display = 'inline-block';
    renderFormularios();
  } else {
    loginError.style.display = 'block';
  }
});

logoutBtn.addEventListener('click', () => {
  loginSection.style.display = 'block';
  adminPanel.style.display = 'none';
  logoutBtn.style.display = 'none';
  passwordInput.value = '';
  loginError.style.display = 'none';
});