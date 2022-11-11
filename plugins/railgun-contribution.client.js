import { contribute, verify } from '@/lib/railgun-advanced-contribution/contribute.js'
global.Buffer = global.Buffer || require('buffer').Buffer

export default ({ store, isHMR, app }, inject) => {
  inject('contributor', main)
}
function main() {
  return { contribute, verify }
}
