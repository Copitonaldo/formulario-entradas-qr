// Importar Firebase
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-app.js";
import { getDatabase, ref, push, runTransaction, get, query, orderByChild, equalTo, onValue } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-database.js";

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
const formTitleElement = document.getElementById('formTitle');
const formData = document.getElementById('formData');
const inputNombre = document.getElementById('nombre');
const inputCedula = document.getElementById('cedula');
const inputEdad = document.getElementById('edad');
const errorMsg = document.getElementById('errorMsg');
const confirmacionDatos = document.getElementById('confirmacionDatos');
const confNombre = document.getElementById('confNombre');
const confCedula = document.getElementById('confCedula');
const confEdad = document.getElementById('confEdad');
const btnConfirmar = document.getElementById('btnConfirmar');
const btnCorregir = document.getElementById('btnCorregir');
const outNombre = document.getElementById('outNombre');
const outCedula = document.getElementById('outCedula');
const outEdad = document.getElementById('outEdad');
const outCodigo = document.getElementById('outCodigo');
const codigoQR = document.getElementById('codigoQR');
const qrCanvas = document.getElementById('qrCanvas'); // El canvas original para mostrar QR
const entradaGenerada = document.getElementById('entradaGenerada');
const ticketBg = document.getElementById('ticketBg'); 
const guardarBtn = document.getElementById('guardarBtn');

// --- Carga de datos del formulario (incluida imagen de fondo) ---
async function cargarDatosFormulario() {
  if (!formId) return;

  // Usamos ref() directamente ya que conocemos la estructura de 'formularios' 
  // y no necesitamos consultarla por 'codigo' como si fuera una lista grande.
  // Asumimos que los formularios se guardan con su 'codigo' como clave o que hay otra forma de acceder.
  // Si los formularios se guardan con push IDs y 'codigo' es un campo interno, 
  // entonces sí se necesita query, orderByChild, equalTo.
  // Por ahora, simplificamos asumiendo que podemos construir la ruta si 'formId' es la clave.
  // Si 'formId' es un valor de campo 'codigo', la consulta original era correcta.
  // Vamos a mantener la consulta original por si acaso.
  const formQuery = query(ref(database, 'formularios'), orderByChild('codigo'), equalTo(formId));
  
  onValue(formQuery, (snapshot) => {
    if (snapshot.exists()) {
      const formEntries = snapshot.val();
      // snapshot.val() devuelve un objeto donde las claves son los push IDs
      const formKey = Object.keys(formEntries)[0]; 
      const specificFormData = formEntries[formKey];
      
      if (formTitleElement) {
        formTitleElement.textContent = `Formulario: ${specificFormData.nombre || formId}`;
      }
      if (ticketBg && specificFormData.imagen) {
        ticketBg.src = specificFormData.imagen;
        ticketBg.style.display = 'block'; 
      } else if (ticketBg) {
        ticketBg.style.display = 'none'; 
        // Opcional: Poner un color de fondo por defecto si no hay imagen
        // ticketBg.parentElement.style.backgroundColor = '#eee'; 
      }
    } else {
      if (formTitleElement) formTitleElement.textContent = 'Formulario no encontrado';
      if (ticketBg) ticketBg.style.display = 'none';
      console.warn(`Formulario con ID ${formId} no encontrado.`);
      // Ocultar el formulario si el ID no es válido o no se encuentra
      if(formData) formData.style.display = 'none';
      errorMsg.innerHTML = '<b>Error:</b> El formulario especificado no existe. Verifique el enlace o contacte al administrador.';
      errorMsg.style.display = 'block';
    }
  }, (error) => {
    console.error("Error al cargar datos del formulario:", error);
    if (formTitleElement) formTitleElement.textContent = 'Error al cargar formulario';
    if (ticketBg) ticketBg.style.display = 'none';
    if(formData) formData.style.display = 'none';
    errorMsg.innerHTML = '<b>Error:</b> No se pudo cargar la información del formulario. Intente más tarde.';
    errorMsg.style.display = 'block';
  });
}


if (!formId || formId.trim() === "") {
  if (formTitleElement) formTitleElement.textContent = 'Error: Formulario no especificado';
  if (errorMsg) {
    errorMsg.innerHTML = '<b>Error Crítico:</b> No se ha especificado un ID de formulario en la URL (parámetro `?id=`).<br>Por favor, contacte al administrador o verifique el enlace.';
    errorMsg.style.display = 'block';
  }
  if (formData) formData.style.display = 'none';
  if (ticketBg) ticketBg.style.display = 'none';
  console.error("formId es nulo o vacío. La aplicación no puede continuar.");
  // No lanzar error aquí para permitir que el mensaje de error se muestre en la página
} else {
  cargarDatosFormulario(); 
}

function toTitleCase(str) {
  return str.toLowerCase().replace(/(^|\s)\S/g, l => l.toUpperCase());
}

function formatCedula(cedula) {
  return cedula.replace(/\D/g, '').replace(/(\d{2})(\d{3})(\d{3})/, '$1.$2.$3');
}

function formatSequentialCode(number) {
  return number.toString().padStart(3, '0');
}

if (formData) {
  formData.addEventListener('submit', async (event) => {
    event.preventDefault();
    errorMsg.style.display = 'none';
    const nombre = inputNombre.value.trim();
    const cedulaRaw = inputCedula.value.replace(/\D/g, ''); 
    const edad = inputEdad.value.trim();

    if (!nombre || !/^\d{7,8}$/.test(cedulaRaw) || !edad || isNaN(parseInt(edad)) || parseInt(edad) < 0) {
      if (!nombre) errorMsg.textContent = 'Debe ingresar un nombre.';
      else if (!/^\d{7,8}$/.test(cedulaRaw)) errorMsg.textContent = 'La cédula debe tener entre 7 y 8 dígitos.';
      else errorMsg.textContent = 'Edad inválida.';
      errorMsg.style.display = 'block';
      return;
    }

    confNombre.textContent = toTitleCase(nombre);
    confCedula.textContent = formatCedula(cedulaRaw);
    confEdad.textContent = `${edad} años`;
    
    formData.style.display = 'none';
    entradaGenerada.style.display = 'none';
    confirmacionDatos.style.display = 'block';
    window.datosParaConfirmar = { nombre, cedula: cedulaRaw, edad };
  });
}

if (btnConfirmar) {
  btnConfirmar.addEventListener('click', async function () {
    if (!formId || formId.trim() === "") {
      errorMsg.innerHTML = "<b>Error Crítico:</b> ID de formulario ausente.";
      errorMsg.style.display = 'block';
      return;
    }

    const { nombre, cedula, edad } = window.datosParaConfirmar;
    const contadorRef = ref(database, `contadores/${formId}/ultimoCodigo`);
    let nuevoCodigoSecuencialFormateado;

    try {
      const transactionResult = await runTransaction(contadorRef, (currentData) => {
        if (currentData === null) {
          // No se puede hacer await get() dentro de la transacción síncrona de Firebase RTDB.
          // Se debe manejar la inicialización del contador de forma diferente o aceptar que
          // el primer código podría no ser 1 si hay un error aquí y se reintenta.
          // Una solución es leer el número de hijos ANTES de la transacción si es la primera vez.
          // Sin embargo, la lógica actual con numChildren + 1 ya está en un callback async,
          // lo que es un problema. La función de transacción NO DEBE SER ASYNC.
          // Se debe reestructurar para que la lectura de hijos (si es necesaria) ocurra fuera
          // o se acepte una inicialización más simple.
          // Para simplificar y corregir: si es null, empezamos en 1.
          // La lógica de contar hijos para inicializar es propensa a race conditions si no está bien manejada.
          // El plan original es que el contador inicie en 1 y se incremente.
          return 1; 
        }
        return currentData + 1;
      });

      if (transactionResult.committed && transactionResult.snapshot.exists()) {
        const nuevoContador = transactionResult.snapshot.val();
        nuevoCodigoSecuencialFormateado = formatSequentialCode(nuevoContador);
      } else {
        console.error("Transacción para el contador no fue committed o el snapshot no existe.");
        errorMsg.textContent = "Error al generar el código secuencial (transacción fallida). Intente de nuevo.";
        errorMsg.style.display = 'block';
        confirmacionDatos.style.display = 'none';
        if (formData) formData.style.display = 'block';
        return;
      }
    } catch (e) {
      console.error("Error en la transacción del contador:", e);
      errorMsg.textContent = "Error crítico al generar el código. Contacte al administrador.";
      errorMsg.style.display = 'block';
      confirmacionDatos.style.display = 'none';
      if (formData) formData.style.display = 'block';
      return;
    }

    const nuevaRespuesta = {
      codigo: nuevoCodigoSecuencialFormateado,
      nombre: toTitleCase(nombre),
      cedula,
      edad,
      fecha: new Date().toISOString()
    };

    const respuestasRef = ref(database, `respuestas/${formId}`);
    try {
      await push(respuestasRef, nuevaRespuesta);
      outNombre.textContent = toTitleCase(nombre);
      outCedula.textContent = formatCedula(cedula);
      outEdad.textContent = `${edad} años`;
      outCodigo.textContent = nuevaRespuesta.codigo;
      codigoQR.textContent = "Código: " + nuevaRespuesta.codigo; // Etiqueta debajo del QR visible

      const qrCanvasElement = document.getElementById('qrCanvas'); // El canvas visible en la página
      const datosQR = `Nombre: ${toTitleCase(nombre)}\nCédula: ${cedula}\nEdad: ${edad}\nCódigo: ${nuevaRespuesta.codigo}`;
      
      // Generar QR en el canvas visible
      QRCode.toCanvas(qrCanvasElement, datosQR, { width: parseInt(qrCanvasElement.style.width) || 70, height: parseInt(qrCanvasElement.style.height) || 70, margin: 1 }, error => {
        if (error) console.error("Error generando QR para visualización:", error);
      });

      confirmacionDatos.style.display = 'none';
      entradaGenerada.style.display = 'block';
    } catch (err) {
      console.error("Error guardando en Firebase:", err);
      errorMsg.textContent = "Error al guardar los datos. Intente de nuevo.";
      errorMsg.style.display = 'block';
      confirmacionDatos.style.display = 'none';
      if (formData) formData.style.display = 'block';
    }
  });
}

if (btnCorregir) {
  btnCorregir.addEventListener('click', () => {
    confirmacionDatos.style.display = 'none';
    if (formData) {
      // Solo mostrar el formulario si formId es válido (ya que cargarDatosFormulario lo oculta si no lo es)
      if (formId && formId.trim() !== "" && formData.style.display === 'none') {
         formData.style.display = 'block';
      }
    }
    errorMsg.style.display = 'none'; // Ocultar cualquier mensaje de error previo
  });
}

// Funcionalidad para el botón "Guardar entrada"
if (guardarBtn) {
  guardarBtn.addEventListener('click', async () => {
    // Intentar cargar html2canvas dinámicamente
    try {
      const html2canvas = (await import('https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.esm.min.js')).default;
      
      const elementToCapture = document.getElementById('entradaGenerada'); // El div que contiene todo el ticket
      if (!elementToCapture) {
        console.error("Elemento 'entradaGenerada' no encontrado para captura.");
        alert("Error: No se pudo encontrar el contenido del ticket para guardar.");
        return;
      }

      // Clonar el elemento para modificarlo antes de la captura sin afectar la visualización
      const clone = elementToCapture.cloneNode(true);
      clone.style.maxWidth = '500px'; // Ancho fijo para la imagen
      clone.style.boxShadow = 'none'; // Quitar sombra para la imagen
      clone.style.padding = '20px'; // Ajustar padding si es necesario
      clone.style.marginTop = '0';
      clone.style.marginBottom = '0';
      
      // Asegurar que el fondo del clon sea blanco si no hay imagen
      const clonedTicketBg = clone.querySelector('#ticketBg');
      if (clonedTicketBg && (!clonedTicketBg.src || clonedTicketBg.style.display === 'none')) {
          const ticketImgWrap = clone.querySelector('.ticket-img-wrap');
          if (ticketImgWrap) ticketImgWrap.style.backgroundColor = '#ffffff'; // Fondo blanco para la captura
      }


      // Añadir el clon al DOM temporalmente para que html2canvas lo renderice correctamente
      clone.style.position = 'absolute';
      clone.style.left = '-9999px'; // Moverlo fuera de la pantalla
      document.body.appendChild(clone);


      html2canvas(clone, { 
        useCORS: true, // Para imágenes de fondo de otros dominios si las hubiera
        scale: 2, // Aumentar la escala para mejor resolución
        backgroundColor: '#ffffff', // Fondo blanco por defecto
        onclone: (documentCloned) => {
          // Asegurar que el canvas del QR se renderice correctamente en el clon
          const originalCanvas = document.getElementById('qrCanvas');
          const clonedCanvas = documentCloned.getElementById('qrCanvas');
          if (originalCanvas && clonedCanvas) {
            // Re-dibujar el QR en el canvas clonado con datos actuales
            const datosQR = `Nombre: ${outNombre.textContent}\nCédula: ${outCedula.textContent}\nEdad: ${outEdad.textContent}\nCódigo: ${outCodigo.textContent}`;
            QRCode.toCanvas(clonedCanvas, datosQR, { width: 70, height: 70, margin:1 }, function (error) {
              if (error) console.error('Error re-dibujando QR en clon:', error);
            });
          }
        }
      }).then(canvas => {
        const link = document.createElement('a');
        link.download = `entrada-${outCodigo.textContent || 'ticket'}.png`;
        link.href = canvas.toDataURL('image/png');
        link.click();
        document.body.removeChild(clone); // Limpiar el clon del DOM
      }).catch(err => {
        console.error("Error al generar la imagen con html2canvas:", err);
        alert("Error al generar la imagen. Intente de nuevo.");
        document.body.removeChild(clone); // Limpiar el clon del DOM en caso de error
      });

    } catch (error) {
      console.error("Error al cargar html2canvas:", error);
      alert("No se pudo cargar la funcionalidad para guardar la imagen. Verifique su conexión o intente más tarde.");
    }
  });
}Tool output for `overwrite_file_with_block`:
