;(function (w, d) {
  'use strict'

  // == Fingerprint2 begin ==
  w['Fingerprint2'] = (function () {
    var Fingerprint2 = function (options) {
      if (!(this instanceof Fingerprint2)) {
        return new Fingerprint2(options)
      }

      var defaultOptions = {
        swfContainerId: 'fingerprintjs2',
        swfPath: 'flash/compiled/FontList.swf',
        detectScreenOrientation: true,
        sortPluginsFor: [/palemoon/i],
        userDefinedFonts: [],
        excludeDoNotTrack: true,
        excludePixelRatio: true
      }
      this.options = this.extend(options, defaultOptions)
      this.nativeForEach = Array.prototype.forEach
      this.nativeMap = Array.prototype.map
    }

    Fingerprint2.prototype = {
      extend: function (source, target) {
        if (source == null) {
          return target
        }
        for (var k in source) {
          if (source[k] != null && target[k] !== source[k]) {
            target[k] = source[k]
          }
        }
        return target
      },
      get: function (done) {
        var that = this
        var keys = {
          data: [],
          addPreprocessedComponent: function (pair) {
            var componentValue = pair.value
            if (typeof that.options.preprocessor === 'function') {
              componentValue = that.options.preprocessor(pair.key, componentValue)
            }
            keys.data.push({ key: pair.key, value: componentValue })
          }
        }
        keys = this.userAgentKey(keys)
        keys = this.languageKey(keys)
        keys = this.colorDepthKey(keys)
        keys = this.deviceMemoryKey(keys)
        keys = this.pixelRatioKey(keys)
        keys = this.hardwareConcurrencyKey(keys)
        keys = this.screenResolutionKey(keys)
        keys = this.availableScreenResolutionKey(keys)
        keys = this.timezoneOffsetKey(keys)
        keys = this.sessionStorageKey(keys)
        keys = this.localStorageKey(keys)
        keys = this.indexedDbKey(keys)
        keys = this.addBehaviorKey(keys)
        keys = this.openDatabaseKey(keys)
        keys = this.cpuClassKey(keys)
        keys = this.platformKey(keys)
        keys = this.doNotTrackKey(keys)
        keys = this.pluginsKey(keys)
        keys = this.canvasKey(keys)
        keys = this.webglKey(keys)
        keys = this.webglVendorAndRendererKey(keys)
        keys = this.adBlockKey(keys)
        keys = this.hasLiedLanguagesKey(keys)
        keys = this.hasLiedResolutionKey(keys)
        keys = this.hasLiedOsKey(keys)
        keys = this.hasLiedBrowserKey(keys)
        keys = this.touchSupportKey(keys)
        keys = this.customEntropyFunction(keys)
        this.fontsKey(keys, function (keysWithFont) {
          that.audioKey(keysWithFont, function (newKeys) {
            var values = []
            that.each(newKeys.data, function (pair) {
              var value = pair.value
              if (value && typeof value.join === 'function') {
                values.push(value.join(';'))
              } else {
                values.push(value)
              }
            })
            var murmur = that.x64hash128(values.join('~~~'), 31)
            return done(murmur, newKeys.data)
          })
        })
      },
      // Inspired by and based on https://github.com/cozylife/audio-fingerprint
      audioKey: function (keys, done) {
        if (this.options.excludeAudioFP) {
          return done(keys)
        }

        var AudioContext = window.OfflineAudioContext || window.webkitOfflineAudioContext

        if (AudioContext == null) {
          keys.addPreprocessedComponent({ key: 'audio_fp', value: null })
          return done(keys)
        }

        var context = new AudioContext(1, 44100, 44100)

        var oscillator = context.createOscillator()
        oscillator.type = 'triangle'
        oscillator.frequency.setValueAtTime(10000, context.currentTime)

        var compressor = context.createDynamicsCompressor()
        this.each(
          [
            ['threshold', -50],
            ['knee', 40],
            ['ratio', 12],
            ['reduction', -20],
            ['attack', 0],
            ['release', 0.25]
          ],
          function (item) {
            if (
              compressor[item[0]] !== undefined &&
              typeof compressor[item[0]].setValueAtTime === 'function'
            ) {
              compressor[item[0]].setValueAtTime(item[1], context.currentTime)
            }
          }
        )

        context.oncomplete = function (event) {
          var fingerprint = event.renderedBuffer
            .getChannelData(0)
            .slice(4500, 5000)
            .reduce(function (acc, val) {
              return acc + Math.abs(val)
            }, 0)
            .toString()
          oscillator.disconnect()
          compressor.disconnect()

          keys.addPreprocessedComponent({ key: 'audio_fp', value: fingerprint })
          return done(keys)
        }

        oscillator.connect(compressor)
        compressor.connect(context.destination)
        oscillator.start(0)
        context.startRendering()
      },
      customEntropyFunction: function (keys) {
        if (typeof this.options.customFunction === 'function') {
          keys.addPreprocessedComponent({ key: 'custom', value: this.options.customFunction() })
        }
        return keys
      },
      userAgentKey: function (keys) {
        if (!this.options.excludeUserAgent) {
          keys.addPreprocessedComponent({ key: 'user_agent', value: this.getUserAgent() })
        }
        return keys
      },
      // for tests
      getUserAgent: function () {
        return navigator.userAgent
      },
      languageKey: function (keys) {
        if (!this.options.excludeLanguage) {
          // IE 9,10 on Windows 10 does not have the `navigator.language` property any longer
          keys.addPreprocessedComponent({
            key: 'language',
            value:
              navigator.language ||
              navigator.userLanguage ||
              navigator.browserLanguage ||
              navigator.systemLanguage ||
              ''
          })
        }
        return keys
      },
      colorDepthKey: function (keys) {
        if (!this.options.excludeColorDepth) {
          keys.addPreprocessedComponent({
            key: 'color_depth',
            value: window.screen.colorDepth || -1
          })
        }
        return keys
      },
      deviceMemoryKey: function (keys) {
        if (!this.options.excludeDeviceMemory) {
          keys.addPreprocessedComponent({ key: 'device_memory', value: this.getDeviceMemory() })
        }
        return keys
      },
      getDeviceMemory: function () {
        return navigator.deviceMemory || -1
      },
      pixelRatioKey: function (keys) {
        if (!this.options.excludePixelRatio) {
          keys.addPreprocessedComponent({ key: 'pixel_ratio', value: this.getPixelRatio() })
        }
        return keys
      },
      getPixelRatio: function () {
        return window.devicePixelRatio || ''
      },
      screenResolutionKey: function (keys) {
        if (!this.options.excludeScreenResolution) {
          return this.getScreenResolution(keys)
        }
        return keys
      },
      getScreenResolution: function (keys) {
        var resolution
        if (this.options.detectScreenOrientation) {
          resolution =
            window.screen.height > window.screen.width
              ? [window.screen.height, window.screen.width]
              : [window.screen.width, window.screen.height]
        } else {
          resolution = [window.screen.width, window.screen.height]
        }
        keys.addPreprocessedComponent({ key: 'resolution', value: resolution })
        return keys
      },
      availableScreenResolutionKey: function (keys) {
        if (!this.options.excludeAvailableScreenResolution) {
          return this.getAvailableScreenResolution(keys)
        }
        return keys
      },
      getAvailableScreenResolution: function (keys) {
        var available
        if (window.screen.availWidth && window.screen.availHeight) {
          if (this.options.detectScreenOrientation) {
            available =
              window.screen.availHeight > window.screen.availWidth
                ? [window.screen.availHeight, window.screen.availWidth]
                : [window.screen.availWidth, window.screen.availHeight]
          } else {
            available = [window.screen.availHeight, window.screen.availWidth]
          }
        }
        if (typeof available !== 'undefined') {
          // headless browsers
          keys.addPreprocessedComponent({ key: 'available_resolution', value: available })
        }
        return keys
      },
      timezoneOffsetKey: function (keys) {
        if (!this.options.excludeTimezoneOffset) {
          keys.addPreprocessedComponent({
            key: 'timezone_offset',
            value: new Date().getTimezoneOffset()
          })
        }
        return keys
      },
      sessionStorageKey: function (keys) {
        if (!this.options.excludeSessionStorage && this.hasSessionStorage()) {
          keys.addPreprocessedComponent({ key: 'session_storage', value: 1 })
        }
        return keys
      },
      localStorageKey: function (keys) {
        if (!this.options.excludeSessionStorage && this.hasLocalStorage()) {
          keys.addPreprocessedComponent({ key: 'local_storage', value: 1 })
        }
        return keys
      },
      indexedDbKey: function (keys) {
        if (!this.options.excludeIndexedDB && this.hasIndexedDB()) {
          keys.addPreprocessedComponent({ key: 'indexed_db', value: 1 })
        }
        return keys
      },
      addBehaviorKey: function (keys) {
        // body might not be defined at this point or removed programmatically
        if (!this.options.excludeAddBehavior && document.body && document.body.addBehavior) {
          keys.addPreprocessedComponent({ key: 'add_behavior', value: 1 })
        }
        return keys
      },
      openDatabaseKey: function (keys) {
        if (!this.options.excludeOpenDatabase && window.openDatabase) {
          keys.addPreprocessedComponent({ key: 'open_database', value: 1 })
        }
        return keys
      },
      cpuClassKey: function (keys) {
        if (!this.options.excludeCpuClass) {
          keys.addPreprocessedComponent({ key: 'cpu_class', value: this.getNavigatorCpuClass() })
        }
        return keys
      },
      platformKey: function (keys) {
        if (!this.options.excludePlatform) {
          keys.addPreprocessedComponent({
            key: 'navigator_platform',
            value: this.getNavigatorPlatform()
          })
        }
        return keys
      },
      doNotTrackKey: function (keys) {
        if (!this.options.excludeDoNotTrack) {
          keys.addPreprocessedComponent({ key: 'do_not_track', value: this.getDoNotTrack() })
        }
        return keys
      },
      canvasKey: function (keys) {
        if (!this.options.excludeCanvas && this.isCanvasSupported()) {
          keys.addPreprocessedComponent({ key: 'canvas', value: this.getCanvasFp() })
        }
        return keys
      },
      webglKey: function (keys) {
        if (!this.options.excludeWebGL && this.isWebGlSupported()) {
          keys.addPreprocessedComponent({ key: 'webgl', value: this.getWebglFp() })
        }
        return keys
      },
      webglVendorAndRendererKey: function (keys) {
        if (!this.options.excludeWebGLVendorAndRenderer && this.isWebGlSupported()) {
          keys.addPreprocessedComponent({
            key: 'webgl_vendor',
            value: this.getWebglVendorAndRenderer()
          })
        }
        return keys
      },
      adBlockKey: function (keys) {
        if (!this.options.excludeAdBlock) {
          keys.addPreprocessedComponent({ key: 'adblock', value: this.getAdBlock() })
        }
        return keys
      },
      hasLiedLanguagesKey: function (keys) {
        if (!this.options.excludeHasLiedLanguages) {
          keys.addPreprocessedComponent({
            key: 'has_lied_languages',
            value: this.getHasLiedLanguages()
          })
        }
        return keys
      },
      hasLiedResolutionKey: function (keys) {
        if (!this.options.excludeHasLiedResolution) {
          keys.addPreprocessedComponent({
            key: 'has_lied_resolution',
            value: this.getHasLiedResolution()
          })
        }
        return keys
      },
      hasLiedOsKey: function (keys) {
        if (!this.options.excludeHasLiedOs) {
          keys.addPreprocessedComponent({ key: 'has_lied_os', value: this.getHasLiedOs() })
        }
        return keys
      },
      hasLiedBrowserKey: function (keys) {
        if (!this.options.excludeHasLiedBrowser) {
          keys.addPreprocessedComponent({
            key: 'has_lied_browser',
            value: this.getHasLiedBrowser()
          })
        }
        return keys
      },
      fontsKey: function (keys, done) {
        if (this.options.excludeJsFonts) {
          return this.flashFontsKey(keys, done)
        }
        return this.jsFontsKey(keys, done)
      },
      // flash fonts (will increase fingerprinting time 20X to ~ 130-150ms)
      flashFontsKey: function (keys, done) {
        if (this.options.excludeFlashFonts) {
          return done(keys)
        }
        // we do flash if swfobject is loaded
        if (!this.hasSwfObjectLoaded()) {
          return done(keys)
        }
        if (!this.hasMinFlashInstalled()) {
          return done(keys)
        }
        if (typeof this.options.swfPath === 'undefined') {
          return done(keys)
        }
        this.loadSwfAndDetectFonts(function (fonts) {
          keys.addPreprocessedComponent({ key: 'swf_fonts', value: fonts.join(';') })
          done(keys)
        })
      },
      // kudos to http://www.lalit.org/lab/javascript-css-font-detect/
      jsFontsKey: function (keys, done) {
        var that = this
        // doing js fonts detection in a pseudo-async fashion
        return setTimeout(function () {
          // a font will be compared against all the three default fonts.
          // and if it doesn't match all 3 then that font is not available.
          var baseFonts = ['monospace', 'sans-serif', 'serif']

          var fontList = [
            'Andale Mono',
            'Arial',
            'Arial Black',
            'Arial Hebrew',
            'Arial MT',
            'Arial Narrow',
            'Arial Rounded MT Bold',
            'Arial Unicode MS',
            'Bitstream Vera Sans Mono',
            'Book Antiqua',
            'Bookman Old Style',
            'Calibri',
            'Cambria',
            'Cambria Math',
            'Century',
            'Century Gothic',
            'Century Schoolbook',
            'Comic Sans',
            'Comic Sans MS',
            'Consolas',
            'Courier',
            'Courier New',
            'Geneva',
            'Georgia',
            'Helvetica',
            'Helvetica Neue',
            'Impact',
            'Lucida Bright',
            'Lucida Calligraphy',
            'Lucida Console',
            'Lucida Fax',
            'LUCIDA GRANDE',
            'Lucida Handwriting',
            'Lucida Sans',
            'Lucida Sans Typewriter',
            'Lucida Sans Unicode',
            'Microsoft Sans Serif',
            'Monaco',
            'Monotype Corsiva',
            'MS Gothic',
            'MS Outlook',
            'MS PGothic',
            'MS Reference Sans Serif',
            'MS Sans Serif',
            'MS Serif',
            'MYRIAD',
            'MYRIAD PRO',
            'Palatino',
            'Palatino Linotype',
            'Segoe Print',
            'Segoe Script',
            'Segoe UI',
            'Segoe UI Light',
            'Segoe UI Semibold',
            'Segoe UI Symbol',
            'Tahoma',
            'Times',
            'Times New Roman',
            'Times New Roman PS',
            'Trebuchet MS',
            'Verdana',
            'Wingdings',
            'Wingdings 2',
            'Wingdings 3'
          ]
          var extendedFontList = [
            'Abadi MT Condensed Light',
            'Academy Engraved LET',
            'ADOBE CASLON PRO',
            'Adobe Garamond',
            'ADOBE GARAMOND PRO',
            'Agency FB',
            'Aharoni',
            'Albertus Extra Bold',
            'Albertus Medium',
            'Algerian',
            'Amazone BT',
            'American Typewriter',
            'American Typewriter Condensed',
            'AmerType Md BT',
            'Andalus',
            'Angsana New',
            'AngsanaUPC',
            'Antique Olive',
            'Aparajita',
            'Apple Chancery',
            'Apple Color Emoji',
            'Apple SD Gothic Neo',
            'Arabic Typesetting',
            'ARCHER',
            'ARNO PRO',
            'Arrus BT',
            'Aurora Cn BT',
            'AvantGarde Bk BT',
            'AvantGarde Md BT',
            'AVENIR',
            'Ayuthaya',
            'Bandy',
            'Bangla Sangam MN',
            'Bank Gothic',
            'BankGothic Md BT',
            'Baskerville',
            'Baskerville Old Face',
            'Batang',
            'BatangChe',
            'Bauer Bodoni',
            'Bauhaus 93',
            'Bazooka',
            'Bell MT',
            'Bembo',
            'Benguiat Bk BT',
            'Berlin Sans FB',
            'Berlin Sans FB Demi',
            'Bernard MT Condensed',
            'BernhardFashion BT',
            'BernhardMod BT',
            'Big Caslon',
            'BinnerD',
            'Blackadder ITC',
            'BlairMdITC TT',
            'Bodoni 72',
            'Bodoni 72 Oldstyle',
            'Bodoni 72 Smallcaps',
            'Bodoni MT',
            'Bodoni MT Black',
            'Bodoni MT Condensed',
            'Bodoni MT Poster Compressed',
            'Bookshelf Symbol 7',
            'Boulder',
            'Bradley Hand',
            'Bradley Hand ITC',
            'Bremen Bd BT',
            'Britannic Bold',
            'Broadway',
            'Browallia New',
            'BrowalliaUPC',
            'Brush Script MT',
            'Californian FB',
            'Calisto MT',
            'Calligrapher',
            'Candara',
            'CaslonOpnface BT',
            'Castellar',
            'Centaur',
            'Cezanne',
            'CG Omega',
            'CG Times',
            'Chalkboard',
            'Chalkboard SE',
            'Chalkduster',
            'Charlesworth',
            'Charter Bd BT',
            'Charter BT',
            'Chaucer',
            'ChelthmITC Bk BT',
            'Chiller',
            'Clarendon',
            'Clarendon Condensed',
            'CloisterBlack BT',
            'Cochin',
            'Colonna MT',
            'Constantia',
            'Cooper Black',
            'Copperplate',
            'Copperplate Gothic',
            'Copperplate Gothic Bold',
            'Copperplate Gothic Light',
            'CopperplGoth Bd BT',
            'Corbel',
            'Cordia New',
            'CordiaUPC',
            'Cornerstone',
            'Coronet',
            'Cuckoo',
            'Curlz MT',
            'DaunPenh',
            'Dauphin',
            'David',
            'DB LCD Temp',
            'DELICIOUS',
            'Denmark',
            'DFKai-SB',
            'Didot',
            'DilleniaUPC',
            'DIN',
            'DokChampa',
            'Dotum',
            'DotumChe',
            'Ebrima',
            'Edwardian Script ITC',
            'Elephant',
            'English 111 Vivace BT',
            'Engravers MT',
            'EngraversGothic BT',
            'Eras Bold ITC',
            'Eras Demi ITC',
            'Eras Light ITC',
            'Eras Medium ITC',
            'EucrosiaUPC',
            'Euphemia',
            'Euphemia UCAS',
            'EUROSTILE',
            'Exotc350 Bd BT',
            'FangSong',
            'Felix Titling',
            'Fixedsys',
            'FONTIN',
            'Footlight MT Light',
            'Forte',
            'FrankRuehl',
            'Fransiscan',
            'Freefrm721 Blk BT',
            'FreesiaUPC',
            'Freestyle Script',
            'French Script MT',
            'FrnkGothITC Bk BT',
            'Fruitger',
            'FRUTIGER',
            'Futura',
            'Futura Bk BT',
            'Futura Lt BT',
            'Futura Md BT',
            'Futura ZBlk BT',
            'FuturaBlack BT',
            'Gabriola',
            'Galliard BT',
            'Gautami',
            'Geeza Pro',
            'Geometr231 BT',
            'Geometr231 Hv BT',
            'Geometr231 Lt BT',
            'GeoSlab 703 Lt BT',
            'GeoSlab 703 XBd BT',
            'Gigi',
            'Gill Sans',
            'Gill Sans MT',
            'Gill Sans MT Condensed',
            'Gill Sans MT Ext Condensed Bold',
            'Gill Sans Ultra Bold',
            'Gill Sans Ultra Bold Condensed',
            'Gisha',
            'Gloucester MT Extra Condensed',
            'GOTHAM',
            'GOTHAM BOLD',
            'Goudy Old Style',
            'Goudy Stout',
            'GoudyHandtooled BT',
            'GoudyOLSt BT',
            'Gujarati Sangam MN',
            'Gulim',
            'GulimChe',
            'Gungsuh',
            'GungsuhChe',
            'Gurmukhi MN',
            'Haettenschweiler',
            'Harlow Solid Italic',
            'Harrington',
            'Heather',
            'Heiti SC',
            'Heiti TC',
            'HELV',
            'Herald',
            'High Tower Text',
            'Hiragino Kaku Gothic ProN',
            'Hiragino Mincho ProN',
            'Hoefler Text',
            'Humanst 521 Cn BT',
            'Humanst521 BT',
            'Humanst521 Lt BT',
            'Imprint MT Shadow',
            'Incised901 Bd BT',
            'Incised901 BT',
            'Incised901 Lt BT',
            'INCONSOLATA',
            'Informal Roman',
            'Informal011 BT',
            'INTERSTATE',
            'IrisUPC',
            'Iskoola Pota',
            'JasmineUPC',
            'Jazz LET',
            'Jenson',
            'Jester',
            'Jokerman',
            'Juice ITC',
            'Kabel Bk BT',
            'Kabel Ult BT',
            'Kailasa',
            'KaiTi',
            'Kalinga',
            'Kannada Sangam MN',
            'Kartika',
            'Kaufmann Bd BT',
            'Kaufmann BT',
            'Khmer UI',
            'KodchiangUPC',
            'Kokila',
            'Korinna BT',
            'Kristen ITC',
            'Krungthep',
            'Kunstler Script',
            'Lao UI',
            'Latha',
            'Leelawadee',
            'Letter Gothic',
            'Levenim MT',
            'LilyUPC',
            'Lithograph',
            'Lithograph Light',
            'Long Island',
            'Lydian BT',
            'Magneto',
            'Maiandra GD',
            'Malayalam Sangam MN',
            'Malgun Gothic',
            'Mangal',
            'Marigold',
            'Marion',
            'Marker Felt',
            'Market',
            'Marlett',
            'Matisse ITC',
            'Matura MT Script Capitals',
            'Meiryo',
            'Meiryo UI',
            'Microsoft Himalaya',
            'Microsoft JhengHei',
            'Microsoft New Tai Lue',
            'Microsoft PhagsPa',
            'Microsoft Tai Le',
            'Microsoft Uighur',
            'Microsoft YaHei',
            'Microsoft Yi Baiti',
            'MingLiU',
            'MingLiU_HKSCS',
            'MingLiU_HKSCS-ExtB',
            'MingLiU-ExtB',
            'Minion',
            'Minion Pro',
            'Miriam',
            'Miriam Fixed',
            'Mistral',
            'Modern',
            'Modern No. 20',
            'Mona Lisa Solid ITC TT',
            'Mongolian Baiti',
            'MONO',
            'MoolBoran',
            'Mrs Eaves',
            'MS LineDraw',
            'MS Mincho',
            'MS PMincho',
            'MS Reference Specialty',
            'MS UI Gothic',
            'MT Extra',
            'MUSEO',
            'MV Boli',
            'Nadeem',
            'Narkisim',
            'NEVIS',
            'News Gothic',
            'News GothicMT',
            'NewsGoth BT',
            'Niagara Engraved',
            'Niagara Solid',
            'Noteworthy',
            'NSimSun',
            'Nyala',
            'OCR A Extended',
            'Old Century',
            'Old English Text MT',
            'Onyx',
            'Onyx BT',
            'OPTIMA',
            'Oriya Sangam MN',
            'OSAKA',
            'OzHandicraft BT',
            'Palace Script MT',
            'Papyrus',
            'Parchment',
            'Party LET',
            'Pegasus',
            'Perpetua',
            'Perpetua Titling MT',
            'PetitaBold',
            'Pickwick',
            'Plantagenet Cherokee',
            'Playbill',
            'PMingLiU',
            'PMingLiU-ExtB',
            'Poor Richard',
            'Poster',
            'PosterBodoni BT',
            'PRINCETOWN LET',
            'Pristina',
            'PTBarnum BT',
            'Pythagoras',
            'Raavi',
            'Rage Italic',
            'Ravie',
            'Ribbon131 Bd BT',
            'Rockwell',
            'Rockwell Condensed',
            'Rockwell Extra Bold',
            'Rod',
            'Roman',
            'Sakkal Majalla',
            'Santa Fe LET',
            'Savoye LET',
            'Sceptre',
            'Script',
            'Script MT Bold',
            'SCRIPTINA',
            'Serifa',
            'Serifa BT',
            'Serifa Th BT',
            'ShelleyVolante BT',
            'Sherwood',
            'Shonar Bangla',
            'Showcard Gothic',
            'Shruti',
            'Signboard',
            'SILKSCREEN',
            'SimHei',
            'Simplified Arabic',
            'Simplified Arabic Fixed',
            'SimSun',
            'SimSun-ExtB',
            'Sinhala Sangam MN',
            'Sketch Rockwell',
            'Skia',
            'Small Fonts',
            'Snap ITC',
            'Snell Roundhand',
            'Socket',
            'Souvenir Lt BT',
            'Staccato222 BT',
            'Steamer',
            'Stencil',
            'Storybook',
            'Styllo',
            'Subway',
            'Swis721 BlkEx BT',
            'Swiss911 XCm BT',
            'Sylfaen',
            'Synchro LET',
            'System',
            'Tamil Sangam MN',
            'Technical',
            'Teletype',
            'Telugu Sangam MN',
            'Tempus Sans ITC',
            'Terminal',
            'Thonburi',
            'Traditional Arabic',
            'Trajan',
            'TRAJAN PRO',
            'Tristan',
            'Tubular',
            'Tunga',
            'Tw Cen MT',
            'Tw Cen MT Condensed',
            'Tw Cen MT Condensed Extra Bold',
            'TypoUpright BT',
            'Unicorn',
            'Univers',
            'Univers CE 55 Medium',
            'Univers Condensed',
            'Utsaah',
            'Vagabond',
            'Vani',
            'Vijaya',
            'Viner Hand ITC',
            'VisualUI',
            'Vivaldi',
            'Vladimir Script',
            'Vrinda',
            'Westminster',
            'WHITNEY',
            'Wide Latin',
            'ZapfEllipt BT',
            'ZapfHumnst BT',
            'ZapfHumnst Dm BT',
            'Zapfino',
            'Zurich BlkEx BT',
            'Zurich Ex BT',
            'ZWAdobeF'
          ]

          if (that.options.extendedJsFonts) {
            fontList = fontList.concat(extendedFontList)
          }

          fontList = fontList.concat(that.options.userDefinedFonts)

          // remove duplicate fonts
          fontList = fontList.filter(function (font, position) {
            return fontList.indexOf(font) === position
          })

          // we use m or w because these two characters take up the maximum width.
          // And we use a LLi so that the same matching fonts can get separated
          var testString = 'mmmmmmmmmmlli'

          // we test using 72px font size, we may use any size. I guess larger the better.
          var testSize = '72px'

          var h = document.getElementsByTagName('body')[0]

          // div to load spans for the base fonts
          var baseFontsDiv = document.createElement('div')

          // div to load spans for the fonts to detect
          var fontsDiv = document.createElement('div')

          var defaultWidth = {}
          var defaultHeight = {}

          // creates a span where the fonts will be loaded
          var createSpan = function () {
            var s = document.createElement('span')
            /*
             * We need this css as in some weird browser this
             * span elements shows up for a microSec which creates a
             * bad user experience
             */
            s.style.position = 'absolute'
            s.style.left = '-9999px'
            s.style.fontSize = testSize

            // css font reset to reset external styles
            s.style.fontStyle = 'normal'
            s.style.fontWeight = 'normal'
            s.style.letterSpacing = 'normal'
            s.style.lineBreak = 'auto'
            s.style.lineHeight = 'normal'
            s.style.textTransform = 'none'
            s.style.textAlign = 'left'
            s.style.textDecoration = 'none'
            s.style.textShadow = 'none'
            s.style.whiteSpace = 'normal'
            s.style.wordBreak = 'normal'
            s.style.wordSpacing = 'normal'

            s.innerHTML = testString
            return s
          }

          // creates a span and load the font to detect and a base font for fallback
          var createSpanWithFonts = function (fontToDetect, baseFont) {
            var s = createSpan()
            s.style.fontFamily = "'" + fontToDetect + "'," + baseFont
            return s
          }

          // creates spans for the base fonts and adds them to baseFontsDiv
          var initializeBaseFontsSpans = function () {
            var spans = []
            for (var index = 0, length = baseFonts.length; index < length; index++) {
              var s = createSpan()
              s.style.fontFamily = baseFonts[index]
              baseFontsDiv.appendChild(s)
              spans.push(s)
            }
            return spans
          }

          // creates spans for the fonts to detect and adds them to fontsDiv
          var initializeFontsSpans = function () {
            var spans = {}
            for (var i = 0, l = fontList.length; i < l; i++) {
              var fontSpans = []
              for (var j = 0, numDefaultFonts = baseFonts.length; j < numDefaultFonts; j++) {
                var s = createSpanWithFonts(fontList[i], baseFonts[j])
                fontsDiv.appendChild(s)
                fontSpans.push(s)
              }
              spans[fontList[i]] = fontSpans // Stores {fontName : [spans for that font]}
            }
            return spans
          }

          // checks if a font is available
          var isFontAvailable = function (fontSpans) {
            var detected = false
            for (var i = 0; i < baseFonts.length; i++) {
              detected =
                fontSpans[i].offsetWidth !== defaultWidth[baseFonts[i]] ||
                fontSpans[i].offsetHeight !== defaultHeight[baseFonts[i]]
              if (detected) {
                return detected
              }
            }
            return detected
          }

          // create spans for base fonts
          var baseFontsSpans = initializeBaseFontsSpans()

          // add the spans to the DOM
          h.appendChild(baseFontsDiv)

          // get the default width for the three base fonts
          for (var index = 0, length = baseFonts.length; index < length; index++) {
            defaultWidth[baseFonts[index]] = baseFontsSpans[index].offsetWidth // width for the default font
            defaultHeight[baseFonts[index]] = baseFontsSpans[index].offsetHeight // height for the default font
          }

          // create spans for fonts to detect
          var fontsSpans = initializeFontsSpans()

          // add all the spans to the DOM
          h.appendChild(fontsDiv)

          // check available fonts
          var available = []
          for (var i = 0, l = fontList.length; i < l; i++) {
            if (isFontAvailable(fontsSpans[fontList[i]])) {
              available.push(fontList[i])
            }
          }

          // remove spans from DOM
          h.removeChild(fontsDiv)
          h.removeChild(baseFontsDiv)

          keys.addPreprocessedComponent({ key: 'js_fonts', value: available })
          done(keys)
        }, 1)
      },
      pluginsKey: function (keys) {
        if (!this.options.excludePlugins) {
          if (this.isIE()) {
            if (!this.options.excludeIEPlugins) {
              keys.addPreprocessedComponent({ key: 'ie_plugins', value: this.getIEPlugins() })
            }
          } else {
            keys.addPreprocessedComponent({
              key: 'regular_plugins',
              value: this.getRegularPlugins()
            })
          }
        }
        return keys
      },
      getRegularPlugins: function () {
        var plugins = []
        if (navigator.plugins) {
          // plugins isn't defined in Node envs.
          for (var i = 0, l = navigator.plugins.length; i < l; i++) {
            if (navigator.plugins[i]) {
              plugins.push(navigator.plugins[i])
            }
          }
        }
        // sorting plugins only for those user agents, that we know randomize the plugins
        // every time we try to enumerate them
        if (this.pluginsShouldBeSorted()) {
          plugins = plugins.sort(function (a, b) {
            if (a.name > b.name) {
              return 1
            }
            if (a.name < b.name) {
              return -1
            }
            return 0
          })
        }
        return this.map(
          plugins,
          function (p) {
            var mimeTypes = this.map(p, function (mt) {
              return [mt.type, mt.suffixes].join('~')
            }).join(',')
            return [p.name, p.description, mimeTypes].join('::')
          },
          this
        )
      },
      getIEPlugins: function () {
        var result = []
        if (
          (Object.getOwnPropertyDescriptor &&
            Object.getOwnPropertyDescriptor(window, 'ActiveXObject')) ||
          'ActiveXObject' in window
        ) {
          var names = [
            'AcroPDF.PDF', // Adobe PDF reader 7+
            'Adodb.Stream',
            'AgControl.AgControl', // Silverlight
            'DevalVRXCtrl.DevalVRXCtrl.1',
            'MacromediaFlashPaper.MacromediaFlashPaper',
            'Msxml2.DOMDocument',
            'Msxml2.XMLHTTP',
            'PDF.PdfCtrl', // Adobe PDF reader 6 and earlier, brrr
            'QuickTime.QuickTime', // QuickTime
            'QuickTimeCheckObject.QuickTimeCheck.1',
            'RealPlayer',
            'RealPlayer.RealPlayer(tm) ActiveX Control (32-bit)',
            'RealVideo.RealVideo(tm) ActiveX Control (32-bit)',
            'Scripting.Dictionary',
            'SWCtl.SWCtl', // ShockWave player
            'Shell.UIHelper',
            'ShockwaveFlash.ShockwaveFlash', // flash plugin
            'Skype.Detection',
            'TDCCtl.TDCCtl',
            'WMPlayer.OCX', // Windows media player
            'rmocx.RealPlayer G2 Control',
            'rmocx.RealPlayer G2 Control.1'
          ]
          // starting to detect plugins in IE
          result = this.map(names, function (name) {
            try {
              // eslint-disable-next-line no-new
              new window.ActiveXObject(name)
              return name
            } catch (e) {
              return null
            }
          })
        }
        if (navigator.plugins) {
          result = result.concat(this.getRegularPlugins())
        }
        return result
      },
      pluginsShouldBeSorted: function () {
        var should = false
        for (var i = 0, l = this.options.sortPluginsFor.length; i < l; i++) {
          var re = this.options.sortPluginsFor[i]
          if (navigator.userAgent.match(re)) {
            should = true
            break
          }
        }
        return should
      },
      touchSupportKey: function (keys) {
        if (!this.options.excludeTouchSupport) {
          keys.addPreprocessedComponent({ key: 'touch_support', value: this.getTouchSupport() })
        }
        return keys
      },
      hardwareConcurrencyKey: function (keys) {
        if (!this.options.excludeHardwareConcurrency) {
          keys.addPreprocessedComponent({
            key: 'hardware_concurrency',
            value: this.getHardwareConcurrency()
          })
        }
        return keys
      },
      hasSessionStorage: function () {
        try {
          return !!window.sessionStorage
        } catch (e) {
          return true // SecurityError when referencing it means it exists
        }
      },
      // https://bugzilla.mozilla.org/show_bug.cgi?id=781447
      hasLocalStorage: function () {
        try {
          return !!window.localStorage
        } catch (e) {
          return true // SecurityError when referencing it means it exists
        }
      },
      hasIndexedDB: function () {
        try {
          return !!window.indexedDB
        } catch (e) {
          return true // SecurityError when referencing it means it exists
        }
      },
      getHardwareConcurrency: function () {
        if (navigator.hardwareConcurrency) {
          return navigator.hardwareConcurrency
        }
        return 'unknown'
      },
      getNavigatorCpuClass: function () {
        if (navigator.cpuClass) {
          return navigator.cpuClass
        } else {
          return 'unknown'
        }
      },
      getNavigatorPlatform: function () {
        if (navigator.platform) {
          return navigator.platform
        } else {
          return 'unknown'
        }
      },
      getDoNotTrack: function () {
        if (navigator.doNotTrack) {
          return navigator.doNotTrack
        } else if (navigator.msDoNotTrack) {
          return navigator.msDoNotTrack
        } else if (window.doNotTrack) {
          return window.doNotTrack
        } else {
          return 'unknown'
        }
      },
      // This is a crude and primitive touch screen detection.
      // It's not possible to currently reliably detect the  availability of a touch screen
      // with a JS, without actually subscribing to a touch event.
      // http://www.stucox.com/blog/you-cant-detect-a-touchscreen/
      // https://github.com/Modernizr/Modernizr/issues/548
      // method returns an array of 3 values:
      // maxTouchPoints, the success or failure of creating a TouchEvent,
      // and the availability of the 'ontouchstart' property
      getTouchSupport: function () {
        var maxTouchPoints = 0
        var touchEvent = false
        if (typeof navigator.maxTouchPoints !== 'undefined') {
          maxTouchPoints = navigator.maxTouchPoints
        } else if (typeof navigator.msMaxTouchPoints !== 'undefined') {
          maxTouchPoints = navigator.msMaxTouchPoints
        }
        try {
          document.createEvent('TouchEvent')
          touchEvent = true
        } catch (_) {
          /* squelch */
        }
        var touchStart = 'ontouchstart' in window
        return [maxTouchPoints, touchEvent, touchStart]
      },
      // https://www.browserleaks.com/canvas#how-does-it-work
      getCanvasFp: function () {
        var result = []
        // Very simple now, need to make it more complex (geo shapes etc)
        var canvas = document.createElement('canvas')
        canvas.width = 2000
        canvas.height = 200
        canvas.style.display = 'inline'
        var ctx = canvas.getContext('2d')
        // detect browser support of canvas winding
        // http://blogs.adobe.com/webplatform/2013/01/30/winding-rules-in-canvas/
        // https://github.com/Modernizr/Modernizr/blob/master/feature-detects/canvas/winding.js
        ctx.rect(0, 0, 10, 10)
        ctx.rect(2, 2, 6, 6)
        result.push(
          'canvas winding:' + (ctx.isPointInPath(5, 5, 'evenodd') === false ? 'yes' : 'no')
        )

        ctx.textBaseline = 'alphabetic'
        ctx.fillStyle = '#f60'
        ctx.fillRect(125, 1, 62, 20)
        ctx.fillStyle = '#069'
        // https://github.com/Valve/fingerprintjs2/issues/66
        if (this.options.dontUseFakeFontInCanvas) {
          ctx.font = '11pt Arial'
        } else {
          ctx.font = '11pt no-real-font-123'
        }
        ctx.fillText('Cwm fjordbank glyphs vext quiz, \ud83d\ude03', 2, 15)
        ctx.fillStyle = 'rgba(102, 204, 0, 0.2)'
        ctx.font = '18pt Arial'
        ctx.fillText('Cwm fjordbank glyphs vext quiz, \ud83d\ude03', 4, 45)

        // canvas blending
        // http://blogs.adobe.com/webplatform/2013/01/28/blending-features-in-canvas/
        // http://jsfiddle.net/NDYV8/16/
        ctx.globalCompositeOperation = 'multiply'
        ctx.fillStyle = 'rgb(255,0,255)'
        ctx.beginPath()
        ctx.arc(50, 50, 50, 0, Math.PI * 2, true)
        ctx.closePath()
        ctx.fill()
        ctx.fillStyle = 'rgb(0,255,255)'
        ctx.beginPath()
        ctx.arc(100, 50, 50, 0, Math.PI * 2, true)
        ctx.closePath()
        ctx.fill()
        ctx.fillStyle = 'rgb(255,255,0)'
        ctx.beginPath()
        ctx.arc(75, 100, 50, 0, Math.PI * 2, true)
        ctx.closePath()
        ctx.fill()
        ctx.fillStyle = 'rgb(255,0,255)'
        // canvas winding
        // http://blogs.adobe.com/webplatform/2013/01/30/winding-rules-in-canvas/
        // http://jsfiddle.net/NDYV8/19/
        ctx.arc(75, 75, 75, 0, Math.PI * 2, true)
        ctx.arc(75, 75, 25, 0, Math.PI * 2, true)
        ctx.fill('evenodd')

        if (canvas.toDataURL) {
          result.push('canvas fp:' + canvas.toDataURL())
        }
        return result.join('~')
      },

      getWebglFp: function () {
        var gl
        var fa2s = function (fa) {
          gl.clearColor(0.0, 0.0, 0.0, 1.0)
          gl.enable(gl.DEPTH_TEST)
          gl.depthFunc(gl.LEQUAL)
          gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT)
          return '[' + fa[0] + ', ' + fa[1] + ']'
        }
        var maxAnisotropy = function (gl) {
          var ext =
            gl.getExtension('EXT_texture_filter_anisotropic') ||
            gl.getExtension('WEBKIT_EXT_texture_filter_anisotropic') ||
            gl.getExtension('MOZ_EXT_texture_filter_anisotropic')
          if (ext) {
            var anisotropy = gl.getParameter(ext.MAX_TEXTURE_MAX_ANISOTROPY_EXT)
            if (anisotropy === 0) {
              anisotropy = 2
            }
            return anisotropy
          } else {
            return null
          }
        }
        gl = this.getWebglCanvas()
        if (!gl) {
          return null
        }
        // WebGL fingerprinting is a combination of techniques, found in MaxMind antifraud script & Augur fingerprinting.
        // First it draws a gradient object with shaders and convers the image to the Base64 string.
        // Then it enumerates all WebGL extensions & capabilities and appends them to the Base64 string, resulting in a huge WebGL string, potentially very unique on each device
        // Since iOS supports webgl starting from version 8.1 and 8.1 runs on several graphics chips, the results may be different across ios devices, but we need to verify it.
        var result = []
        var vShaderTemplate =
          'attribute vec2 attrVertex;varying vec2 varyinTexCoordinate;uniform vec2 uniformOffset;void main(){varyinTexCoordinate=attrVertex+uniformOffset;gl_Position=vec4(attrVertex,0,1);}'
        var fShaderTemplate =
          'precision mediump float;varying vec2 varyinTexCoordinate;void main() {gl_FragColor=vec4(varyinTexCoordinate,0,1);}'
        var vertexPosBuffer = gl.createBuffer()
        gl.bindBuffer(gl.ARRAY_BUFFER, vertexPosBuffer)
        var vertices = new Float32Array([-0.2, -0.9, 0, 0.4, -0.26, 0, 0, 0.732134444, 0])
        gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW)
        vertexPosBuffer.itemSize = 3
        vertexPosBuffer.numItems = 3
        var program = gl.createProgram()
        var vshader = gl.createShader(gl.VERTEX_SHADER)
        gl.shaderSource(vshader, vShaderTemplate)
        gl.compileShader(vshader)
        var fshader = gl.createShader(gl.FRAGMENT_SHADER)
        gl.shaderSource(fshader, fShaderTemplate)
        gl.compileShader(fshader)
        gl.attachShader(program, vshader)
        gl.attachShader(program, fshader)
        gl.linkProgram(program)
        gl.useProgram(program)
        program.vertexPosAttrib = gl.getAttribLocation(program, 'attrVertex')
        program.offsetUniform = gl.getUniformLocation(program, 'uniformOffset')
        gl.enableVertexAttribArray(program.vertexPosArray)
        gl.vertexAttribPointer(
          program.vertexPosAttrib,
          vertexPosBuffer.itemSize,
          gl.FLOAT,
          !1,
          0,
          0
        )
        gl.uniform2f(program.offsetUniform, 1, 1)
        gl.drawArrays(gl.TRIANGLE_STRIP, 0, vertexPosBuffer.numItems)
        try {
          result.push(gl.canvas.toDataURL())
        } catch (e) {
          /* .toDataURL may be absent or broken (blocked by extension) */
        }
        result.push('extensions:' + (gl.getSupportedExtensions() || []).join(';'))
        result.push(
          'webgl aliased line width range:' + fa2s(gl.getParameter(gl.ALIASED_LINE_WIDTH_RANGE))
        )
        result.push(
          'webgl aliased point size range:' + fa2s(gl.getParameter(gl.ALIASED_POINT_SIZE_RANGE))
        )
        result.push('webgl alpha bits:' + gl.getParameter(gl.ALPHA_BITS))
        result.push('webgl antialiasing:' + (gl.getContextAttributes().antialias ? 'yes' : 'no'))
        result.push('webgl blue bits:' + gl.getParameter(gl.BLUE_BITS))
        result.push('webgl depth bits:' + gl.getParameter(gl.DEPTH_BITS))
        result.push('webgl green bits:' + gl.getParameter(gl.GREEN_BITS))
        result.push('webgl max anisotropy:' + maxAnisotropy(gl))
        result.push(
          'webgl max combined texture image units:' +
            gl.getParameter(gl.MAX_COMBINED_TEXTURE_IMAGE_UNITS)
        )
        result.push(
          'webgl max cube map texture size:' + gl.getParameter(gl.MAX_CUBE_MAP_TEXTURE_SIZE)
        )
        result.push(
          'webgl max fragment uniform vectors:' + gl.getParameter(gl.MAX_FRAGMENT_UNIFORM_VECTORS)
        )
        result.push('webgl max render buffer size:' + gl.getParameter(gl.MAX_RENDERBUFFER_SIZE))
        result.push('webgl max texture image units:' + gl.getParameter(gl.MAX_TEXTURE_IMAGE_UNITS))
        result.push('webgl max texture size:' + gl.getParameter(gl.MAX_TEXTURE_SIZE))
        result.push('webgl max varying vectors:' + gl.getParameter(gl.MAX_VARYING_VECTORS))
        result.push('webgl max vertex attribs:' + gl.getParameter(gl.MAX_VERTEX_ATTRIBS))
        result.push(
          'webgl max vertex texture image units:' +
            gl.getParameter(gl.MAX_VERTEX_TEXTURE_IMAGE_UNITS)
        )
        result.push(
          'webgl max vertex uniform vectors:' + gl.getParameter(gl.MAX_VERTEX_UNIFORM_VECTORS)
        )
        result.push('webgl max viewport dims:' + fa2s(gl.getParameter(gl.MAX_VIEWPORT_DIMS)))
        result.push('webgl red bits:' + gl.getParameter(gl.RED_BITS))
        result.push('webgl renderer:' + gl.getParameter(gl.RENDERER))
        result.push(
          'webgl shading language version:' + gl.getParameter(gl.SHADING_LANGUAGE_VERSION)
        )
        result.push('webgl stencil bits:' + gl.getParameter(gl.STENCIL_BITS))
        result.push('webgl vendor:' + gl.getParameter(gl.VENDOR))
        result.push('webgl version:' + gl.getParameter(gl.VERSION))

        try {
          // Add the unmasked vendor and unmasked renderer if the debug_renderer_info extension is available
          var extensionDebugRendererInfo = gl.getExtension('WEBGL_debug_renderer_info')
          if (extensionDebugRendererInfo) {
            result.push(
              'webgl unmasked vendor:' +
                gl.getParameter(extensionDebugRendererInfo.UNMASKED_VENDOR_WEBGL)
            )
            result.push(
              'webgl unmasked renderer:' +
                gl.getParameter(extensionDebugRendererInfo.UNMASKED_RENDERER_WEBGL)
            )
          }
        } catch (e) {
          /* squelch */
        }

        if (!gl.getShaderPrecisionFormat) {
          return result.join('~')
        }

        var that = this

        that.each(['FLOAT', 'INT'], function (numType) {
          that.each(['VERTEX', 'FRAGMENT'], function (shader) {
            that.each(['HIGH', 'MEDIUM', 'LOW'], function (numSize) {
              that.each(['precision', 'rangeMin', 'rangeMax'], function (key) {
                var format = gl.getShaderPrecisionFormat(
                  gl[shader + '_SHADER'],
                  gl[numSize + '_' + numType]
                )[key]
                if (key !== 'precision') {
                  key = 'precision ' + key
                }
                var line = [
                  'webgl ',
                  shader.toLowerCase(),
                  ' shader ',
                  numSize.toLowerCase(),
                  ' ',
                  numType.toLowerCase(),
                  ' ',
                  key,
                  ':',
                  format
                ]
                result.push(line.join(''))
              })
            })
          })
        })
        return result.join('~')
      },
      getWebglVendorAndRenderer: function () {
        /* This a subset of the WebGL fingerprint with a lot of entropy, while being reasonably browser-independent */
        try {
          var glContext = this.getWebglCanvas()
          var extensionDebugRendererInfo = glContext.getExtension('WEBGL_debug_renderer_info')
          return (
            glContext.getParameter(extensionDebugRendererInfo.UNMASKED_VENDOR_WEBGL) +
            '~' +
            glContext.getParameter(extensionDebugRendererInfo.UNMASKED_RENDERER_WEBGL)
          )
        } catch (e) {
          return null
        }
      },
      getAdBlock: function () {
        var ads = document.createElement('div')
        ads.innerHTML = '&nbsp;'
        ads.className = 'adsbox'
        var result = false
        try {
          // body may not exist, that's why we need try/catch
          document.body.appendChild(ads)
          result = document.getElementsByClassName('adsbox')[0].offsetHeight === 0
          document.body.removeChild(ads)
        } catch (e) {
          result = false
        }
        return result
      },
      getHasLiedLanguages: function () {
        // We check if navigator.language is equal to the first language of navigator.languages
        if (typeof navigator.languages !== 'undefined') {
          try {
            var firstLanguages = navigator.languages[0].substr(0, 2)
            if (firstLanguages !== navigator.language.substr(0, 2)) {
              return true
            }
          } catch (err) {
            return true
          }
        }
        return false
      },
      getHasLiedResolution: function () {
        if (window.screen.width < window.screen.availWidth) {
          return true
        }
        if (window.screen.height < window.screen.availHeight) {
          return true
        }
        return false
      },
      getHasLiedOs: function () {
        var userAgent = navigator.userAgent.toLowerCase()
        var oscpu = navigator.oscpu
        var platform = navigator.platform.toLowerCase()
        var os
        // We extract the OS from the user agent (respect the order of the if else if statement)
        if (userAgent.indexOf('windows phone') >= 0) {
          os = 'Windows Phone'
        } else if (userAgent.indexOf('win') >= 0) {
          os = 'Windows'
        } else if (userAgent.indexOf('android') >= 0) {
          os = 'Android'
        } else if (userAgent.indexOf('linux') >= 0) {
          os = 'Linux'
        } else if (userAgent.indexOf('iphone') >= 0 || userAgent.indexOf('ipad') >= 0) {
          os = 'iOS'
        } else if (userAgent.indexOf('mac') >= 0) {
          os = 'Mac'
        } else {
          os = 'Other'
        }
        // We detect if the person uses a mobile device
        var mobileDevice
        if (
          'ontouchstart' in window ||
          navigator.maxTouchPoints > 0 ||
          navigator.msMaxTouchPoints > 0
        ) {
          mobileDevice = true
        } else {
          mobileDevice = false
        }

        if (
          mobileDevice &&
          os !== 'Windows Phone' &&
          os !== 'Android' &&
          os !== 'iOS' &&
          os !== 'Other'
        ) {
          return true
        }

        // We compare oscpu with the OS extracted from the UA
        if (typeof oscpu !== 'undefined') {
          oscpu = oscpu.toLowerCase()
          if (oscpu.indexOf('win') >= 0 && os !== 'Windows' && os !== 'Windows Phone') {
            return true
          } else if (oscpu.indexOf('linux') >= 0 && os !== 'Linux' && os !== 'Android') {
            return true
          } else if (oscpu.indexOf('mac') >= 0 && os !== 'Mac' && os !== 'iOS') {
            return true
          } else if (
            (oscpu.indexOf('win') === -1 &&
              oscpu.indexOf('linux') === -1 &&
              oscpu.indexOf('mac') === -1) !==
            (os === 'Other')
          ) {
            return true
          }
        }

        // We compare platform with the OS extracted from the UA
        if (platform.indexOf('win') >= 0 && os !== 'Windows' && os !== 'Windows Phone') {
          return true
        } else if (
          (platform.indexOf('linux') >= 0 ||
            platform.indexOf('android') >= 0 ||
            platform.indexOf('pike') >= 0) &&
          os !== 'Linux' &&
          os !== 'Android'
        ) {
          return true
        } else if (
          (platform.indexOf('mac') >= 0 ||
            platform.indexOf('ipad') >= 0 ||
            platform.indexOf('ipod') >= 0 ||
            platform.indexOf('iphone') >= 0) &&
          os !== 'Mac' &&
          os !== 'iOS'
        ) {
          return true
        } else if (
          (platform.indexOf('win') === -1 &&
            platform.indexOf('linux') === -1 &&
            platform.indexOf('mac') === -1) !==
          (os === 'Other')
        ) {
          return true
        }

        if (
          typeof navigator.plugins === 'undefined' &&
          os !== 'Windows' &&
          os !== 'Windows Phone'
        ) {
          // We are are in the case where the person uses ie, therefore we can infer that it's windows
          return true
        }

        return false
      },
      getHasLiedBrowser: function () {
        var userAgent = navigator.userAgent.toLowerCase()
        var productSub = navigator.productSub

        // we extract the browser from the user agent (respect the order of the tests)
        var browser
        if (userAgent.indexOf('firefox') >= 0) {
          browser = 'Firefox'
        } else if (userAgent.indexOf('opera') >= 0 || userAgent.indexOf('opr') >= 0) {
          browser = 'Opera'
        } else if (userAgent.indexOf('chrome') >= 0) {
          browser = 'Chrome'
        } else if (userAgent.indexOf('safari') >= 0) {
          browser = 'Safari'
        } else if (userAgent.indexOf('trident') >= 0) {
          browser = 'Internet Explorer'
        } else {
          browser = 'Other'
        }

        if (
          (browser === 'Chrome' || browser === 'Safari' || browser === 'Opera') &&
          productSub !== '20030107'
        ) {
          return true
        }

        // eslint-disable-next-line no-eval
        var tempRes = eval.toString().length
        if (
          tempRes === 37 &&
          browser !== 'Safari' &&
          browser !== 'Firefox' &&
          browser !== 'Other'
        ) {
          return true
        } else if (tempRes === 39 && browser !== 'Internet Explorer' && browser !== 'Other') {
          return true
        } else if (
          tempRes === 33 &&
          browser !== 'Chrome' &&
          browser !== 'Opera' &&
          browser !== 'Other'
        ) {
          return true
        }

        // We create an error to see how it is handled
        var errFirefox
        try {
          // eslint-disable-next-line no-throw-literal
          throw 'a'
        } catch (err) {
          try {
            err.toSource()
            errFirefox = true
          } catch (errOfErr) {
            errFirefox = false
          }
        }
        if (errFirefox && browser !== 'Firefox' && browser !== 'Other') {
          return true
        }
        return false
      },
      isCanvasSupported: function () {
        var elem = document.createElement('canvas')
        return !!(elem.getContext && elem.getContext('2d'))
      },
      isWebGlSupported: function () {
        // code taken from Modernizr
        if (!this.isCanvasSupported()) {
          return false
        }

        var glContext = this.getWebglCanvas()
        return !!window.WebGLRenderingContext && !!glContext
      },
      isIE: function () {
        if (navigator.appName === 'Microsoft Internet Explorer') {
          return true
        } else if (navigator.appName === 'Netscape' && /Trident/.test(navigator.userAgent)) {
          // IE 11
          return true
        }
        return false
      },
      hasSwfObjectLoaded: function () {
        return typeof window.swfobject !== 'undefined'
      },
      hasMinFlashInstalled: function () {
        return window.swfobject.hasFlashPlayerVersion('9.0.0')
      },
      addFlashDivNode: function () {
        var node = document.createElement('div')
        node.setAttribute('id', this.options.swfContainerId)
        document.body.appendChild(node)
      },
      loadSwfAndDetectFonts: function (done) {
        var hiddenCallback = '___fp_swf_loaded'
        window[hiddenCallback] = function (fonts) {
          done(fonts)
        }
        var id = this.options.swfContainerId
        this.addFlashDivNode()
        var flashvars = { onReady: hiddenCallback }
        var flashparams = { allowScriptAccess: 'always', menu: 'false' }
        window.swfobject.embedSWF(
          this.options.swfPath,
          id,
          '1',
          '1',
          '9.0.0',
          false,
          flashvars,
          flashparams,
          {}
        )
      },
      getWebglCanvas: function () {
        var canvas = document.createElement('canvas')
        var gl = null
        try {
          gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl')
        } catch (e) {
          /* squelch */
        }
        if (!gl) {
          gl = null
        }
        return gl
      },

      /**
       * @template T
       * @param {T=} context
       */
      each: function (obj, iterator, context) {
        if (obj === null) {
          return
        }
        if (this.nativeForEach && obj.forEach === this.nativeForEach) {
          obj.forEach(iterator, context)
        } else if (obj.length === +obj.length) {
          for (var i = 0, l = obj.length; i < l; i++) {
            if (iterator.call(context, obj[i], i, obj) === {}) {
              return
            }
          }
        } else {
          for (var key in obj) {
            if (obj.hasOwnProperty(key)) {
              if (iterator.call(context, obj[key], key, obj) === {}) {
                return
              }
            }
          }
        }
      },

      /**
       * @template T,V
       * @param {T=} context
       * @param {function(this:T, ?, (string|number), T=):V} iterator
       * @return {V}
       */
      map: function (obj, iterator, context) {
        var results = []
        // Not using strict equality so that this acts as a
        // shortcut to checking for `null` and `undefined`.
        if (obj == null) {
          return results
        }
        if (this.nativeMap && obj.map === this.nativeMap) {
          return obj.map(iterator, context)
        }
        this.each(obj, function (value, index, list) {
          results[results.length] = iterator.call(context, value, index, list)
        })
        return results
      },

      /// MurmurHash3 related functions

      //
      // Given two 64bit ints (as an array of two 32bit ints) returns the two
      // added together as a 64bit int (as an array of two 32bit ints).
      //
      x64Add: function (m, n) {
        m = [m[0] >>> 16, m[0] & 0xffff, m[1] >>> 16, m[1] & 0xffff]
        n = [n[0] >>> 16, n[0] & 0xffff, n[1] >>> 16, n[1] & 0xffff]
        var o = [0, 0, 0, 0]
        o[3] += m[3] + n[3]
        o[2] += o[3] >>> 16
        o[3] &= 0xffff
        o[2] += m[2] + n[2]
        o[1] += o[2] >>> 16
        o[2] &= 0xffff
        o[1] += m[1] + n[1]
        o[0] += o[1] >>> 16
        o[1] &= 0xffff
        o[0] += m[0] + n[0]
        o[0] &= 0xffff
        return [(o[0] << 16) | o[1], (o[2] << 16) | o[3]]
      },

      //
      // Given two 64bit ints (as an array of two 32bit ints) returns the two
      // multiplied together as a 64bit int (as an array of two 32bit ints).
      //
      x64Multiply: function (m, n) {
        m = [m[0] >>> 16, m[0] & 0xffff, m[1] >>> 16, m[1] & 0xffff]
        n = [n[0] >>> 16, n[0] & 0xffff, n[1] >>> 16, n[1] & 0xffff]
        var o = [0, 0, 0, 0]
        o[3] += m[3] * n[3]
        o[2] += o[3] >>> 16
        o[3] &= 0xffff
        o[2] += m[2] * n[3]
        o[1] += o[2] >>> 16
        o[2] &= 0xffff
        o[2] += m[3] * n[2]
        o[1] += o[2] >>> 16
        o[2] &= 0xffff
        o[1] += m[1] * n[3]
        o[0] += o[1] >>> 16
        o[1] &= 0xffff
        o[1] += m[2] * n[2]
        o[0] += o[1] >>> 16
        o[1] &= 0xffff
        o[1] += m[3] * n[1]
        o[0] += o[1] >>> 16
        o[1] &= 0xffff
        o[0] += m[0] * n[3] + m[1] * n[2] + m[2] * n[1] + m[3] * n[0]
        o[0] &= 0xffff
        return [(o[0] << 16) | o[1], (o[2] << 16) | o[3]]
      },
      //
      // Given a 64bit int (as an array of two 32bit ints) and an int
      // representing a number of bit positions, returns the 64bit int (as an
      // array of two 32bit ints) rotated left by that number of positions.
      //
      x64Rotl: function (m, n) {
        n %= 64
        if (n === 32) {
          return [m[1], m[0]]
        } else if (n < 32) {
          return [(m[0] << n) | (m[1] >>> (32 - n)), (m[1] << n) | (m[0] >>> (32 - n))]
        } else {
          n -= 32
          return [(m[1] << n) | (m[0] >>> (32 - n)), (m[0] << n) | (m[1] >>> (32 - n))]
        }
      },
      //
      // Given a 64bit int (as an array of two 32bit ints) and an int
      // representing a number of bit positions, returns the 64bit int (as an
      // array of two 32bit ints) shifted left by that number of positions.
      //
      x64LeftShift: function (m, n) {
        n %= 64
        if (n === 0) {
          return m
        } else if (n < 32) {
          return [(m[0] << n) | (m[1] >>> (32 - n)), m[1] << n]
        } else {
          return [m[1] << (n - 32), 0]
        }
      },
      //
      // Given two 64bit ints (as an array of two 32bit ints) returns the two
      // xored together as a 64bit int (as an array of two 32bit ints).
      //
      x64Xor: function (m, n) {
        return [m[0] ^ n[0], m[1] ^ n[1]]
      },
      //
      // Given a block, returns murmurHash3's final x64 mix of that block.
      // (`[0, h[0] >>> 1]` is a 33 bit unsigned right shift. This is the
      // only place where we need to right shift 64bit ints.)
      //
      x64Fmix: function (h) {
        h = this.x64Xor(h, [0, h[0] >>> 1])
        h = this.x64Multiply(h, [0xff51afd7, 0xed558ccd])
        h = this.x64Xor(h, [0, h[0] >>> 1])
        h = this.x64Multiply(h, [0xc4ceb9fe, 0x1a85ec53])
        h = this.x64Xor(h, [0, h[0] >>> 1])
        return h
      },

      //
      // Given a string and an optional seed as an int, returns a 128 bit
      // hash using the x64 flavor of MurmurHash3, as an unsigned hex.
      //
      x64hash128: function (key, seed) {
        key = key || ''
        seed = seed || 0
        var remainder = key.length % 16
        var bytes = key.length - remainder
        var h1 = [0, seed]
        var h2 = [0, seed]
        var k1 = [0, 0]
        var k2 = [0, 0]
        var c1 = [0x87c37b91, 0x114253d5]
        var c2 = [0x4cf5ad43, 0x2745937f]
        for (var i = 0; i < bytes; i = i + 16) {
          k1 = [
            (key.charCodeAt(i + 4) & 0xff) |
              ((key.charCodeAt(i + 5) & 0xff) << 8) |
              ((key.charCodeAt(i + 6) & 0xff) << 16) |
              ((key.charCodeAt(i + 7) & 0xff) << 24),
            (key.charCodeAt(i) & 0xff) |
              ((key.charCodeAt(i + 1) & 0xff) << 8) |
              ((key.charCodeAt(i + 2) & 0xff) << 16) |
              ((key.charCodeAt(i + 3) & 0xff) << 24)
          ]
          k2 = [
            (key.charCodeAt(i + 12) & 0xff) |
              ((key.charCodeAt(i + 13) & 0xff) << 8) |
              ((key.charCodeAt(i + 14) & 0xff) << 16) |
              ((key.charCodeAt(i + 15) & 0xff) << 24),
            (key.charCodeAt(i + 8) & 0xff) |
              ((key.charCodeAt(i + 9) & 0xff) << 8) |
              ((key.charCodeAt(i + 10) & 0xff) << 16) |
              ((key.charCodeAt(i + 11) & 0xff) << 24)
          ]
          k1 = this.x64Multiply(k1, c1)
          k1 = this.x64Rotl(k1, 31)
          k1 = this.x64Multiply(k1, c2)
          h1 = this.x64Xor(h1, k1)
          h1 = this.x64Rotl(h1, 27)
          h1 = this.x64Add(h1, h2)
          h1 = this.x64Add(this.x64Multiply(h1, [0, 5]), [0, 0x52dce729])
          k2 = this.x64Multiply(k2, c2)
          k2 = this.x64Rotl(k2, 33)
          k2 = this.x64Multiply(k2, c1)
          h2 = this.x64Xor(h2, k2)
          h2 = this.x64Rotl(h2, 31)
          h2 = this.x64Add(h2, h1)
          h2 = this.x64Add(this.x64Multiply(h2, [0, 5]), [0, 0x38495ab5])
        }
        k1 = [0, 0]
        k2 = [0, 0]
        switch (remainder) {
          case 15:
            k2 = this.x64Xor(k2, this.x64LeftShift([0, key.charCodeAt(i + 14)], 48))
          // fallthrough
          case 14:
            k2 = this.x64Xor(k2, this.x64LeftShift([0, key.charCodeAt(i + 13)], 40))
          // fallthrough
          case 13:
            k2 = this.x64Xor(k2, this.x64LeftShift([0, key.charCodeAt(i + 12)], 32))
          // fallthrough
          case 12:
            k2 = this.x64Xor(k2, this.x64LeftShift([0, key.charCodeAt(i + 11)], 24))
          // fallthrough
          case 11:
            k2 = this.x64Xor(k2, this.x64LeftShift([0, key.charCodeAt(i + 10)], 16))
          // fallthrough
          case 10:
            k2 = this.x64Xor(k2, this.x64LeftShift([0, key.charCodeAt(i + 9)], 8))
          // fallthrough
          case 9:
            k2 = this.x64Xor(k2, [0, key.charCodeAt(i + 8)])
            k2 = this.x64Multiply(k2, c2)
            k2 = this.x64Rotl(k2, 33)
            k2 = this.x64Multiply(k2, c1)
            h2 = this.x64Xor(h2, k2)
          // fallthrough
          case 8:
            k1 = this.x64Xor(k1, this.x64LeftShift([0, key.charCodeAt(i + 7)], 56))
          // fallthrough
          case 7:
            k1 = this.x64Xor(k1, this.x64LeftShift([0, key.charCodeAt(i + 6)], 48))
          // fallthrough
          case 6:
            k1 = this.x64Xor(k1, this.x64LeftShift([0, key.charCodeAt(i + 5)], 40))
          // fallthrough
          case 5:
            k1 = this.x64Xor(k1, this.x64LeftShift([0, key.charCodeAt(i + 4)], 32))
          // fallthrough
          case 4:
            k1 = this.x64Xor(k1, this.x64LeftShift([0, key.charCodeAt(i + 3)], 24))
          // fallthrough
          case 3:
            k1 = this.x64Xor(k1, this.x64LeftShift([0, key.charCodeAt(i + 2)], 16))
          // fallthrough
          case 2:
            k1 = this.x64Xor(k1, this.x64LeftShift([0, key.charCodeAt(i + 1)], 8))
          // fallthrough
          case 1:
            k1 = this.x64Xor(k1, [0, key.charCodeAt(i)])
            k1 = this.x64Multiply(k1, c1)
            k1 = this.x64Rotl(k1, 31)
            k1 = this.x64Multiply(k1, c2)
            h1 = this.x64Xor(h1, k1)
          // fallthrough
        }
        h1 = this.x64Xor(h1, [0, key.length])
        h2 = this.x64Xor(h2, [0, key.length])
        h1 = this.x64Add(h1, h2)
        h2 = this.x64Add(h2, h1)
        h1 = this.x64Fmix(h1)
        h2 = this.x64Fmix(h2)
        h1 = this.x64Add(h1, h2)
        h2 = this.x64Add(h2, h1)
        return (
          ('00000000' + (h1[0] >>> 0).toString(16)).slice(-8) +
          ('00000000' + (h1[1] >>> 0).toString(16)).slice(-8) +
          ('00000000' + (h2[0] >>> 0).toString(16)).slice(-8) +
          ('00000000' + (h2[1] >>> 0).toString(16)).slice(-8)
        )
      }
    }

    Fingerprint2.VERSION = '1.8.0'
    return Fingerprint2
  })()
  // == Fingerprint2 end ==

  // tools
  /**
   * print and echo
   */
  var dump = function () {
    var args = Array.prototype.slice.call(arguments)
    console.log.apply(console, args)
    return args.length <= 1 ? args[0] : args
  }

  /**
   * 函式快取
   * @param {*} fn
   */
  var memoize = function (fn) {
    return function () {
      var args = Array.prototype.slice.call(arguments)
      fn.cache = fn.cache || {}
      return fn.cache[args] ? fn.cache[args] : (fn.cache[args] = fn.apply(this, args))
    }
  }

  // Polyfill
  if (!Array.prototype.indexOf) {
    // eslint-disable-next-line no-extend-native
    Array.prototype.indexOf = function (searchElement, fromIndex) {
      if (this == null) throw new TypeError('"this" is null or not defined')

      var o = Object(this)
      var len = o.length >>> 0
      if (len === 0) return -1

      var n = fromIndex | 0
      if (n >= len) return -1

      var k = Math.max(n >= 0 ? n : len - Math.abs(n), 0)
      while (k < len) {
        if (k in o && o[k] === searchElement) return k
        k++
      }
      return -1
    }
  }

  if (!Date.now) {
    Date.now = function now() {
      return new Date().getTime()
    }
  }

  var compact = function (ary) {
    var result = []
    for (var i = 0, len = ary.length; i < len; i++) {
      if (ary[i]) result.push(ary[i])
    }
    return result
  }

  // helpfunction
  /**
   * 是否為物件中的屬性
   * @param {*} obj
   * @param {*} key
   */
  var isProp = function (obj, key) {
    return Object.prototype.hasOwnProperty.call(obj, key)
  }

  /**
   * 是否為函式
   * @param {*} func
   */
  var isFunction = function (func) {
    return typeof func === 'function'
  }

  /**
   * 時間在 begin 與 end 之間
   * @param {*} comptime
   * @param {*} begin
   * @param {*} end
   */
  var between = function (comptime, begin, end) {
    var ms = typeof comptime === 'string' ? new Date(comptime).getTime() : comptime
    var beginms = typeof begin === 'string' ? new Date(begin).getTime() : begin
    var endms = typeof begin === 'string' ? new Date(end).getTime() : end

    return ms >= beginms && ms <= endms
  }

  /**
   * 現在時間在 begin 與 end 之間
   * @param {*} begin
   * @param {*} end
   */
  var nowBetween = function (begin, end) {
    return between(Date.now(), begin, end)
  }

  /**
   * 取得頁面上的頂級網域
   */
  var goodDomain = memoize(function () {
    var domain = window.location.hostname || document.domain || ''
    var p = domain.split('.')
    var s = '_gd' + Date.now().toString(36)
    var lock = s + '=' + s
    var i = 0

    while (i < p.length - 1 && document.cookie.indexOf(lock) === -1) {
      domain = p.slice(-1 - ++i).join('.')
      document.cookie = lock + ';domain=' + domain + ';'
    }
    document.cookie = s + '=;expires=Thu, 01 Jan 1970 00:00:01 GMT;domain=' + domain + ';'
    return domain
  })

  /**
   * 設定跨子網域cookie
   */
  var setCookie = (function (domain) {
    return function (cname, cvalue, delay) {
      var ms = Date.now() + (+delay || 10) * 360 * 86400000
      var expires = 'expires=' + new Date(ms).toGMTString()
      document.cookie = cname + '=' + cvalue + ';' + expires + ';domain=.' + domain + ';path=/'
    }
  })(goodDomain())

  /**
   * 取得 cookie 值
   * @param {*} cname
   */
  var getCookie = function (cname) {
    var name = cname + '='
    var ca = document.cookie.split(';')
    for (var i = 0, len = ca.length; i < len; i++) {
      var c = ca[i].trim()
      if (c.indexOf(name) === 0) return c.substring(name.length)
    }
    return ''
  }

  /**
   * 存取 cookie
   * @param {*} key
   * @param {*} value
   */
  var appraiseCK = function (key, value) {
    try {
      if (value) {
        setCookie(key, value)
      } else {
        value = getCookie(key)
      }
      return value || ''
    } catch (e) {
      return ''
    }
  }

  /**
   * 存取 localStorage
   * @param {*} key
   * @param {*} value
   */
  var appraiseLS = function (key, value) {
    try {
      var store = window.localStorage
      if (value) {
        store.setItem(key, value)
      } else {
        value = store.getItem(key)
      }
      return value || ''
    } catch (e) {
      return ''
    }
  }

  /**
   * 存取 indexedDB
   * @param {*} key
   * @param {*} value
   * @param {*} done
   */
  var appraiseIDB = function (key, value, done) {
    var IDB =
      window.indexedDB || window.mozIndexedDB || window.webkitIndexedDB || window.msIndexedDB
    if (isFunction(value)) {
      done = value
      value = ''
    }
    if (!key) return done && done('')

    try {
      var conn = IDB.open('db_' + key, 1)
      var storeName = 'tb_' + key
      conn.onupgradeneeded = function (event) {
        var db = event.target.result
        db.createObjectStore(storeName, {
          keyPath: 'name',
          unique: false
        })
      }
      conn.onerror = function () {
        done && done('')
      }
      conn.onsuccess = function (event) {
        var db = event.target.result
        if (db.objectStoreNames.contains(storeName)) {
          var store = db.transaction([storeName], 'readwrite').objectStore(storeName)
          var qy
          if (value) {
            qy = store.put({ name: key, value: value })
            qy.onerror = function () {
              done && done('')
            }
            qy.onsuccess = function () {
              done && done(value)
            }
          } else {
            qy = store.get(key)
            qy.onerror = function () {
              done && done('')
            }
            qy.onsuccess = function (ev) {
              var result = ev.target.result
              done(result ? result.value : '')
            }
          }
        } else {
          done('')
        }
        db.close()
      }
    } catch (e) {
      done('')
    }
  }

  /**
   * 將物件轉成 url 查詢字串
   * @param {*} obj
   */
  var makeSearchString = function (obj) {
    var ary = []
    for (var key in obj) {
      if (isProp(obj, key)) {
        var val = obj[key]
        ary.push(encodeURIComponent(key) + '=' + encodeURIComponent(val))
      }
    }
    return ary.join('&')
  }

  /**
   * 取得 url 查詢字串中特定 key 的值
   * @param {*} key
   * @param {*} qs
   */
  var getValue = function (key, qs) {
    var pairs = ((qs || '').substring(1) || '').split('&')
    for (var i = 0, len = pairs.length; i < len; i++) {
      var pair = pairs[i].split('=')
      if (pair[0] === key) return pair[1]
    }
  }

  // const
  var tjSecond = (function (now) {
    return function () {
      return Math.floor((Date.now() - now) / 1000)
    }
  })(Date.now())

  /**
   * ajax get, type=json 回傳 json, type=text 回傳 string
   * @param {[json|text]} type
   * @param {*} url
   * @param {*} func
   */
  var getR = function (type, url, func) {
    var oReq = new XMLHttpRequest() // eslint-disable-line
    var callback = func
    try {
      oReq.responseType = type
    } catch (e) {
      // fix ie
      callback = function (evt) {
        var s = this.response
        if (typeof s === 'string') {
          try {
            Object.defineProperty(this, 'response', {
              get: function () {
                var x = s.trim()
                return x ? JSON.parse(x) : {}
              }
            })
          } catch (e) {}
        }
        func.call(this, evt)
      }
    }

    oReq.addEventListener('load', callback)
    oReq.open('GET', url)
    oReq.send()
  }

  /**
   * ajax post, 沒有回傳
   * @param {*} url
   * @param {*} data
   */
  var postR = function (url, data) {
    var formData = typeof data === 'string' ? data : JSON.stringify(data)
    //formData = '{"records":[{"value":{"name": "testUser123"}}]}';
    //console.log(typeof formData);
    //console.log("##postR###",url)
    if (navigator.sendBeacon) {
      console.log('beacon')
      navigator.sendBeacon(url, formData)
      //

      //
    } else {
      console.log('http_post')
      var oReq = new XMLHttpRequest() // eslint-disable-line
      oReq.open('POST', url, true)
      oReq.setRequestHeader('Content-Type', 'text/plain;charset=UTF-8')
      oReq.send(formData)
    }
  }

  /**
   * 建立一個 iFrame
   * @param {*} src
   */
  var createIframe = function (src) {
    var mapp = '<iframe src="' + src + '" style="display: none; width: 1px; height: 1px;"></iframe>'
    var ifrm = document.createRange().createContextualFragment(mapp)

    //var ifrm = d.createElement('iframe')
    //ifrm.style.display = 'none'
    //ifrm.setAttribute('src', src)
    //ifrm.setAttribute("hidden", true);
    //ifrm.style.width = '1px'
    //ifrm.style.height = '1px'

    return ifrm
  }

  // 改為 inline
  var disableId = function (id) {
    var el = d.getElementById(id)
    if (!el) return
    el.style.display = 'none'
  }

  // var aq_close = function () {
  //   disableId('aq_show_pop')
  // }

  /**
   * 載入 js 程式碼
   * @param {*} url
   * @param {*} callback
   */
  var loadScript = function (url, callback) {
    var head = document.getElementsByTagName('head')[0]
    var node = document.createElement('script')
    node.type = 'text/javascript'
    if (
      node.attachEvent &&
      !(node.attachEvent.toString && node.attachEvent.toString().indexOf('[native code') === -1)
    ) {
      node.attachEvent('onreadystatechange', callback) // old ie
    } else {
      node.addEventListener('load', callback, false)
    }
    node.src = url
    head.appendChild(node)
    return node
  }

  var loadCSS = function (url) {
    var head = document.getElementsByTagName('head')[0]
    var node = document.createElement('link')
    node.type = 'text/css'
    node.rel = 'stylesheet'
    node.href = url

    head.appendChild(node)
    //console.log(node)
    //alert("!")
  }

  var helloBarClose = function helloBarClose() {
    window.addEventListener('click', function (event) {
      //console.log(event.target.innerText.trim());

      if (event.target && event.target.matches('a.icon-close')) {
        var helloBarElement = document.getElementById('hellobar-bar')
        fadeOutEffect(helloBarElement)
      } else if (event.target && event.target.innerText.trim() === '我要訂閱') {
        var _helloBarElement = document.getElementById('hellobar-bar')

        fadeOutEffect(_helloBarElement)
      } else if (event.target && event.target.innerText.trim() === '取消') {
        var _helloBarElement2 = document.getElementById('hellobar-bar')

        fadeOutEffect(_helloBarElement2)
      }
    })
  }
  var fadeOutEffect = function fadeOutEffect(element) {
    var fadeEffect = setInterval(function () {
      if (!element.style.opacity) {
        element.style.opacity = 1
      }

      if (element.style.opacity < 0.1) {
        clearInterval(fadeEffect)
      } else {
        element.style.opacity -= 0.1
      }
    }, 40)
    disableId('hellobar-bar')
  }

  var clone = function (a) {
    var r = []
    var i = -1
    while (++i < a.length) {
      //console.log(i)
      r[i] = a[i]
    }
    return r
  }

  /**
   * 載入 gtag 程式碼
   * @param {*} tag
   * @param {*} callback
   */
  /*
   var loadGTag = function (tag, callback) {
      loadScript('https://www.googletagmanager.com/gtag/js?id=' + tag+'&l=accuGDL', function () {
        window.accuGDL = window.accuGDL || []
        function gtag () { 
          window.accuGDL.push(arguments) 
          dump( "DD->", clone(window.accuGDL))
        }
        gtag('js', new Date())
        gtag('config', tag)
        callback(gtag)
      })
    }
    */

  var loadGTag = function (tag, callback) {
    loadScript('https://www.googletagmanager.com/gtag/js?id=' + tag, function () {
      window.dataLayer = window.dataLayer || []
      //dump('loadFPC:',env.fpc)
      function gtag() {
        window.dataLayer.push(arguments)
        //dump( "DD->", clone(window.dataLayer))
      }
      gtag('js', new Date())
      gtag('config', tag)
      callback(gtag)
    })
  }
  //
  function showWebChat(objNo, status) {
    //document.domain = "pacific.com.tw";
    var _check_mobile = detectmob()
    _url =
      'https://irs.pacific.com.tw/wbc/check.php?fpc=' + fpc + '&objNo=' + objNo + '&auto=' + status
    if (_check_mobile) {
      _mobile_v = 'mobile'
      //alert(_url);
      window.open(_url, 'Webchat')
    } else {
      _mobile_v = 'pc'
      document.getElementById('foo').style.zIndex = 99999
      document.getElementById('foo').style.display = 'block'
      if (status != 'X') {
        document.getElementById('wbc').src = _url
      }
    }
  }
  function createWebChat(objNo, status, k) {
    //alert(objNo);
    //if ( fpc == "e2545a9067243abe0fd81cbc795f5d86-_JZJEPBS0M56GQ" || fpc =='04474a4ddedc2c185bcc5e7dd28d5673-_K5HNA2CEM4K7Z') {
    //_url = "https://bot-event.accunix.net/webchat_client/8991/chat_guest.html?fpc="+fpc+"&objNo="+objNo+"&auto_in=Y";
    if (k == 'create') {
      _url = 'https://irs.pacific.com.tw/wbc/check.php?status=create&fpc=' + fpc + '&objNo=' + objNo
      var div = document.createElement('div')
      div.innerHTML =
        '<div id="foo"><iframe id="wbc" src="' +
        _url +
        '" width="350px" height="550px" frameborder="0" scrolling="yes"></iframe></div>'
      document.body.appendChild(div)
    } else {
      if (status == 'hide') {
        document.getElementById('foo').style.zIndex = -1
        document.getElementById('foo').style.display = 'none'
      } else if (status == 'show') {
        document.getElementById('foo').style.zIndex = 99999
        document.getElementById('foo').style.display = 'block'
      }
    }

    //}
  }
  /**
   * 取得 meta 的 name=name 的 content attribute 值
   * @param {*} name
   */
  var getMetaContent = function (name) {
    var attr = document.getElementsByTagName('meta')[name]
    return attr ? attr.getAttribute('content') : null
  }

  /**
   * 取得第一個 name=name  input 的值
   * @param {*} name
   */
  var getInputValue = function (name) {
    var elm = document.querySelector('input[name="' + name + '"]')
    return elm ? elm.value : null
  }

  /**
   * 取得第一個名稱等於 name 的 input 元件
   * @param {*} name
   */
  var getInputByName = function (name) {
    return document.querySelector('input[name="' + name + '"]') || {}
  }

  /**
   * 取得第一個該選擇的文字內容
   * @param {*} name
   */
  var getElmText = function (name) {
    var elm = document.querySelector(name)
    return elm ? elm.innerText : null
  }

  /**
   * 取得所有該選擇的文字內容
   * @param {*} name
   */
  var getAllElmText = function (name) {
    var elms = document.querySelectorAll(name)
    var results = []
    for (var i = 0, len = elms.length; i < len; i++) {
      results.push(elms[i].innerText)
    }
    return results
  }

  /**
   * 取得checkbox checked 的值
   * @param {*} name
   */
  var getCheckedValue = function (ary) {
    for (var i = 0, len = ary.length; i < len; i++) {
      var e = getInputByName(ary[i])
      if (e.checked) return e.value
    }
  }

  /**
   * 封裝綁定 'touchstart' or 'click' 的函式
   * @param {*} env
   * @param {*} event
   */
  var onClink = function (env, event) {
    return document.body.addEventListener(env.touch ? 'touchstart' : 'click', event, false)
  }
  var onMSG = function (env, event) {
    return document.body.addEventListener('message', event, false)
  }
  /**
   * 取得該 node 的父節點為 a tag 的 node 或
   * 若自己為 a tag 則傳回自己
   * @param {*} el
   */
  var getParentAnchor = function (el) {
    while (el) {
      //console.log("####",el)
      if (el.tagName === 'A') return el
      el = el.parentNode
    }
  }

  /**
   * 判斷瀏覽器與版本
   * 有些問題需改寫
   */
  var get_browser = function () {
    // eslint-disable-line
    var ua = navigator.userAgent
    var tem
    var M = ua.match(/(opera|chrome|safari|firefox|msie|trident(?=\/))\/?\s*(\d+)/i) || []

    if (/trident/i.test(M[1])) {
      tem = /\brv[ :]+(\d+)/g.exec(ua) || []
      return { name: 'IE', version: tem[1] || '' }
    }

    if (M[1] === 'Chrome') {
      tem = ua.match(/\bOPR|Edge\/(\d+)/)
      if (tem != null) return { name: 'Opera', version: tem[1] }
    }

    M = M[2] ? [M[1], M[2]] : [navigator.appName, navigator.appVersion, '-?']

    if ((tem = ua.match(/version\/(\d+)/i)) != null) {
      M.splice(1, 1, tem[1])
    }

    return {
      name: M[0],
      version: M[1]
    }
  }

  var getBrowser = function () {
    // var nVer = navigator.appVersion
    var nAgt = navigator.userAgent
    var browserName = navigator.appName
    var fullVersion = '' + parseFloat(navigator.appVersion)
    var majorVersion = parseInt(navigator.appVersion, 10)
    var nameOffset, verOffset, ix

    if ((verOffset = nAgt.indexOf('OPR/')) !== -1) {
      browserName = 'Opera'
      fullVersion = nAgt.substring(verOffset + 4)
    } else if ((verOffset = nAgt.indexOf('Opera')) !== -1) {
      browserName = 'Opera'
      fullVersion = nAgt.substring(verOffset + 6)
      if ((verOffset = nAgt.indexOf('Version')) !== -1) {
        fullVersion = nAgt.substring(verOffset + 8)
      }
    } else if ((verOffset = nAgt.indexOf('MSIE')) !== -1) {
      browserName = 'IE'
      fullVersion = nAgt.substring(verOffset + 5)
    } else if ((verOffset = nAgt.indexOf('Edge')) !== -1) {
      browserName = 'Edge'
      fullVersion = nAgt.substring(verOffset + 5)
    } else if ((verOffset = nAgt.indexOf('Chrome')) !== -1) {
      browserName = 'Chrome'
      fullVersion = nAgt.substring(verOffset + 7)
    } else if ((verOffset = nAgt.indexOf('Safari')) !== -1) {
      browserName = 'Safari'
      fullVersion = nAgt.substring(verOffset + 7)
      if ((verOffset = nAgt.indexOf('Version')) !== -1) {
        fullVersion = nAgt.substring(verOffset + 8)
      }
    } else if ((verOffset = nAgt.indexOf('Firefox')) !== -1) {
      browserName = 'Firefox'
      fullVersion = nAgt.substring(verOffset + 8)
    } else if ((nameOffset = nAgt.lastIndexOf(' ') + 1) < (verOffset = nAgt.lastIndexOf('/'))) {
      browserName = nAgt.substring(nameOffset, verOffset)
      fullVersion = nAgt.substring(verOffset + 1)
      if (browserName.toLowerCase() === browserName.toUpperCase()) {
        browserName = navigator.appName
      }
    }
    if ((ix = fullVersion.indexOf(';')) !== -1) {
      fullVersion = fullVersion.substring(0, ix)
    }
    if ((ix = fullVersion.indexOf(' ')) !== -1) {
      fullVersion = fullVersion.substring(0, ix)
    }

    majorVersion = parseInt('' + fullVersion, 10)
    if (isNaN(majorVersion)) {
      fullVersion = '' + parseFloat(navigator.appVersion)
      majorVersion = parseInt(navigator.appVersion, 10)
    }

    return {
      browser: browserName,
      version: fullVersion,
      major: majorVersion
    }
  }

  /**
   * 判斷是否為行動裝置
   * 已改寫,
   */
  var detectmob = function () {
    return /Mobi|Android|BlackBerry|Windows Phone/i.test(navigator.userAgent)
  }

  /**
   * 產生唯一碼
   * 原 genID().gen() 改為 genID()
   */
  var genID = (function () {
    var inner = []
    var unique = function (id) {
      return inner.indexOf(id) === -1 && id
    }

    return function () {
      var radix = 36
      var id = false
      while (!id) {
        id = unique(
          '_' +
            (Date.now().toString(radix) + Math.random().toString(radix).substr(2, 5)).toUpperCase()
        )
      }
      inner.push(id)
      return id
    }
  })()

  /**
   * 設定map, create Iframe and set cookie
   * @param {*} map
   */
  var setMapping = function (map) {
    var qs = makeSearchString(map.data)

    //console.log(ad2_element);
    //document.body.appendChild(mapp_element);

    var ifrm = createIframe(map.src + '?' + qs)
    d.body.appendChild(ifrm)
    setCookie(map.key, 'Y', '10')
  }

  /**
   * 產生 map 函式
   * @param {*} key
   */
  var makeMapping = function (key) {
    var map = Mapping[key]
    return function (tk, fr) {
      if (!tk) return
      var data = {}
      if (tk != null) data['tk'] = tk
      if (fr != null) data['fr'] = fr
      map['data'] = data
      setMapping(map)
    }
  }

  var Mapping = {
    aqV: {
      src: '',
      key: 'aqv'
    },
    aqM: {
      src: 'https://mapping.accunix.net/cdp_link.php',
      key: 'aqM'
    },
    aqE: {
      src: '',
      key: 'aqE'
    },
    aqG: {
      src: '',
      key: 'aqG'
    }
  }

  var getTK2 = function (qs) {
    return getValue('token', qs)
  }
  var getTK = function (qs) {
    return getValue('tk', qs)
  }
  var getAccuTK = function (qs) {
    return getValue('AccuTK', qs)
  }

  var mapping_volPrepareFrame = makeMapping('aqV') // eslint-disable-line
  var mapping_accuPrepareFrame = makeMapping('aqM') // eslint-disable-line
  var accuPrepareFrame = makeMapping('aqE')
  var prepareFrame = makeMapping('aqG')

  /**
   * 依路徑分類頁面
   * @param {*} env
   */

  var beaconList = [
    {
      name: 'showWebNotify',
      url: '',
      genData: function (env) {
        return function (a, b, c) {
          //
          var _PN = ''
          var title1 = ''
          var title2 = ''
          var picUrl = ''

          if (a) {
            title1 = a
          } else {
            title1 = '最新優惠報你知！即時熱門優惠訊息!'
          }
          if (b) {
            title2 = b
          } else {
            title2 = '最新產品優惠情報、熱門活動，即時訂閱讓你不錯失任何優惠訊息。'
          }
          if (c) {
            picUrl = c
          } else {
            picUrl = 'https://notify.accunix.net/discount.png'
          }
          var content = {
            text: 'Web notify Test',
            buttonText: '同意',
            buttonLink:
              'https://notify.accunix.net/' +
              env.hostname +
              '/?fpc=' +
              env.fpc +
              '&source=' +
              env.hostname,
            cookieExpiration: 30,
            cookieKey: 'cookieNotificationJun102018',
            googleAnalytics: true,
            left: screen.width / 2 - 500 / 2,
            top: screen.height / 2 - 500 / 2
          }

          var helloBar =
            '<div id="hellobar-bar" class="web-notify-wrapper"><div class="web-notify-content"><div class="web-notify-content-img"><img src="' +
            picUrl +
            '"></div><div class="web-notify-content-text"><div class="web-notify-content-title">' +
            title1 +
            '</div><div class="web-notify-content-discount">' +
            title2 +
            '</div></div><div class="web-notify-content-button"><a class="web-notify-content-cancel-button">取消</a><a onclick="window.open(\'' +
            content.buttonLink +
            "', 'Yahoo', config='height=500,width=500,top=" +
            content.top +
            ',left=' +
            content.left +
            '\');" class="web-notify-content-subscription-button">我要訂閱</a></div></div></div>'
          //
          _PN = getCookie('pushNotify')
          if (_PN != 'Y') {
            loadCSS('https://notify.accunix.net/notify.css')

            var element = document.createRange().createContextualFragment(helloBar)
            //console.log(element);
            document.body.appendChild(element)
            setCookie('pushNotify', 'Y')
            helloBarClose()
          }

          //
          return {
            fpc: env.fpc,
            clientIP: env.ip,
            t: Date.now()
          }
        }
      }
    },
    {
      name: 'beaconData',
      url: 'https://asia-northeast1-accuhit-tw-project.cloudfunctions.net/http-js4',
      genData: function (env) {
        return function (a, b) {
          return {
            fpc: env.fpc,
            member: b,
            mobile: env.mobile,
            clientIP: env.ip,
            t: Date.now()
          }
        }
      }
    },
    {
      name: 'beaconSend',
      url: 'https://kafka-api.accunix.net/cdp-rawevent',
      genData: function (env) {
        return function (a, b, c, d, e, f, g, h, i, j, k, l, m, n, o, p, q, r) {
          return {
            records: [
              {
                value: {
                  domain: env.host,
                  l_pathname: env.pathname,
                  fpc: env.fpc,
                  orgId: a,
                  orgType: b,
                  kind: c,
                  type: d,
                  col1: e,
                  col2: f,
                  col3: g,
                  col4: h,
                  col5: i,
                  col6: j,
                  col7: k,
                  col8: l,
                  col9: m,
                  col10: n,
                  col11: o,
                  col12: p,
                  col13: q,
                  col14: r,
                  t: Date.now()
                }
              }
            ]
          }
        }
      }
    },
    {
      name: 'beaconJS3_CF',
      url: 'https://asia-northeast1-accuhit-tw-project.cloudfunctions.net/http-js3-pub',
      genData: function (env) {
        return function (xIP, fpc) {
          console.log('###js3###', xIP)
          return {
            metaDesc: getMetaContent('description'),
            metaKeyword: getMetaContent('keywords'),
            referrer: env.ref,
            source: env.host,
            l_pathname: env.pathname,
            fpc: env.fpc,
            mobile: env.mobile,
            browser: env.browser,
            browserVersion: env.version,
            clientHeight: document.body.clientHeight
              ? document.body.clientHeight
              : document.documentElement.clientHeight,
            clientWidth: document.body.clientWidth,
            from: env.href,
            title: document.title,
            clientIP: env.ip,
            lineTK: env.AccuTK || '?', // ??
            ua: env.ua,
            t: Date.now(),
            muid: window.location.hostname == 'www.gewei-tw.com' ? getMetaContent('muid') : ''
          }
        }
      }
    },
    {
      name: 'beaconJS3',
      url: 'https://kafka-api.accunix.net/cdp-rawdata',
      genData: function (env) {
        return function (xIP, fpc) {
          //console.log("###js3###",xIP)
          return {
            records: [
              {
                value: {
                  metaDesc: getMetaContent('description'),
                  metaKeyword: getMetaContent('keywords'),
                  referrer: env.ref,
                  source: env.host,
                  l_pathname: env.pathname,
                  fpc: env.fpc,
                  mobile: env.mobile,
                  browser: env.browser,
                  browserVersion: env.version,
                  clientHeight: document.body.clientHeight
                    ? document.body.clientHeight
                    : document.documentElement.clientHeight,
                  clientWidth: document.body.clientWidth,
                  from: env.href,
                  title: document.title,
                  clientIP: env.ip,
                  lineTK: env.AccuTK || '?', // ??
                  ua: env.ua,
                  t: Date.now(),
                  muid: window.location.hostname == 'www.gewei-tw.com' ? getMetaContent('muid') : ''
                }
              }
            ]
          }
        }
      }
    },
    {
      name: 'beaconJS1',
      url: 'https://asia-northeast1-accuhit-tw-project.cloudfunctions.net/http-js1',
      genData: function (env) {
        return function (e) {
          var target = e ? e.target || {} : ''
          var alink = getParentAnchor(target)
          if (!alink) return

          var vw = e.view || {}
          var loc = vw.location || {}

          return {
            a_title: target.title || '',
            l_host: loc.host,
            l_pathname: loc.pathname,
            fpc: env.fpc,
            mobile: env.mobile,
            browser: env.browser,
            browserVersion: env.version,
            clientHeight: env.clientHeight,
            clientWidth: env.clientWidth,
            from: env.ref,
            title: env.title || '',
            condition: env.conditionData || '?',
            objNo: env.objNo || '?',
            objBuildPin: env.objBuildPin || '?',
            objLandPin: env.objLandPin || '?',
            type: 'type',
            elementType: 'link',
            href: alink.href || '',
            text: alink.text || '',
            t: Date.now()
          }
        }
      }
    }
  ]
  var daex_pixel = function (env) {
    var e = new Image(1, 1),
      c = Math.floor(new Date().getTime() / 1e3),
      d = document.createElement('div')
    d.style.height = '0'
    d.style.overflow = 'hidden'

    d.appendChild(e),
      (e.src = 'https://mapping.daexauto.com/daex_Pixel.php?tk=' + env.fpc + '&fr=' + env.hostname)
    document.querySelector('body').appendChild(d)

    console.log('AQ pixel test')
    //var ad2Pixel = '<img src="https://cm.ad2iction.com/sync?ad2_pid=ach02x&ad2_tpi=1&ad2_puid='+env.fpc+'&ad2_pus='+env.hostname+'" with="1" heigh="1" style="display: none;">';
    //var ad2_element = document.createRange().createContextualFragment(ad2Pixel);

    //document.body.appendChild(ad2_element);
  }
  var AD2_pixel = function (env) {
    var ad2Pixel =
      '<img src="https://cm.ad2iction.com/sync?ad2_pid=ach02x&ad2_tpi=1&ad2_puid=' +
      env.fpc +
      '&ad2_pus=' +
      env.hostname +
      '" with="1" heigh="1" style="display: none;">'

    var ad2_element = document.createRange().createContextualFragment(ad2Pixel)
    //console.log(ad2_element);
    document.body.appendChild(ad2_element)
  }
  var clickForce_mapping = function (env) {
    var e = new Image(1, 1),
      c = Math.floor(new Date().getTime() / 1e3),
      d = document.createElement('div')
    d.style.height = '0'
    d.style.overflow = 'hidden'
    var _url1 =
      'https://91tracker.accunix.net/clickforce_redirect.php?aq_id=' +
      env.fpc +
      '&aq_host=' +
      env.hostname
    var _url2 =
      'https://mapping.accunix.net/cf_test.php?aq_id=' + env.fpc + '&aq_host=' + env.hostname
    d.appendChild(e), (e.src = _url2)
    document.querySelector('body').appendChild(d)

    console.log('clickForce test')
  }

  var domainMappings = {
    allRun: function (env) {
      env.dos.beaconJS3('xxx')
      //env.dos.beaconJS3_CF('xxx');
      //daex_pixel(env)
      //AD2_pixel(env)
      const mapping = localStorage.getItem('mappingFpc')
      if (!mapping) {
        const href = location.href
        location.href = 'http://localhost:3000/trace?originHref=' + href
      }
    },
    syntrend: function (env) {
      console.log('##syntrend###')
      if (env.hostname !== 'www.syntrend.com.tw') return
      //clickForce_mapping(env);
    }
  }
  // env

  /**
   * 取得本機端 ip
   * @param {*} callback
   */
  /*  
    var hostIP = function (callback) {
      getR('json', '//ping.accunix.net/magic/ping', function () {
        if (this.status !== 200) return callback && callback()
        callback && callback(this.response.ip)
      })
    }
*/
  var hostIP = function (callback) {
    getR('text', '//cloudflare.com/cdn-cgi/trace', function () {
      if (this.status !== 200) return callback && callback()
      //callback && callback(this.response.ip)
      callback && callback(getIP(this.response))
    })
  }
  var getIP = function (text) {
    var pairs = (text || '' || '').split(/[\n\r]/)
    for (var i = 0, len = pairs.length; i < len; i++) {
      var pair = pairs[i].split('=')
      if (pair[0] === 'ip') return pair[1]
    }
  }

  /**
   * 取得 fpc
   * @param {*} callback
   */
  var fpc = function (callback) {
    var key = 'fpc'
    var ck = function (done) {
      var value = appraiseCK(key)
      done(value)
    }
    var ls = function (done) {
      var value = appraiseLS(key)
      done(value)
    }
    var idb = function (done) {
      appraiseIDB('fpc', done)
    }
    var fp = function (done) {
      new Fingerprint2().get(function (result) {
        // eslint-disable-line
        var rid = genID()
        done(result ? result + '-' + rid : 'accutracker' + rid + '-' + rid)
      })
    }

    executer([ck, ls, idb, fp], function (results) {
      // cookie, localStorage, indexedDB, Fingerprint2
      var fpc = ''
      for (var i = 0, len = results.length; i < len && !fpc; i++) {
        fpc = results[i]
      }
      callback(fpc)
    })
  }

  /**
   * 設定 fpc
   * @param {*} value
   */
  var refreshFPC = function (value) {
    var key = 'fpc'
    appraiseCK(key, value)
    appraiseLS(key, value)
    appraiseIDB(key, value)
  }

  // executer
  var executer = function (actors, callback) {
    var i = -1
    var items = []
    var notyet = actors.length

    var update = function (item, index) {
      return function (value) {
        items[index] = value
        notyet--
      }
    }

    var feedback = function () {
      if (notyet) return setTimeout(feedback, 10)
      callback(items)
    }

    var run = function () {
      i += 1
      if (i >= actors.length) return feedback()
      var method = actors[i]
      if (method && isFunction(method)) method(update(method, i))
      run()
    }

    run()
  }

  var execMappings = function (env, obj) {
    // var obj = domainMappings
    for (var key in obj) {
      if (isProp(obj, key)) {
        var func = obj[key]
        isFunction(func) && func(env)
      }
    }
  }

  var fillBeacon = function (env, beacon) {
    return function () {
      var args = Array.prototype.slice.call(arguments)
      var fn = beacon.genData(env)
      var data = fn.apply(this, args)
      postR(beacon.url, data)
    }
  }

  var setBeacon = function (env, list) {
    var result = {}
    for (var i = 0, len = list.length; i < len; i++) {
      var beacon = list[i]
      result[beacon.name] = fillBeacon(env, beacon)
    }
    return result
  }

  var defaultALinkEvent = function (env) {
    return function (e) {
      var alink = getParentAnchor(e.target)
      if (!alink) return

      var vw = e.view || {}
      var loc = vw.location || {}

      /* eslint-disable */
      var data = {
        a_title: alink.title || '',
        l_host: loc.host || '',
        l_pathname: loc.pathname || '',
        fpc: env.fpc,
        mobile: env.mobile,
        browser: env.browser,
        browserVersion: env.version,
        clientHeight: env.clientHeight,
        clientWidth: env.clientWidth,
        from: env.ref,
        title: env.title,
        condition: env.conditionData || 'conditionData?',
        objNo: env.objNo || 'objNo?',
        objBuildPin: env.objBuildPin || 'objBuildPin?',
        objLandPin: env.objLandPin || 'objLandPin?',
        type: 'type',
        elementType: 'link',
        href: alink.href || '',
        text: alink.text || '',
        tp: tjSecond(),
        cl: env.href,
        t: Date.now()
      }
      /* eslint-enable */

      var url = 'https://asia-northeast1-accuhit-tw-project.cloudfunctions.net/http-js1'
      //postR(url, data)
    }
  }

  // main
  var init = function () {
    try {
      executer([hostIP, fpc], function (results) {
        // var env = 'xa' // ignore
        var loc = window.location || {}
        var bs = getBrowser()
        var mood = {
          ip: results[0] || '',
          fpc: results[1] || '',
          domain: goodDomain() || '',
          host: loc.host || '',
          href: loc.href || '',
          hostname: loc.hostname || '',
          pathname: loc.pathname || '',
          mobile: detectmob() ? 'mobile' : 'pc',
          browser: bs.browser,
          version: bs.version,
          ua: window.navigator.userAgent,
          ref: document.referrer,
          touch: !!(
            'ontouchstart' in window ||
            window.navigator.maxTouchPoints ||
            window.navigator.msMaxTouchPoints
          ),
          clientHeight:
            (document.body.clientHeight
              ? document.body.clientHeight
              : document.documentElement.clientHeight) || 0,
          clientWidth: document.body.clientWidth || 0,
          title: document.title || '',
          tk: getTK(loc.search) || '',
          tk2: getTK2(loc.search) || '',
          AccuTK: getAccuTK(loc.search) || '',
          aqG: getCookie('aqG') === 'Y',
          aqE: getCookie('aqE') === 'Y'
        }

        //dump('@@', JSON.stringify(mood, null, 4)) // print env

        // set fpc to any
        refreshFPC(mood.fpc)

        // demo: set window param
        // var env='env'
        // window['tjSecond'] = tjSecond

        // init dos
        var dos = setBeacon(mood, beaconList)
        // release dos to window
        window['dos'] = mood['dos'] = dos // set dos to window

        window['fpc'] = mood.fpc

        // exec mapping at domainMappings
        execMappings(mood, domainMappings)

        // set default aLink Event
        var clickEvent = defaultALinkEvent(mood)
        onClink(mood, clickEvent)

        // do something
      })
    } catch (e) {
      dump('eee', e) // debug out
    }
  }
  if (!window['_aq']) {
    window['_aq'] = 1
    window.addEventListener('DOMContentLoaded', init)
  }
  //window.addEventListener('DOMContentLoaded',init)
})(window, document)
