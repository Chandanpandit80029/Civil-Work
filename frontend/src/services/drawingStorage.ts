const DB_NAME = 'drawing-library';
const DB_VERSION = 1;
const STORE_NAME = 'drawings';

interface DrawingRecord {
  id: string;
  name: string;
  date: string;
  size: string;
  type: string;
  fileData: ArrayBuffer | null;
  mimeType: string;
}

interface DrawingInput {
  id: string;
  name: string;
  date: string;
  size: string;
  type: string;
  file?: File;
  category?: string;
  notes?: string;
  rateItems?: any[];
}

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' });
        store.createIndex('name', 'name', { unique: false });
        store.createIndex('date', 'date', { unique: false });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function saveDrawings(
  drawings: DrawingInput[]
): Promise<void> {
  // First, read all file data outside the transaction to avoid auto-commit
  const records: DrawingRecord[] = await Promise.all(
    drawings.map(async (drawing) => {
      let fileData: ArrayBuffer | null = null;
      let mimeType = '';

      if (drawing.file) {
        fileData = await drawing.file.arrayBuffer();
        mimeType = drawing.file.type;
      }

      return {
        id: drawing.id,
        name: drawing.name,
        date: drawing.date,
        size: drawing.size,
        type: drawing.type,
        fileData,
        mimeType,
      };
    })
  );

  // Now do all database operations in a single transaction (no awaits between ops)
  const db = await openDB();
  const tx = db.transaction(STORE_NAME, 'readwrite');
  const store = tx.objectStore(STORE_NAME);

  // Clear existing and add new records
  store.clear();
  for (const record of records) {
    store.put(record);
  }

  return new Promise((resolve, reject) => {
    tx.oncomplete = () => {
      db.close();
      resolve();
    };
    tx.onerror = () => {
      db.close();
      reject(tx.error);
    };
  });
}

export async function loadDrawings(): Promise<
  {
    id: string;
    name: string;
    date: string;
    size: string;
    type: string;
    dataUrl?: string;
    file?: File;
    category?: string;
    notes?: string;
    rateItems?: any[];
  }[]
> {
  const db = await openDB();
  const tx = db.transaction(STORE_NAME, 'readonly');
  const store = tx.objectStore(STORE_NAME);
  const request = store.getAll();

  return new Promise((resolve, reject) => {
    request.onsuccess = () => {
      const records: DrawingRecord[] = request.result;
      const drawings = records.map((record) => {
        let file: File | undefined;
        let dataUrl: string | undefined;

        if (record.fileData) {
          const blob = new Blob([record.fileData], { type: record.mimeType || 'application/octet-stream' });
          file = new File([blob], record.name, { type: record.mimeType || 'application/octet-stream' });

          const IMAGE_EXTENSIONS = ['PNG', 'JPG', 'JPEG', 'TIF', 'TIFF', 'BMP', 'GIF', 'WEBP', 'SVG'];
          const ext = record.type.toUpperCase();
          if (IMAGE_EXTENSIONS.includes(ext)) {
            dataUrl = URL.createObjectURL(blob);
          }
        }

        return {
          id: record.id,
          name: record.name,
          date: record.date,
          size: record.size,
          type: record.type,
          dataUrl,
          file,
        };
      });
      db.close();
      resolve(drawings);
    };
    request.onerror = () => {
      db.close();
      reject(request.error);
    };
  });
}

export async function deleteDrawing(id: string): Promise<void> {
  const db = await openDB();
  const tx = db.transaction(STORE_NAME, 'readwrite');
  const store = tx.objectStore(STORE_NAME);
  store.delete(id);

  return new Promise((resolve, reject) => {
    tx.oncomplete = () => {
      db.close();
      resolve();
    };
    tx.onerror = () => {
      db.close();
      reject(tx.error);
    };
  });
}