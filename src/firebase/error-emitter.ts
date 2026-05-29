
'use client';

import { FirestorePermissionError } from './errors';

type Listener = (error: FirestorePermissionError) => void;

class ErrorEmitter {
  private listeners: { [key: string]: Listener[] } = {};

  on(event: string, listener: Listener) {
    if (!this.listeners[event]) {
      this.listeners[event] = [];
    }
    this.listeners[event].push(listener);
  }

  off(event: string, listener: Listener) {
    if (!this.listeners[event]) return;
    this.listeners[event] = this.listeners[event].filter(l => l !== listener);
  }

  emit(event: string, error: FirestorePermissionError) {
    if (!this.listeners[event]) return;
    this.listeners[event].forEach(listener => listener(error));
  }
}

export const errorEmitter = new ErrorEmitter();
