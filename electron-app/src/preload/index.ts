import { contextBridge, ipcRenderer } from 'electron'
import type { ChatEvent, NoterApi } from '../shared/types'

const api: NoterApi = {
  settings: {
    get: () => ipcRenderer.invoke('settings:get'),
    set: (patch) => ipcRenderer.invoke('settings:set', patch)
  },
  vault: {
    pick: () => ipcRenderer.invoke('vault:pick'),
    list: () => ipcRenderer.invoke('vault:list'),
    read: (name) => ipcRenderer.invoke('vault:read', name),
    write: (note) => ipcRenderer.invoke('vault:write', note),
    create: (name, kind, folder) => ipcRenderer.invoke('vault:create', name, kind, folder),
    remove: (name) => ipcRenderer.invoke('vault:remove', name),
    move: (name, folder) => ipcRenderer.invoke('vault:move', name, folder),
    createFolder: (folder) => ipcRenderer.invoke('vault:createFolder', folder),
    search: (q) => ipcRenderer.invoke('vault:search', q)
  },
  llm: {
    models: () => ipcRenderer.invoke('llm:models'),
    chat: (model, messages) => ipcRenderer.invoke('llm:chat', model, messages),
    onEvent: (cb) => {
      const handler = (_e: unknown, ev: ChatEvent): void => cb(ev)
      ipcRenderer.on('llm:event', handler)
      return () => ipcRenderer.removeListener('llm:event', handler)
    }
  }
}

contextBridge.exposeInMainWorld('api', api)
