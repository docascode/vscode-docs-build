export interface BuildInput {
    readonly workspaceFolderName: string;
    readonly localRepositoryPath: string;
    readonly localRepositoryUrl: string;
    readonly originalRepositoryUrl: string;
    readonly outputFolderPath: string;
    readonly logPath: string;
    readonly dryRun: boolean;
    readonly port: number;
}

export enum BuildType {
    FullBuild = 'FullBuild',
    PartialBuild = 'PartialBuild'
}