// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode'
import Pic from './Pic'

// this method is called when your extension is activated
// your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {
  console.log('Hub.Pic Start')
  const disposable = vscode.commands.registerCommand
  const disposables = [disposable('hub.pic', () => Pic('hub.pic'))]

  context.subscriptions.push(...disposables)
}

// this method is called when your extension is deactivated
export function deactivate() {}
