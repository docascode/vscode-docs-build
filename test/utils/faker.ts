import path from 'path';
import { SinonSandbox,SinonStub } from 'sinon';
import { DiagnosticCollection } from 'vscode';
import { LanguageClient } from 'vscode-languageclient/node';

import { BuildExecutor } from '../../src/build/buildExecutor';
import { BuildInput } from '../../src/build/buildInput';
import { BuildResult, DocfxExecutionResult } from '../../src/build/buildResult';
import { EnvironmentController } from '../../src/common/environmentController';
import { PlatformInformation } from '../../src/common/platformInformation';
import { Credential, CredentialController } from '../../src/credential/credentialController';
import { KeyChain } from '../../src/credential/keyChain';
import { AbsolutePathPackage } from '../../src/dependency/package';
import { ExtensionContext } from '../../src/extensionContext';
import { DocsRepoType, UserInfo, UserType } from '../../src/shared';
import TelemetryReporter from '../../src/telemetryReporter';

export function getFakeEnvironmentController(docsRepoType: DocsRepoType = 'GitHub'): EnvironmentController {
    return {
        env: 'PROD',
        docsRepoType: docsRepoType || 'GitHub',
        debugMode: false,
        userType: UserType.MicrosoftEmployee,
        enableAutomaticRealTimeValidation: false
    };
}

export function setEnvToPROD(environmentController: EnvironmentController): void {
    environmentController.env = 'PROD';
}

export function setEnvToPPE(environmentController: EnvironmentController): void {
    environmentController.env = 'PPE';
}

export function getFakedWindowsPlatformInformation(): PlatformInformation {
    return <PlatformInformation>{
        isWindows: () => true,
        rid: 'win7-x64'
    };
}

export function getFakedNonWindowsPlatformInformation(): PlatformInformation {
    return <PlatformInformation>{
        isWindows: () => false,
        rid: 'osx-x64'
    };
}

export function getFakedTelemetryReporter(): TelemetryReporter {
    return <TelemetryReporter>{
        getUserOptIn: () => true
    };
}

export function setTelemetryUserOptInToTrue(telemetryReporter: TelemetryReporter): void {
    telemetryReporter.getUserOptIn = () => true;
}

export function setTelemetryUserOptInToFalse(telemetryReporter: TelemetryReporter): void {
    telemetryReporter.getUserOptIn = () => false;
}

export function setupKeyChain(sinon: SinonSandbox, keyChain: KeyChain, userInfo: UserInfo): SinonStub<[], Promise<UserInfo>> {
    return sinon.stub(keyChain, 'getUserInfo').resolves(userInfo);
}

export const fakedPackage = new AbsolutePathPackage(
    'faked-id',
    'fakedName',
    'Faked package description',
    'https://faked.url',
    'faked.binary',
    'faked-rid',
    'faked-integrity'
);

export const fakedCredential = <Credential>{
    signInStatus: 'SignedIn',
    userInfo: {
        signType: 'GitHub',
        userId: 'faked-id',
        userEmail: 'fake@microsoft.com',
        userName: 'Faked User',
        userToken: 'faked-token'
    }
};

export const fakedCredentialController = <CredentialController>{
    credential: fakedCredential
};

export const tempFolder = path.resolve(__dirname, '../../../.temp');
export const defaultOutputPath = path.resolve(tempFolder, 'output');
export const defaultLogPath = path.resolve(defaultOutputPath, '.errors.log');
export const publicTemplateURL = "https://static.docs.com/ui/latest";

export const fakedExtensionContext = <ExtensionContext>{
    packageJson: {
        runtimeDependencies: [
            {
                id: "docfx-win7-x64",
                name: "docfx",
                binary: "docfx.exe",
                installPath: ".docfx",
                rid: "win7-x64",
            },
            {
                id: "docfx-osx-x64",
                name: "docfx",
                binary: "./docfx",
                installPath: ".docfx",
                rid: "osx-x64",
            }
        ]
    },
    extensionPath: path.resolve(tempFolder, 'fakedExtensionPath'),
    extensionVersion: '0.0.1'
};

export const fakedBuildInput = <BuildInput>{
    dryRun: true,
    localRepositoryPath: path.resolve(tempFolder, 'fakedRepositoryPath'),
    localRepositoryUrl: 'https://faked.repository',
    originalRepositoryUrl: 'https://faked.original.repository',
    outputFolderPath: defaultOutputPath,
    logPath: defaultLogPath,
    port: 8080,
};

export function getFakedBuildExecutor(docfxExecutionResult: DocfxExecutionResult, setRunBuildFuncParameters?: Function): BuildExecutor {
    let buildCancelled = false;
    return <any>{
        RunBuild: (correlationId: string, input: BuildInput, buildUserToken: string, buildSubFolder?: string): Promise<BuildResult> => {
            if (setRunBuildFuncParameters) {
                setRunBuildFuncParameters(correlationId, input, buildUserToken, buildSubFolder);
            }
            return new Promise((resolve, reject) => {
                setTimeout(() => {
                    if (buildCancelled) {
                        resolve(<BuildResult>{
                            result: DocfxExecutionResult.Canceled,
                            isRestoreSkipped: false
                        });
                        buildCancelled = false;
                    } else {
                        resolve(<BuildResult>{
                            result: docfxExecutionResult,
                            isRestoreSkipped: false
                        });
                    }
                }, 10);
            });
        },
        cancelBuild: (): Promise<void> => {
            buildCancelled = true;
            return Promise.resolve();
        },
        getLanguageClient: (input: BuildInput, buildUserToken: string) => {
            if (setRunBuildFuncParameters) {
                setRunBuildFuncParameters(undefined, input, buildUserToken);
            }
            return <LanguageClient>{
                start: () => { return; },
                diagnostics: <DiagnosticCollection>{
                    name: 'fakeDiagnosticCollection'
                }
            };
        }
    };
}