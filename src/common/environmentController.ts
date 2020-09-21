import { Environment, DocsRepoType } from '../shared';

export interface EnvironmentController {
    env: Environment;
    docsRepoType: DocsRepoType;
    debugMode: boolean;
    enableSignRecommendHint: boolean;
}