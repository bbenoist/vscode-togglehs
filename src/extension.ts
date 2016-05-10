'use strict';
import * as vscode from 'vscode';
import * as path from 'path';
var fileExists = require('file-exists');
var slash = require('slash');

const headerExts = [ '.h', '.hpp', '.hh', '.hxx' ];
const sourceExts = [ '.c', '.cpp', '.cc', '.cxx', '.m', '.mm' ];

// Generates appropriate variants for the predefined extensions arrays.
function allExts(exts:string[]) {
  return exts.concat(exts.map((ext) => { return ext.toUpperCase(); }));
}

// Test whether a given file has an extension included in the given array.
function testExtension(fileName:string, exts:string[]) {
  var found = allExts(exts).find((ext) => {
    return ext === path.extname(fileName);
  });
  return undefined != found;
}

// Removes extension from file name.
function removeExtension(fileName:string) {
  return fileName.substr(0, fileName.lastIndexOf('.'));
}

// Returns true if given file is an header, false otherwise.
function isHeader(fileName:string) {
  return testExtension(fileName, headerExts);
}

// Returns true if given file is source, false otherwise.
function isSource(fileName:string) {
  return testExtension(fileName, sourceExts);
}

// Returns true if file is local, false otherwise.
function isLocalFile(uri:vscode.Uri) {
  return uri.scheme === 'file';
}

// Try to get local file value.
function getLocalFile(uri:vscode.Uri) {
  if (isLocalFile(uri)) {
    return uri.fsPath;
  }
  throw "Unsupported file scheme.";
}

// Return extensions which are the opposite of a given file name.
function getOppositeExts(fileName:string) {
  if (isHeader(fileName)) { return sourceExts; }
  if (isSource(fileName)) { return headerExts; }
  return undefined;
}

// Returns the location of a given file name relative to the workspace root
// directory.
function workspaceRelative(fileName:string) {
  return path.relative(vscode.workspace.rootPath, fileName);
}

// Finds a file matching an extension included in the given array.
function findFile(pattern:string, exts:string[]) {
  return new Promise<string>((accept, reject) => {
    vscode.workspace.findFiles(pattern, '').then((uris) => {
      var found = uris.find((uri) => {
        return testExtension(uri.fsPath, exts) && fileExists(uri.fsPath);
      });
      if (found == undefined) {
        reject("Cannot find corresponding file.");
      }
      accept(found.fsPath);
    }, reject);
  });
}

// Opens the given file in vscode workspace.
function openFile(fileName:string) {
  return new Promise((accept, reject) => {
    vscode.workspace.openTextDocument(fileName).then(
      (doc) => {
        vscode.window.showTextDocument(doc).then(() => { accept(true); }, reject);
      }, reject
    );
  });
}

// Tries to toggle current file between source and header.
function toggleHS() {
  return new Promise((accept, reject) => {
    var fileName = getLocalFile(vscode.window.activeTextEditor.document.uri);
    var exts = getOppositeExts(fileName);
    var glob = slash(removeExtension(workspaceRelative(fileName))) + '.*';
    findFile(slash(glob), exts).then(openFile, () => {
      findFile(path.posix.join('**', path.posix.basename(glob)), exts)
        .then(openFile, reject);
    });
  });
}

// Activates the extension.
// Unfortunately, we cannot (yet) make the toggle command only displaying when a file with a matching extension is opened.
export function activate(context: vscode.ExtensionContext) {
  let disposable = vscode.commands.registerTextEditorCommand('togglehs.toggleHS', (textEditor, edit) => {
    toggleHS().catch((reason) => {
      vscode.window.showErrorMessage(reason);
    });
  });
  context.subscriptions.push(disposable);
}

export function deactivate() {
}
