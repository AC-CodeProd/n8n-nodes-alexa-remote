import { configWithoutCloudSupport } from '@n8n/node-cli/eslint';

export default [
  ...configWithoutCloudSupport,
  {
    files: ['package.json'],
    rules: {
      // alexa-remote2 and alexa-cookie2 are unique runtime deps not shared with n8n;
      // the build tool does not bundle them, so they must remain in dependencies.
      '@n8n/community-nodes/no-runtime-dependencies': 'off',
    },
  },
];
