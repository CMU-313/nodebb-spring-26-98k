'use strict';

const user = require('../../user');
const authenticationController = require('../authentication');
const helpers = require('../helpers');
const llmTranslateService = require('./llmTranslate');

const Utilities = module.exports;

Utilities.ping = {};
Utilities.ping.get = (req, res) => {
	helpers.formatApiResponse(200, res, {
		pong: true,
	});
};

Utilities.ping.post = (req, res) => {
	helpers.formatApiResponse(200, res, {
		uid: req.user.uid,
		received: req.body,
	});
};

Utilities.login = (req, res) => {
	res.locals.redirectAfterLogin = async (req, res) => {
		const userData = (await user.getUsers([req.uid], req.uid)).pop();
		helpers.formatApiResponse(200, res, userData);
	};
	res.locals.noScriptErrors = (req, res, err, statusCode) => {
		helpers.formatApiResponse(statusCode, res, new Error(err));
	};

	authenticationController.login(req, res);
};

Utilities.llmTranslate = async (req, res) => {
	const content = String(req.body.content || '').trim();

	if (!content) {
		helpers.formatApiResponse(400, res, new Error('[[error:invalid-data]]'));
		return;
	}

	try {
		const translated = await llmTranslateService.translateText(content);

		helpers.formatApiResponse(200, res, {
			provider: 'ollama',
			translated,
		});
	} catch (err) {
		console.error('Translation error:', err);
		helpers.formatApiResponse(503, res, new Error(`Translation failed: ${err.message || 'Unknown error'}`));
	}
};
