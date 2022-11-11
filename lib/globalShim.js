if (typeof globalThis.btoa === 'undefined') {
  const { btoa, atob } = require('abab')
  Object.defineProperty(globalThis, 'btoa', {
    value: btoa,
    enumerable: false,
    configurable: true,
    writable: true
  })
  Object.defineProperty(globalThis, 'atob', {
    value: atob,
    enumerable: false,
    configurable: true,
    writable: true
  })
}
