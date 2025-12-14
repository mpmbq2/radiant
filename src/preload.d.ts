export interface ElectronAPI {
  sendMessage: (channel: string, data: unknown) => void;
  onMessage: (channel: string, callback: (data: unknown) => void) => void;
}

declare global {
  interface Window {
    electronAPI: ElectronAPI;
  }
}
