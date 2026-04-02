import Papa from 'papaparse';

// Get URL references to all patient CSV files inside src/
// ?url makes vite return the public asset URL instead of the file content
const csvFileUrls = import.meta.glob('../*.csv', { query: '?url', eager: true });

export async function fetchPatientTrendData(stayId) {
  if (!stayId) return null;

  // Locate the file matching testidx_X_pid_{stayId}_...csv
  const pidTag = `_pid_${stayId}_`;
  const fileKey = Object.keys(csvFileUrls).find(k => k.includes(pidTag));

  if (!fileKey) {
    console.warn(`[CSV] Patient ${stayId} trends CSV not found.`);
    return null;
  }

  const fileUrl = csvFileUrls[fileKey].default || csvFileUrls[fileKey];

  try {
    const res = await fetch(fileUrl);
    if (!res.ok) throw new Error(`HTTP error ${res.status}`);
    const text = await res.text();
    
    return new Promise((resolve) => {
       Papa.parse(text, {
         header: true,
         dynamicTyping: true, // Auto-convert strings to numbers
         skipEmptyLines: true,
         complete: (results) => {
           if (results.errors.length > 0) {
             console.warn(`[CSV] Parsing warnings for ${stayId}:`, results.errors);
           }
           resolve(results.data);
         },
         error: (err) => {
           console.error(`[CSV] Papaparse error for ${stayId}:`, err);
           resolve(null);
         }
       });
    });
  } catch (e) {
    console.error(`[CSV] Failed to fetch trends CSV for ${stayId}:`, e);
    return null;
  }
}
