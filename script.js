// Elementos del DOM
const taskForm = document.getElementById('taskForm');
const taskList = document.getElementById('taskList');
const themeToggle = document.getElementById('themeToggle');
const videoFondo = document.getElementById('video-fondo');
const imagenTema = document.getElementById('imagenTema');

let tasks = JSON.parse(localStorage.getItem('tasks')) || [];
let draggedTaskId = null;

// Solicitar permiso de notificaciones
if ('Notification' in window && Notification.permission !== 'granted') {
  Notification.requestPermission();
}

// Cargar tema guardado
const temaGuardado = localStorage.getItem('tema');
document.body.classList.toggle('dark', temaGuardado === 'dark');
if (videoFondo) videoFondo.style.filter = temaGuardado === 'dark' ? 'brightness(50%)' : 'brightness(100%)';
themeToggle.textContent = temaGuardado === 'dark' ? '☀️ Modo claro' : '🌙 Modo oscuro';

function saveTasks() {
  localStorage.setItem('tasks', JSON.stringify(tasks));
}

function programarNotificacion(tarea) {
  const [dia, mes, anio] = tarea.fecha.split('/');
  const fechaVencimiento = new Date(`${anio}-${mes}-${dia}T08:00:00`);
  const ahora = new Date();
  const tiempoRestante = fechaVencimiento - ahora;

  if (tiempoRestante > 0 && tiempoRestante <= 24 * 60 * 60 * 1000) {
    setTimeout(() => {
      if (Notification.permission === 'granted') {
        new Notification(`⏰ Tarea próxima a vencer: "${tarea.texto}"`, {
          body: `Prioridad: ${tarea.prioridad}`,
          icon: '/icono-tarea.png'
        });
      }
    }, tiempoRestante);
  }
}

function renderTasks(filtro = 'todas') {
  taskList.innerHTML = '';
  const filtered = filtro === 'completadas' ? tasks.filter(t => t.completada)
                  : filtro === 'pendientes' ? tasks.filter(t => !t.completada)
                  : tasks;

  filtered.forEach(task => {
    const taskEl = document.createElement('div');
    taskEl.className = `task ${task.completada ? 'completed' : ''}`;
    taskEl.setAttribute('draggable', true);
    taskEl.setAttribute('data-id', task.id);

    taskEl.addEventListener('dragstart', handleDragStart);
    taskEl.addEventListener('dragover', handleDragOver);
    taskEl.addEventListener('drop', handleDrop);
    taskEl.addEventListener('dragend', handleDragEnd);

    if (task.editing) {
      taskEl.innerHTML = `
        <div>
          <input type="text" id="editText-${task.id}" value="${task.texto}" onkeydown="handleEditKey(event, ${task.id})" onblur="guardarEdicion(${task.id})">
          <input type="date" id="editDate-${task.id}" value="${formatearFechaInput(task.fecha)}" onkeydown="handleEditKey(event, ${task.id})" onblur="guardarEdicion(${task.id})">
          <select id="editPriority-${task.id}" onkeydown="handleEditKey(event, ${task.id})" onblur="guardarEdicion(${task.id})">
            <option value="baja" ${task.prioridad === 'baja' ? 'selected' : ''}>Baja</option>
            <option value="media" ${task.prioridad === 'media' ? 'selected' : ''}>Media</option>
            <option value="alta" ${task.prioridad === 'alta' ? 'selected' : ''}>Alta</option>
          </select>
        </div>
        <div>
          <button onclick="guardarEdicion(${task.id})">💾</button>
          <button onclick="cancelarEdicion(${task.id})">❌</button>
        </div>`;
    } else {
      taskEl.innerHTML = `
        <div>
          <input type="checkbox" ${task.completada ? 'checked' : ''} onchange="toggleComplete(${task.id})">
          <span>${task.texto} - ${task.fecha}</span>
          <span class="priority ${task.prioridad}">${task.prioridad}</span>
        </div>
        <div>
          <button onclick="iniciarEdicion(${task.id})">✏️</button>
          <button onclick="deleteTask(${task.id})">🗑️</button>
        </div>`;
    }

    taskList.appendChild(taskEl);
    if (!task.completada) programarNotificacion(task);
  });
}

taskForm.addEventListener('submit', e => {
  e.preventDefault();
  const texto = document.getElementById('taskText').value.trim();
  const fechaInput = document.getElementById('taskDate').value;
  const prioridad = document.getElementById('taskPriority').value;

  if (!texto) return alert('La tarea no puede estar vacía.');
  const fechaObj = new Date(fechaInput);
  if (isNaN(fechaObj)) return alert('Fecha inválida.');

  const dia = String(fechaObj.getDate()).padStart(2, '0');
  const mes = String(fechaObj.getMonth() + 1).padStart(2, '0');
  const anio = fechaObj.getFullYear();
  const fechaFormateada = `${dia}/${mes}/${anio}`;

  const nuevaTarea = {
    id: Date.now(),
    texto,
    fecha: fechaFormateada,
    prioridad,
    completada: false
  };

  tasks.push(nuevaTarea);
  saveTasks();
  renderTasks();
  programarNotificacion(nuevaTarea);
  taskForm.reset();
});

function toggleComplete(id) {
  tasks = tasks.map(t => t.id === id ? { ...t, completada: !t.completada } : t);
  saveTasks();
  renderTasks();
}

function deleteTask(id) {
  tasks = tasks.filter(t => t.id !== id);
  saveTasks();
  renderTasks();
}

function iniciarEdicion(id) {
  tasks = tasks.map(t => t.id === id ? { ...t, editing: true } : t);
  renderTasks();
}

function cancelarEdicion(id) {
  tasks = tasks.map(t => t.id === id ? { ...t, editing: false } : t);
  renderTasks();
}

function guardarEdicion(id) {
  const nuevoTexto = document.getElementById(`editText-${id}`).value.trim();
  const nuevaFechaRaw = document.getElementById(`editDate-${id}`).value;
  const nuevaPrioridad = document.getElementById(`editPriority-${id}`).value;

  if (!nuevoTexto || !nuevaFechaRaw) return alert('Todos los campos son obligatorios.');

  const fechaObj = new Date(nuevaFechaRaw);
  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);
  if (fechaObj < hoy) return alert('La fecha no puede ser anterior a hoy.');

  const dia = String(fechaObj.getDate()).padStart(2, '0');
  const mes = String(fechaObj.getMonth() + 1).padStart(2, '0');
  const anio = fechaObj.getFullYear();
  const fechaFormateada = `${dia}/${mes}/${anio}`;

  tasks = tasks.map(t => t.id === id ? { ...t, texto: nuevoTexto, fecha: fechaFormateada, prioridad: nuevaPrioridad, editing: false } : t);
  saveTasks();
  renderTasks();
}

function handleEditKey(e, id) {
  if (e.key === 'Enter') {
    e.preventDefault();
    guardarEdicion(id);
  }
}

document.getElementById('exportCSV').addEventListener('click', () => {
  if (tasks.length === 0) return alert('No hay tareas para exportar.');

  const encabezados = ['Texto', 'Fecha', 'Prioridad', 'Completada'];
  const filas = tasks.map(t => [
    `"${t.texto}"`,
    `"${t.fecha}"`,
    t.prioridad,
    t.completada ? 'Sí' : 'No'
  ]);

  const contenidoCSV = [encabezados.join(','), ...filas.map(f => f.join(','))].join('\n');
  const blob = new Blob([contenidoCSV], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = 'tareas.csv';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
});

function formatearFechaInput(fecha) {
  const [dia, mes, anio] = fecha.split('/');
  return `${anio}-${mes}-${dia}`;
}

function handleDragStart(e) {
  const id = e.currentTarget.getAttribute('data-id');
  e.dataTransfer.setData('text/plain', id);
  e.currentTarget.classList.add('dragging');
}

function handleDragOver(e) {
  e.preventDefault();
}

function handleDrop(e) {
  e.preventDefault();
  const draggedId = e.dataTransfer.getData('text/plain');
  const targetId = e.currentTarget.getAttribute('data-id');
  if (draggedId === targetId) return;

  const draggedIndex = tasks.findIndex(t => t.id == draggedId);
  const targetIndex = tasks.findIndex(t => t.id == targetId);
  const [draggedTask] = tasks.splice(draggedIndex, 1);
  tasks.splice(targetIndex, 0, draggedTask);

  saveTasks();
  renderTasks();
}

function handleDragEnd() {
  document.querySelectorAll('.task').forEach(el => el.classList.remove('dragging'));
}

// Modo claro/oscuro
themeToggle.addEventListener('click', () => {
  const esOscuro = document.body.classList.toggle('dark');
  localStorage.setItem('tema', esOscuro ? 'dark' : 'light');

  if (videoFondo) videoFondo.style.filter = esOscuro ? 'brightness(50%)' : 'brightness(100%)';
  themeToggle.textContent = esOscuro ? '☀️ Modo claro' : '🌙 Modo oscuro';
  if (imagenTema) imagenTema.src = esOscuro ? '/Diseño_JD.mp4' : '/jdlogo.png';
});

renderTasks();
