export const Validation = {
  validateBookForm(data: { title: string; author: string; year: string }): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];
    if (!data.title.trim()) errors.push('Вкажіть назву книги.');
    if (!data.author.trim()) errors.push('Вкажіть автора.');
    const year = Number(data.year);
    if (!/^\d{4}$/.test(data.year) || year < 1000 || year > 2100) errors.push('Вкажіть коректний рік.');
    return { isValid: errors.length === 0, errors };
  },
  validateUserForm(data: { id: string; name: string; email: string }): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];
    if (!/^\d+$/.test(data.id.trim())) errors.push('ID користувача має містити тільки цифри.');
    if (!data.name.trim()) errors.push("Вкажіть ім'я користувача.");
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email.trim())) errors.push('Вкажіть коректний email.');
    return { isValid: errors.length === 0, errors };
  },
  validateUserId(id: string): { isValid: boolean; errors: string[] } {
    const errors = /^\d+$/.test(id.trim()) ? [] : ['ID користувача має містити тільки цифри.'];
    return { isValid: errors.length === 0, errors };
  },
};
