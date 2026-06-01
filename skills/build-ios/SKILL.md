---
name: build-ios
description: Pull the latest code, run the Saarthi iOS production build with EAS, and submit it to App Store Connect when the user wants a release build or App Store submission.
---

# Build iOS

Use this skill for iOS release builds and App Store submission.

> **V2 readiness:** not runnable yet — V2 has no EAS configuration
> (`eas.json` missing, project not linked). Set up EAS before invoking
> this skill, and remember V2 uses the same bundle id as V1
> (`com.saarthi.app`), so publishing V2 to TestFlight or production
> replaces V1 for testers.

## Workflow

1. Check for uncommitted changes.
2. Pull the latest code on the current branch.
3. Run the production iOS EAS build.
4. If the build succeeds, submit the latest build to App Store Connect.
5. Report the build ID, version number, submission result, and App Store Connect link if available.

## Guardrails

- Stop immediately if there are uncommitted changes.
- Stop immediately if the build fails.
- Do not retry automatically.

