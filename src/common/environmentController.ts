import { Environment, DocsRepoType } from '../shared';

export interface EnvironmentController {
    env: Environment;
    docsRepoType: DocsRepoType;
    debugMode: boolean;
    enableSignRecommendHint: boolean;
    userType: UserType;
}

export enum UserType {
    InternalEmployee = "Microsoft Internal Employee",
    PublicContributor = "Public Contributor",
    Unknow = ""

}