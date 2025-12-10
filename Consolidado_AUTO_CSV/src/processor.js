import * as XLSX from 'xlsx';

export async function extraerDatosMultiplesCampañas(archivo, campañasSeleccionadas, fechaUsuarioInicio, fechaUsuarioFin) {
    
    // 1. Leer archivo
    const data = await archivo.arrayBuffer();
    const workbook = XLSX.read(data, { type: 'array', cellDates: true });
    
    const firstSheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[firstSheetName];

    // header: 1 nos da la matriz completa (incluyendo filas vacías si las hay)
    const rawData = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: "" });

    // 2. Encontrar fila de encabezado
    let headerRowIndex = rawData.findIndex(row => 
        row[0] && row[0].toString().toUpperCase().includes('EVENTO')
    );

    if (headerRowIndex === -1) throw new Error("No se encontró la fila de encabezados 'EVENTO/VIGENCIAS'");

    // Normalizar campañas
    const campañasTarget = campañasSeleccionadas.map(c => c.trim().toLowerCase());

    // 3. Filtrar Filas (Lógica de Negocio)
    const filasFiltradas = rawData.filter((row, index) => {
        // Saltamos filas previas y el propio encabezado (lo procesaremos aparte)
        if (index <= headerRowIndex) return false;

        // --- FILTRO CAMPAÑA ---
        const cellCampaña = row[0] ? row[0].toString().trim().toLowerCase() : "";
        const esCampañaElegida = campañasTarget.includes(cellCampaña);
        if (!esCampañaElegida) return false;

        // --- FILTRO FECHAS ---
        // Usamos columnas J (índice 9) y K (índice 10) para validar, AUNQUE NO LAS EXPORTEMOS TODAS
        const cellInicio = row[10]; 
        const cellFin = row[11];   

        const fechaRowInicio = new Date(cellInicio);
        const fechaRowFin = new Date(cellFin);
        const filtroInicio = new Date(fechaUsuarioInicio);
        const filtroFin = new Date(fechaUsuarioFin);

        if (isNaN(fechaRowInicio) || isNaN(fechaRowFin)) return false;

        // Lógica de cruce de fechas
        return (fechaRowInicio <= filtroFin) && (fechaRowFin >= filtroInicio);
    });

    // 4. Función para Seleccionar Columnas Específicas
    // Esta función recorta y pega los pedazos de fila que nos interesan
    const seleccionarColumnas = (filaCompleta) => {
        return [
            ...filaCompleta.slice(0, 9),    // 1 a 9 (A - I)
            ...filaCompleta.slice(10, 13),  // 11 a 13 (K - M) 
            ...filaCompleta.slice(15, 42),  // P (15) a AQ (43)
            ...filaCompleta.slice(15, 42),  // P (15) a AQ (43)
            ...filaCompleta.slice(47, 49),  // AV (47) a AW (48)
            ...filaCompleta.slice(50, 52),  // AY (50) a AZ (51)
            ...filaCompleta.slice(52, 56),  
            ...filaCompleta.slice(57, 61),  
            ...filaCompleta.slice(62, 64),  
            ...filaCompleta.slice(65, 79)   
        ];
    };

    // 5. Construir el Dataset Final
    
    // Primero, procesamos el encabezado para que tenga las mismas columnas que los datos
    const filaEncabezadoOriginal = rawData[headerRowIndex];
    const nuevoEncabezado = seleccionarColumnas(filaEncabezadoOriginal);

    // Luego procesamos todas las filas filtradas
    const nuevosDatos = filasFiltradas.map(fila => seleccionarColumnas(fila));

    // Unimos todo
    const datasetParaCSV = [nuevoEncabezado, ...nuevosDatos];

    // 6. Generar CSV
    const hojaSalida = XLSX.utils.aoa_to_sheet(datasetParaCSV);
    return XLSX.utils.sheet_to_csv(hojaSalida);
}