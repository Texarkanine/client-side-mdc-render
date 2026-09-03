import { test } from 'node:test';
import assert from 'node:assert/strict';
import { injectCss } from './gm-compat.js';

function fakeDocument({ head = true } = {}) {
	const created = [];
	const parent = {
		children: [],
		appendChild(el) {
			this.children.push(el);
			return el;
		},
	};
	const documentElement = {
		children: [],
		appendChild(el) {
			this.children.push(el);
			return el;
		},
	};
	return {
		created,
		head: head ? parent : null,
		documentElement,
		createElement(tagName) {
			const el = { tagName, textContent: '' };
			created.push(el);
			return el;
		},
	};
}

test('injectCss uses GM_addStyle when it is a function', () => {
	const calls = [];
	const document = fakeDocument();
	const result = injectCss('.x { color: red; }', {
		addStyle: (css) => {
			calls.push(css);
			return 'granted';
		},
		document,
	});
	assert.equal(result, 'granted');
	assert.deepEqual(calls, ['.x { color: red; }']);
	assert.equal(document.created.length, 0);
	assert.equal(document.head.children.length, 0);
});

test('injectCss appends a style element to document.head when GM_addStyle is missing', () => {
	const document = fakeDocument();
	const result = injectCss('.x { color: red; }', { document });
	assert.equal(result.tagName, 'style');
	assert.equal(result.textContent, '.x { color: red; }');
	assert.deepEqual(document.head.children, [result]);
	assert.equal(document.documentElement.children.length, 0);
});

test('injectCss appends to documentElement when head is missing', () => {
	const document = fakeDocument({ head: false });
	const result = injectCss('body { margin: 0; }', { document });
	assert.equal(result.tagName, 'style');
	assert.equal(result.textContent, 'body { margin: 0; }');
	assert.deepEqual(document.documentElement.children, [result]);
});
