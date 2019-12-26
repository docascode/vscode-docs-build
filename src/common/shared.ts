import * as vscode from 'vscode';
import { DocsChannel } from './DocsChannel';

// Extension
export const EXTENSION_NAME = 'docs-build';

export const EXTENSION_ID = `ceapex.${EXTENSION_NAME}`;

const extension = vscode.extensions.getExtension(EXTENSION_ID);

export const PACKAGE_JSON = extension.packageJSON;

export const EXTENSION_PATH = extension.extensionPath;

// Global variables
export const docsChannel = new DocsChannel();