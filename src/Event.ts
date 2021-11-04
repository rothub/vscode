import { EventEmitter } from 'events'
import * as vscode from 'vscode'

export enum EVSHooks {
  updated = 'updated',
}

export enum Tip {
  info,
  error,
}

export default class Event extends EventEmitter {
  protected env: any
  protected section: string

  constructor(section: string) {
    super()

    this.section = section
    this.env = vscode.workspace.getConfiguration(this.section)
  }

  protected progress<R>(
    message: string,
    callback: (
      progress: vscode.Progress<{
        message?: string
        increment?: number
      }>,
      token: vscode.CancellationToken,
    ) => Thenable<R>,
  ) {
    vscode.window.withProgress(
      {
        location: vscode.ProgressLocation.Notification,
        title: this.section.toUpperCase() + ': ' + message,
        cancellable: false,
      },
      callback,
    )
  }

  protected tip(type: Tip, message: string) {
    message = this.section.toUpperCase() + ': ' + message

    switch (type) {
      case Tip.info:
        vscode.window.showInformationMessage(message)
        break
      case Tip.error:
        vscode.window.showErrorMessage(message)
        break
    }
  }
}
