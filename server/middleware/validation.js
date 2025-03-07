const Joi = require('joi');

const botRegistrationSchema = Joi.object({
  name: Joi.string().required().min(3).max(50),
  type: Joi.string().required().valid('news', 'trend', 'conversation', 'insider', 'hype'),
  locations: Joi.array().items(
    Joi.object({
      lat: Joi.number().required().min(-90).max(90),
      lng: Joi.number().required().min(-180).max(180),
      radius: Joi.number().required().min(0.1).max(100) // radius in kilometers
    })
  ).min(1).required(),
  topics: Joi.array().items(Joi.string()).min(1).required(),
  responseTemplates: Joi.array().items(Joi.string()).min(1).when('type', {
    is: 'conversation',
    then: Joi.array().required(),
    otherwise: Joi.optional()
  })
});

const postSchema = Joi.object({
  content: Joi.string().required().min(1).max(500),
  location: Joi.object({
    lat: Joi.number().required().min(-90).max(90),
    lng: Joi.number().required().min(-180).max(180)
  }).required(),
  type: Joi.string().required().valid('news', 'trend', 'conversation', 'insider', 'hype'),
  media: Joi.array().items(Joi.string().uri()).optional(),
  tags: Joi.array().items(Joi.string()).optional(),
  placeId: Joi.string().optional()
});

const interactionSchema = Joi.object({
  type: Joi.string().required().valid('like', 'comment', 'share'),
  postId: Joi.string().required().hex().length(24),
  content: Joi.when('type', {
    is: 'comment',
    then: Joi.string().required().min(1).max(280),
    otherwise: Joi.forbidden()
  })
});

exports.validateBotRegistration = async (req, res, next) => {
  try {
    await botRegistrationSchema.validateAsync(req.body, { abortEarly: false });
    next();
  } catch (error) {
    res.status(400).json({
      success: false,
      error: {
        code: 'validation_error',
        message: 'Invalid bot registration data',
        details: error.details.map(detail => ({
          field: detail.path.join('.'),
          message: detail.message
        }))
      }
    });
  }
};

exports.validatePost = async (req, res, next) => {
  try {
    await postSchema.validateAsync(req.body, { abortEarly: false });
    next();
  } catch (error) {
    res.status(400).json({
      success: false,
      error: {
        code: 'validation_error',
        message: 'Invalid post data',
        details: error.details.map(detail => ({
          field: detail.path.join('.'),
          message: detail.message
        }))
      }
    });
  }
};

exports.validateInteraction = async (req, res, next) => {
  try {
    await interactionSchema.validateAsync(req.body, { abortEarly: false });
    next();
  } catch (error) {
    res.status(400).json({
      success: false,
      error: {
        code: 'validation_error',
        message: 'Invalid interaction data',
        details: error.details.map(detail => ({
          field: detail.path.join('.'),
          message: detail.message
        }))
      }
    });
  }
}; 