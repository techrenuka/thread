import companiesData from "./data/companies.json";
import dhagasData from "./data/dhaga.json";
import materialsData from "./data/materials.json";
import sizesData from "./data/sizes.json";

const dbName = "NiddleConfig";
const dbVersion = 1;
const storeNames = ["companies", "dhagas", "materials", "sizes", "designs"];

let db;

const openDatabase = () => {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(dbName, dbVersion);

        request.onupgradeneeded = (event) => {
            db = event.target.result;
            
            // Create stores with appropriate key configurations
            if (!db.objectStoreNames.contains("companies")) {
                db.createObjectStore("companies", { keyPath: "code" });
            }
            if (!db.objectStoreNames.contains("dhagas")) {
                db.createObjectStore("dhagas", { keyPath: "code" });
            }
            if (!db.objectStoreNames.contains("materials")) {
                db.createObjectStore("materials", { keyPath: "code" });
            }
            if (!db.objectStoreNames.contains("sizes")) {
                db.createObjectStore("sizes", { keyPath: "code" });
            }
            // Create designs store with designName as keyPath
            if (!db.objectStoreNames.contains("designs")) {
                db.createObjectStore("designs", { keyPath: "designName" });
            }
        };

        request.onsuccess = (event) => {
            db = event.target.result;
            resolve(db);
        };

        request.onerror = (event) => {
            reject("Database error: " + event.target.errorCode);
        };
    });
};

const migrateData = async () => {
    const db = await openDatabase();
    
    // Check if data already exists in any store
    const checkDataExists = async () => {
        const promises = storeNames.map(storeName => {
            return new Promise((resolve) => {
                const transaction = db.transaction(storeName, "readonly");
                const store = transaction.objectStore(storeName);
                const countRequest = store.count();
                countRequest.onsuccess = () => resolve(countRequest.result > 0);
                countRequest.onerror = () => resolve(false);
            });
        });
        
        const results = await Promise.all(promises);
        return results.some(hasData => hasData);
    };

    const hasExistingData = await checkDataExists();
    if (hasExistingData) {
        console.log("Migration skipped: Data already exists in one or more stores");
        return;
    }

    // Proceed with migration
    const transaction = db.transaction(storeNames, "readwrite");

    // Migrate data for each store
    storeNames.forEach(storeName => {
        const store = transaction.objectStore(storeName);
        let data;
        
        switch (storeName) {
            case "companies":
                data = companiesData;
                break;
            case "dhagas":
                data = dhagasData;
                break;
            case "materials":
                data = materialsData;
                break;
            case "sizes":
                data = sizesData;
                break;
            case "designs":
                data = []; // Initialize empty designs store
                break;
            default:
                data = [];
        }

        if (data && data.length > 0) {
            data.forEach(item => {
                const request = store.put(item);
                request.onerror = (event) => {
                    console.error(`Error adding item to ${storeName}:`, event.target.error);
                };
            });
        }
    });

    return new Promise((resolve, reject) => {
        transaction.oncomplete = () => {
            console.log("Data migration completed successfully");
            resolve();
        };

        transaction.onerror = (event) => {
            console.error("Data migration error:", event.target.error);
            reject(event.target.error);
        };
    });
};

export { openDatabase, migrateData }; 