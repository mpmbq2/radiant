import { contextBridge, ipcRenderer } from 'electron';

// Expose protected methods that allow the renderer process to use
// ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electronAPI', {
  // Example: send a message to main process
  sendMessage: (channel: string, data: unknown) => {
    // Whitelist channels
    const validChannels = ['toMain'];
    if (validChannels.includes(channel)) {
      ipcRenderer.send(channel, data);
    }
  },
  // Example: receive a message from main process
  onMessage: (channel: string, callback: (data: unknown) => void) => {
    const validChannels = ['fromMain'];
    if (validChannels.includes(channel)) {
      ipcRenderer.on(channel, (_event, data) => callback(data));
    }
  },
});
