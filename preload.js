const { contextBridge, ipcRenderer, webUtils } = require('electron');
const inv = (c) => (...a) => ipcRenderer.invoke(c, ...a);
contextBridge.exposeInMainWorld('api', {
  getPathForFile: (file) => {
    try {
      return (webUtils && webUtils.getPathForFile) ? webUtils.getPathForFile(file) : (file && file.path) || '';
    } catch {
      return (file && file.path) || '';
    }
  },
  createProject: inv('project:create'),
  openProject: inv('project:open'),
  openHtmlFile: inv('project:openHtmlFile'),
  projectInfo: inv('project:info'),
  readPage: inv('page:read'),
  writePage: inv('page:write'),
  createPage: inv('page:create'),
  deletePage: inv('page:delete'),
  importImage: inv('asset:import'),
  importApp: inv('app:import'),
  importAppBulk: inv('app:importBulk'),
  importAppFile: inv('app:importFile'),
  cloneAppUrl: inv('app:cloneUrl'),
  listApps: inv('apps:list'),
  styleProjectApps: inv('app:styleHtml'),
  saveCustomApp: inv('app:saveCustom'),
  readAppCode: inv('app:readCode'),
  deleteApp: inv('app:delete'),
  clone: inv('clone:run'),
  pickFolder: inv('dialog:folder'),
  defaultCloneDir: inv('clone:defaultDir'),
  fullscreen: inv('win:fullscreen'),
  openFolder: inv('shell:folder'),
  openInBrowser: inv('shell:browser'),
  openExternal: inv('shell:external'),
  showItem: inv('shell:showItem'),
  listFonts: inv('fonts:list'),
  listAssets: inv('assets:list'),
  getRecentProjects: inv('project:recent'),
  getTemplateCatalog: inv('templates:catalog'),
  fetchNeocities: inv('templates:neocities'),
  searchGithubTemplates: inv('templates:github'),
  searchWasmApps: inv('templates:wasm'),
  importWasm4Cart: inv('app:importWasm4'),
  setGithubToken: inv('templates:setGithubToken'),
  rollFreshTemplate: inv('templates:rollFresh'),
  cloneCommunityTemplate: inv('templates:cloneCommunity'),
  publishInfo: inv('publish:info'),
  pickHtmlFileForPublish: inv('publish:pickHtmlFile'),
  publishSetToken: inv('publish:setToken'),
  publishForget: inv('publish:forget'),
  publishRun: inv('publish:run'),
  onPublishProgress: (cb) => ipcRenderer.on('publish:progress', (_, m) => cb(m)),
  onCloneProgress: (cb) => ipcRenderer.on('clone:progress', (_, m) => cb(m))
});
