<template>
  <div class="container">
    <h1>Extractor Comercial a CSV</h1>

    <div class="card upload-section">
      <p>1. Carga el Excel actualizado</p>
      <input type="file" @change="handleFileUpload" accept=".xlsx" />
    </div>

    <div v-if="archivoCargado" class="controls-section">
      
      <div class="control-group">
        <p>2. Selecciona las Campañas</p>
        
        <div class="custom-dropdown">
          <button @click="toggleDropdown" class="dropdown-btn">
            {{ textoBotonDropdown }}
            <span class="arrow">▼</span>
          </button>

          <div v-if="dropdownAbierto" class="dropdown-content">
            <label class="select-all" v-if="listaCampanas.length > 0">
               <input type="checkbox" @change="toggleAll" :checked="todasSeleccionadas"/> 
               <b>Seleccionar todas</b>
            </label>
            
            <div v-for="c in listaCampanas" :key="c" class="checkbox-item">
              <label>
                <input 
                  type="checkbox" 
                  :value="c" 
                  v-model="campanasSeleccionadas" 
                />
                {{ c }}
              </label>
            </div>
          </div>
        </div>
        <small>{{ campanasSeleccionadas.length }} campañas seleccionadas</small>
      </div>

      <div class="control-group">
        <p>3. Rango de Fechas</p>
        <div class="date-row">
          <input type="date" v-model="fechaInicio" placeholder="Inicio" />
          <span class="separator">a</span>
          <input type="date" v-model="fechaFin" placeholder="Fin" />
        </div>
      </div>

      <button 
        @click="ejecutarExtraccion" 
        class="action-btn"
        :disabled="campanasSeleccionadas.length === 0 || !fechaInicio"
      >
        GENERAR CSV
      </button>

    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue';
import * as XLSX from 'xlsx';
import { extraerDatosMultiplesCampañas } from './processor';

// Estado
const archivoCargado = ref(null);
const listaCampanas = ref([]);
const campanasSeleccionadas = ref([]); // Ahora es un Array
const fechaInicio = ref('');
const fechaFin = ref('');

// UI Estado
const dropdownAbierto = ref(false);

// Computed para texto del botón
const textoBotonDropdown = computed(() => {
  if (campanasSeleccionadas.value.length === 0) return "Seleccionar...";
  if (campanasSeleccionadas.value.length === 1) return campanasSeleccionadas.value[0];
  return `${campanasSeleccionadas.value.length} campañas seleccionadas`;
});

const todasSeleccionadas = computed(() => {
    return listaCampanas.value.length > 0 && campanasSeleccionadas.value.length === listaCampanas.value.length;
});

// Lógica de carga (Idéntica a la anterior pero limpiando selecciones)
const handleFileUpload = async (event) => {
  const file = event.target.files[0];
  archivoCargado.value = file;
  campanasSeleccionadas.value = []; // Reset

  const data = await file.arrayBuffer();
  const workbook = XLSX.read(data);
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const json = XLSX.utils.sheet_to_json(sheet, { header: 1 });
  
  const headerIndex = json.findIndex(row => row[0] && row[0].toString().includes('EVENTO'));
  
  const campañas = new Set();
  json.slice(headerIndex + 1).forEach(row => {
    if (row[0]) campañas.add(row[0].toString().trim());
  });
  
  listaCampanas.value = Array.from(campañas).sort();
};

// Lógica UI Dropdown
const toggleDropdown = () => dropdownAbierto.value = !dropdownAbierto.value;

const toggleAll = (e) => {
    if (e.target.checked) {
        campanasSeleccionadas.value = [...listaCampanas.value];
    } else {
        campanasSeleccionadas.value = [];
    }
}

// Ejecución
const ejecutarExtraccion = async () => {
  try {
    const csvContent = await extraerDatosMultiplesCampañas(
        archivoCargado.value, 
        campanasSeleccionadas.value, // Pasamos el array completo
        fechaInicio.value, 
        fechaFin.value
    );

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    // Nombre del archivo más genérico "Multi_Export"
    link.download = `Exportacion_Figma_${campanasSeleccionadas.value.length}_Campañas.csv`;
    link.click();
    
  } catch (error) {
    alert("Error al procesar: " + error.message);
  }
};
</script>

<style scoped>
/* Estilos básicos para que se vea bien el menu */
.container { max-width: 500px; margin: 0 auto; font-family: sans-serif; padding: 20px; }
.card { background: #f9f9f9; padding: 15px; border-radius: 8px; margin-bottom: 20px; border: 1px solid #ddd; }
.controls-section { display: flex; flex-direction: column; gap: 20px; }

/* Dropdown Styles */
.custom-dropdown { position: relative; width: 100%; }
.dropdown-btn {
  width: 100%; padding: 10px; background: white; border: 1px solid #ccc;
  border-radius: 4px; text-align: left; cursor: pointer; display: flex; justify-content: space-between;
}
.dropdown-content {
  position: absolute; top: 100%; left: 0; right: 0;
  background: white; border: 1px solid #ccc; border-radius: 4px;
  max-height: 250px; overflow-y: auto; z-index: 10; box-shadow: 0 4px 6px rgba(0,0,0,0.1);
}
.checkbox-item, .select-all { padding: 8px 12px; display: block; cursor: pointer; }
.checkbox-item:hover { background-color: #f0f0f0; }
.checkbox-item input { margin-right: 10px; }
.select-all { border-bottom: 1px solid #eee; background: #fafafa; }

/* Date inputs */
.date-row { display: flex; gap: 10px; align-items: center; }
.date-row input { flex: 1; padding: 8px; border: 1px solid #ccc; border-radius: 4px; }

/* Action Button */
.action-btn {
  background: #2c3e50; color: white; padding: 15px; border: none;
  border-radius: 6px; font-size: 16px; cursor: pointer; transition: background 0.3s;
}
.action-btn:hover { background: #34495e; }
.action-btn:disabled { background: #95a5a6; cursor: not-allowed; }
</style>