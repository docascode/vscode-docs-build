import { EventType } from './eventType';
import { Credential } from '../credential/credentialController';
import { PlatformInformation } from './platformInformation';
import { Environment } from '../shared';

export interface BaseEvent {
    type: EventType;
}

// Sign in
export class UserSignInSucceeded implements BaseEvent {
    type = EventType.UserSignInSucceeded;
    constructor(public credential: Credential) { }
}

export class CredentialRetrieveFromLocalCredentialManager implements BaseEvent {
    type = EventType.CredentialRetrieveFromLocalCredentialManager;
    constructor(public credential: Credential) { }
}

export class UserSignedOut implements BaseEvent {
    type = EventType.UserSignedOut;
}

export class UserSigningIn implements BaseEvent {
    type = EventType.UserSigningIn;
}

export class UserSignInFailed implements BaseEvent {
    type = EventType.UserSignInFailed;
    constructor(public message: string) { }
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

export class SignInProgress implements BaseEvent {
    type = EventType.SignInProgress;
    constructor(public message: string, public tag?: string) { }
}

// Others
export class EnvironmentChanged implements BaseEvent {
    type = EventType.EnvironmentChanged;
    constructor(public env: Environment) { }
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
    constructor(public pkgDescription: string) { }
}

export class ZipFileInstalling implements BaseEvent {
    type = EventType.ZipFileInstalling;
}

export class PlatformInfoRetrieved implements BaseEvent {
    type = EventType.PlatformInfoRetrieved;
    constructor(public platformInfo: PlatformInformation) { }
}