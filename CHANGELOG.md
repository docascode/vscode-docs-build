# Change Log

## 0.2.0 (September 28, 2020)
### Added
- Make sign-in optional and Support public contributor.
### Changed
- Use `docsmsft` publisher. (#133)

## 0.1.22 (September 2, 2020)
### Added
- Support validating learn repository. (#115)
- Support debug mode. (#120)
### Changed
- Use latest docfx: 3.0.0-beta1.353+50b0b3e0b1. (#121)

## 0.1.21 (August 24, 2020)
### Added
- Support validating paired repository linked to a provisioned repository. (#115)

## 0.1.20 (August 12, 2020)
### Changed
- Update extension prerequisites check. (#110)

## 0.1.19 (June 30, 2020)
### Changed
- Use latest docfx: 3.0.0-beta1.116+20abf93571.

## 0.1.18 (June 4, 2020)
### Changed
- Stop generating output inside the repository to avoid introducing git changes. (#106)
- Use latest docfx: 3.0.0-beta1.15+efb56a9787. (#107)

## 0.1.17 (March 19, 2020)
### Fixed
- Fix Azure DevOps repository credential expiry detect issue. (#99)
- Fix build with implicitly restore failed. (#100)
### Changed
- Refine message wording. (#98)

## 0.1.16 (March 9, 2020)
### Changed
- Use latest docfx: 3.0.0-beta-01584-b16bf7cb5. (#91)

## 0.1.15 (March 6, 2020)
### Added
- Support Cancelling build. (#34)
- Support Azure DevOps repository. (#80)
### Changed
- Merge the 2 step sign in flow into 1 step sign in flow. (#68)

## 0.1.14 (February 21, 2020)
### Fixed
- Update telemetry. (#65 #66)

## 0.1.13 (February 21, 2020)
### Added
- Add telemetry.
### Fixed
- Fix diagnostics not clear up after rebuild. (#52)

## 0.1.12 (February 18, 2020)
### Added
- Bundle extension to improve loading performance. (#32)
- Add quick pick menu. (#33)

## 0.1.11 (January 30, 2020)
### Fixed
- Fix build crashing when workspace path contains space. (#29)

## 0.1.10 (January 16, 2020)
### Changed
- Only restore dependencies on VS Code re-open to improve performance. (#18)
- Run DocFx build in `--dry-run` mode to improve performance. (#18)

## 0.1.9 (January 14, 2020)
### Fixed
- Fix failing to build repository contains landingData. (#17)

## 0.1.8 (December 31, 2019)
### Changed
- Cross-platform support(Windows & Mac OS)
- Remove Dependency dotnet and Nodejs
- Install runtime dependencies according the current platform automatically once the extension activated.
- Use latest DocFX(3.0.0-beta-01460-4f008e94d)
  - Drop docfx.yml and consume docfx.json + op.config + op.redirection directly
  - Support external Xref

## 0.1.7 (November 26, 2019)
### Changed
- Add diagnostic source `Docs validation`.
- Rename to `Docs validation` from `Docs Build`.

## 0.1.6 (November 19, 2019)
### Added
- Support different build environment.
### Changed
- Removing the dependency on proposed API

## 0.1.5 (November 8, 2019)
### Changed
- Removing the dependency on Azure CLI

## 0.1.4 (October 31, 2019)
### Added
- One-click to migrate to docfx v3.
### Changed
- Add new requirement: Azure CLI installed and login

## 0.1.3 (October 30, 2019)
### Fixed
- Fix failing to get user info after sign-in.

## 0.1.2 (October 29, 2019)
### Fixed
- Make docs-pipeline self-contained

## 0.1.0 (October 10, 2019)
### Added
- Sign in/out to Docs, and display the status in statusBar
- Build the current workspace folder
- Display the real-time build streaming output in `Docs` channel
- Display all diagnostics in `Problem` view with detail information after build finished.
