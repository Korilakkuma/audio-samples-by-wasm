'use strict';

document.getElementById('select-audio').addEventListener('change', (event) => {
  onSelectAudio(event);
}, false);

const audiocontext = new AudioContext();
const processor    = audiocontext.createScriptProcessor(2048, 2, 2);

async function onSelectAudio(event) {
  processor.onaudioprocess = null;
  processor.disconnect(0);

  const value = event.currentTarget.value;

  if (value === '') {
    return;
  }

  const args = value.split(' ');

  try {
    const response    = await fetch(`./wasm/${args[0]}.wasm`)
    const arrayBuffer = await response.arrayBuffer();
    const module      = await WebAssembly.compile(arrayBuffer);

    const imports = {};

    imports.env = {};
    imports.env.memoryBase = 0;
    imports.env.tableBase  = 0;

    if (!imports.env.memory) {
      imports.env.memory = new WebAssembly.Memory({ initial: 256, maximum: 256 });
    }

    if (!imports.env.table) {
      imports.env.table = new WebAssembly.Table({ initial: 1, maximum : 1, element: 'anyfunc' });
    }

    imports.env.__syscall2 = () => {};
    imports.env.__lock = () => {};
    imports.env.__unlock = () => {};
    imports.env.__handle_stack_overflow = () => {};
    imports.env.emscripten_resize_heap = () => {};
    imports.env.time = () => {};

    const { instance } = await WebAssembly.instantiate(arrayBuffer, imports);

    startAudio(instance, args[1]);
  } catch (e) {
    console.error(e);
  }
}

async function startAudio(instance, type) {
  try {
    await audiocontext.resume();

    const bufferSize = processor.bufferSize;

    processor.connect(audiocontext.destination);

    processor.onaudioprocess = (event) => {
      const inputLs  = event.inputBuffer.getChannelData(0);
      const inputRs  = event.inputBuffer.getChannelData(1);
      const outputLs = event.outputBuffer.getChannelData(0);
      const outputRs = event.outputBuffer.getChannelData(1);

      for (let i = 0; i < bufferSize; i++) {
        let output = 0;

        switch (type) {
          case 'whitenoise':
            output = instance.exports.whitenoise();
            break;
          case 'pinknoise':
            output = instance.exports.pinknoise();
            break;
          case 'browniannoise':
            output = instance.exports.browniannoise();
            break;
          default:
            break;
        }

        outputLs[i] = output;
        outputRs[i] = output;
      }
    }
  } catch (e) {
    console.error(e);
  }
}