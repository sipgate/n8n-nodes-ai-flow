module.exports = {
	preset: 'ts-jest',
	testEnvironment: 'node',
	testMatch: ['**/test/**/*.test.ts'],
	testPathIgnorePatterns: ['/node_modules/', '/dist/'],
	collectCoverageFrom: [
		'nodes/**/*.node.ts',
		'!nodes/**/test/**',
		'!**/node_modules/**',
		'!**/dist/**',
	],
	coverageDirectory: 'coverage',
	coverageReporters: ['text', 'lcov', 'html'],
	moduleFileExtensions: ['ts', 'js', 'json'],
	transform: {
		'^.+\\.ts$': ['ts-jest', {
			tsconfig: {
				esModuleInterop: true,
				allowSyntheticDefaultImports: true,
			},
		}],
	},
};
