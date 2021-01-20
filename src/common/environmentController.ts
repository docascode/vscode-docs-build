import { DocsRepoType, Environment, UserType } from '../shared';

export interface EnvironmentController {
    env: Environment;
    docsRepoType: DocsRepoType;
    debugMode: boolean;
    userType: UserType;
    enableAutomaticRealTimeValidation: boolean;
}