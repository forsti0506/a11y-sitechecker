import { jest } from '@jest/globals';
import { TextEncoder, TextDecoder } from 'util';

jest.setTimeout(150000); // in milliseconds

Object.assign(global, { TextDecoder, TextEncoder });
