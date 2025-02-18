// The `GDEF` table contains various glyph properties
// https://docs.microsoft.com/en-us/typography/opentype/spec/gdef

import check from '../check.js'
import { Parser } from '../parse.js'

const attachList = function () {
  return {
    coverage: this.parsePointer(Parser.coverage),
    attachPoints: this.parseList(Parser.pointer(Parser.uShortList))
  }
}

const caretValue = function () {
  const format = this.parseUShort()
  check.argument(format === 1 || format === 2 || format === 3,
    'Unsupported CaretValue table version.')
  if (format === 1) {
    return { coordinate: this.parseShort() }
  } else if (format === 2) {
    return { pointindex: this.parseShort() }
  } else if (format === 3) {
    // Device / Variation Index tables unsupported
    return { coordinate: this.parseShort() }
  }
}

const ligGlyph = function () {
  return this.parseList(Parser.pointer(caretValue))
}

const ligCaretList = function () {
  return {
    coverage: this.parsePointer(Parser.coverage),
    ligGlyphs: this.parseList(Parser.pointer(ligGlyph))
  }
}

const markGlyphSets = function () {
  this.parseUShort() // Version
  return this.parseList(Parser.pointer(Parser.coverage))
}

function parseGDEFTable (data, start) {
  start = start || 0
  const p = new Parser(data, start)
  const tableVersion = p.parseVersion(1)
  check.argument(tableVersion === 1 || tableVersion === 1.2 || tableVersion === 1.3,
    'Unsupported GDEF table version.')
  const gdef = {
    version: tableVersion,
    classDef: p.parsePointer(Parser.classDef),
    attachList: p.parsePointer(attachList),
    ligCaretList: p.parsePointer(ligCaretList),
    markAttachClassDef: p.parsePointer(Parser.classDef)
  }
  if (tableVersion >= 1.2) {
    gdef.markGlyphSets = p.parsePointer(markGlyphSets)
  }
  return gdef
}
export default { parse: parseGDEFTable }
