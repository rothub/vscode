import * as path from 'path'
import * as vscode from 'vscode'
import { v4 as uuid } from 'uuid'
import Event, { EVSHooks, Tip } from '../Event'
import PicGoCore from 'picgo'
import dayjs from 'dayjs'
import { IImgInfo, IPlugin, IPicGo } from 'picgo/dist/src/types'

const picgo = require('picgo') as typeof PicGoCore

interface Input {
  uuid: string
  Y: string
  y: string
  m: string
  d: string
  h: string
  i: string
  s: string
  name?: string
  ext?: string
}

interface Output {
  dir: string
  name: string
  ext: string
  url: string
}

class Pic extends Event {
  private readonly PicGo: IPicGo = new picgo()
  private readonly Date: dayjs.Dayjs = dayjs()

  constructor(section: string) {
    super(section)

    this.PicGo.setConfig({ picBed: this.env.get('bed') })
    this.PicGo.helper.beforeUploadPlugins.register(
      'beforeRename',
      this.beforeRename(),
    )
    this.PicGo.on('finished', (ctx: PicGoCore) => this.finished(ctx))
  }

  async upload(input: string[]): Promise<any> {
    return await Promise.allSettled([
      this.progress('files uploading...', async progress => {
        return await new Promise<void>((resolve, reject) => {
          const onProgress = (p: number) => {
            progress.report({ increment: p })
            if (p === 100) {
              offListeners()
              resolve()
            }
          }

          const onFailed = (error: Error) => {
            const message = error.message || 'unknown error.'
            offListeners()
            reject(message)
            this.tip(Tip.error, message)
          }

          const onNotification = (notice: any) => {
            const message = `${notice.title}! ${notice.body || ''}${
              notice.text || ''
            }`
            offListeners()
            reject(message)
            this.tip(Tip.error, message)
          }

          const offListeners = () => {
            this.PicGo.off('uploadProgress', onProgress)
            this.PicGo.off('failed', onFailed)
            this.PicGo.off('notification', onNotification)
          }

          this.PicGo.on('uploadProgress', onProgress)
          this.PicGo.on('failed', onFailed)
          this.PicGo.on('notification', onNotification)
        })
      }),
      this.PicGo.upload(input),
    ]).catch(() => {})
  }

  protected beforeRename(): IPlugin {
    return {
      handle: (ctx: IPicGo) => {
        const template = this.env.get('input')
        const input: Input = {
          uuid: uuid(),
          Y: this.Date.format('YYYY'),
          y: this.Date.format('YY'),
          m: this.Date.format('MM'),
          d: this.Date.format('DD'),
          h: this.Date.format('HH'),
          i: this.Date.format('mm'),
          s: this.Date.format('ss'),
        }

        ctx.output.forEach((file: IImgInfo) => {
          input.ext = file.extname || ''
          input.name = path.basename(file.fileName || '', input.ext)

          file.fileName = this.rename(template, input)
        })
      },
    }
  }

  protected finished(ctx: PicGoCore) {
    const template = this.env.get('output')

    const url = ctx.output.reduce((join: string, file: IImgInfo): string => {
      const filename = file.fileName || ''
      const ext = file.extname || ''
      let dir = path.dirname(filename)
      dir === '.' && (dir = '')
      const name = path.basename(filename, ext)
      const url = file.imgUrl || ''

      const output = { dir, name, ext, url }
      return `${join}${this.rename(template, output)}\n`
    }, '')

    const editor = vscode.window.activeTextEditor
    if (editor) {
      editor.edit(textEditor => {
        textEditor.replace(editor.selection, url)
        this.emit(EVSHooks.updated, url)
        this.tip(Tip.info, 'file uploaded successfully.')
      })
    } else {
      this.tip(Tip.error, 'no active editor.')
    }
  }

  protected rename(template: string, io: Input | Output): string {
    const keys = Object.keys(io)
    const values = Object.values(io)
    const func = 'return `' + template + '`'

    return new Function(...keys, func).apply(null, values)
  }
}

export default async (section: string): Promise<any> => {
  const files = await vscode.window.showOpenDialog({ canSelectMany: true })

  if (files?.length) {
    return new Pic(section).upload(files.map(file => file.fsPath))
  }
}
