'use strict';

const assert = require('assert');
const db = require('./mocks/databasemock');

const topics = require('../src/topics');
const posts = require('../src/posts');
const categories = require('../src/categories');
const user = require('../src/user');
const groups = require('../src/groups');
const privileges = require('../src/privileges');
const apiTopics = require('../src/api/topics');

describe('Topic Status Tracking', () => {
	let adminUid;
	let regularUid;
	let category;
	let topic;

	before(async () => {
		// Create test users
		adminUid = await user.create({ username: 'statusadmin', password: '123456' });
		regularUid = await user.create({ username: 'statususer', password: '123456' });

		// Make admin user an administrator
		await groups.join('administrators', adminUid);

		// Create test category
		category = await categories.create({
			name: 'Test Category',
			description: 'Test category for status tests',
		});

		// Give privileges
		await privileges.categories.give(['groups:topics:create', 'groups:topics:reply', 'groups:topics:read'], category.cid, 'registered-users');
	});

	describe('Default Status on Topic Creation', () => {
		it('should create new topics with "unanswered" status by default', async () => {
			const result = await topics.post({
				uid: regularUid,
				cid: category.cid,
				title: 'Test Topic for Default Status',
				content: 'This topic should have unanswered status',
			});

			const status = await topics.getStatus(result.topicData.tid);
			assert.strictEqual(status, 'unanswered');
		});

		it('should return unanswered status when retrieving topic data', async () => {
			const result = await topics.post({
				uid: regularUid,
				cid: category.cid,
				title: 'Another Test Topic',
				content: 'Testing status in topic data',
			});

			const topicData = await topics.getTopicData(result.topicData.tid);
			assert.strictEqual(topicData.status, 'unanswered');
		});
	});

	describe('Status Update Functions', () => {
		beforeEach(async () => {
			const result = await topics.post({
				uid: regularUid,
				cid: category.cid,
				title: 'Test Topic',
				content: 'Test content',
			});
			topic = result.topicData;
		});

		it('should update status to "answered"', async () => {
			await topics.setStatus(topic.tid, 'answered');
			const status = await topics.getStatus(topic.tid);
			assert.strictEqual(status, 'answered');
		});

		it('should update status to "resolved"', async () => {
			await topics.setStatus(topic.tid, 'resolved');
			const status = await topics.getStatus(topic.tid);
			assert.strictEqual(status, 'resolved');
		});

		it('should change status from answered to resolved', async () => {
			await topics.setStatus(topic.tid, 'answered');
			let status = await topics.getStatus(topic.tid);
			assert.strictEqual(status, 'answered');

			await topics.setStatus(topic.tid, 'resolved');
			status = await topics.getStatus(topic.tid);
			assert.strictEqual(status, 'resolved');
		});

		it('should reject invalid status values', async () => {
			await assert.rejects(
				topics.setStatus(topic.tid, 'invalid')
			);
		});

		it('should reject empty status', async () => {
			await assert.rejects(
				topics.setStatus(topic.tid, '')
			);
		});

		it('should handle status with extra whitespace', async () => {
			await assert.rejects(
				topics.setStatus(topic.tid, ' answered ')
			);
		});
	});

	describe('Bulk Status Retrieval', () => {
		it('should retrieve status for multiple topics', async () => {
			const result1 = await topics.post({
				uid: regularUid,
				cid: category.cid,
				title: 'Topic 1',
				content: 'Content 1',
			});

			const result2 = await topics.post({
				uid: regularUid,
				cid: category.cid,
				title: 'Topic 2',
				content: 'Content 2',
			});

			const result3 = await topics.post({
				uid: regularUid,
				cid: category.cid,
				title: 'Topic 3',
				content: 'Content 3',
			});

			await topics.setStatus(result1.topicData.tid, 'answered');
			await topics.setStatus(result2.topicData.tid, 'resolved');
			// result3 keeps default 'unanswered'

			const statuses = await topics.getTopicsStatus([
				result1.topicData.tid,
				result2.topicData.tid,
				result3.topicData.tid,
			]);

			assert.strictEqual(statuses[0], 'answered');
			assert.strictEqual(statuses[1], 'resolved');
			assert.strictEqual(statuses[2], 'unanswered');
		});

		it('should return empty array for empty input', async () => {
			const statuses = await topics.getTopicsStatus([]);
			assert(Array.isArray(statuses));
			assert.strictEqual(statuses.length, 0);
		});
	});

	describe('API Endpoint', () => {
		beforeEach(async () => {
			const result = await topics.post({
				uid: adminUid,
				cid: category.cid,
				title: 'Test Topic for API',
				content: 'Test content',
			});
			topic = result.topicData;
		});

		it('should update status via API', async () => {
			const result = await apiTopics.updateStatus({ uid: adminUid }, {
				tid: topic.tid,
				status: 'resolved',
			});

			assert.strictEqual(result.status, 'resolved');

			const actualStatus = await topics.getStatus(topic.tid);
			assert.strictEqual(actualStatus, 'resolved');
		});

		it('should reject update without status field', async () => {
			await assert.rejects(
				apiTopics.updateStatus({ uid: adminUid }, {
					tid: topic.tid,
				})
			);
		});

		it('should reject invalid status via API', async () => {
			await assert.rejects(
				apiTopics.updateStatus({ uid: adminUid }, {
					tid: topic.tid,
					status: 'invalid',
				})
			);
		});

		it('should reject status update without edit privileges', async () => {
			// Create a topic owned by admin
			const adminTopic = await topics.post({
				uid: adminUid,
				cid: category.cid,
				title: 'Admin Topic',
				content: 'Admin content',
			});

			// Try to update as regular user (who doesn't own it)
			await assert.rejects(
				apiTopics.updateStatus({ uid: regularUid }, {
					tid: adminTopic.topicData.tid,
					status: 'resolved',
				})
			);
		});

		it('should allow topic owner to update status', async () => {
			// Regular user creates their own topic
			const ownTopic = await topics.post({
				uid: regularUid,
				cid: category.cid,
				title: 'User Topic',
				content: 'User content',
			});

			// Should succeed since they own it
			const result = await apiTopics.updateStatus({ uid: regularUid }, {
				tid: ownTopic.topicData.tid,
				status: 'resolved',
			});

			assert.strictEqual(result.status, 'resolved');
		});
	});

	describe('Data Persistence', () => {
		it('should persist status across topic retrieval', async () => {
			const result = await topics.post({
				uid: regularUid,
				cid: category.cid,
				title: 'Persistence Test',
				content: 'Testing persistence',
			});

			await topics.setStatus(result.topicData.tid, 'answered');

			// Retrieve topic multiple times
			const topicData1 = await topics.getTopicData(result.topicData.tid);
			const topicData2 = await topics.getTopicData(result.topicData.tid);

			assert.strictEqual(topicData1.status, 'answered');
			assert.strictEqual(topicData2.status, 'answered');
		});
	});

	describe('Edge Cases', () => {
		it('should handle non-existent topic gracefully', async () => {
			const status = await topics.getStatus(999999);
			// Should return null or undefined for non-existent topic
			assert(!status || status === 'unanswered');
		});

		it('should handle concurrent status updates', async () => {
			const result = await topics.post({
				uid: regularUid,
				cid: category.cid,
				title: 'Concurrent Test',
				content: 'Testing concurrency',
			});

			// Update status concurrently
			await Promise.all([
				topics.setStatus(result.topicData.tid, 'answered'),
				topics.setStatus(result.topicData.tid, 'resolved'),
			]);

			const status = await topics.getStatus(result.topicData.tid);
			// Should have one of the two values (last write wins)
			assert(['answered', 'resolved'].includes(status));
		});
	});

	after(async () => {
		await db.emptydb();
	});
});