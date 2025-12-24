
const getErrorMessage = (error) => {
  if (error.response?.data?.message) {
    return error.response.data.message;
  }
  if (error.response?.data?.errors) {
    return error.response.data.errors.map(e => e.message).join(', ');
  }
  return error.message || 'Something went wrong';
};

module.exports = {
  // ... other helpers
  getErrorMessage
};