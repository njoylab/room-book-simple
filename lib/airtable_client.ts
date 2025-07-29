import { env } from './env';

const AIRTABLE_BASE_URL = `https://api.airtable.com/v0/${env.AIRTABLE_BASE_ID}`;

const headers = {
    'Authorization': `Bearer ${env.AIRTABLE_API_KEY}`,
    'Content-Type': 'application/json',
};

interface AirtableRecord {
    id: string;
    fields: Record<string, unknown>;
    createdTime: string;
}

interface AirtableResponse {
    records: AirtableRecord[];
    offset?: string;
}

interface FetchOptions {
    cacheOptions?: RequestInit['next'];
    cache?: RequestInit['cache'];
}

/**
 * Generic function to fetch all records from an Airtable table with automatic pagination
 */
export async function fetchAllRecords(
    table: string,
    options: {
        fields?: string[];
        sort?: Array<{ field: string; direction: 'asc' | 'desc' }>;
        filterByFormula?: string;
        cache?: FetchOptions;
    } = {}
): Promise<AirtableRecord[]> {
    const { fields, sort, filterByFormula, cache } = options;
    const params = new URLSearchParams();

    if (fields?.length) {
        fields.forEach(field => params.append('fields[]', field));
    }

    if (sort?.length) {
        sort.forEach((sortRule, index) => {
            params.append(`sort[${index}][field]`, sortRule.field);
            params.append(`sort[${index}][direction]`, sortRule.direction);
        });
    }

    if (filterByFormula) {
        params.append('filterByFormula', filterByFormula);
    }

    const allRecords: AirtableRecord[] = [];
    let offset: string | undefined;

    do {
        if (offset) {
            params.set('offset', offset);
        }

        const url = `${AIRTABLE_BASE_URL}/${table}?${params.toString()}`;

        const response = await fetch(url, {
            headers,
            next: cache?.cacheOptions,
            cache: cache?.cache
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(`Airtable API error: ${response.status} - ${errorData.error?.message || response.statusText}`);
        }

        const data: AirtableResponse = await response.json();
        allRecords.push(...data.records);
        offset = data.offset;

        // Remove offset from params for next iteration
        if (!offset) {
            params.delete('offset');
        }
    } while (offset);

    return allRecords;
}

/**
 * Fetch a single record by ID
 */
export async function fetchRecord(
    table: string, 
    recordId: string, 
    options: {
        fields?: string[];
        cacheOptions?: RequestInit['next'];
        cache?: RequestInit['cache'];
    } = {}
): Promise<AirtableRecord> {
    let url = `${AIRTABLE_BASE_URL}/${table}/${recordId}`;
    
    // Add fields parameter if specified
    if (options.fields?.length) {
        const params = new URLSearchParams();
        options.fields.forEach(field => params.append('fields[]', field));
        url += `?${params.toString()}`;
    }

    const response = await fetch(url, {
        headers,
        next: options.cacheOptions,
        cache: options.cache
    });

    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(`Airtable API error: ${response.status} - ${errorData.error?.message || response.statusText}`);
    }

    return response.json();
}

/**
 * Create a new record
 */
export async function createRecord(table: string, fields: Record<string, unknown>): Promise<AirtableRecord> {
    const url = `${AIRTABLE_BASE_URL}/${table}`;

    const response = await fetch(url, {
        method: 'POST',
        headers,
        body: JSON.stringify({ fields }),
        next: { revalidate: 0 } // No cache for mutations
    });

    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(`Airtable API error: ${response.status} - ${errorData.error?.message || response.statusText}`);
    }

    return response.json();
}

/**
 * Update a record
 */
export async function updateRecord(table: string, recordId: string, fields: Record<string, unknown>): Promise<AirtableRecord> {
    const url = `${AIRTABLE_BASE_URL}/${table}/${recordId}`;

    const response = await fetch(url, {
        method: 'PATCH',
        headers,
        body: JSON.stringify({ fields }),
        next: { revalidate: 0 } // No cache for mutations
    });

    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(`Airtable API error: ${response.status} - ${errorData.error?.message || response.statusText}`);
    }

    return response.json();
}