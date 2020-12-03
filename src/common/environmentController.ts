import { Environment, DocsRepoType, UserType } from '../shared';

export interface EnvironmentController {
    env: Environment;
    docsRepoType: DocsRepoType;
    debugMode: boolean;
    enableSignRecommendHint: boolean;
    userType: UserType;
}