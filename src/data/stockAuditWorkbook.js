const XML_HEADER = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
const COLUMNS = 14

const xml = (value) => String(value ?? '')
  .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '')
  .replaceAll('&', '&amp;')
  .replaceAll('<', '&lt;')
  .replaceAll('>', '&gt;')
  .replaceAll('"', '&quot;')
  .replaceAll("'", '&apos;')

const columnName = (column) => {
  let value = column
  let name = ''
  while (value > 0) {
    const remainder = (value - 1) % 26
    name = String.fromCharCode(65 + remainder) + name
    value = Math.floor((value - 1) / 26)
  }
  return name
}

const inlineCell = (reference, value, style = 6) => `<c r="${reference}" s="${style}" t="inlineStr"><is><t xml:space="preserve">${xml(value)}</t></is></c>`
const numberCell = (reference, value, style) => {
  const number = Number(value)
  return Number.isFinite(number) ? `<c r="${reference}" s="${style}"><v>${number}</v></c>` : ''
}
const blankCell = (reference, style = 6) => `<c r="${reference}" s="${style}"/>`

function crc32(bytes) {
  let crc = 0xFFFFFFFF
  for (const byte of bytes) {
    crc ^= byte
    for (let bit = 0; bit < 8; bit += 1) crc = (crc >>> 1) ^ ((crc & 1) ? 0xEDB88320 : 0)
  }
  return (crc ^ 0xFFFFFFFF) >>> 0
}

function zipStore(files) {
  const encoder = new TextEncoder()
  const localParts = []
  const directoryParts = []
  let directoryOffset = 0

  for (const [path, contents] of files) {
    const name = encoder.encode(path)
    const bytes = encoder.encode(contents)
    const checksum = crc32(bytes)
    const localHeader = new Uint8Array(30 + name.length)
    const localView = new DataView(localHeader.buffer)
    localView.setUint32(0, 0x04034B50, true)
    localView.setUint16(4, 20, true)
    localView.setUint16(6, 0, true)
    localView.setUint16(8, 0, true)
    localView.setUint16(10, 0, true)
    localView.setUint16(12, 0x21, true)
    localView.setUint32(14, checksum, true)
    localView.setUint32(18, bytes.length, true)
    localView.setUint32(22, bytes.length, true)
    localView.setUint16(26, name.length, true)
    localView.setUint16(28, 0, true)
    localHeader.set(name, 30)
    localParts.push(localHeader, bytes)

    const directoryHeader = new Uint8Array(46 + name.length)
    const directoryView = new DataView(directoryHeader.buffer)
    directoryView.setUint32(0, 0x02014B50, true)
    directoryView.setUint16(4, 20, true)
    directoryView.setUint16(6, 20, true)
    directoryView.setUint16(8, 0, true)
    directoryView.setUint16(10, 0, true)
    directoryView.setUint16(12, 0, true)
    directoryView.setUint16(14, 0x21, true)
    directoryView.setUint32(16, checksum, true)
    directoryView.setUint32(20, bytes.length, true)
    directoryView.setUint32(24, bytes.length, true)
    directoryView.setUint16(28, name.length, true)
    directoryView.setUint16(30, 0, true)
    directoryView.setUint16(32, 0, true)
    directoryView.setUint16(34, 0, true)
    directoryView.setUint16(36, 0, true)
    directoryView.setUint32(38, 0, true)
    directoryView.setUint32(42, directoryOffset, true)
    directoryHeader.set(name, 46)
    directoryParts.push(directoryHeader)
    directoryOffset += localHeader.length + bytes.length
  }

  const directory = new Uint8Array(directoryParts.reduce((sum, part) => sum + part.length, 0))
  let directoryCursor = 0
  for (const part of directoryParts) {
    directory.set(part, directoryCursor)
    directoryCursor += part.length
  }
  const localSize = directoryOffset
  const end = new Uint8Array(22)
  const endView = new DataView(end.buffer)
  endView.setUint32(0, 0x06054B50, true)
  endView.setUint16(4, 0, true)
  endView.setUint16(6, 0, true)
  endView.setUint16(8, files.length, true)
  endView.setUint16(10, files.length, true)
  endView.setUint32(12, directory.length, true)
  endView.setUint32(16, localSize, true)
  endView.setUint16(20, 0, true)

  const output = new Uint8Array(localSize + directory.length + end.length)
  let cursor = 0
  for (const part of localParts) {
    output.set(part, cursor)
    cursor += part.length
  }
  output.set(directory, cursor)
  cursor += directory.length
  output.set(end, cursor)
  return output
}

function stockRows(products) {
  const excluded = []
  const rows = products.map((product) => {
    const isTan = product.productType === 'tan'
    const onHand = Number(product.stockQuantity || 0)
    const reserved = Number(product.reservedQuantity || 0)
    const available = Math.max(0, onHand - reserved)
    const metersPerTan = Number(product.metersPerTan)
    const rawSaleRate = isTan ? product.salePricePerMeter : product.salePrice
    const saleRate = Number(rawSaleRate)
    const missingPrice = rawSaleRate == null || String(rawSaleRate).trim() === '' || !Number.isFinite(saleRate) || saleRate < 0
    const invalidTanLength = isTan && (!Number.isFinite(metersPerTan) || metersPerTan <= 0)
    let sellingValue = onHand * (isTan ? metersPerTan : 1) * saleRate
    if (onHand > 0 && (missingPrice || invalidTanLength)) {
      const reasons = [missingPrice && 'Missing sale price', invalidTanLength && 'Invalid meters per Tan'].filter(Boolean)
      const name = product.articleNumber || product.article || product.code || product.name || 'Unnamed product'
      excluded.push(`${name} · ${product.batchNumber || 'No batch'}: ${reasons.join(', ')}`)
      sellingValue = null
    }
    return {
      product,
      isTan,
      onHand,
      available,
      reserved,
      defective: Number(product.defectiveQuantity || 0),
      metersPerTan: isTan && Number.isFinite(metersPerTan) && metersPerTan > 0 ? metersPerTan : null,
      purchaseRate: Number(product.averageCost || 0),
      saleRate: missingPrice ? null : saleRate,
      purchaseValue: onHand * Number(product.averageCost || 0),
      sellingValue,
    }
  })
  return { rows, excluded }
}

function workbookXml(lastRow) {
  const width = COLUMNS
  const lastColumn = columnName(width)
  return `${XML_HEADER}<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><bookViews><workbookView/></bookViews><sheets><sheet name="Stock Audit" sheetId="1" r:id="rId1"/></sheets><definedNames><definedName name="_xlnm.Print_Area" localSheetId="0">'Stock Audit'!$A$1:$${lastColumn}$${lastRow}</definedName><definedName name="_xlnm.Print_Titles" localSheetId="0">'Stock Audit'!$1:$5</definedName></definedNames></workbook>`
}

function stylesXml() {
  return `${XML_HEADER}<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><numFmts count="3"><numFmt numFmtId="164" formatCode="#,##0.00"/><numFmt numFmtId="165" formatCode="&quot;Rs. &quot;#,##0.00"/><numFmt numFmtId="166" formatCode="#,##0"/></numFmts><fonts count="5"><font><sz val="10"/><color rgb="FF173B32"/><name val="Aptos"/></font><font><b/><sz val="16"/><color rgb="FFFFFFFF"/><name val="Aptos Display"/></font><font><sz val="9"/><color rgb="FF52645C"/><name val="Aptos"/></font><font><b/><sz val="9"/><color rgb="FFFFFFFF"/><name val="Aptos"/></font><font><b/><sz val="9"/><color rgb="FF9C0006"/><name val="Aptos"/></font></fonts><fills count="5"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill><fill><patternFill patternType="solid"><fgColor rgb="FF155B4B"/><bgColor indexed="64"/></patternFill></fill><fill><patternFill patternType="solid"><fgColor rgb="FFEAF3E7"/><bgColor indexed="64"/></patternFill></fill><fill><patternFill patternType="solid"><fgColor rgb="FFFFF2CC"/><bgColor indexed="64"/></patternFill></fill></fills><borders count="2"><border><left/><right/><top/><bottom/><diagonal/></border><border><left/><right/><top/><bottom style="thin"><color rgb="FFE3EAE5"/></bottom><diagonal/></border></borders><cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs><cellXfs count="11"><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/><xf numFmtId="0" fontId="1" fillId="2" borderId="0" xfId="0" applyAlignment="1"><alignment horizontal="center" vertical="center"/></xf><xf numFmtId="0" fontId="2" fillId="3" borderId="0" xfId="0" applyAlignment="1"><alignment vertical="center"/></xf><xf numFmtId="0" fontId="0" fillId="3" borderId="1" xfId="0" applyAlignment="1"><alignment vertical="center" wrapText="1"/></xf><xf numFmtId="165" fontId="0" fillId="3" borderId="1" xfId="0" applyAlignment="1"><alignment horizontal="right" vertical="center"/></xf><xf numFmtId="0" fontId="3" fillId="2" borderId="1" xfId="0" applyAlignment="1"><alignment horizontal="center" vertical="center" wrapText="1"/></xf><xf numFmtId="0" fontId="2" fillId="0" borderId="1" xfId="0" applyAlignment="1"><alignment vertical="center" wrapText="1"/></xf><xf numFmtId="166" fontId="2" fillId="0" borderId="1" xfId="0" applyAlignment="1"><alignment horizontal="right" vertical="center"/></xf><xf numFmtId="164" fontId="2" fillId="0" borderId="1" xfId="0" applyAlignment="1"><alignment horizontal="right" vertical="center"/></xf><xf numFmtId="165" fontId="2" fillId="0" borderId="1" xfId="0" applyAlignment="1"><alignment horizontal="right" vertical="center"/></xf><xf numFmtId="0" fontId="4" fillId="4" borderId="1" xfId="0" applyAlignment="1"><alignment vertical="center" wrapText="1"/></xf></cellXfs><cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles></styleSheet>`
}

function worksheetXml(products, valuation, date) {
  const { rows, excluded } = stockRows(products)
  const headers = ['Type', 'Article / tan name', 'Product / tan type', 'Supplier', 'Batch', 'On hand (suits/tans)', 'Available (suits/tans)', 'Reserved', 'Defective', 'Meters / tan', 'Purchase rate / suit or tan (Rs.)', 'Sale rate / suit or meter (Rs.)', 'Stock purchase cost (Rs.)', 'Stock value at sale prices (Rs.)']
  const lastDataRow = rows.length + 5
  const totalRow = lastDataRow + 1
  const noteRow = totalRow + 1
  const lastColumn = columnName(headers.length)
  const columnWidths = [8, 15, 18, 16, 14, 9, 9, 9, 9, 10, 13, 13, 16, 16]
  const cols = columnWidths.map((width, index) => `<col min="${index + 1}" max="${index + 1}" width="${width}" customWidth="1"/>`).join('')
  const headerCells = headers.map((header, index) => inlineCell(`${columnName(index + 1)}5`, header, 5)).join('')
  const dataRows = rows.map((row, index) => {
    const number = index + 6
    const article = row.isTan ? row.product.name || '' : row.product.articleNumber || row.product.article || row.product.code || ''
    const productType = row.isTan ? row.product.tanType || '' : row.product.name || row.product.productName || ''
    const values = [
      inlineCell(`A${number}`, row.isTan ? 'Tan' : 'Suit'),
      inlineCell(`B${number}`, article),
      inlineCell(`C${number}`, productType),
      inlineCell(`D${number}`, ['-', '—'].includes(row.product.supplier) ? '' : row.product.supplier),
      inlineCell(`E${number}`, ['-', '—'].includes(row.product.batch) ? '' : row.product.batch),
      numberCell(`F${number}`, row.onHand, 7),
      numberCell(`G${number}`, row.available, 7),
      numberCell(`H${number}`, row.reserved, 7),
      numberCell(`I${number}`, row.defective, 7),
      row.metersPerTan == null ? blankCell(`J${number}`, 7) : numberCell(`J${number}`, row.metersPerTan, 8),
      numberCell(`K${number}`, row.purchaseRate, 9),
      row.saleRate == null ? blankCell(`L${number}`, 9) : numberCell(`L${number}`, row.saleRate, 9),
      numberCell(`M${number}`, row.purchaseValue, 9),
      row.sellingValue == null
        ? inlineCell(`N${number}`, `Excluded: ${[row.saleRate == null && 'missing sale price', row.isTan && row.metersPerTan == null && 'invalid tan length'].filter(Boolean).join(', ')}`, 10)
        : numberCell(`N${number}`, row.sellingValue, 9),
    ].filter(Boolean).join('')
    return `<row r="${number}" ht="25" customHeight="1">${values}</row>`
  }).join('')
  const totalCells = [
    inlineCell(`A${totalRow}`, 'TOTAL', 10),
    ...Array.from({ length: 4 }, (_, index) => blankCell(`${columnName(index + 2)}${totalRow}`, 10)),
    numberCell(`F${totalRow}`, rows.reduce((sum, row) => sum + row.onHand, 0), 7),
    numberCell(`G${totalRow}`, rows.reduce((sum, row) => sum + row.available, 0), 7),
    numberCell(`H${totalRow}`, rows.reduce((sum, row) => sum + row.reserved, 0), 7),
    numberCell(`I${totalRow}`, rows.reduce((sum, row) => sum + row.defective, 0), 7),
    blankCell(`J${totalRow}`, 10),
    blankCell(`K${totalRow}`, 10),
    blankCell(`L${totalRow}`, 10),
    numberCell(`M${totalRow}`, valuation.purchaseCost, 9),
    numberCell(`N${totalRow}`, valuation.sellingValue, 9),
  ].join('')
  const partialNote = excluded.length
    ? `Partial selling value: ${excluded.length} stocked product(s) are excluded below because their sale price or tan length is invalid. Sale rate is per suit for suits and per meter for tans; purchase rate is per suit or tan.`
    : 'Sale rate is per suit for suits and per meter for tans; purchase rate is per suit or tan. Tan value uses meters per tan × sale rate per meter.'
  const summaryCells = [
    inlineCell('A3', 'Products', 3), numberCell('B3', rows.length, 7),
    inlineCell('C3', 'On-hand units', 3), numberCell('D3', rows.reduce((sum, row) => sum + row.onHand, 0), 7),
    inlineCell('E3', 'Purchase cost (Rs.)', 3), numberCell('F3', valuation.purchaseCost, 4),
    inlineCell('G3', 'Sale value (Rs.)', 3), numberCell('H3', valuation.sellingValue, 4),
    inlineCell('I3', 'Partial rows', 3), numberCell('J3', excluded.length, 7),
  ].join('')

  return `${XML_HEADER}<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetPr><pageSetUpPr fitToPage="1" autoPageBreaks="0"/></sheetPr><dimension ref="A1:${lastColumn}${noteRow}"/><sheetViews><sheetView showGridLines="0" workbookViewId="0"><pane ySplit="5" topLeftCell="A6" activePane="bottomLeft" state="frozen"/><selection pane="bottomLeft" activeCell="A6" sqref="A6"/></sheetView></sheetViews><sheetFormatPr defaultRowHeight="18"/><cols>${cols}</cols><sheetData><row r="1" ht="32" customHeight="1"><c r="A1" s="1" t="inlineStr"><is><t>ABBAS TEXTILE WHOLESALE · STOCK AUDIT</t></is></c></row><row r="2" ht="22" customHeight="1"><c r="A2" s="2" t="inlineStr"><is><t>Audit date: ${xml(date)}</t></is></c></row><row r="3" ht="26" customHeight="1">${summaryCells}</row><row r="4" ht="8"/><row r="5" ht="34" customHeight="1">${headerCells}</row>${dataRows}<row r="${totalRow}" ht="24" customHeight="1">${totalCells}</row><row r="${noteRow}" ht="30" customHeight="1"><c r="A${noteRow}" s="2" t="inlineStr"><is><t xml:space="preserve">${xml(partialNote)}</t></is></c></row></sheetData><autoFilter ref="A5:${lastColumn}${lastDataRow}"/><mergeCells count="3"><mergeCell ref="A1:${lastColumn}1"/><mergeCell ref="A2:${lastColumn}2"/><mergeCell ref="A${noteRow}:${lastColumn}${noteRow}"/></mergeCells><pageMargins left="0.25" right="0.25" top="0.35" bottom="0.35" header="0.15" footer="0.15"/><pageSetup paperSize="9" orientation="landscape" fitToWidth="1" fitToHeight="0"/><headerFooter><oddFooter>&amp;P / &amp;N</oddFooter></headerFooter></worksheet>`
}

export function createStockAuditWorkbook(products, valuation, date) {
  const sheet = worksheetXml(products, valuation, date)
  const lastRow = products.length + 7
  const contentTypes = `${XML_HEADER}<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/><Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/></Types>`
  const rootRelationships = `${XML_HEADER}<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>`
  const workbookRelationships = `${XML_HEADER}<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>`
  const files = [
    ['[Content_Types].xml', contentTypes],
    ['_rels/.rels', rootRelationships],
    ['xl/workbook.xml', workbookXml(lastRow)],
    ['xl/_rels/workbook.xml.rels', workbookRelationships],
    ['xl/styles.xml', stylesXml()],
    ['xl/worksheets/sheet1.xml', sheet],
  ]
  return new Blob([zipStore(files)], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
}
