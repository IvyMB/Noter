import { BrowserWindow, Menu, app, dialog, ipcMain, shell } from 'electron'
import { randomUUID } from 'crypto'
import { join } from 'path'
import type { ChatMessage, NoteData, Settings } from '../shared/types'
import { chat, listModels } from './ollama'
import { loadSettings, saveSettings } from './settings'
import { Vault } from './vault'

let settings: Settings
let vault: Vault

function createWindow(): BrowserWindow {
  const win = new BrowserWindow({
    width: 1400,
    height: 860,
    minWidth: 900,
    minHeight: 600,
    show: false,
    title: 'Noter',
    backgroundColor: settings.theme === 'dark' ? '#1a1b26' : '#f4f5fa',
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false
    }
  })
  win.on('ready-to-show', () => win.show())
  win.webContents.setWindowOpenHandler(({ url }) => {
    void shell.openExternal(url)
    return { action: 'deny' }
  })
  if (process.env['ELECTRON_RENDERER_URL']) void win.loadURL(process.env['ELECTRON_RENDERER_URL'])
  else void win.loadFile(join(__dirname, '../renderer/index.html'))
  return win
}

function registerIpc(): void {
  ipcMain.handle('settings:get', () => settings)
  ipcMain.handle('settings:set', async (_e, patch: Partial<Settings>) => {
    settings = { ...settings, ...patch }
    saveSettings(settings)
    if (patch.vaultDir) {
      vault = new Vault(settings.vaultDir)
      await vault.init()
    }
    return settings
  })

  ipcMain.handle('vault:pick', async (e) => {
    const win = BrowserWindow.fromWebContents(e.sender)!
    const r = await dialog.showOpenDialog(win, { properties: ['openDirectory', 'createDirectory'] })
    return r.canceled ? null : r.filePaths[0]
  })
  ipcMain.handle('vault:list', () => vault.list())
  ipcMain.handle('vault:read', (_e, name: string) => vault.read(name))
  ipcMain.handle('vault:write', (_e, note: NoteData) => vault.write(note))
  ipcMain.handle('vault:create', (_e, name: string, kind: string, folder: string) =>
    vault.create(name, kind, folder)
  )
  ipcMain.handle('vault:remove', (_e, name: string) => vault.remove(name))
  ipcMain.handle('vault:move', (_e, name: string, folder: string) => vault.move(name, folder))
  ipcMain.handle('vault:createFolder', (_e, folder: string) => vault.createFolder(folder))
  ipcMain.handle('vault:search', (_e, q: string) => vault.search(q))

  ipcMain.handle('llm:models', () => listModels())
  ipcMain.handle('llm:chat', (e, model: string, messages: ChatMessage[]) => {
    const id = randomUUID()
    void chat(id, model, messages, (ev) => {
      if (!e.sender.isDestroyed()) e.sender.send('llm:event', ev)
    })
    return id
  })
}

app.whenReady().then(async () => {
  settings = loadSettings()
  vault = new Vault(settings.vaultDir)
  await vault.init()
  Menu.setApplicationMenu(null)
  registerIpc()
  createWindow()
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})
