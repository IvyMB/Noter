/** Traduções (en/pt). Inglês é o padrão e o fallback. */
import { createContext, useContext } from 'react'
import type { Language } from '@shared/types'

export const LANGUAGES: Record<Language, string> = { en: 'English', pt: 'Português' }

const en = {
  'app.vault': 'Vault',
  'app.openFolder': 'Open folder…',
  'app.language': 'Language',
  'app.theme': 'Theme',
  'theme.dark': 'Dark',
  'theme.light': 'Light',
  'tab.editor': 'Editor',
  'tab.cards': 'Cards',
  'tab.graph': 'Graph',
  'sidebar.search': 'Search…',
  'sidebar.byFolder': 'By folder',
  'sidebar.byKind': 'By type',
  'sidebar.newNote': 'New note',
  'sidebar.newFolder': 'New folder',
  'sidebar.empty': 'No notes found',
  'ctx.move': 'Move to folder…',
  'ctx.changeKind': 'Change type',
  'ctx.delete': 'Delete',
  'dlg.newNote': 'New note',
  'dlg.newFolder': 'New folder',
  'dlg.newFolder.hint': 'Use / for subfolders',
  'dlg.move': 'Move note',
  'dlg.delete': 'Delete note',
  'dlg.delete.text': "Delete '{name}'? This cannot be undone.",
  'field.title': 'Title',
  'field.kind': 'Type',
  'field.folder': 'Folder',
  'field.folder.root': 'Root',
  'common.create': 'Create',
  'common.move': 'Move',
  'common.delete': 'Delete',
  'common.cancel': 'Cancel',
  'editor.backlinks': 'Backlinks',
  'editor.noBacklinks': 'No notes link here',
  'editor.empty': 'Select or create a note',
  'chat.title': 'Local LLM (Ollama)',
  'chat.context': 'Use current note as context',
  'chat.placeholder': 'Ask something… (Enter to send)',
  'chat.you': 'You',
  'chat.ai': 'AI',
  'chat.offline': 'Ollama offline / no models',
  'chat.systemNote': "User's note:",
  'chat.error': 'Error talking to Ollama: {err}. Is it installed and running?',
  'chat.refresh': 'Refresh models',
  'chat.toggle': 'Toggle chat',
  'cards.all': 'All',
  'cards.sort': 'Sort',
  'cards.recent': 'Recent',
  'cards.name': 'Name',
  'cards.connections': '{n} connections',
  'cards.linksTo': 'Links to {name}',
  'cards.linkedFrom': 'Linked from {name}',
  'cards.noExcerpt': 'Empty note',
  'cards.search': 'Filter cards…',
  'cards.allFolders': 'All folders',
  'cards.connectedTo': 'Connected to',
  'cards.pickNote': 'Pick a note…',
  'cards.dir.any': 'Any',
  'cards.dir.out': 'Links to',
  'cards.dir.in': 'Linked from',
  'cards.depth': 'Hops away',
  'cards.showing': 'Showing {n} of {total}',
  'cards.clear': 'Clear filters',
  'cards.showConnected': 'Show only notes connected to this one',
  'graph.hint': 'Double-click a node to open · drag to move · scroll to zoom',
  'kind.Note': 'Note',
  'kind.Idea': 'Idea',
  'kind.Project': 'Project',
  'kind.Task': 'Task',
  'kind.Meeting': 'Meeting',
  'kind.Journal': 'Journal',
  'kind.Reference': 'Reference'
}

type Key = keyof typeof en

const pt: Record<Key, string> = {
  'app.vault': 'Vault',
  'app.openFolder': 'Abrir pasta…',
  'app.language': 'Idioma',
  'app.theme': 'Tema',
  'theme.dark': 'Escuro',
  'theme.light': 'Claro',
  'tab.editor': 'Editor',
  'tab.cards': 'Cards',
  'tab.graph': 'Grafo',
  'sidebar.search': 'Buscar…',
  'sidebar.byFolder': 'Por pastas',
  'sidebar.byKind': 'Por tipo',
  'sidebar.newNote': 'Nova nota',
  'sidebar.newFolder': 'Nova pasta',
  'sidebar.empty': 'Nenhuma nota encontrada',
  'ctx.move': 'Mover para pasta…',
  'ctx.changeKind': 'Alterar tipo',
  'ctx.delete': 'Excluir',
  'dlg.newNote': 'Nova nota',
  'dlg.newFolder': 'Nova pasta',
  'dlg.newFolder.hint': 'Use / para subpastas',
  'dlg.move': 'Mover nota',
  'dlg.delete': 'Excluir nota',
  'dlg.delete.text': "Excluir '{name}'? Isso não pode ser desfeito.",
  'field.title': 'Título',
  'field.kind': 'Tipo',
  'field.folder': 'Pasta',
  'field.folder.root': 'Raiz',
  'common.create': 'Criar',
  'common.move': 'Mover',
  'common.delete': 'Excluir',
  'common.cancel': 'Cancelar',
  'editor.backlinks': 'Backlinks',
  'editor.noBacklinks': 'Nenhuma nota aponta para cá',
  'editor.empty': 'Selecione ou crie uma nota',
  'chat.title': 'LLM local (Ollama)',
  'chat.context': 'Usar nota atual como contexto',
  'chat.placeholder': 'Pergunte algo… (Enter envia)',
  'chat.you': 'Você',
  'chat.ai': 'IA',
  'chat.offline': 'Ollama offline / sem modelos',
  'chat.systemNote': 'Nota do usuário:',
  'chat.error': 'Erro falando com o Ollama: {err}. Ele está instalado e rodando?',
  'chat.refresh': 'Atualizar modelos',
  'chat.toggle': 'Mostrar/ocultar chat',
  'cards.all': 'Todos',
  'cards.sort': 'Ordenar',
  'cards.recent': 'Recentes',
  'cards.name': 'Nome',
  'cards.connections': '{n} conexões',
  'cards.linksTo': 'Aponta para {name}',
  'cards.linkedFrom': 'Referenciada por {name}',
  'cards.noExcerpt': 'Nota vazia',
  'cards.search': 'Filtrar cards…',
  'cards.allFolders': 'Todas as pastas',
  'cards.connectedTo': 'Conectadas a',
  'cards.pickNote': 'Escolha uma nota…',
  'cards.dir.any': 'Qualquer',
  'cards.dir.out': 'Aponta para',
  'cards.dir.in': 'Referenciada por',
  'cards.depth': 'Saltos de distância',
  'cards.showing': 'Mostrando {n} de {total}',
  'cards.clear': 'Limpar filtros',
  'cards.showConnected': 'Mostrar só notas conectadas a esta',
  'graph.hint': 'Duplo clique abre a nota · arraste para mover · role para dar zoom',
  'kind.Note': 'Nota',
  'kind.Idea': 'Ideia',
  'kind.Project': 'Projeto',
  'kind.Task': 'Tarefa',
  'kind.Meeting': 'Reunião',
  'kind.Journal': 'Diário',
  'kind.Reference': 'Referência'
}

const STRINGS: Record<Language, Record<Key, string>> = { en, pt }

export type TFn = (key: Key, vars?: Record<string, string>) => string
export type KindFn = (kind: string) => string

export function makeT(lang: Language): { t: TFn; kindLabel: KindFn } {
  const t: TFn = (key, vars) => {
    let s = STRINGS[lang][key] ?? en[key] ?? key
    for (const [k, v] of Object.entries(vars ?? {})) s = s.replace(`{${k}}`, v)
    return s
  }
  const kindLabel: KindFn = (kind) => {
    const key = `kind.${kind}` as Key
    return key in en ? t(key) : kind
  }
  return { t, kindLabel }
}

interface I18n {
  t: TFn
  kindLabel: KindFn
  lang: Language
}

export const I18nContext = createContext<I18n>({ ...makeT('en'), lang: 'en' })
export const useI18n = (): I18n => useContext(I18nContext)
