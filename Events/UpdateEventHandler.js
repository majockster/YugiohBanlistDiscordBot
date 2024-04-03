const EventEmitter = require('events')

let flag = false
const emitter = new EventEmitter()

function setVariable(newValue){
    if (newValue != flag){
        flag = newValue
        emitter.emit('change', newValue)
    }
}

module.exports = { emitter, setVariable }
