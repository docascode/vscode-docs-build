import { EventType } from './EventType';
import { Credential } from '../credential/CredentialController';
import { PlatformInformation } from './PlatformInformation';
import { Environment } from './shared';

export interface BaseEvent {
    type: EventType;
}

// Credential Related
export class UserSignedIn implements BaseEvent {
    type = EventType.UserSignedIn;
    constructor(public credential: Credential) { }
}

export class RetrieveFromLocalCredentialManager implements BaseEvent {
    type = EventType.RetrieveFromLocalCredentialManager;
    constructor(public credential: Credential) { }
}

export class UserSignedOut implements BaseEvent {
    type = EventType.UserSignedOut;
}

export class UserSigningIn implements BaseEvent {
    type = EventType.UserSigningIn;
}

export class SignInFailed implements BaseEvent {
    type = EventType.SignInFailed;
    constructor(public message: string) { }
}

export class ResetCredential implements BaseEvent {
    type = EventType.ResetCredential;
}

export class CredentialInitializing implements BaseEvent {
    type = EventType.CredentialInitializing;
}


export class CredentialExpiry implements BaseEvent {
    type = EventType.CredentialExpiry;
}

export class RefreshCredential implements BaseEvent {
    type = EventType.RefreshCredential;
}

// Log
export class LogPlatformInfo implements BaseEvent {
    type = EventType.LogPlatformInfo;
    constructor(public platformInfo: PlatformInformation) { }
}

export class LogProgress implements BaseEvent {
    type = EventType.LogProgress;
    constructor(public message: string, public tag?: string) { }
}

// Others
export class EnvironmentChange implements BaseEvent {
    type = EventType.EnvironmentChange;
    constructor(public env: Environment) { }
}

// Runtime Dependency
export class DependencyInstallStart implements BaseEvent {
    type = EventType.DependencyInstallStart;
}

export class DependencyInstallSuccess implements BaseEvent {
    type = EventType.DependencyInstallSuccess;
}

export class PackageInstallStart implements BaseEvent {
    type = EventType.PackageInstallStart;
    constructor(public pkgDescription: string) { }
}

export class PackageInstallSuccess implements BaseEvent {
    type = EventType.PackageInstallSuccess;
    constructor(public pkgDescription: string) { }
}

export class PackageInstallFailed implements BaseEvent {
    type = EventType.PackageInstallFailed;
    constructor(public pkgDescription: string, public message: string, public willRetry: boolean) { }
}

export class DownloadStart implements BaseEvent {
    type = EventType.DownloadStart;
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

export class DownloadValidation implements BaseEvent {
    type = EventType.DownloadValidation;
    constructor() { }
}

export class IntegrityCheckFailure implements BaseEvent {
    type = EventType.IntegrityCheckFailure;
    constructor(public pkgDescription: string) { }
}

export class InstallZipFile implements BaseEvent {
    type = EventType.InstallZipFile;
}