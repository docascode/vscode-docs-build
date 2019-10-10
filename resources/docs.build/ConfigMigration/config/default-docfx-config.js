'use strict';

module.exports = {
  name: null,
  product: null,
  files: null,
  exclude: null,
  output: {
    pdf: false
  },
  baseUrl: "https://docs.microsoft.com",
  documentId: {
    sourceBasePath: '.'
  },
  globalMetadata: null,
  routes: null,
  monikerRange: null,
  fileGroups: null,
  customErrors: {
    "circular-reference": "error",
    "include-not-found": "error"
  },
  contribution: {
    repository: null,
    excludeContributors: null
  },
  template: null,
  dependencies: null,
  resolveAlias: { "~": "." },
  fileMetadata: null,
  redirections: null
}
