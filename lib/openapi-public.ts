const openApiSpec = {
  openapi: '3.1.0',
  info: {
    title: 'B4I Rooms External API',
    version: '1.0.0',
    description: 'External API for trusted clients such as local LLM tools. Authenticate with a bearer token issued by the authenticated web session endpoint.'
  },
  servers: [
    {
      url: 'https://b4irooms.vercel.app'
    }
  ],
  tags: [
    { name: 'Authentication' },
    { name: 'Public API' }
  ],
  paths: {
    '/api/auth/api-token': {
      post: {
        tags: ['Authentication'],
        summary: 'Issue an external API bearer token',
        description: 'Requires the normal authenticated web session cookie. Returns a bearer token for external clients.',
        responses: {
          '201': {
            description: 'Token issued',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ApiTokenResponse' }
              }
            }
          },
          '401': { $ref: '#/components/responses/AuthenticationError' },
          '404': { $ref: '#/components/responses/NotFoundError' }
        }
      }
    },
    '/api/public/me': {
      get: {
        tags: ['Public API'],
        summary: 'Get current bearer token user',
        security: [{ bearerAuth: [] }],
        responses: {
          '200': {
            description: 'Authenticated user',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['user'],
                  properties: {
                    user: { $ref: '#/components/schemas/User' }
                  }
                }
              }
            }
          },
          '401': { $ref: '#/components/responses/AuthenticationError' },
          '404': { $ref: '#/components/responses/NotFoundError' }
        }
      }
    },
    '/api/public/rooms': {
      get: {
        tags: ['Public API'],
        summary: 'List meeting rooms',
        security: [{ bearerAuth: [] }],
        responses: {
          '200': {
            description: 'Meeting rooms',
            content: {
              'application/json': {
                schema: {
                  type: 'array',
                  items: { $ref: '#/components/schemas/MeetingRoom' }
                }
              }
            }
          },
          '401': { $ref: '#/components/responses/AuthenticationError' },
          '404': { $ref: '#/components/responses/NotFoundError' }
        }
      }
    },
    '/api/public/rooms/{id}/slots': {
      get: {
        tags: ['Public API'],
        summary: 'Get availability slots for a room on a date',
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'string' }, description: 'Room identifier' },
          { name: 'date', in: 'query', required: true, schema: { type: 'string', format: 'date' }, description: 'Date in YYYY-MM-DD format' }
        ],
        responses: {
          '200': {
            description: 'Room availability slots',
            content: {
              'application/json': {
                schema: {
                  type: 'array',
                  items: { $ref: '#/components/schemas/TimeSlot' }
                }
              }
            }
          },
          '400': { $ref: '#/components/responses/ValidationError' },
          '401': { $ref: '#/components/responses/AuthenticationError' },
          '404': { $ref: '#/components/responses/NotFoundError' }
        }
      }
    },
    '/api/public/bookings': {
      post: {
        tags: ['Public API'],
        summary: 'Create a booking',
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/CreateBookingRequest' }
            }
          }
        },
        responses: {
          '201': {
            description: 'Booking created',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/Booking' }
              }
            }
          },
          '400': { $ref: '#/components/responses/ValidationError' },
          '401': { $ref: '#/components/responses/AuthenticationError' },
          '404': { $ref: '#/components/responses/NotFoundError' },
          '409': { $ref: '#/components/responses/ConflictError' },
          '429': { $ref: '#/components/responses/RateLimitError' }
        }
      }
    }
  },
  components: {
    securitySchemes: {
      bearerAuth: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' }
    },
    responses: {
      AuthenticationError: {
        description: 'Authentication required or token invalid',
        content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } }
      },
      ValidationError: {
        description: 'Validation error',
        content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } }
      },
      NotFoundError: {
        description: 'Resource not found',
        content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } }
      },
      ConflictError: {
        description: 'Resource conflict',
        content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } }
      },
      RateLimitError: {
        description: 'Rate limit exceeded',
        content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } }
      }
    },
    schemas: {
      ApiTokenResponse: {
        type: 'object',
        required: ['token', 'expiresInHours'],
        properties: {
          token: { type: 'string' },
          expiresInHours: { type: 'integer' }
        }
      },
      User: {
        type: 'object',
        required: ['id', 'name', 'email', 'image', 'team'],
        properties: {
          id: { type: 'string' },
          name: { type: 'string' },
          email: { type: 'string', format: 'email' },
          image: { type: 'string' },
          team: { type: 'string' }
        }
      },
      AirtableImage: {
        type: 'object',
        required: ['id', 'type', 'size', 'url', 'filename', 'name', 'width', 'height', 'thumbnails'],
        properties: {
          id: { type: 'string' },
          type: { type: 'string' },
          size: { type: 'integer' },
          url: { type: 'string', format: 'uri' },
          filename: { type: 'string' },
          name: { type: 'string' },
          width: { type: 'integer' },
          height: { type: 'integer' },
          thumbnails: {
            type: 'object',
            required: ['small', 'large', 'full'],
            properties: {
              small: { type: 'object', additionalProperties: true },
              large: { type: 'object', additionalProperties: true },
              full: { type: 'object', additionalProperties: true }
            }
          }
        }
      },
      MeetingRoom: {
        type: 'object',
        required: ['id', 'name', 'capacity', 'startTime', 'endTime', 'image'],
        properties: {
          id: { type: 'string' },
          name: { type: 'string' },
          capacity: { type: 'integer' },
          notes: { type: 'string' },
          location: { type: 'string' },
          status: { type: 'string' },
          startTime: { type: 'integer', description: 'Opening time in seconds from midnight' },
          endTime: { type: 'integer', description: 'Closing time in seconds from midnight' },
          image: {
            oneOf: [
              { $ref: '#/components/schemas/AirtableImage' },
              { type: 'null' }
            ]
          },
          maxMeetingHours: { type: 'number' },
          tags: { type: 'array', items: { type: 'string' } },
          blockedDays: { type: 'array', items: { type: 'integer' } }
        }
      },
      TimeSlot: {
        type: 'object',
        required: ['startTime', 'endTime', 'label', 'available', 'occupied', 'past'],
        properties: {
          startTime: { type: 'string', format: 'date-time' },
          endTime: { type: 'string', format: 'date-time' },
          label: { type: 'string' },
          available: { type: 'boolean' },
          occupied: { type: 'boolean' },
          past: { type: 'boolean' }
        }
      },
      CreateBookingRequest: {
        type: 'object',
        required: ['roomId', 'startTime', 'endTime'],
        properties: {
          roomId: { type: 'string' },
          startTime: { type: 'string', format: 'date-time' },
          endTime: { type: 'string', format: 'date-time' },
          note: { type: 'string', maxLength: 500 }
        }
      },
      Booking: {
        type: 'object',
        required: ['id', 'userLabel', 'user', 'startTime', 'endTime', 'room', 'roomName'],
        properties: {
          id: { type: 'string' },
          userLabel: { type: 'string' },
          user: { type: 'string' },
          userEmail: { type: 'string', format: 'email' },
          startTime: { type: 'string', format: 'date-time' },
          endTime: { type: 'string', format: 'date-time' },
          note: { type: 'string' },
          room: { type: 'string' },
          roomName: { type: 'string' },
          roomLocation: { type: 'string' },
          status: { type: 'string' }
        }
      },
      ErrorResponse: {
        type: 'object',
        required: ['error', 'type'],
        properties: {
          error: { type: 'string' },
          type: { type: 'string' },
          details: {
            description: 'Present in development mode only'
          }
        }
      }
    }
  }
} as const;

export default openApiSpec;
