import StreamJSON from 'stream-json';
import Assembler from 'stream-json/Assembler.js';
import { Readable } from 'node:stream';

const { parser } = StreamJSON;

/**
 * Streaming JSON parser that works with Express raw body
 * Uses stream-json Assembler to parse without loading entire payload as string
 *
 * @param {Buffer|Stream} input - Raw buffer or stream from Express
 * @returns {Promise<Object>} Parsed JSON object
 */
async function parseStreamJSON(input) {
  return new Promise((resolve, reject) => {
    const inputStream = Buffer.isBuffer(input) ? Readable.from(input) : input;
    const asm = Assembler.connectTo(inputStream.pipe(parser()));

    asm.on('done', (assembler) => {
      resolve(assembler.current);
    });

    asm.on('error', (error) => {
      reject(error);
    });
  });
}

export default {
  parseStreamJSON
};
