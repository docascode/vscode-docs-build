# Release Instruction

Please follow the following steps to publish a new version extension.

1. Update the `version` property in [package.json](../package.json) file.

2. Update [CHANGELOG](../CHANGELOG.md) file to add the notable changes of this version.
> Pleas follow the this [instruction](http://keepachangelog.com/) to structure this file.

3. Update the docfx version(**Not required**)

```Shell
$ set DOCFX_VERSION={version}
$ gulp updateRuntimeDependencies
```

4. Create a PR to master branch and merge it.

5. Create new release tag and push
```Shell
# Create a release tag
# git tag -a {extension version} -m "{Description}"
$ git tag -a v0.1.4 -m "Docs Validation v0.1.4"
# Push tag to the extension repo
$ git push origin v0.1.4
```
> The tag push will automatically trigger the release CI to publish a new version extension