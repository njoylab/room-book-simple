import { formatTime, formatDate, parseDate, addDays, formatDisplayDate } from '../date'

describe('Date Utilities', () => {
  describe('formatTime', () => {
    it('should format time correctly for whole hours', () => {
      expect(formatTime(3600)).toBe('01:00') // 1 hour
      expect(formatTime(7200)).toBe('02:00') // 2 hours
      expect(formatTime(28800)).toBe('08:00') // 8 hours
    })

    it('should format time correctly with minutes', () => {
      expect(formatTime(3630)).toBe('01:00') // 1 hour 30 seconds (rounds down)
      expect(formatTime(3660)).toBe('01:01') // 1 hour 1 minute
      expect(formatTime(5400)).toBe('01:30') // 1 hour 30 minutes
      expect(formatTime(32400)).toBe('09:00') // 9 hours
    })

    it('should handle zero time', () => {
      expect(formatTime(0)).toBe('00:00')
    })

    it('should pad minutes with leading zero', () => {
      expect(formatTime(3660)).toBe('01:01')
      expect(formatTime(3720)).toBe('01:02')
      expect(formatTime(4080)).toBe('01:08')
    })

    it('should handle large time values', () => {
      expect(formatTime(86400)).toBe('24:00') // 24 hours
      expect(formatTime(90000)).toBe('25:00') // 25 hours
    })
  })

  describe('formatDate', () => {
    it('should format date to YYYY-MM-DD', () => {
      const date = new Date('2024-01-15T10:30:00Z')
      expect(formatDate(date)).toBe('2024-01-15')
    })

    it('should handle different dates', () => {
      expect(formatDate(new Date('2023-12-31T23:59:59Z'))).toBe('2023-12-31')
      expect(formatDate(new Date('2024-02-29T00:00:00Z'))).toBe('2024-02-29') // Leap year
      expect(formatDate(new Date('2024-07-04T12:00:00Z'))).toBe('2024-07-04')
    })

    it('should handle edge cases', () => {
      expect(formatDate(new Date('2024-01-01T00:00:00Z'))).toBe('2024-01-01')
      expect(formatDate(new Date('2024-12-31T23:59:59Z'))).toBe('2024-12-31')
    })
  })

  describe('parseDate', () => {
    it('should parse date string correctly', () => {
      const result = parseDate('2024-01-15')
      expect(result.getUTCFullYear()).toBe(2024)
      expect(result.getUTCMonth()).toBe(0) // January is 0
      expect(result.getUTCDate()).toBe(15)
      expect(result.getUTCHours()).toBe(0)
      expect(result.getUTCMinutes()).toBe(0)
    })

    it('should handle different date formats', () => {
      const result1 = parseDate('2023-12-31')
      expect(result1.getUTCFullYear()).toBe(2023)
      expect(result1.getUTCMonth()).toBe(11) // December is 11
      expect(result1.getUTCDate()).toBe(31)

      const result2 = parseDate('2024-02-29') // Leap year
      expect(result2.getUTCFullYear()).toBe(2024)
      expect(result2.getUTCMonth()).toBe(1) // February is 1
      expect(result2.getUTCDate()).toBe(29)
    })
  })

  describe('addDays', () => {
    it('should add positive days', () => {
      const date = new Date('2024-01-15T10:30:00Z')
      const result = addDays(date, 5)
      expect(formatDate(result)).toBe('2024-01-20')
    })

    it('should subtract days with negative input', () => {
      const date = new Date('2024-01-15T10:30:00Z')
      const result = addDays(date, -5)
      expect(formatDate(result)).toBe('2024-01-10')
    })

    it('should handle month boundaries', () => {
      const date = new Date('2024-01-31T10:30:00Z')
      const result = addDays(date, 1)
      expect(formatDate(result)).toBe('2024-02-01')
    })

    it('should handle year boundaries', () => {
      const date = new Date('2023-12-31T10:30:00Z')
      const result = addDays(date, 1)
      expect(formatDate(result)).toBe('2024-01-01')
    })

    it('should not mutate original date', () => {
      const date = new Date('2024-01-15T10:30:00Z')
      const originalTime = date.getTime()
      addDays(date, 5)
      expect(date.getTime()).toBe(originalTime)
    })

    it('should handle zero days', () => {
      const date = new Date('2024-01-15T10:30:00Z')
      const result = addDays(date, 0)
      expect(formatDate(result)).toBe('2024-01-15')
    })
  })

  describe('formatDisplayDate', () => {
    beforeEach(() => {
      // Mock Date to have consistent "today"
      jest.useFakeTimers()
      jest.setSystemTime(new Date('2024-01-15T10:30:00Z'))
    })

    afterEach(() => {
      jest.useRealTimers()
    })

    it('should return "Today" for current date', () => {
      const today = new Date('2024-01-15T15:30:00Z')
      expect(formatDisplayDate(today)).toBe('Today')
    })

    it('should return "Tomorrow" for next day', () => {
      const tomorrow = new Date('2024-01-16T10:30:00Z')
      expect(formatDisplayDate(tomorrow)).toBe('Tomorrow')
    })

    it('should return "Yesterday" for previous day', () => {
      const yesterday = new Date('2024-01-14T10:30:00Z')
      expect(formatDisplayDate(yesterday)).toBe('Yesterday')
    })

    it('should return formatted date for other dates', () => {
      const futureDate = new Date('2024-01-20T10:30:00Z')
      const result = formatDisplayDate(futureDate)
      expect(result).toMatch(/Saturday, January 20, 2024/)
    })

    it('should return formatted date for past dates', () => {
      const pastDate = new Date('2024-01-10T10:30:00Z')
      const result = formatDisplayDate(pastDate)
      expect(result).toMatch(/Wednesday, January 10, 2024/)
    })

    it('should handle different years', () => {
      const differentYear = new Date('2023-01-15T10:30:00Z')
      const result = formatDisplayDate(differentYear)
      expect(result).toMatch(/Sunday, January 15, 2023/)
    })
  })
})