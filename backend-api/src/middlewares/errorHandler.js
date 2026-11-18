export function errorHandler(err, req, res, next) {
  console.error('[Error]', err);

  // خطای اعتبارسنجی Mongoose
  if (err.name === 'ValidationError') {
    const messages = Object.values(err.errors).map(val => val.message);
    return res.status(400).json({
      success: false,
      message: 'خطای اعتبارسنجی داده‌ها',
      errors: messages,
    });
  }

  // کلید تکراری Mongoose Duplicate Key (11000)
  if (err.code === 11000) {
    const field = Object.keys(err.keyValue).join(', ');
    return res.status(409).json({
      success: false,
      message: `مقدار وارد شده برای فیلد '${field}' تکراری است.`,
    });
  }

  // خطای CastError (فرمت نامعتبر ObjectId)
  if (err.name === 'CastError') {
    return res.status(400).json({
      success: false,
      message: `فرمت شناسه '${err.value}' نامعتبر است.`,
    });
  }

  const statusCode = err.statusCode || 500;
  res.status(statusCode).json({
    success: false,
    message: err.message || 'خطای داخلی سرور رخ داده است.',
  });
}
