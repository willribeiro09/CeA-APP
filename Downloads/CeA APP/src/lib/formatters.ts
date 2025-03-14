/**
 * Format a numeric value to USD currency format
 */
export const formatCurrency = (value: number): string => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(value);
};

/**
 * Format a date to MM/DD/YYYY format
 */
export const formatDate = (date: Date | string): string => {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  return dateObj.toLocaleDateString('en-US');
};

/**
 * Format a number with thousands separator
 */
export const formatNumber = (value: number): string => {
  return new Intl.NumberFormat('en-US').format(value);
}; 