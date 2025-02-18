// The Layout object is the prototype of Substitution objects, and provides
// utility methods to manipulate common layout tables (GPOS, GSUB, GDEF...)

import check from './check.js'

function searchTag (arr, tag) {
  let iMin = 0
  let iMax = arr.length - 1
  while (iMin <= iMax) {
    const iMid = (iMin + iMax) >>> 1
    const val = arr[iMid].tag
    if (val === tag) {
      return iMid
    } else if (val < tag) {
      iMin = iMid + 1
    } else { iMax = iMid - 1 }
  }
  // Not found: return -1-insertion point
  return -iMin - 1
}

function binSearch (arr, value) {
  let iMin = 0
  let iMax = arr.length - 1
  while (iMin <= iMax) {
    const iMid = (iMin + iMax) >>> 1
    const val = arr[iMid]
    if (val === value) {
      return iMid
    } else if (val < value) {
      iMin = iMid + 1
    } else { iMax = iMid - 1 }
  }
  // Not found: return -1-insertion point
  return -iMin - 1
}

// binary search in a list of ranges (coverage, class definition)
function searchRange (ranges, value) {
  let range
  let iMin = 0
  let iMax = ranges.length - 1
  while (iMin <= iMax) {
    const iMid = (iMin + iMax) >>> 1
    range = ranges[iMid]
    const start = range.start
    if (start === value) {
      return range
    } else if (start < value) {
      iMin = iMid + 1
    } else { iMax = iMid - 1 }
  }
  if (iMin > 0) {
    range = ranges[iMin - 1]
    if (value > range.end) return 0
    return range
  }
}

class Layout {
  constructor (font, tableName) {
    this.font = font
    this.tableName = tableName
  }

  /**
   * Get or create the Layout table (GSUB, GPOS etc).
   * @param  {boolean} [create] - Whether to create a new one.
   * @return {Object} The GSUB or GPOS table.
   */
  getTable (create) {
    let layout = this.font.tables[this.tableName]
    if (!layout && create) {
      layout = this.font.tables[this.tableName] = this.createDefaultTable()
    }
    return layout
  }

  /**
   * Returns all scripts in the substitution table.
   * @instance
   * @return {Array}
   */
  getScriptNames () {
    const layout = this.getTable()
    if (!layout) { return [] }
    return layout.scripts.map(function (script) {
      return script.tag
    })
  }

  /**
   * Returns the best bet for a script name.
   * Returns 'DFLT' if it exists.
   * If not, returns 'latn' if it exists.
   * If neither exist, returns undefined.
   */
  getDefaultScriptName () {
    const layout = this.getTable()
    if (!layout) { return }
    let hasLatn = false
    for (let i = 0; i < layout.scripts.length; i++) {
      const name = layout.scripts[i].tag
      if (name === 'DFLT') return name
      if (name === 'latn') hasLatn = true
    }
    if (hasLatn) return 'latn'
  }

  /**
   * Returns all LangSysRecords in the given script.
   * @instance
   * @param script - The tag of the script
   * @param create - Forces the creation of this script table if it doesn't exist.
   * @return {Object} An object with tag and script properties.
   */
  getScriptTable (script = 'DFLT', create = false) {
    const layout = this.getTable(create)
    if (layout) {
      const scripts = layout.scripts
      const pos = searchTag(layout.scripts, script)
      if (pos >= 0) {
        return scripts[pos].script
      } else if (create) {
        const scr = {
          tag: script,
          script: {
            defaultLangSys: { reserved: 0, reqFeatureIndex: 0xffff, featureIndexes: [] },
            langSysRecords: []
          }
        }
        scripts.splice(-1 - pos, 0, scr)
        return scr.script
      }
    }
  }

  /**
   * Returns a language system table
   * @instance
   * @param {string} [script='DFLT']
   * @param language - The tag of the language system
   * @param create - Forces the creation of this langSysTable if it doesn't exist.
   * @return {Object}
   */
  getLangSysTable (script, language = 'dflt', create = false) {
    const scriptTable = this.getScriptTable(script, create)
    if (scriptTable) {
      if (language === 'dflt' || language === 'DFLT') {
        return scriptTable.defaultLangSys
      }
      const pos = searchTag(scriptTable.langSysRecords, language)
      if (pos >= 0) {
        return scriptTable.langSysRecords[pos].langSys
      } else if (create) {
        const langSysRecord = {
          tag: language,
          langSys: { reserved: 0, reqFeatureIndex: 0xffff, featureIndexes: [] }
        }
        scriptTable.langSysRecords.splice(-1 - pos, 0, langSysRecord)
        return langSysRecord.langSys
      }
    }
  }

  /**
   * Get a specific feature table.
   * @instance
   * @param {string} [script='DFLT']
   * @param {string} [language='dlft']
   * @param {string} feature - One of the codes listed at https://www.microsoft.com/typography/OTSPEC/featurelist.htm
   * @param {boolean} create - forces the creation of the feature table if it doesn't exist.
   * @return {Object}
   */
  getFeatureTable (script, language, feature, create) {
    const langSysTable = this.getLangSysTable(script, language, create)
    if (langSysTable) {
      let featureRecord
      const featIndexes = langSysTable.featureIndexes
      const allFeatures = this.font.tables[this.tableName].features
      // The FeatureIndex array of indices is in arbitrary order,
      // even if allFeatures is sorted alphabetically by feature tag.
      for (let i = 0; i < featIndexes.length; i++) {
        featureRecord = allFeatures[featIndexes[i]]
        if (featureRecord.tag === feature) {
          return featureRecord.feature
        }
      }
      if (create) {
        const index = allFeatures.length
        // Automatic ordering of features would require to shift feature indexes in the script list.
        check.assert(index === 0 || feature >= allFeatures[index - 1].tag, 'Features must be added in alphabetical order.')
        featureRecord = {
          tag: feature,
          feature: { params: 0, lookupListIndexes: [] }
        }
        allFeatures.push(featureRecord)
        featIndexes.push(index)
        return featureRecord.feature
      }
    }
  }

  /**
   * Get the lookup tables of a given type for a script/language/feature.
   * @instance
   * @param {string} [script='DFLT']
   * @param {string} [language='dlft']
   * @param {string} feature - 4-letter feature code
   * @param {number} lookupType - 1 to 9
   * @param {boolean} [create] - forces the creation of the lookup table if it doesn't exist, with no subtables.
   * @return {Object[]}
   */
  getLookupTables (script, language, feature, lookupType, create = false) {
    const featureTable = this.getFeatureTable(script, language, feature, create)
    const tables = []
    if (featureTable) {
      let lookupTable
      const lookupListIndexes = featureTable.lookupListIndexes
      const allLookups = this.font.tables[this.tableName].lookups
      // lookupListIndexes are in no particular order, so use naive search.
      for (let i = 0; i < lookupListIndexes.length; i++) {
        lookupTable = allLookups[lookupListIndexes[i]]
        if (lookupTable.lookupType === lookupType) {
          tables.push(lookupTable)
        }
      }
      if (tables.length === 0 && create) {
        lookupTable = {
          lookupType,
          lookupFlag: 0,
          subtables: [],
          markFilteringSet: undefined
        }
        const index = allLookups.length
        allLookups.push(lookupTable)
        lookupListIndexes.push(index)
        return [lookupTable]
      }
    }
    return tables
  }

  /**
   * Find a glyph in a class definition table
   * https://docs.microsoft.com/en-us/typography/opentype/spec/chapter2#class-definition-table
   * @param {object} classDefTable - an OpenType Layout class definition table
   * @param {number} glyphIndex - the index of the glyph to find
   * @returns {number} -1 if not found
   */
  getGlyphClass (classDefTable, glyphIndex) {
    switch (classDefTable.format) {
      case 1:
        if (classDefTable.startGlyph <= glyphIndex && glyphIndex < classDefTable.startGlyph + classDefTable.classes.length) {
          return classDefTable.classes[glyphIndex - classDefTable.startGlyph]
        }
        return 0
      case 2:
        const range = searchRange(classDefTable.ranges, glyphIndex)
        return range ? range.classId : 0
    }
  }

  /**
   * Find a glyph in a coverage table
   * https://docs.microsoft.com/en-us/typography/opentype/spec/chapter2#coverage-table
   * @param {object} coverageTable - an OpenType Layout coverage table
   * @param {number} glyphIndex - the index of the glyph to find
   * @returns {number} -1 if not found
   */
  getCoverageIndex (coverageTable, glyphIndex) {
    switch (coverageTable.format) {
      case 1:
        const index = binSearch(coverageTable.glyphs, glyphIndex)
        return index >= 0 ? index : -1
      case 2:
        const range = searchRange(coverageTable.ranges, glyphIndex)
        return range ? range.index + glyphIndex - range.start : -1
    }
  }

  /**
   * Returns the list of glyph indexes of a coverage table.
   * Format 1: the list is stored raw
   * Format 2: compact list as range records.
   * @instance
   * @param  {Object} coverageTable
   * @return {Array}
   */
  expandCoverage (coverageTable) {
    if (coverageTable.format === 1) {
      return coverageTable.glyphs
    } else {
      const glyphs = []
      const ranges = coverageTable.ranges
      for (let i = 0; i < ranges.length; i++) {
        const range = ranges[i]
        const start = range.start
        const end = range.end
        for (let j = start; j <= end; j++) {
          glyphs.push(j)
        }
      }
      return glyphs
    }
  }
}

/**
 * Binary search an object by "tag" property
 * @instance
 * @function searchTag
 * @memberof opentype.Layout
 * @param  {Array} arr
 * @param  {string} tag
 * @return {number}
 */
Layout.prototype.searchTag = searchTag

/**
 * Binary search in a list of numbers
 * @instance
 * @function binSearch
 * @memberof opentype.Layout
 * @param  {Array} arr
 * @param  {number} value
 * @return {number}
 */
Layout.prototype.binSearch = binSearch

export default Layout
