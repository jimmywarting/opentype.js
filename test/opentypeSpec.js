import assert from 'assert'
import { Font, Path, Glyph, load, loadSync } from '../src/opentype.js'

describe('opentype.js', function () {
  it('can load a TrueType font', function () {
    const font = loadSync('./fonts/Roboto-Black.ttf')
    assert.deepEqual(font.names.fontFamily, { en: 'Roboto Black' })
    assert.equal(font.unitsPerEm, 2048)
    assert.equal(font.glyphs.length, 1294)
    const aGlyph = font.charToGlyph('A')
    assert.equal(aGlyph.unicode, 65)
    assert.equal(aGlyph.path.commands.length, 15)
  })

  it('can load a TrueType font as a resolved promise', function (done) {
    load('./fonts/Roboto-Black.ttf').then((font) => {
      assert.deepEqual(font.names.fontFamily, { en: 'Roboto Black' })
      assert.equal(font.unitsPerEm, 2048)
      assert.equal(font.glyphs.length, 1294)
      const aGlyph = font.charToGlyph('A')
      assert.equal(aGlyph.unicode, 65)
      assert.equal(aGlyph.path.commands.length, 15)
      done()
    })
  })

  it('can load a OpenType/CFF font', function () {
    const font = loadSync('./fonts/FiraSansOT-Medium.otf')
    assert.deepEqual(font.names.fontFamily, { en: 'Fira Sans OT Medium' })
    assert.equal(font.unitsPerEm, 1000)
    assert.equal(font.glyphs.length, 1151)
    const aGlyph = font.charToGlyph('A')
    assert.equal(aGlyph.name, 'A')
    assert.equal(aGlyph.unicode, 65)
    assert.equal(aGlyph.path.commands.length, 14)
  })

  it('can load a CID-keyed font', function () {
    const font = loadSync('./fonts/FDArrayTest257.otf')
    assert.deepEqual(font.names.fontFamily, { en: 'FDArray Test 257' })
    assert.deepEqual(font.tables.cff.topDict.ros, ['Adobe', 'Identity', 0])
    assert.equal(font.tables.cff.topDict._fdArray.length, 256)
    assert.equal(font.tables.cff.topDict._fdSelect[0], 0)
    assert.equal(font.tables.cff.topDict._fdSelect[42], 41)
    assert.equal(font.tables.cff.topDict._fdSelect[256], 255)
    assert.equal(font.unitsPerEm, 1000)
    assert.equal(font.glyphs.length, 257)
    const aGlyph = font.glyphs.get(2)
    assert.equal(aGlyph.name, 'gid2')
    assert.equal(aGlyph.unicode, 1)
    assert.equal(aGlyph.path.commands.length, 24)
  })

  it('can load a WOFF/CFF font', function () {
    const font = loadSync('./fonts/FiraSansMedium.woff')
    assert.deepEqual(font.names.fontFamily, { en: 'Fira Sans OT' })
    assert.equal(font.unitsPerEm, 1000)
    assert.equal(font.glyphs.length, 1147)
    const aGlyph = font.charToGlyph('A')
    assert.equal(aGlyph.name, 'A')
    assert.equal(aGlyph.unicode, 65)
    assert.equal(aGlyph.path.commands.length, 14)
  })

  it('handles a parseBuffer error', function (done) {
    load('./fonts/badfont.ttf', function (err) {
      if (err) {
        done()
      }
    })
  })

  it('handles a parseBuffer error as a rejected promise', function (done) {
    load('./fonts/badfont.ttf')
      .catch((err) => {
        if (err) {
          done()
        }
      })
  })

  it('throws an error when advanceWidth is not set', function () {
    const notdefGlyph = new Glyph({
      name: '.notdef',
      unicode: 0,
      path: new Path()
    })
    const font = new Font({
      familyName: 'MyFont',
      styleName: 'Medium',
      unitsPerEm: 1000,
      ascender: 800,
      descender: -200,
      glyphs: [notdefGlyph]
    })
    assert.throws(function () { font.toArrayBuffer() }, /advanceWidth is not a number/)
  })
})

describe('opentype.js on low memory mode', function () {
  const opt = { lowMemory: true }

  it('can load a TrueType font', function () {
    const font = loadSync('./fonts/Roboto-Black.ttf', opt)
    assert.deepEqual(font.names.fontFamily, { en: 'Roboto Black' })
    assert.equal(font.unitsPerEm, 2048)
    assert.equal(font.glyphs.length, 0)
    const aGlyph = font.charToGlyph('A')
    assert.equal(aGlyph.unicode, 65)
    assert.equal(aGlyph.path.commands.length, 15)
  })

  it('can load a OpenType/CFF font', function () {
    const font = loadSync('./fonts/FiraSansOT-Medium.otf', opt)
    assert.deepEqual(font.names.fontFamily, { en: 'Fira Sans OT Medium' })
    assert.equal(font.unitsPerEm, 1000)
    assert.equal(font.glyphs.length, 0)
    const aGlyph = font.charToGlyph('A')
    assert.equal(aGlyph.name, 'A')
    assert.equal(aGlyph.unicode, 65)
    assert.equal(aGlyph.path.commands.length, 14)
  })

  it('can load a CID-keyed font', function () {
    const font = loadSync('./fonts/FDArrayTest257.otf', opt)
    assert.deepEqual(font.names.fontFamily, { en: 'FDArray Test 257' })
    assert.deepEqual(font.tables.cff.topDict.ros, ['Adobe', 'Identity', 0])
    assert.equal(font.tables.cff.topDict._fdArray.length, 256)
    assert.equal(font.tables.cff.topDict._fdSelect[0], 0)
    assert.equal(font.tables.cff.topDict._fdSelect[42], 41)
    assert.equal(font.tables.cff.topDict._fdSelect[256], 255)
    assert.equal(font.unitsPerEm, 1000)
    assert.equal(font.glyphs.length, 0)
    const aGlyph = font.glyphs.get(2)
    assert.equal(aGlyph.name, 'gid2')
    assert.equal(aGlyph.unicode, 1)
    assert.equal(aGlyph.path.commands.length, 24)
  })

  it('can load a WOFF/CFF font', function () {
    const font = loadSync('./fonts/FiraSansMedium.woff', opt)
    assert.deepEqual(font.names.fontFamily, { en: 'Fira Sans OT' })
    assert.equal(font.unitsPerEm, 1000)
    assert.equal(font.glyphs.length, 0)
    const aGlyph = font.charToGlyph('A')
    assert.equal(aGlyph.name, 'A')
    assert.equal(aGlyph.unicode, 65)
    assert.equal(aGlyph.path.commands.length, 14)
  })

  it('handles a parseBuffer error', function (done) {
    load('./fonts/badfont.ttf', function (err) {
      if (err) {
        done()
      }
    })
  }, opt)

  it('throws an error when advanceWidth is not set', function () {
    const notdefGlyph = new Glyph({
      name: '.notdef',
      unicode: 0,
      path: new Path()
    })
    const font = new Font({
      familyName: 'MyFont',
      styleName: 'Medium',
      unitsPerEm: 1000,
      ascender: 800,
      descender: -200,
      glyphs: [notdefGlyph]
    })
    assert.throws(function () { font.toArrayBuffer() }, /advanceWidth is not a number/)
  })
})
