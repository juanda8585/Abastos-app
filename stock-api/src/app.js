const express = require('express');
const swaggerUi = require('swagger-ui-express');
const swaggerJsdoc = require('swagger-jsdoc');
const productionRoutes = require('./routes/production');

const app = express();
const PORT = process.env.PORT || 3000;

// --- Safe JSON Swagger Configuration ---
const swaggerOptions = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Abastos Stock & Production API',
      version: '1.0.0',
      description: 'API documentation for managing production batches and inventory movements.',
    },
    servers: [
      {
        url: `http://localhost:${PORT}`,
        description: 'Local Development Server',
      },
    ],
    paths: {
      '/api/production/batches': {
        post: {
          summary: 'Create a new production batch header',
          description: 'Initializes a production batch with the responsible employee\'s name.',
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['employeeName'],
                  properties: {
                    employeeName: {
                      type: 'string',
                      example: 'John Doe'
                    }
                  }
                }
              }
            }
          },
          responses: {
            201: {
              description: 'Batch created successfully',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      success: { type: 'boolean', example: true },
                      batchId: { type: 'integer', example: 1 }
                    }
                  }
                }
              }
            },
            400: { description: 'Invalid input / Missing required fields' }
          }
        }
      },
      '/api/production/batches/{batchId}/details': {
        post: {
          summary: 'Submit production batch items and movements',
          description: 'Processes an array of items, creates batch details, and logs inventory transactions via a DB transaction.',
          parameters: [
            {
              in: 'path',
              name: 'batchId',
              required: true,
              schema: { type: 'integer' },
              description: 'The ID of the parent production batch'
            }
          ],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['items'],
                  properties: {
                    items: {
                      type: 'array',
                      items: {
                        type: 'object',
                        required: ['productId', 'quantityProduced', 'expirationDate'],
                        properties: {
                          productId: { type: 'integer', example: 101 },
                          quantityProduced: { type: 'integer', example: 50 },
                          expirationDate: { type: 'string', format: 'date', example: '2026-12-31' }
                        }
                      }
                    }
                  }
                }
              }
            }
          },
          responses: {
            200: {
              description: 'Batch details and inventory entries saved successfully',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      success: { type: 'boolean', example: true },
                      batchId: { type: 'integer', example: 1 }
                    }
                  }
                }
              }
            },
            400: { description: 'Invalid parameters or item array' },
            500: { description: 'Transaction aborted / Database error' }
          }
        }
      }
    }
  },
  apis: [] // We don't need to parse external files anymore
};

const swaggerDocs = swaggerJsdoc(swaggerOptions);
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocs));
// ---------------------------------------

app.use(express.json());
app.use('/api/production', productionRoutes);

// Global Error Handler
app.use((err, req, res, next) => {
  console.error('Unhandled Error:', err.stack);
  res.status(500).json({ error: 'Internal Server Error' });
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Swagger available at http://localhost:${PORT}/api-docs`);
});