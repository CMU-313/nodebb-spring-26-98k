'use strict';

const DEFAULT_OLLAMA_URL = 'http://localhost:11434';
const DEFAULT_OLLAMA_MODEL = process.env.OLLAMA_MODEL || 'qwen3:0.6b';



const COMMON_ENGLISH_WORDS = new Set([
	'the', 'be', 'to', 'of', 'and', 'a', 'in', 'that', 'have', 'I',
	'it', 'for', 'not', 'on', 'with', 'he', 'as', 'you', 'do', 'at',
	'this', 'but', 'his', 'by', 'from', 'they', 'we', 'say', 'her', 'she',
	'or', 'an', 'will', 'my', 'one', 'all', 'would', 'there', 'their', 'what',
	'so', 'up', 'out', 'if', 'about', 'who', 'get', 'which', 'go', 'me', 'when',
	'make', 'can', 'like', 'time', 'no', 'just', 'him', 'know', 'take', 'people',
	'into', 'year', 'your', 'good', 'some', 'could', 'them', 'see', 'other', 'than',
	'then', 'now', 'look', 'only', 'come', 'its', 'over', 'think', 'also', 'back',
	'after', 'use', 'two', 'how', 'our', 'work', 'first', 'well', 'way', 'even',
	'new', 'want', 'because', 'any', 'these', 'give', 'day', 'most', 'us',
]);

function isProbablyEnglish(text) {
	if (!text || !text.trim()) {
		return true;
	}

	const cleaned = text.toLowerCase().replace(/[^a-z\s]/g, ' ');
	const tokens = cleaned.split(/\s+/).filter(Boolean);
	if (!tokens.length) {
		return true;
	}

	const englishMatches = tokens.filter(t => COMMON_ENGLISH_WORDS.has(t)).length;
	return englishMatches / tokens.length >= 0.3;
}

function parseOllamaResponse(data) {
	if (!data || typeof data !== 'object') {
		return null;
	}

	if (data.message && typeof data.message.content === 'string') {
		return data.message.content.trim();
	}

	if (typeof data.response === 'string') {
		return data.response.trim();
	}

	if (data.response && typeof data.response.translated === 'string') {
		return data.response.translated.trim();
	}

	if (data.output && Array.isArray(data.output) && data.output[0] && typeof data.output[0].content === 'string') {
		return data.output[0].content.trim();
	}

	return null;
}

async function translateText(content) {
	const text = String(content || '').trim();
	if (!text) {
		return '';
	}

	if (isProbablyEnglish(text)) {
		return text;
	}

	const ollamaUrl = (process.env.OLLAMA_URL || DEFAULT_OLLAMA_URL).replace(/\/+$/, '');
	const ollamaModel = process.env.OLLAMA_MODEL || DEFAULT_OLLAMA_MODEL;

	const endpoint = `${ollamaUrl}/api/chat`;

	const payload = {
		model: ollamaModel,
		messages: [
			{
				role: 'system',
				content: 'You are a translator. Translate the user input to English. Return ONLY the English translation.',
			},
			{
				role: 'user',
				content: text,
			},
		],
		stream: false,
	};

	let response;
	try {
		response = await fetch(endpoint, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
			},
			body: JSON.stringify(payload),
		});
	} catch (err) {
		// Ollama unavailable, return original text
		return text;
	}

	if (!response.ok) {
		// Ollama error, return original text
		return text;
	}
	

	let body;
	try {
		body = await response.json();
	} catch (err) {
		// Invalid JSON response, return original text
		return text;
	}

	const translated = parseOllamaResponse(body);

	if (!translated) {
		return text;
	}

	return translated;
}

module.exports = {
	isProbablyEnglish,
	parseOllamaResponse,
	translateText,
};
