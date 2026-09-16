interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
  clear(): void;
}

export class Storage {
  private readonly storage: StorageLike;

  constructor(
    private readonly key = 'library-data',
    storage?: StorageLike,
  ) {
    this.storage = storage ?? window.localStorage;
  }

  save<T>(value: T): void {
    this.storage.setItem(this.key, JSON.stringify(value));
  }

  load<T>(fallback: T): T {
    const raw = this.storage.getItem(this.key);
    if (!raw) return fallback;
    try {
      return JSON.parse(raw) as T;
    } catch {
      return fallback;
    }
  }

  remove(): void {
    this.storage.removeItem(this.key);
  }

  clear(): void {
    this.storage.clear();
  }
}
