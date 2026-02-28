/**
 * Example controller - replace with your domain controllers.
 * Controllers handle request/response and call models/services.
 */

export const getExample = async (req, res, next) => {
  try {
    res.json({ message: 'Example controller response' });
  } catch (error) {
    next(error);
  }
};
