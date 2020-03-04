/*---------------------------------------------------------
 * Copyright (C) Microsoft Corporation. All rights reserved.
 *--------------------------------------------------------*/
/* tslint:disable */
(process.env['APPLICATION_INSIGHTS_NO_DIAGNOSTIC_CHANNEL'] as any) = true;

import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import vscode from 'vscode';
import * as appInsights from 'applicationinsights';

export default class TelemetryReporter {
    private appInsightsClient: appInsights.TelemetryClient | undefined;
    private userOptIn: boolean = false;
    private readonly configListener: vscode.Disposable;

    private static TELEMETRY_CONFIG_ID = 'telemetry';
    private static TELEMETRY_CONFIG_ENABLED_ID = 'enableTelemetry';

    private logStream: fs.WriteStream | undefined;
    private customCommonProperties: {
        [key: string]: string;
    } = {};

    // tslint:disable-next-line
    constructor(private extensionId: string, private extensionVersion: string, key: string) {
        let logFilePath = process.env['VSCODE_LOGS'] || '';
        if (logFilePath && extensionId && process.env['VSCODE_LOG_LEVEL'] === 'trace') {
            logFilePath = path.join(logFilePath, `${extensionId}.txt`);
            this.logStream = fs.createWriteStream(logFilePath, { flags: 'a', encoding: 'utf8', autoClose: true });
        }
        this.updateUserOptIn(key);
        this.configListener = vscode.workspace.onDidChangeConfiguration(() => this.updateUserOptIn(key));
    }

    private updateUserOptIn(key: string): void {
        const config = vscode.workspace.getConfiguration(TelemetryReporter.TELEMETRY_CONFIG_ID);
        if (this.userOptIn !== config.get<boolean>(TelemetryReporter.TELEMETRY_CONFIG_ENABLED_ID, true)) {
            this.userOptIn = config.get<boolean>(TelemetryReporter.TELEMETRY_CONFIG_ENABLED_ID, true);
            if (this.userOptIn) {
                this.createAppInsightsClient(key);
            } else {
                this.dispose();
            }
        }
    }

    private createAppInsightsClient(key: string) {
        //check if another instance is already initialized
        if (appInsights.defaultClient) {
            this.appInsightsClient = new appInsights.TelemetryClient(key);
            // no other way to enable offline mode
            this.appInsightsClient.channel.setUseDiskRetryCaching(true);
        } else {
            appInsights.setup(key)
                .setAutoCollectRequests(false)
                .setAutoCollectPerformance(false)
                .setAutoCollectExceptions(false)
                .setAutoCollectDependencies(false)
                .setAutoDependencyCorrelation(false)
                .setAutoCollectConsole(false)
                .setUseDiskRetryCaching(true)
                .start();
            this.appInsightsClient = appInsights.defaultClient;
        }

        this.appInsightsClient.commonProperties = this.getCommonProperties();
        if (vscode && vscode.env) {
            this.appInsightsClient.context.tags[this.appInsightsClient.context.keys.userId] = vscode.env.machineId;
            this.appInsightsClient.context.tags[this.appInsightsClient.context.keys.sessionId] = vscode.env.sessionId;
        }
        //check if it's an Asimov key to change the endpoint
        if (key && key.indexOf('AIF-') === 0) {
            this.appInsightsClient.config.endpointUrl = "https://vortex.data.microsoft.com/collect/v1";
        }
    }

    // __GDPR__COMMON__ "common.os" : { "classification": "SystemMetaData", "purpose": "FeatureInsight" }
    // __GDPR__COMMON__ "common.platformversion" : { "classification": "SystemMetaData", "purpose": "FeatureInsight" }
    // __GDPR__COMMON__ "common.extname" : { "classification": "PublicNonPersonalData", "purpose": "FeatureInsight" }
    // __GDPR__COMMON__ "common.extversion" : { "classification": "PublicNonPersonalData", "purpose": "FeatureInsight" }
    // __GDPR__COMMON__ "common.vscodemachineid" : { "endPoint": "MacAddressHash", "classification": "EndUserPseudonymizedInformation", "purpose": "FeatureInsight" }
    // __GDPR__COMMON__ "common.vscodesessionid" : { "classification": "SystemMetaData", "purpose": "FeatureInsight" }
    // __GDPR__COMMON__ "common.vscodeversion" : { "classification": "SystemMetaData", "purpose": "FeatureInsight" }
    private getCommonProperties(): { [key: string]: string } {
        const commonProperties = Object.create(null);
        commonProperties['common.os'] = os.platform();
        commonProperties['common.platformversion'] = (os.release() || '').replace(/^(\d+)(\.\d+)?(\.\d+)?(.*)/, '$1$2$3');
        commonProperties['common.extname'] = this.extensionId;
        commonProperties['common.extversion'] = this.extensionVersion;
        if (vscode && vscode.env) {
            commonProperties['common.vscodemachineid'] = vscode.env.machineId;
            commonProperties['common.vscodesessionid'] = vscode.env.sessionId;
            commonProperties['common.vscodeversion'] = vscode.version;
        }
        return {
            ...commonProperties,
            ...this.customCommonProperties
        };
    }

    public getUserOptIn(): boolean {
        return this.userOptIn;
    }

    public setCommonProperty(properties: { [key: string]: string }) {
        this.customCommonProperties = {
            ...this.customCommonProperties,
            ...properties
        };
        if (this.appInsightsClient) {
            this.appInsightsClient.commonProperties = {
                ...this.appInsightsClient.commonProperties,
                ...properties
            };
        }
    }

    public sendTelemetryEvent(eventName: string, properties?: { [key: string]: string }, measurements?: { [key: string]: number }): void {
        if (this.userOptIn && eventName && this.appInsightsClient) {
            this.appInsightsClient.trackEvent({
                name: `${this.extensionId}/${eventName}`,
                properties: properties,
                measurements: measurements
            })

            if (this.logStream) {
                this.logStream.write(`telemetry/${eventName} ${JSON.stringify({ properties, measurements })}\n`);
            }
        }
    }

    public sendTelemetryMetric(
        metricName: string,
        value: number,
        properties?: { [key: string]: string },
        count?: number,
        min?: number,
        max?: number,
        stdDev?: number,
    ): void {
        if (this.userOptIn && metricName && this.appInsightsClient) {
            this.appInsightsClient.trackMetric({
                name: `${this.extensionId}/${metricName}`,
                value: value,
                properties: properties,
                count: count,
                min: min,
                max: max,
                stdDev: stdDev
            });

            if (this.logStream) {
                this.logStream.write(`telemetry/${metricName} ${value} ${JSON.stringify({ properties, count, min, max, stdDev })}\n`);
            }
        }
    }

    public sendTelemetryException(error: Error, properties?: { [key: string]: string }, measurements?: { [key: string]: number }): void {
        if (this.userOptIn && error && this.appInsightsClient) {
            this.appInsightsClient.trackException({
                exception: error,
                properties: properties,
                measurements: measurements
            })

            if (this.logStream) {
                this.logStream.write(`telemetry/${error.name} ${error.message} ${JSON.stringify({ properties, measurements })}\n`);
            }
        }
    }

    public dispose(): Promise<any> {

        this.configListener.dispose();

        const flushEventsToLogger = new Promise<any>(resolve => {
            if (!this.logStream) {
                return resolve(void 0);
            }
            this.logStream.on('finish', resolve);
            this.logStream.end();
        });

        const flushEventsToAI = new Promise<any>(resolve => {
            if (this.appInsightsClient) {
                this.appInsightsClient.flush({
                    callback: () => {
                        // all data flushed
                        this.appInsightsClient = undefined;
                        resolve(void 0);
                    }
                });
            } else {
                resolve(void 0);
            }
        });
        return Promise.all([flushEventsToAI, flushEventsToLogger]);
    }
}