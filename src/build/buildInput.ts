export interface BuildInput {
    readonly workspaceFolderName: string;
    readonly buildType: BuildType;
    readonly localRepositoryPath: string;
    readonly localRepositoryUrl: string;
    readonly originalRepositoryUrl: string;
    readonly outputFolderPath: string;
    readonly logPath: string;
}

export enum BuildType {
    FullBuild = 'FullBuild',
    ChangedFileBuild = 'ChangedFileBuild'
}