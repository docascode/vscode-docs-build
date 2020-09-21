const config = {
    auth: {
        PROD: {
            GitHubOauthClientId: 'cab2f1d73e2dc96c7f8b',
            GitHubOauthScope: 'repo user:email read:user',
            GitHubOauthRedirectUrl: 'https://op-build-prod.azurewebsites.net/v1/Authorizations/github',
            AzureDevOpsOauthClientId: '19245851-059B-42EA-A505-E09F71F7201A',
            AzureDevOpsOauthScope: 'vso.build_execute vso.chat_manage vso.code_manage vso.test_write vso.work_write',
            AzureDevOpsRedirectUrl: 'https://op-build-prod.azurewebsites.net/v1/Authorizations/vso',
            AADAuthTenantId: '72f988bf-86f1-41af-91ab-2d7cd011db47',
            AADAuthClientId: '53bb1162-c37b-4176-8ddf-ce47964c3fcd',
            AADAuthScope: 'openid offline_access profile',
            AADAuthResource: 'https://graph.windows.net',
            AADAuthRedirectUrl: 'https://op-build-prod.azurewebsites.net/v1/Authorizations/aad'
        },
        PPE: {
            GitHubOauthClientId: '7decdab5f6801e75e1d5',
            GitHubOauthScope: 'repo user:email read:user',
            GitHubOauthRedirectUrl: 'https://op-build-sandbox2.azurewebsites.net/v1/Authorizations/github',
            AzureDevOpsOauthClientId: '378784D0-5873-4D41-9626-B9A6CE8AF4EC',
            AzureDevOpsOauthScope: 'vso.build_execute vso.chat_manage vso.code_manage vso.test_write vso.work_write',
            AzureDevOpsRedirectUrl: 'https://op-build-sandbox2.azurewebsites.net/v1/Authorizations/vso',
            AADAuthTenantId: '72f988bf-86f1-41af-91ab-2d7cd011db47',
            AADAuthClientId: '90e8d374-2270-4528-86d0-77b9f736ffbf',
            AADAuthScope: 'openid offline_access profile',
            AADAuthResource: 'https://graph.windows.net',
            AADAuthRedirectUrl: 'https://op-build-sandbox2.azurewebsites.net/v1/Authorizations/aad'
        }
    },
    OPBuildAPIEndPoint: {
        PROD: 'https://op-build-prod.azurewebsites.net',
        PPE: 'https://op-build-sandbox2.azurewebsites.net'
    },
    AIKey: {
        PROD: '4424c909-fdd9-4229-aecb-ad2a52b039e6',
        PPE: '91c4866b-a41e-4dd1-beaa-d8eba4477219'
    },
    SignInTimeOut: 120000,
    PublicTemplate: "https://static.docs.com/ui/latest"
};

export default config;