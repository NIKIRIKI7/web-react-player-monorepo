/** @type {import('dependency-cruiser').IConfiguration} */
module.exports = {
  forbidden: [
    {
      name: 'no-circular',
      severity: 'error',
      comment: 'Запрещены любые циклические зависимости в проекте',
      from: {},
      to: { circular: true },
    },
    {
      name: 'core-must-not-depend-on-ui',
      severity: 'error',
      comment: 'Core пакет не может импортировать UI пакет',
      from: { path: '^packages/core' },
      to: { path: '^packages/ui' },
    },
    {
      name: 'core-must-not-depend-on-react',
      severity: 'error',
      comment: 'Core пакет должен быть framework-agnostic и не знать о React',
      from: { path: '^packages/core' },
      to: { path: 'react|react-dom' },
    },
  ],
  options: {
    doNotFollow: {
      path: 'node_modules',
    },
    tsPreCompilationDeps: true,
    tsConfig: {
      fileName: 'tsconfig.base.json',
    },
  },
};
