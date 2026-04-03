'use strict';

const assert = require('assert');
const llm = require('../src/controllers/write/llmTranslate');

describe('LLM translation service', () => {
	let originalFetch;

	before(() => {
		originalFetch = global.fetch;
	});

	after(() => {
		global.fetch = originalFetch;
	});

	it('detects probably English text and skips API call', async () => {
		const translated = await llm.translateText('Hello, how are you?');
		assert.strictEqual(translated, 'Hello, how are you?');
	});

	it('translates non-English input using mock Ollama response', async () => {
		global.fetch = async () => ({
			ok: true,
			json: async () => ({ message: { content: 'Hello from translation' } }),
		});

		const translated = await llm.translateText('hola');
		assert.strictEqual(translated, 'Hello from translation');
	});

	it('returns source when Ollama response is empty', async () => {
		global.fetch = async () => ({
			ok: true,
			json: async () => ({}),
		});

		const source = 'bonjour';
		const translated = await llm.translateText(source);
		assert.strictEqual(translated, source);
	});

	it('throws when Ollama endpoint is unavailable', async () => {
		global.fetch = async () => { throw new Error('ECONNREFUSED'); };

		await assert.rejects(
			async () => { await llm.translateText('hola'); },
			{ message: /Ollama request failed: ECONNREFUSED/ }
		);
	});

	it('throws on non-OK Ollama response status', async () => {
		global.fetch = async () => ({
			ok: false,
			status: 502,
			text: async () => '{"error":"bad gateway"}',
		});

		await assert.rejects(
			async () => { await llm.translateText('hola'); },
			{ message: /Ollama API error: 502/ }
		);
	});
});
