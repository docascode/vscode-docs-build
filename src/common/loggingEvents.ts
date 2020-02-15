import { EventType } from './eventType';
import { Credential } from '../credential/credentialController';
import { PlatformInformation } from './platformInformation';
import { Environment } from '../shared';
import { TriggerErrorType } from '../build/triggerErrorType';

export interface BaseEvent {
    type: EventType;
}

// Sign in
export class UserSignInSucceeded implements BaseEvent {
    type = EventType.UserSignInSucceeded;
    constructor(public credential: Credential) { }
}

export class UserSigningIn implements BaseEvent {
    type = EventType.UserSigningIn;
}

export class UserSignInFailed implements BaseEvent {
    type = EventType.UserSignInFailed;
    constructor(public message: string) { }
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
    constructor(public localRepositoryUrl: string, public originalRepositoryUrl: string, public repositoryBranch: string) { }
}

export class BuildInstantAllocated implements BaseEvent {
    type = EventType.BuildInstantAllocated;
}

export class BuildInstantReleased implements BaseEvent {
    type = EventType.BuildInstantReleased;
}

export class BuildTriggerFailed implements BaseEvent {
    type = EventType.BuildTriggerFailed;
    constructor(public message: string, public triggerErrorType?: TriggerErrorType, public extensionData?: any[]) { }
}

export class BuildJobTriggered implements BaseEvent {
    type = EventType.BuildJobTriggered;
    constructor(public workSpaceFolderName: string) { }
}

export class BuildJobSucceeded implements BaseEvent {
    type = EventType.BuildJobSucceeded;
}

export class BuildJobFailed implements BaseEvent {
    type = EventType.BuildJobFailed;
}

export class BuildProgress implements BaseEvent {
    type = EventType.BuildProgress;
    constructor(public message: string) { }
}

export class DocfxRestoreStarted implements BaseEvent {
    type = EventType.DocfxRestoreStarted;
}

export class DocfxRestoreFinished implements BaseEvent {
    type = EventType.DocfxRestoreFinished;
    public exitCode: number;
}

export class DocfxRestoreSucceeded extends DocfxRestoreFinished {
    exitCode = 0;
}

export class DocfxRestoreFailed extends DocfxRestoreFinished {
    constructor(public exitCode: number) { super(); }
}

export class DocfxRestoreCanceled implements BaseEvent {
    type = EventType.DocfxRestoreCanceled;
}

export class DocfxBuildStarted implements BaseEvent {
    type = EventType.DocfxBuildStarted;
}

export class DocfxBuildFinished implements BaseEvent {
    type = EventType.DocfxBuildFinished;
    public exitCode: number;
}

export class DocfxBuildSucceeded extends DocfxBuildFinished {
    exitCode = 0;
}

export class DocfxBuildFailed extends DocfxBuildFinished {
    constructor(public exitCode: number) { super(); }
}

export class DocfxBuildCanceled implements BaseEvent {
    type = EventType.DocfxBuildCanceled;
}

export class ReportGenerationFailed implements BaseEvent {
    type = EventType.ReportGenerationFailed;

    constructor(public message: string) { }
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

// Test only
export class RefreshCredential implements BaseEvent {
    type = EventType.RefreshCredential;
}