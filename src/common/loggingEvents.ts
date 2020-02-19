import { EventType } from './eventType';
import { Credential } from '../credential/credentialController';
import { PlatformInformation } from './platformInformation';
import { Environment } from '../shared';
import { BuildResult, DocfxExecutionResult } from '../build/buildResult';
import { BuildInput } from '../build/buildInput';

export interface BaseEvent {
    type: EventType;
}

// Sign in
export class UserSignInTriggered implements BaseEvent {
    type = EventType.UserSignInTriggered;
    constructor(public correlationId: string) { }
}

export class UserSignInCompleted implements BaseEvent {
    type = EventType.UserSignInCompleted;
    constructor(public correlationId: string, public succeeded: boolean) { }
}

export class UserSignInSucceeded extends UserSignInCompleted {
    constructor(public correlationId: string, public credential: Credential) {
        super(correlationId, true);
    }
}

export class UserSignInFailed extends UserSignInCompleted {
    constructor(public correlationId: string, public err: Error) {
        super(correlationId, false);
    }
}

export class UserSignOutTriggered implements BaseEvent {
    type = EventType.UserSignOutTriggered;
    constructor(public correlationId: string) { }
}

export class UserSignOutCompleted implements BaseEvent {
    type = EventType.UserSignOutCompleted;
    constructor(public correlationId: string, public succeeded: boolean) { }
}

export class UserSignOutSucceeded extends UserSignOutCompleted {
    constructor(public correlationId: string) {
        super(correlationId, true);
    }
}

export class UserSignOutFailed extends UserSignOutCompleted {
    constructor(public correlationId: string, public err: Error) {
        super(correlationId, false);
    }
}

export class UserSignInProgress implements BaseEvent {
    type = EventType.UserSignInProgress;
    constructor(public message: string, public tag?: string) { }
}

export class CredentialRetrieveFromLocalCredentialManager implements BaseEvent {
    type = EventType.CredentialRetrieveFromLocalCredentialManager;
    constructor(public credential: Credential) { }
}

export class CredentialReset implements BaseEvent {
    type = EventType.CredentialReset;
}

export class CredentialInitializing implements BaseEvent {
    type = EventType.CredentialInitializing;
}

export class CredentialExpired implements BaseEvent {
    type = EventType.CredentialExpired;
}

// Build
export class RepositoryEnabledV3 implements BaseEvent {
    type = EventType.RepositoryEnabledV3;
}

export class RepositoryInfoRetrieved implements BaseEvent {
    type = EventType.RepositoryInfoRetrieved;
    constructor(public localRepositoryUrl: string, public originalRepositoryUrl: string) { }
}

export class BuildInstantAllocated implements BaseEvent {
    type = EventType.BuildInstantAllocated;
}

export class BuildInstantReleased implements BaseEvent {
    type = EventType.BuildInstantReleased;
}

export class BuildTriggered implements BaseEvent {
    type = EventType.BuildTriggered;
    constructor(public correlationId: string) { }
}

export class BuildStarted implements BaseEvent {
    type = EventType.BuildStarted;
    constructor(public workSpaceFolderName: string) { }
}

export class BuildCompleted implements BaseEvent {
    type = EventType.BuildCompleted;
    constructor(public correlationId: string, public result: DocfxExecutionResult, public buildInput: BuildInput, public totalTimeInSeconds: number) { }
}

export class BuildSucceeded extends BuildCompleted {
    constructor(public correlationId: string, public buildInput: BuildInput, public totalTimeInSeconds: number, public buildResult: BuildResult) { super(correlationId, DocfxExecutionResult.Succeeded, buildInput, totalTimeInSeconds); }
}

export class BuildFailed extends BuildCompleted {
    constructor(public correlationId: string, public buildInput: BuildInput, public totalTimeInSeconds: number, public err: Error) { super(correlationId, DocfxExecutionResult.Failed, buildInput, totalTimeInSeconds); }
}

export class BuildCanceled extends BuildCompleted {
    constructor(public correlationId: string, public buildInput: BuildInput, public totalTimeInSeconds: number) { super(correlationId, DocfxExecutionResult.Canceled, buildInput, totalTimeInSeconds); }
}

export class BuildProgress implements BaseEvent {
    type = EventType.BuildProgress;
    constructor(public message: string) { }
}

export class DocfxRestoreStarted implements BaseEvent {
    type = EventType.DocfxRestoreStarted;
}

export class DocfxRestoreCompleted implements BaseEvent {
    type = EventType.DocfxRestoreCompleted;
    constructor(public result: DocfxExecutionResult, public exitCode?: number) { }
}

export class DocfxBuildStarted implements BaseEvent {
    type = EventType.DocfxBuildStarted;
}

export class DocfxBuildCompleted implements BaseEvent {
    type = EventType.DocfxBuildCompleted;
    constructor(public result: DocfxExecutionResult, public exitCode?: number) { }
}

// API
export class APICallStarted implements BaseEvent {
    type = EventType.APICallStarted;
    constructor(public name: string, public url: string) { }
}

export class APICallFailed implements BaseEvent {
    type = EventType.APICallFailed;
    constructor(public name: string, public url: string, public message: string) { }
}

// Runtime Dependency
export class DependencyInstallStarted implements BaseEvent {
    type = EventType.DependencyInstallStarted;
}

export class DependencyInstallFinished implements BaseEvent {
    type = EventType.DependencyInstallFinished;
}

export class PackageInstallStarted implements BaseEvent {
    type = EventType.PackageInstallStarted;
    constructor(public pkgDescription: string) { }
}

export class PackageInstallSucceeded implements BaseEvent {
    type = EventType.PackageInstallSucceeded;
    constructor(public pkgDescription: string) { }
}

export class PackageInstallFailed implements BaseEvent {
    type = EventType.PackageInstallFailed;
    constructor(public pkgDescription: string, public message: string, public willRetry: boolean) { }
}

export class DownloadStarted implements BaseEvent {
    type = EventType.DownloadStarted;
    constructor(public pkgDescription: string) { }
}

export class DownloadProgress implements BaseEvent {
    type = EventType.DownloadProgress;
    constructor(public downloadPercentage: number) { }
}

export class DownloadSizeObtained implements BaseEvent {
    type = EventType.DownloadSizeObtained;
    constructor(public packageSize: number) { }
}

export class DownloadValidating implements BaseEvent {
    type = EventType.DownloadValidating;
    constructor() { }
}

export class DownloadIntegrityCheckFailed implements BaseEvent {
    type = EventType.DownloadIntegrityCheckFailed;
}

export class ZipFileInstalling implements BaseEvent {
    type = EventType.ZipFileInstalling;
}

export class PlatformInfoRetrieved implements BaseEvent {
    type = EventType.PlatformInfoRetrieved;
    constructor(public platformInfo: PlatformInformation) { }
}

// Others
export class EnvironmentChanged implements BaseEvent {
    type = EventType.EnvironmentChanged;
    constructor(public env: Environment) { }
}

export class LearnMoreClicked implements BaseEvent {
    type = EventType.LearnMoreClicked;
    constructor(public correlationId: string, public code: string) { }
}

// Test only
export class RefreshCredential implements BaseEvent {
    type = EventType.RefreshCredential;
}