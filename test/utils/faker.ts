import path from 'path';
import { EnvironmentController } from '../../src/common/environmentController';
import { AbsolutePathPackage } from '../../src/dependency/package';
import { SinonSandbox } from 'sinon';
import { KeyChain } from '../../src/credential/keyChain';
import { UserInfo, DocsRepoType } from '../../src/shared';
import { Credential } from '../../src/credential/credentialController';
import { ExtensionContext } from '../../src/extensionContext';
import { PlatformInformation } from '../../src/common/platformInformation';
import TelemetryReporter from '../../src/telemetryReporter';
import { BuildInput, BuildType } from '../../src/build/buildInput';
import { BuildResult, DocfxExecutionResult } from '../../src/build/buildResult';
import { BuildExecutor } from '../../src/build/buildExecutor';

export function getFakeEnvironmentController(docsRepoType: DocsRepoType = 'GitHub'): EnvironmentController {
    return {
        env: 'PROD',
        docsRepoType: docsRepoType || 'GitHub'
    };
}

export function setEnvToPROD(environmentController: EnvironmentController) {
    environmentController.env = 'PROD';
}

export function setEnvToPPE(environmentController: EnvironmentController) {
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

export function setTelemetryUserOptInToTrue(telemetryReporter: TelemetryReporter) {
    telemetryReporter.getUserOptIn = () => true;
}

export function setTelemetryUserOptInToFalse(telemetryReporter: TelemetryReporter) {
    telemetryReporter.getUserOptIn = () => false;
}

export function setupKeyChain(sinon: SinonSandbox, keyChain: KeyChain, userInfo: UserInfo) {
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

export const testFolder = path.resolve(__dirname, '.temp');

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
    extensionPath: path.resolve(testFolder, 'fakedExtensionPath'),
    extensionVersion: '0.0.1'
};

export const fakedBuildInput = <BuildInput>{
    buildType: BuildType.FullBuild,
    localRepositoryPath: path.resolve(testFolder, 'fakedRepositoyPath'),
    localRepositoryUrl: 'https://faked.repository',
    originalRepositoryUrl: 'https://faked.original.repository'
};

export function getFakedBuildExecutor(docfxExecutionResult: DocfxExecutionResult): BuildExecutor {
    let buildCancelled = false;
    return <any>{
        RunBuild: (correlationId: string, input: BuildInput, buildUserToken: string): Promise<BuildResult> => {
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
        }
    };
}