export function apiErrorMessage(error, fallback = 'Something went wrong') {
  if (error.response && error.response.data) {
    const { message, errors } = error.response.data;
    if (Array.isArray(errors) && errors.length > 0) return errors.join('. ');
    if (message) return message;
  }
  if (error.message) return error.message;
  return fallback;
}
