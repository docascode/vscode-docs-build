import { RequestType, ResponseError } from "vscode-languageclient/node";

export const UserCredentialRefreshRequest_Type = new RequestType<UserCredentialRefreshParams, UserCredentialRefreshResponse, void>('docfx/userCredentialRefresh');

export interface UserCredentialRefreshParams {
    url: string
}

export interface UserCredentialRefreshResponse {
    result?: Object;
    error?: ResponseError<void>;
}