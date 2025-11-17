import { describe, it, expect, jest } from '@jest/globals';
import { Readable } from 'node:stream';
import Assembler from 'stream-json/Assembler.js';
import streamJSONParser from './index.js';

const { parseStreamJSON } = streamJSONParser;

describe('stream-json-parser', () => {
  describe('parseStreamJSON', () => {
    it('should parse JSON from Buffer input', async () => {
      const data = { test: 'data', number: 123, nested: { key: 'value' } };
      const buffer = Buffer.from(JSON.stringify(data));

      const result = await parseStreamJSON(buffer);

      expect(result).toEqual(data);
    });

    it('should parse JSON from Stream input', async () => {
      const data = { stream: 'test', array: [1, 2, 3] };
      const stream = Readable.from(JSON.stringify(data));

      const result = await parseStreamJSON(stream);

      expect(result).toEqual(data);
    });

    it('should handle complex nested JSON structures', async () => {
      const data = {
        users: [
          { id: 1, name: 'User 1' },
          { id: 2, name: 'User 2' }
        ],
        metadata: { count: 2 }
      };
      const buffer = Buffer.from(JSON.stringify(data));

      const result = await parseStreamJSON(buffer);

      expect(result).toEqual(data);
    });

    it('should handle array JSON structures', async () => {
      const data = [1, 2, 3, 4, 5];
      const buffer = Buffer.from(JSON.stringify(data));

      const result = await parseStreamJSON(buffer);

      expect(result).toEqual(data);
    });

    it('should reject when assembler emits error', async () => {
      const buffer = Buffer.from('{}');

      const mockAssembler = {
        on: jest.fn((event, handler) => {
          if (event === 'error') {
            setTimeout(() => handler(new Error('Parse error')), 0);
          }
          return mockAssembler;
        })
      };

      jest.spyOn(Assembler, 'connectTo').mockReturnValue(mockAssembler);

      await expect(parseStreamJSON(buffer)).rejects.toThrow('Parse error');

      Assembler.connectTo.mockRestore();
    });
  });

  describe('module exports', () => {
    it('should export parseStreamJSON function', () => {
      expect(streamJSONParser.parseStreamJSON).toBeDefined();
      expect(typeof streamJSONParser.parseStreamJSON).toBe('function');
    });
  });
});

