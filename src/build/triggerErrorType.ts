export enum TriggerErrorType {
    TriggerBuildWhenInstantNotAvailable,
    TriggerBuildBeforeSignedIn,
    TriggerBuildOnV2Repo,
    TriggerBuildOnNonWorkspace,
    TriggerBuildOnNonDocsRepo,
    TriggerBuildOnInvalidDocsRepo,
    TriggerBuildWithoutSpecificWorkspace,
}