/**
 * @fileoverview Tests for custom Airtable client
 * @description Comprehensive test suite for the custom Airtable HTTP client
 * covering all CRUD operations, pagination, error handling, and edge cases.
 */

// Mock fetch globally
const mockFetch = jest.fn();
global.fetch = mockFetch;

// Mock environment
jest.mock('../env', () => ({
  env: {
    AIRTABLE_API_KEY: 'test-api-key',
    AIRTABLE_BASE_ID: 'test-base-id',
  }
}));

import { fetchAllRecords, fetchRecord, createRecord, updateRecord } from '../airtable_client';

describe('airtable_client', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockFetch.mockClear();
  });

  describe('fetchAllRecords', () => {
    it('should fetch all records with default options', async () => {
      const mockResponse = {
        records: [
          { id: 'rec1', fields: { name: 'Test 1' }, createdTime: '2024-01-01T00:00:00.000Z' },
          { id: 'rec2', fields: { name: 'Test 2' }, createdTime: '2024-01-01T00:00:00.000Z' }
        ]
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: jest.fn().mockResolvedValue(mockResponse)
      });

      const result = await fetchAllRecords('TestTable');

      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.airtable.com/v0/test-base-id/TestTable?',
        {
          headers: {
            'Authorization': 'Bearer test-api-key',
            'Content-Type': 'application/json',
          },
          next: undefined
        }
      );

      expect(result).toEqual(mockResponse.records);
    });

    it('should fetch records with fields filter', async () => {
      const mockResponse = {
        records: [
          { id: 'rec1', fields: { name: 'Test 1' }, createdTime: '2024-01-01T00:00:00.000Z' }
        ]
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: jest.fn().mockResolvedValue(mockResponse)
      });

      const result = await fetchAllRecords('TestTable', {
        fields: ['name', 'status']
      });

      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.airtable.com/v0/test-base-id/TestTable?fields%5B%5D=name&fields%5B%5D=status',
        expect.any(Object)
      );

      expect(result).toEqual(mockResponse.records);
    });

    it('should fetch records with sort options', async () => {
      const mockResponse = {
        records: [
          { id: 'rec1', fields: { name: 'A Test' }, createdTime: '2024-01-01T00:00:00.000Z' },
          { id: 'rec2', fields: { name: 'B Test' }, createdTime: '2024-01-01T00:00:00.000Z' }
        ]
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: jest.fn().mockResolvedValue(mockResponse)
      });

      const result = await fetchAllRecords('TestTable', {
        sort: [{ field: 'name', direction: 'asc' }]
      });

      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.airtable.com/v0/test-base-id/TestTable?sort%5B0%5D%5Bfield%5D=name&sort%5B0%5D%5Bdirection%5D=asc',
        expect.any(Object)
      );

      expect(result).toEqual(mockResponse.records);
    });

    it('should fetch records with filter formula', async () => {
      const mockResponse = {
        records: [
          { id: 'rec1', fields: { name: 'Active Test', status: 'Active' }, createdTime: '2024-01-01T00:00:00.000Z' }
        ]
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: jest.fn().mockResolvedValue(mockResponse)
      });

      const result = await fetchAllRecords('TestTable', {
        filterByFormula: "{status} = 'Active'"
      });

      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.airtable.com/v0/test-base-id/TestTable?filterByFormula=%7Bstatus%7D+%3D+%27Active%27',
        expect.any(Object)
      );

      expect(result).toEqual(mockResponse.records);
    });

    it('should handle pagination automatically', async () => {
      const firstResponse = {
        records: [
          { id: 'rec1', fields: { name: 'Test 1' }, createdTime: '2024-01-01T00:00:00.000Z' }
        ],
        offset: 'next-page-offset'
      };

      const secondResponse = {
        records: [
          { id: 'rec2', fields: { name: 'Test 2' }, createdTime: '2024-01-01T00:00:00.000Z' }
        ]
      };

      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: jest.fn().mockResolvedValue(firstResponse)
        })
        .mockResolvedValueOnce({
          ok: true,
          json: jest.fn().mockResolvedValue(secondResponse)
        });

      const result = await fetchAllRecords('TestTable');

      expect(mockFetch).toHaveBeenCalledTimes(2);
      expect(mockFetch).toHaveBeenNthCalledWith(2,
        'https://api.airtable.com/v0/test-base-id/TestTable?offset=next-page-offset',
        expect.any(Object)
      );

      expect(result).toEqual([...firstResponse.records, ...secondResponse.records]);
    });

    it('should handle API errors gracefully', async () => {
      const errorResponse = {
        error: { message: 'Invalid API key' }
      };

      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
        statusText: 'Unauthorized',
        json: jest.fn().mockResolvedValue(errorResponse)
      });

      await expect(fetchAllRecords('TestTable')).rejects.toThrow(
        'Airtable API error: 401 - Invalid API key'
      );
    });

    it('should handle malformed error responses', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
        json: jest.fn().mockRejectedValue(new Error('Invalid JSON'))
      });

      await expect(fetchAllRecords('TestTable')).rejects.toThrow(
        'Airtable API error: 500 - Internal Server Error'
      );
    });

    it('should pass cache options correctly', async () => {
      const mockResponse = {
        records: [
          { id: 'rec1', fields: { name: 'Test 1' }, createdTime: '2024-01-01T00:00:00.000Z' }
        ]
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: jest.fn().mockResolvedValue(mockResponse)
      });

      const cacheOptions = { revalidate: 300 };
      await fetchAllRecords('TestTable', { cacheOptions });

      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          next: cacheOptions
        })
      );
    });
  });

  describe('fetchRecord', () => {
    it('should fetch a single record by ID', async () => {
      const mockRecord = {
        id: 'rec123',
        fields: { name: 'Test Record' },
        createdTime: '2024-01-01T00:00:00.000Z'
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: jest.fn().mockResolvedValue(mockRecord)
      });

      const result = await fetchRecord('TestTable', 'rec123');

      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.airtable.com/v0/test-base-id/TestTable/rec123',
        {
          headers: {
            'Authorization': 'Bearer test-api-key',
            'Content-Type': 'application/json',
          },
          next: undefined
        }
      );

      expect(result).toEqual(mockRecord);
    });

    it('should handle fetch record errors', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
        statusText: 'Not Found',
        json: jest.fn().mockResolvedValue({ error: { message: 'Record not found' } })
      });

      await expect(fetchRecord('TestTable', 'rec123')).rejects.toThrow(
        'Airtable API error: 404 - Record not found'
      );
    });
  });

  describe('createRecord', () => {
    it('should create a new record', async () => {
      const fields = { name: 'New Record', status: 'Active' };
      const mockResponse = {
        id: 'rec456',
        fields,
        createdTime: '2024-01-01T00:00:00.000Z'
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: jest.fn().mockResolvedValue(mockResponse)
      });

      const result = await createRecord('TestTable', fields);

      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.airtable.com/v0/test-base-id/TestTable',
        {
          method: 'POST',
          headers: {
            'Authorization': 'Bearer test-api-key',
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ fields }),
          next: { revalidate: 0 }
        }
      );

      expect(result).toEqual(mockResponse);
    });

    it('should handle create record errors', async () => {
      const fields = { name: 'Invalid Record' };

      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 422,
        statusText: 'Unprocessable Entity',
        json: jest.fn().mockResolvedValue({ 
          error: { message: 'Invalid field value' }
        })
      });

      await expect(createRecord('TestTable', fields)).rejects.toThrow(
        'Airtable API error: 422 - Invalid field value'
      );
    });
  });

  describe('updateRecord', () => {
    it('should update an existing record', async () => {
      const fields = { status: 'Completed' };
      const mockResponse = {
        id: 'rec123',
        fields: { name: 'Test Record', status: 'Completed' },
        createdTime: '2024-01-01T00:00:00.000Z'
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: jest.fn().mockResolvedValue(mockResponse)
      });

      const result = await updateRecord('TestTable', 'rec123', fields);

      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.airtable.com/v0/test-base-id/TestTable/rec123',
        {
          method: 'PATCH',
          headers: {
            'Authorization': 'Bearer test-api-key',
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ fields }),
          next: { revalidate: 0 }
        }
      );

      expect(result).toEqual(mockResponse);
    });

    it('should handle update record errors', async () => {
      const fields = { status: 'Invalid Status' };

      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 422,
        statusText: 'Unprocessable Entity',
        json: jest.fn().mockResolvedValue({ 
          error: { message: 'Invalid field value' }
        })
      });

      await expect(updateRecord('TestTable', 'rec123', fields)).rejects.toThrow(
        'Airtable API error: 422 - Invalid field value'
      );
    });
  });

  describe('URL encoding', () => {
    it('should properly encode complex filter formulas', async () => {
      const mockResponse = { records: [] };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: jest.fn().mockResolvedValue(mockResponse)
      });

      await fetchAllRecords('TestTable', {
        filterByFormula: "AND({status} = 'Active', {date} >= '2024-01-01')"
      });

      const expectedUrl = 'https://api.airtable.com/v0/test-base-id/TestTable?filterByFormula=AND%28%7Bstatus%7D+%3D+%27Active%27%2C+%7Bdate%7D+%3E%3D+%272024-01-01%27%29';
      expect(mockFetch).toHaveBeenCalledWith(expectedUrl, expect.any(Object));
    });

    it('should handle special characters in field names', async () => {
      const mockResponse = { records: [] };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: jest.fn().mockResolvedValue(mockResponse)
      });

      await fetchAllRecords('TestTable', {
        fields: ['Field Name with Spaces', 'Field-with-dashes', 'Field_with_underscores']
      });

      const call = mockFetch.mock.calls[0];
      const url = call[0] as string;
      
      expect(url).toContain('fields%5B%5D=Field+Name+with+Spaces');
      expect(url).toContain('fields%5B%5D=Field-with-dashes');
      expect(url).toContain('fields%5B%5D=Field_with_underscores');
    });
  });

  describe('Network and edge cases', () => {
    it('should handle network errors', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      await expect(fetchAllRecords('TestTable')).rejects.toThrow('Network error');
    });

    it('should handle empty response', async () => {
      const mockResponse = { records: [] };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: jest.fn().mockResolvedValue(mockResponse)
      });

      const result = await fetchAllRecords('TestTable');

      expect(result).toEqual([]);
    });

    it('should handle response with no offset (single page)', async () => {
      const mockResponse = {
        records: [
          { id: 'rec1', fields: { name: 'Test 1' }, createdTime: '2024-01-01T00:00:00.000Z' }
        ]
        // No offset property means no more pages
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: jest.fn().mockResolvedValue(mockResponse)
      });

      const result = await fetchAllRecords('TestTable');

      expect(mockFetch).toHaveBeenCalledTimes(1);
      expect(result).toEqual(mockResponse.records);
    });
  });
});