/**
 * Exportación a Excel (.xlsx) sin dependencias externas.
 *
 * Un .xlsx es un ZIP con XML dentro. Aquí se genera un ZIP mínimo con el
 * método "stored" (sin compresión) — suficiente para Excel, LibreOffice y
 * Google Sheets — evitando instalar librerías en el proyecto.
 */

// ── CRC-32 (necesario para entradas ZIP válidas) ─────────────────────────────
const CRC_TABLE = (() => {
  const tabla = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    tabla[n] = c >>> 0;
  }
  return tabla;
})();

const crc32 = (bytes) => {
  let c = 0xffffffff;
  for (let i = 0; i < bytes.length; i++) c = CRC_TABLE[(c ^ bytes[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
};

const utf8 = (str) => new TextEncoder().encode(str);

// ── Ensamblado de ZIP (método stored) ────────────────────────────────────────
// Une piezas sueltas (Uint8Array o números) en un solo buffer de bytes.
function concatBytes(piezas) {
  const salida = [];
  for (const p of piezas) {
    if (typeof p === 'number') salida.push(p);
    else for (const b of p) salida.push(b);
  }
  return new Uint8Array(salida);
}

export function buildZip(files) {
  const u16 = (v) => new Uint8Array([v & 0xff, (v >> 8) & 0xff]);
  const u32 = (v) => new Uint8Array([v & 0xff, (v >> 8) & 0xff, (v >> 16) & 0xff, (v >>> 24) & 0xff]);

  // Fecha DOS fija (01/01/2026) — el contenido no depende de la hora local
  const DOS_TIME = u16(0);
  const DOS_DATE = u16(((2026 - 1980) << 9) | (1 << 5) | 1);

  const locales = [];
  const central = [];
  let offset = 0;

  for (const { name, data } of files) {
    const nombre = utf8(name);
    const crc = crc32(data);

    // Local file header
    locales.push(
      u32(0x04034b50), u16(20), u16(0x0800), u16(0),
      DOS_TIME, DOS_DATE,
      u32(crc), u32(data.length), u32(data.length),
      u16(nombre.length), u16(0),
      nombre, data
    );

    // Central directory record
    central.push(
      u32(0x02014b50), u16(20), u16(20), u16(0x0800), u16(0),
      DOS_TIME, DOS_DATE,
      u32(crc), u32(data.length), u32(data.length),
      u16(nombre.length), u16(0), u16(0), u16(0), u16(0), u32(0), u32(offset),
      nombre
    );

    offset += 30 + nombre.length + data.length;
  }

  const centralBytes = concatBytes(central);
  const fin = concatBytes([
    u32(0x06054b50), u16(0), u16(0),
    u16(files.length), u16(files.length),
    u32(centralBytes.length), u32(offset), u16(0),
  ]);

  return concatBytes([...locales, centralBytes, fin]);
}

// ── XML helpers ──────────────────────────────────────────────────────────────
const escapeXml = (s) =>
  String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');

const colName = (n) => {
  let s = '';
  n += 1;
  while (n > 0) {
    const m = (n - 1) % 26;
    s = String.fromCharCode(65 + m) + s;
    n = Math.floor((n - 1) / 26);
  }
  return s;
};

const celda = (valor, fila, col, estilo = 0) => {
  const ref = `${colName(col)}${fila}`;
  const s = estilo ? ` s="${estilo}"` : '';
  if (valor === null || valor === undefined || valor === '') return `<c r="${ref}"${s}/>`;
  if (typeof valor === 'number' && Number.isFinite(valor)) {
    return `<c r="${ref}"${s} t="n"><v>${valor}</v></c>`;
  }
  return `<c r="${ref}"${s} t="inlineStr"><is><t xml:space="preserve">${escapeXml(valor)}</t></is></c>`;
};

/**
 * Genera y descarga un .xlsx con formato (encabezado con color, bordes y
 * anchos de columna calculados según el contenido).
 * @param {string[]} headers  Nombres de columna
 * @param {Array<Array<string|number|null>>} filas  Filas de datos
 * @param {string} nombreArchivo  ej: "inventario.xlsx"
 */
export function exportarExcel(headers, filas, nombreArchivo = 'export.xlsx') {
  // Estilos: 0 = normal · 1 = encabezado (negrita, blanco, fondo azul) · 2 = datos con borde
  const styles = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
<fonts count="2"><font><sz val="11"/><name val="Calibri"/></font><font><b/><sz val="11"/><color rgb="FFFFFFFF"/><name val="Calibri"/></font></fonts>
<fills count="3"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill><fill><patternFill patternType="solid"><fgColor rgb="FF1F4E78"/><bgColor indexed="64"/></patternFill></fill></fills>
<borders count="2"><border><left/><right/><top/><bottom/><diagonal/></border><border><left style="thin"><color rgb="FFD9D9D9"/></left><right style="thin"><color rgb="FFD9D9D9"/></right><top style="thin"><color rgb="FFD9D9D9"/></top><bottom style="thin"><color rgb="FFD9D9D9"/></bottom><diagonal/></border></borders>
<cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>
<cellXfs count="3">
<xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/>
<xf numFmtId="0" fontId="1" fillId="2" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment horizontal="center" vertical="center" wrapText="1"/></xf>
<xf numFmtId="0" fontId="0" fillId="0" borderId="1" xfId="0" applyBorder="1" applyAlignment="1"><alignment vertical="center"/></xf>
</cellXfs>
</styleSheet>`;

  const filasXml = [];
  filasXml.push(
    `<row r="1">${headers.map((h, i) => celda(h, 1, i, 1)).join('')}</row>`
  );
  filas.forEach((fila, f) => {
    filasXml.push(`<row r="${f + 2}">${fila.map((v, i) => celda(v, f + 2, i, 2)).join('')}</row>`);
  });

  // Ancho por columna: el máximo entre el encabezado y el contenido (límite 45)
  const anchos = headers.map((h, i) => {
    let max = String(h ?? '').length;
    filas.forEach((fila) => {
      const len = String(fila[i] ?? '').length;
      if (len > max) max = len;
    });
    return Math.min(Math.max(max + 3, 10), 45);
  });
  const cols = anchos
    .map((w, i) => `<col min="${i + 1}" max="${i + 1}" width="${w}" customWidth="1"/>`)
    .join('');

  const contentTypes = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/></Types>`;

  const rels = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>`;

  const workbook = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets><sheet name="Inventario" sheetId="1" r:id="rId1"/></sheets></workbook>`;

  const workbookRels = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>`;

  const sheet = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetViews><sheetView workbookViewId="0"><pane ySplit="1" topLeftCell="A2" activePane="bottomLeft" state="frozen"/></sheetView></sheetViews><cols>${cols}</cols><sheetData>${filasXml.join('')}</sheetData></worksheet>`;

  const zip = buildZip([
    { name: '[Content_Types].xml', data: utf8(contentTypes) },
    { name: '_rels/.rels', data: utf8(rels) },
    { name: 'xl/workbook.xml', data: utf8(workbook) },
    { name: 'xl/_rels/workbook.xml.rels', data: utf8(workbookRels) },
    { name: 'xl/styles.xml', data: utf8(styles) },
    { name: 'xl/worksheets/sheet1.xml', data: utf8(sheet) },
  ]);

  const blob = new Blob([zip], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
  const url = URL.createObjectURL(blob);
  const enlace = document.createElement('a');
  enlace.href = url;
  enlace.download = nombreArchivo;
  document.body.appendChild(enlace);
  enlace.click();
  enlace.remove();
  URL.revokeObjectURL(url);
}
