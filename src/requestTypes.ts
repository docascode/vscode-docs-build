import { RequestType } from "vscode-languageclient/node";

export const UserCredentialRefreshRequest_Type = new RequestType<GetCredentialParams, GetCredentialResponse, void>('docfx/getCredential');

export interface GetCredentialParams {
    url: string
}

export interface GetCredentialResponse {
    result?: Object;
}